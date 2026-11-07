using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using GharMitra.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace GharMitra.Infrastructure.Payments;

public class RazorpayService : IPaymentGatewayService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<RazorpayService> _logger;

    public RazorpayService(HttpClient http, IConfiguration config, ILogger<RazorpayService> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    public async Task<string?> RefundAsync(
        string razorpayPaymentId,
        decimal amount,
        string reason,
        CancellationToken ct = default)
    {
        // Mock payments — simulate success
        if (razorpayPaymentId.StartsWith("pay_mock_", StringComparison.OrdinalIgnoreCase))
        {
            var mockRefundId = $"rfnd_mock_{Guid.NewGuid():N}".Substring(0, 20);
            _logger.LogInformation("Mock refund issued for {PaymentId}: {Amount}, reason: {Reason}, refundId: {RefundId}",
                razorpayPaymentId, amount, reason, mockRefundId);
            return mockRefundId;
        }

        // Real Razorpay refund
        var keyId = _config["Razorpay:KeyId"];
        var keySecret = _config["Razorpay:KeySecret"];

        if (string.IsNullOrEmpty(keyId) || string.IsNullOrEmpty(keySecret))
        {
            _logger.LogError("Razorpay credentials missing — cannot issue refund for {PaymentId}", razorpayPaymentId);
            return null;
        }

        var auth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}"));

        var payload = new
        {
            amount = (int)Math.Round(amount * 100), // Razorpay uses paise
            speed = "normal",
            notes = new Dictionary<string, string>
            {
                { "reason", reason },
                { "source", "gharmitra-api" }
            }
        };

        var json = JsonSerializer.Serialize(payload);
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"https://api.razorpay.com/v1/payments/{razorpayPaymentId}/refund");
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", auth);
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");

        try
        {
            var response = await _http.SendAsync(request, ct);
            var responseBody = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Razorpay refund failed: {StatusCode} {Body}", response.StatusCode, responseBody);
                return null;
            }

            using var doc = JsonDocument.Parse(responseBody);
            var refundId = doc.RootElement.GetProperty("id").GetString();
            _logger.LogInformation("Razorpay refund issued: {RefundId} for {PaymentId}, {Amount}",
                refundId, razorpayPaymentId, amount);
            return refundId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Razorpay refund exception for {PaymentId}", razorpayPaymentId);
            return null;
        }
    }
}