using GharMitra.Application.Common.Interfaces;
using GharMitra.Domain.Entities;
using GharMitra.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Application.Auth;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _db;
    private readonly IJwtTokenGenerator _jwt;

    public AuthService(IApplicationDbContext db, IJwtTokenGenerator jwt)
    {
        _db = db;
        _jwt = jwt;
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

        var user = new User
        {
            FullName = r.FullName.Trim(),
            Email = email,
            PhoneNumber = r.PhoneNumber.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(r.Password),
            Role = r.Role
        };

        if (r.Role == UserRole.Customer)
            user.Customer = new Customer { City = r.City?.Trim() ?? string.Empty };
        else
            user.Professional = new Professional { City = r.City?.Trim() ?? string.Empty };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        return Build(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest r, CancellationToken ct = default)
    {
        var email = r.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email && u.IsActive, ct)
            ?? throw new InvalidOperationException("Invalid email or password.");

        if (!BCrypt.Net.BCrypt.Verify(r.Password, user.PasswordHash))
            throw new InvalidOperationException("Invalid email or password.");

        return Build(user);
    }

    private AuthResponse Build(User user)
    {
        var (token, expires) = _jwt.GenerateToken(user);
        return new AuthResponse(token, expires, user.Id, user.FullName, user.Email, user.Role.ToString());
    }
}