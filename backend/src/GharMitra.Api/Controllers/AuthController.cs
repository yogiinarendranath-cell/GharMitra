using GharMitra.Application.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace GharMitra.Api.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken ct)
    {
        try { return Ok(await _auth.RegisterAsync(request, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct)
    {
        try { return Ok(await _auth.LoginAsync(request, ct)); }
        catch (InvalidOperationException ex) { return Unauthorized(new { message = ex.Message }); }
    }

    [HttpPost("verify-otp")]
    public async Task<ActionResult<AuthResponse>> VerifyOtp(VerifyOtpRequest request, CancellationToken ct)
    {
        try { return Ok(await _auth.VerifyOtpAsync(request, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("verify-phone")]
    public async Task<ActionResult<AuthResponse>> VerifyPhone(VerifyPhoneRequest request, CancellationToken ct)
    {
        try { return Ok(await _auth.VerifyPhoneAsync(request, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        try { await _auth.ForgotPasswordAsync(request.Email, ct); }
        catch { /* Never reveal errors */ }
        return Ok(new { message = "If an account exists with this email, a reset link has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        try
        {
            await _auth.ResetPasswordAsync(request.Token, request.NewPassword, ct);
            return Ok(new { message = "Password reset successfully. You can now log in." });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}