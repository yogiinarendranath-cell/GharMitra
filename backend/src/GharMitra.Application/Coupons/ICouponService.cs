namespace GharMitra.Application.Coupons;

public interface ICouponService
{
    Task<CouponDto> CreateAsync(CreateCouponRequest request, CancellationToken ct = default);
    Task<List<CouponDto>> GetAllAsync(CancellationToken ct = default);
    Task<ApplyCouponResponse> ApplyToBookingAsync(Guid customerUserId, Guid bookingId, string code, CancellationToken ct = default);
    Task RemoveFromBookingAsync(Guid customerUserId, Guid bookingId, CancellationToken ct = default);
    Task<CouponStatsDto> GetStatsAsync(DateTime? fromUtc, DateTime? toUtc, CancellationToken ct = default);
}