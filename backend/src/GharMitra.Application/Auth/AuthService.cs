using GharMitra.Application.Common.Interfaces;
using GharMitra.Domain.Entities;
using GharMitra.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Application.Auth;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _db;
    private readonly IJwtTokenGenerator _jwt;
    private readonly IEmailService _emailService;

    public AuthService(IApplicationDbContext db, IJwtTokenGenerator jwt, IEmailService emailService)
    {
        _db = db;
        _jwt = jwt;
        _emailService = emailService;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest r, CancellationToken ct = default)
    {
        var email = r.Email.Trim().ToLowerInvariant();

        if (await _db.Users.AnyAsync(u => u.Email == email, ct))
            throw new InvalidOperationException("An account with this email already exists.");

        if (r.Role is not (UserRole.Customer or UserRole.Professional))
            throw new InvalidOperationException("Invalid role for self-registration.");

        if (string.IsNullOrWhiteSpace(r.Password) || r.Password.Length < 8)
            throw new InvalidOperationException("Password must be at least 8 characters.");

        // Generate 6-digit OTP
        var otp = new Random().Next(100000, 999999).ToString();

        var user = new User
        {
            FullName = r.FullName.Trim(),
            Email = email,
            PhoneNumber = r.PhoneNumber.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(r.Password),
            Role = r.Role,
            IsEmailVerified = false,
            OtpCode = otp,
            OtpExpiryUtc = DateTime.UtcNow.AddMinutes(10)
        };

        if (r.Role == UserRole.Customer)
            user.Customer = new Customer { City = r.City?.Trim() ?? string.Empty };
        else
            user.Professional = new Professional { City = r.City?.Trim() ?? string.Empty };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        // Send Email
        try
        {
            await _emailService.SendOtpEmailAsync(user.Email, user.FullName, otp, ct);
        }
        catch (Exception ex)
        {
            // Log the error but don't block registration
            Console.WriteLine($"Failed to send OTP email: {ex.Message}");
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

        if (!user.IsEmailVerified)
            throw new InvalidOperationException("Email not verified. Please check your inbox for the OTP.");

        return Build(user);
    }

    public async Task<AuthResponse> VerifyOtpAsync(VerifyOtpRequest r, CancellationToken ct = default)
    {
        var email = r.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct)
            ?? throw new InvalidOperationException("User not found.");

        if (user.IsEmailVerified)
            throw new InvalidOperationException("Email is already verified.");

        if (user.OtpCode != r.Code)
            throw new InvalidOperationException("Invalid OTP code.");

        if (user.OtpExpiryUtc < DateTime.UtcNow)
            throw new InvalidOperationException("OTP has expired. Please register again.");

        user.IsEmailVerified = true;
        user.OtpCode = null;
        user.OtpExpiryUtc = null;
        user.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return Build(user);
    }

    private AuthResponse Build(User user)
    {
        var (token, expires) = _jwt.GenerateToken(user);
        return new AuthResponse(token, expires, user.Id, user.FullName, user.Email, user.Role.ToString(), user.IsEmailVerified);
    }
}