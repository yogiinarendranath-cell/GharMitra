using GharMitra.Application.Common.Interfaces;
using GharMitra.Application.Payments;
using GharMitra.Domain.Enums;
using GharMitra.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Razorpay.Api;

namespace GharMitra.Infrastructure.Payments;

public class PaymentService : IPaymentService
{
    private readonly IApplicationDbContext _db;
    private readonly RazorpaySettings _settings;

    public PaymentService(IApplicationDbContext db, IOptions<RazorpaySettings> settings)
    {
        _db = db;
        _settings = settings.Value;
    }

    public async Task<PaymentOrderDto> CreateOrderAsync(Guid userId, Guid bookingId, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.UserId == userId, ct)
            ?? throw new InvalidOperationException("Customer not found.");

        var booking = await _db.Bookings
            .Include(b => b.Service)
            .Include(b => b.Customer).ThenInclude(c => c.User)
            .FirstOrDefaultAsync(b => b.Id == bookingId && b.CustomerId == customer.Id, ct)
            ?? throw new InvalidOperationException("Booking not found.");

        if (booking.PaymentStatus == PaymentStatus.Paid)
            throw new InvalidOperationException("Booking is already paid.");

        bool isMock = string.IsNullOrWhiteSpace(_settings.KeyId) || _settings.KeyId.StartsWith("rzp_test_your");
        
        string orderId;
        if (isMock)
        {
            orderId = $"order_mock_{Guid.NewGuid().ToString()[..10]}";
        }
        else
        {
            var client = new RazorpayClient(_settings.KeyId, _settings.KeySecret);
            var options = new Dictionary<string, object>
            {
                { "amount", (int)(booking.TotalAmount * 100) },
                { "currency", "INR" },
                { "receipt", booking.BookingNumber }
            };
            var order = client.Order.Create(options);
            orderId = order["id"].ToString();
        }

        booking.RazorpayOrderId = orderId;
        await _db.SaveChangesAsync(ct);

        return new PaymentOrderDto(
            orderId,
            booking.TotalAmount,
            "INR",
            _settings.KeyId ?? "rzp_test_mock",
            isMock,
            booking.BookingNumber,
            booking.Customer.User.FullName,
            booking.Customer.User.Email,
            booking.Customer.User.PhoneNumber
        );
    }

    public async Task<bool> VerifyPaymentAsync(Guid userId, Guid bookingId, VerifyPaymentRequest request, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.UserId == userId, ct)
            ?? throw new InvalidOperationException("Customer not found.");

        var booking = await _db.Bookings
            .FirstOrDefaultAsync(b => b.Id == bookingId && b.CustomerId == customer.Id, ct)
            ?? throw new InvalidOperationException("Booking not found.");

        if (booking.RazorpayOrderId != request.RazorpayOrderId)
            throw new InvalidOperationException("Order ID mismatch.");

        bool isMock = string.IsNullOrWhiteSpace(_settings.KeyId) || _settings.KeyId.StartsWith("rzp_test_your");

        if (!isMock)
        {
            var attributes = new Dictionary<string, string>
            {
                { "razorpay_order_id", request.RazorpayOrderId },
                { "razorpay_payment_id", request.RazorpayPaymentId },
                { "razorpay_signature", request.RazorpaySignature }
            };
            
            try
            {
                // The SDK throws an exception if the signature is invalid.
                Utils.verifyPaymentSignature(attributes);
            }
            catch (Exception)
            {
                throw new InvalidOperationException("Payment signature verification failed.");
            }
        }

        booking.PaymentStatus = PaymentStatus.Paid;
        booking.RazorpayPaymentId = request.RazorpayPaymentId;
        booking.UpdatedAtUtc = DateTime.UtcNow;

        // Coupon redemption
        if (booking.AppliedCouponId.HasValue && booking.DiscountAmount.HasValue && booking.DiscountAmount > 0)
        {
            var coupon = await _db.Coupons.FirstOrDefaultAsync(c => c.Id == booking.AppliedCouponId.Value, ct);
            if (coupon != null)
            {
                _db.CouponRedemptions.Add(new CouponRedemption
                {
                    CouponId = coupon.Id,
                    BookingId = booking.Id,
                    CustomerId = booking.CustomerId,
                    DiscountApplied = booking.DiscountAmount.Value
                });
                coupon.CurrentUses += 1;
            }
        }

        await _db.SaveChangesAsync(ct);
        return true;
    }
}