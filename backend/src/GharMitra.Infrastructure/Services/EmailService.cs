using GharMitra.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace GharMitra.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;

    public EmailService(IConfiguration config, IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _httpClientFactory = httpClientFactory;
    }

    public async Task SendOtpEmailAsync(string toEmail, string toName, string otpCode, CancellationToken ct = default)
    {
        var emailSettings = _config.GetSection("EmailSettings");
        var apiKey = emailSettings["ApiKey"] ?? throw new InvalidOperationException("Brevo API Key missing");
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
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>"
        };

        var response = await client.PostAsJsonAsync("https://api.brevo.com/v3/smtp/email", payload, ct);
        
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(ct);
            throw new Exception($"Brevo API Error: {response.StatusCode} - {error}");
        }
    }
}