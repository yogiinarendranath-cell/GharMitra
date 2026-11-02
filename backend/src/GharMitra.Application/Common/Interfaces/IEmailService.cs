namespace GharMitra.Application.Common.Interfaces;

public interface IEmailService
{
    Task SendOtpEmailAsync(string toEmail, string toName, string otpCode, CancellationToken ct = default);
}