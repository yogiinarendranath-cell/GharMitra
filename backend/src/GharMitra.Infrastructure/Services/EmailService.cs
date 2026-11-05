using GharMitra.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace GharMitra.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, IHttpClientFactory httpClientFactory, ILogger<EmailService> logger)
    {
        _config = config;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task SendOtpEmailAsync(string toEmail, string toName, string otpCode, CancellationToken ct = default)
    {
        var devMode = _config.GetValue<bool>("Auth:DevMode");

        if (devMode)
        {
            _logger.LogWarning("════════════════════════════════════════════");
            _logger.LogWarning("📧 DEV MODE EMAIL OTP");
            _logger.LogWarning($"   To: {toEmail}");
            _logger.LogWarning($"   Name: {toName}");
            _logger.LogWarning($"   CODE: {otpCode}");
            _logger.LogWarning("════════════════════════════════════════════");
            return;
        }

        var emailSettings = _config.GetSection("EmailSettings");
        var apiKey = emailSettings["ApiKey"] ?? throw new InvalidOperationException("Email API Key missing");
        var senderEmail = emailSettings["SenderEmail"] ?? throw new InvalidOperationException("SenderEmail missing");
        var senderName = emailSettings["SenderName"] ?? "GharMitra";

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("api-key", apiKey);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var payload = new
        {
            sender = new { name = senderName, email = senderEmail },
            to = new[] { new { email = toEmail, name = toName } },
            subject = "Your GharMitra Verification Code",
            htmlContent = $@"
                <h2>Welcome to GharMitra!</h2>
                <p>Hi {toName},</p>
                <p>Your verification code is:</p>
                <h1 style='color: #D81B60; letter-spacing: 5px;'>{otpCode}</h1>
                <p>This code will expire in 10 minutes.</p>"
        };

        var response = await client.PostAsJsonAsync("https://api.brevo.com/v3/smtp/email", payload, ct);
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(ct);
            throw new Exception($"Brevo API Error: {response.StatusCode} - {error}");
        }
    }
}