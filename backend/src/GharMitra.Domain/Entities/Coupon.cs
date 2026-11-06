using GharMitra.Domain.Common;

namespace GharMitra.Domain.Entities;

public enum CouponDiscountType
{
    Percentage = 1,
    FixedAmount = 2
}

public class Coupon : BaseEntity
{
    public string Code { get; set; } = string.Empty;              // e.g., "WELCOME50"
    public string? Description { get; set; }
    public CouponDiscountType DiscountType { get; set; }
    public decimal DiscountValue { get; set; }                    // 20 for 20%, 50 for ₹50
    public decimal? MaxDiscountAmount { get; set; }               // cap for percentage (e.g., max ₹100 off)
    public decimal MinOrderAmount { get; set; }                   // booking total must be >= this
    public DateTime? ValidFromUtc { get; set; }
    public DateTime? ValidUntilUtc { get; set; }
    public int? MaxTotalUses { get; set; }                        // total times redeemable
    public int CurrentUses { get; set; }
    public int? MaxUsesPerCustomer { get; set; } = 1;             // usually 1 per customer
    public bool IsActive { get; set; } = true;

    public ICollection<CouponRedemption> Redemptions { get; set; } = new List<CouponRedemption>();
}