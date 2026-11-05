using GharMitra.Application.Common.Interfaces;
using GharMitra.Domain.Entities;
using GharMitra.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace GharMitra.Application.Auth;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _db;
    private readonly IJwtTokenGenerator _jwt;
    private readonly IEmailService _emailService;
    private readonly ISmsService _smsService;
    private readonly IConfiguration _config;

    public AuthService(IApplicationDbContext db, IJwtTokenGenerator jwt, IEmailService emailService, ISmsService smsService, IConfiguration config)
    {
        _db = db;
        _jwt = jwt;
        _emailService = emailService;
        _smsService = smsService;
        _config = config;
    }

    private bool SkipVerification => _config.GetValue<bool>("Auth:SkipVerification");

    public async Task<AuthResponse> RegisterAsync(RegisterRequest r, CancellationToken ct = default)
    {
        var email = r.Email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email == email, ct))
            throw new InvalidOperationException("An account with this email already exists.");

        var emailOtp = new Random().Next(100000, 999999).ToString();
        var phoneOtp = new Random().Next(100000, 999999).ToString();
        var skip = SkipVerification;

        var user = new User
        {
            FullName = r.FullName.Trim(),
            Email = email,
            PhoneNumber = r.PhoneNumber.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(r.Password),
            Role = r.Role,
            IsEmailVerified = skip,
            OtpCode = skip ? null : emailOtp,
            OtpExpiryUtc = skip ? null : DateTime.UtcNow.AddMinutes(10),
            IsPhoneVerified = skip,
            PhoneOtpCode = skip ? null : phoneOtp,
            PhoneOtpExpiryUtc = skip ? null : DateTime.UtcNow.AddMinutes(10)
        };

        if (r.Role == UserRole.Customer)
            user.Customer = new Customer { City = r.City?.Trim() ?? string.Empty };
        else
            user.Professional = new Professional { City = r.City?.Trim() ?? string.Empty };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        if (!skip)
        {
            try { await _emailService.SendOtpEmailAsync(user.Email, user.FullName, emailOtp, ct); } catch { }
            try { await _smsService.SendOtpSmsAsync(user.PhoneNumber, phoneOtp, ct); } catch { }
        }

        return Build(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest r, CancellationToken ct = default)
    {
        var email = r.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email && u.IsActive, ct)
            ?? throw new InvalidOperationException("Invalid email or password.");

        if (!BCrypt.Net.BCrypt.Verify(r.Password, user.PasswordHash))
            throw new InvalidOperationException("Invalid email or password.");

        if (!SkipVerification)
        {
            if (!user.IsEmailVerified)
                throw new InvalidOperationException("Email not verified. Please check your inbox for the OTP.");
            if (!user.IsPhoneVerified)
                throw new InvalidOperationException("Phone not verified. Please check your SMS for the OTP.");
        }

        return Build(user);
    }

    public async Task<AuthResponse> VerifyOtpAsync(VerifyOtpRequest r, CancellationToken ct = default)
    {
        var email = r.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct)
            ?? throw new InvalidOperationException("User not found.");

        if (user.IsEmailVerified) throw new InvalidOperationException("Email is already verified.");
        if (user.OtpCode != r.Code) throw new InvalidOperationException("Invalid OTP code.");
        if (user.OtpExpiryUtc < DateTime.UtcNow) throw new InvalidOperationException("OTP has expired.");

        user.IsEmailVerified = true;
        user.OtpCode = null;
        user.OtpExpiryUtc = null;
        user.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Build(user);
    }

    public async Task<AuthResponse> VerifyPhoneAsync(VerifyPhoneRequest r, CancellationToken ct = default)
    {
        var email = r.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct)
            ?? throw new InvalidOperationException("User not found.");

        if (user.IsPhoneVerified) throw new InvalidOperationException("Phone is already verified.");
        if (user.PhoneOtpCode != r.Code) throw new InvalidOperationException("Invalid SMS OTP code.");
        if (user.PhoneOtpExpiryUtc < DateTime.UtcNow) throw new InvalidOperationException("SMS OTP has expired.");

        user.IsPhoneVerified = true;
        user.PhoneOtpCode = null;
        user.PhoneOtpExpiryUtc = null;
        user.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Build(user);
    }

    private AuthResponse Build(User user)
    {
        var (token, expires) = _jwt.GenerateToken(user);
        return new AuthResponse(token, expires, user.Id, user.FullName, user.Email, user.PhoneNumber, user.Role.ToString(), user.IsEmailVerified, user.IsPhoneVerified);
    }
}