using GharMitra.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace GharMitra.Infrastructure.Services;

public class SmsService : ISmsService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmsService> _logger;

    public SmsService(IConfiguration config, ILogger<SmsService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public Task SendOtpSmsAsync(string phoneNumber, string otpCode, CancellationToken ct = default)
    {
        var devMode = _config.GetValue<bool>("Auth:DevMode");

        if (devMode)
        {
            _logger.LogWarning("════════════════════════════════════════════");
            _logger.LogWarning("📱 DEV MODE SMS OTP");
            _logger.LogWarning($"   To: {phoneNumber}");
            _logger.LogWarning($"   CODE: {otpCode}");
            _logger.LogWarning("════════════════════════════════════════════");
            return Task.CompletedTask;
        }

        var accountSid = _config["Twilio:AccountSid"];
        var authToken = _config["Twilio:AuthToken"];
        var fromNumber = _config["Twilio:FromNumber"];

        if (string.IsNullOrWhiteSpace(accountSid))
        {
            _logger.LogWarning($"[NO SMS CONFIGURED] To: {phoneNumber} | Code: {otpCode}");
            return Task.CompletedTask;
        }

        TwilioClient.Init(accountSid, authToken);
        var message = MessageResource.Create(
            body: $"Your GharMitra verification code is: {otpCode}",
            from: new PhoneNumber(fromNumber),
            to: new PhoneNumber(phoneNumber)
        );

        _logger.LogInformation($"SMS sent to {phoneNumber}. SID: {message.Sid}");
        return Task.CompletedTask;
    }
}