using GharMitra.Domain.Enums;

namespace GharMitra.Application.Auth;

public record RegisterRequest(
    string FullName,
    string Email,
    string PhoneNumber,
    string Password,
    UserRole Role,
    string? City);

public record LoginRequest(string Email, string Password);
public record VerifyOtpRequest(string Email, string Code);
public record VerifyPhoneRequest(string Email, string Code);

public record AuthResponse(
    string Token,
    DateTime ExpiresAtUtc,
    Guid UserId,
    string FullName,
    string Email,
    string PhoneNumber,
    string Role,
    bool IsEmailVerified,
    bool IsPhoneVerified);