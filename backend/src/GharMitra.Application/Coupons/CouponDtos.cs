namespace GharMitra.Application.Coupons;

public record CreateCouponRequest(
    string Code,
    string? Description,
    int DiscountType,
    decimal DiscountValue,
    decimal? MaxDiscountAmount,
    decimal MinOrderAmount,
    DateTime? ValidFromUtc,
    DateTime? ValidUntilUtc,
    int? MaxTotalUses,
    int? MaxUsesPerCustomer);

public record CouponDto(
    Guid Id, string Code, string? Description,
    string DiscountType, decimal DiscountValue, decimal? MaxDiscountAmount,
    decimal MinOrderAmount, DateTime? ValidFromUtc, DateTime? ValidUntilUtc,
    int? MaxTotalUses, int CurrentUses, int? MaxUsesPerCustomer,
    bool IsActive, DateTime CreatedAtUtc);

public record ApplyCouponRequest(string Code);

public record ApplyCouponResponse(string Code, decimal DiscountApplied, decimal OriginalAmount, decimal NewAmount);

public record CouponStatsDto(
    decimal TotalDiscountGiven,
    int TotalRedemptions,
    string? TopCouponCode,
    int TopCouponUses);