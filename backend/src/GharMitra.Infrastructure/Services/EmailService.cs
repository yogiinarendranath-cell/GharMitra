using GharMitra.Application.Common.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;

namespace GharMitra.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    public async Task SendOtpEmailAsync(string toEmail, string toName, string otpCode, CancellationToken ct = default)
    {
        var emailSettings = _config.GetSection("EmailSettings");
        var host = emailSettings["Host"] ?? "smtp.gmail.com";
        var port = int.Parse(emailSettings["Port"] ?? "587");
        var senderEmail = emailSettings["SenderEmail"] ?? throw new InvalidOperationException("SenderEmail missing");
        var senderName = emailSettings["SenderName"] ?? "GharMitra";
        var password = emailSettings["Password"] ?? throw new InvalidOperationException("Email password missing");

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(senderName, senderEmail));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = "Your GharMitra Verification Code";

        var bodyBuilder = new BodyBuilder
        {
            HtmlBody = $@"
                <h2>Welcome to GharMitra!</h2>
                <p>Hi {toName},</p>
                <p>Your verification code is:</p>
                <h1 style='color: #D81B60; letter-spacing: 5px;'>{otpCode}</h1>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>"
        };
        message.Body = bodyBuilder.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync(host, port, SecureSocketOptions.StartTls, ct);
        await client.AuthenticateAsync(senderEmail, password, ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }
}