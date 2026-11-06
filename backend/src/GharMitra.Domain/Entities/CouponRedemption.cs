using GharMitra.Domain.Common;

namespace GharMitra.Domain.Entities;

public class CouponRedemption : BaseEntity
{
    public Guid CouponId { get; set; }
    public Coupon Coupon { get; set; } = null!;

    public Guid BookingId { get; set; }
    public Booking Booking { get; set; } = null!;

    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public decimal DiscountApplied { get; set; }
}