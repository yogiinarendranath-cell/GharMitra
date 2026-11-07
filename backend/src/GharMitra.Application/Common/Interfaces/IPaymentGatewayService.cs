namespace GharMitra.Application.Common.Interfaces;

public interface IPaymentGatewayService
{
    /// <summary>
    /// Issue a refund for a Razorpay payment.
    /// Returns the refund ID if successful, null if the refund couldn't be issued.
    /// For mock payments (dev), returns a synthetic ID.
    /// </summary>
    Task<string?> RefundAsync(
        string razorpayPaymentId,
        decimal amount,
        string reason,
        CancellationToken ct = default);
}