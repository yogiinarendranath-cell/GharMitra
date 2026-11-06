using GharMitra.Domain.Common;

namespace GharMitra.Domain.Entities;

public class Referral : BaseEntity
{
    // Who shared the referral
    public Guid ReferrerCustomerId { get; set; }
    public Customer ReferrerCustomer { get; set; } = null!;

    // Who signed up using the referral (null until redeemed)
    public Guid? RefereeCustomerId { get; set; }
    public Customer? RefereeCustomer { get; set; }

    // The unique code that was shared (e.g., "NARENDRA-A1B2")
    public string ReferralCode { get; set; } = string.Empty;

    // Optional: capture email at share time so we can pre-fill the signup form
    public string? RefereeEmail { get; set; }

    // Status
    public bool IsRedeemed { get; set; }
    public DateTime? RedeemedAtUtc { get; set; }

    // Reward amounts (captured at share time so they don't change retroactively)
    public decimal RefereeDiscount { get; set; } = 50m;
    public decimal ReferrerReward { get; set; } = 100m;

    // Coupon IDs created when redeemed
    public Guid? RefereeCouponId { get; set; }
    public Guid? ReferrerCouponId { get; set; }
}