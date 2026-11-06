using GharMitra.Domain.Common;

namespace GharMitra.Domain.Entities;

public enum CouponDiscountType
{
    Percentage = 1,
    FixedAmount = 2
}

public class Coupon : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public CouponDiscountType DiscountType { get; set; }
    public decimal DiscountValue { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public decimal MinOrderAmount { get; set; }
    public DateTime? ValidFromUtc { get; set; }
    public DateTime? ValidUntilUtc { get; set; }
    public int? MaxTotalUses { get; set; }
    public int CurrentUses { get; set; }
    public int? MaxUsesPerCustomer { get; set; } = 1;
    public bool IsActive { get; set; } = true;

    public ICollection<CouponRedemption> Redemptions { get; set; } = new List<CouponRedemption>();
}