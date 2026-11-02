namespace GharMitra.Application.Common.Interfaces;

public interface ISmsService
{
    Task SendOtpSmsAsync(string phoneNumber, string otpCode, CancellationToken ct = default);
}