namespace GharMitra.Application.Auth;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<AuthResponse> VerifyOtpAsync(VerifyOtpRequest request, CancellationToken ct = default);
    Task<AuthResponse> VerifyPhoneAsync(VerifyPhoneRequest request, CancellationToken ct = default);

    Task ForgotPasswordAsync(string email, CancellationToken ct = default);
    Task ResetPasswordAsync(string token, string newPassword, CancellationToken ct = default);
}