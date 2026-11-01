namespace GharMitra.Application.Payments;

public record PaymentOrderDto(
    string OrderId,
    decimal Amount,
    string Currency,
    string KeyId,
    bool IsMock,
    string BookingNumber,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone);

public record VerifyPaymentRequest(
    string RazorpayOrderId,
    string RazorpayPaymentId,
    string RazorpaySignature);

public interface IPaymentService
{
    Task<PaymentOrderDto> CreateOrderAsync(Guid userId, Guid bookingId, CancellationToken ct = default);
    Task<bool> VerifyPaymentAsync(Guid userId, Guid bookingId, VerifyPaymentRequest request, CancellationToken ct = default);
}