using GharMitra.Domain.Common;
using GharMitra.Domain.Enums;

namespace GharMitra.Domain.Entities;

public class Booking : BaseEntity
{
    public string BookingNumber { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public Guid ServiceId { get; set; }
    public Service Service { get; set; } = null!;

    public DateTime ScheduledStartUtc { get; set; }
    public int DurationMinutes { get; set; }
    public string AddressLine { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? Pincode { get; set; }
    public string? Notes { get; set; }
    
    // NEW: Location tracking
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public decimal TotalAmount { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Pending;

    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Unpaid;
    public string? RazorpayOrderId { get; set; }
    public string? RazorpayPaymentId { get; set; }

    public DateTime? CancelledAtUtc { get; set; }
    public string? CancellationReason { get; set; }

    public BookingAssignment? Assignment { get; set; }

    // Refund tracking
    public decimal? RefundAmount { get; set; }
    public DateTime? RefundedAtUtc { get; set; }
    public string? RefundReason { get; set; }

    // Coupon tracking
    public Guid? AppliedCouponId { get; set; }
    public Coupon? AppliedCoupon { get; set; }
    public decimal? DiscountAmount { get; set; }
    public decimal OriginalAmount { get; set; }
}