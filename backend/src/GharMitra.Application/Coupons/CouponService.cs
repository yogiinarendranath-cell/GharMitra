using GharMitra.Application.Common.Interfaces;
using GharMitra.Domain.Entities;
using GharMitra.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Application.Coupons;

public class CouponService : ICouponService
{
    private readonly IApplicationDbContext _db;
    public CouponService(IApplicationDbContext db) => _db = db;

    public async Task<CouponDto> CreateAsync(CreateCouponRequest r, CancellationToken ct = default)
    {
        var code = r.Code.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(code))
            throw new InvalidOperationException("Coupon code is required.");
        if (await _db.Coupons.AnyAsync(c => c.Code == code, ct))
            throw new InvalidOperationException($"Coupon '{code}' already exists.");
        if (r.DiscountType is not (1 or 2))
            throw new InvalidOperationException("DiscountType must be 1 (Percentage) or 2 (FixedAmount).");
        if (r.DiscountValue <= 0)
            throw new InvalidOperationException("DiscountValue must be positive.");

        var coupon = new Coupon
        {
            Code = code,
            Description = r.Description?.Trim(),
            DiscountType = (CouponDiscountType)r.DiscountType,
            DiscountValue = r.DiscountValue,
            MaxDiscountAmount = r.MaxDiscountAmount,
            MinOrderAmount = r.MinOrderAmount,
            ValidFromUtc = r.ValidFromUtc?.ToUniversalTime(),
            ValidUntilUtc = r.ValidUntilUtc?.ToUniversalTime(),
            MaxTotalUses = r.MaxTotalUses,
            MaxUsesPerCustomer = r.MaxUsesPerCustomer ?? 1,
            FirstBookingOnly = r.FirstBookingOnly
        };

        _db.Coupons.Add(coupon);
        await _db.SaveChangesAsync(ct);
        return ToDto(coupon);
    }

    public async Task<List<CouponDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.Coupons
            .OrderByDescending(c => c.CreatedAtUtc)
            .Select(c => new CouponDto(
                c.Id, c.Code, c.Description, c.DiscountType.ToString(),
                c.DiscountValue, c.MaxDiscountAmount, c.MinOrderAmount,
                c.ValidFromUtc, c.ValidUntilUtc, c.MaxTotalUses,
                c.CurrentUses, c.MaxUsesPerCustomer, c.IsActive, c.CreatedAtUtc,
                c.FirstBookingOnly))
            .ToListAsync(ct);
    }

    public async Task<ApplyCouponResponse> ApplyToBookingAsync(Guid customerUserId, Guid bookingId, string code, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.UserId == customerUserId, ct)
            ?? throw new InvalidOperationException("Customer not found.");

        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId && b.CustomerId == customer.Id, ct)
            ?? throw new InvalidOperationException("Booking not found.");

        if (booking.PaymentStatus == PaymentStatus.Paid)
            throw new InvalidOperationException("Cannot apply coupon to a paid booking.");

        if (booking.AppliedCouponId.HasValue)
            throw new InvalidOperationException("A coupon is already applied. Remove it first.");

        var normalized = code.Trim().ToUpperInvariant();
        var coupon = await _db.Coupons.FirstOrDefaultAsync(c => c.Code == normalized, ct)
            ?? throw new InvalidOperationException($"Coupon '{normalized}' does not exist.");

        if (!coupon.IsActive)
            throw new InvalidOperationException("This coupon is no longer active.");
        if (coupon.ValidFromUtc.HasValue && coupon.ValidFromUtc.Value > DateTime.UtcNow)
            throw new InvalidOperationException("This coupon is not yet valid.");
        if (coupon.ValidUntilUtc.HasValue && coupon.ValidUntilUtc.Value < DateTime.UtcNow)
            throw new InvalidOperationException("This coupon has expired.");
        if (coupon.MaxTotalUses.HasValue && coupon.CurrentUses >= coupon.MaxTotalUses.Value)
            throw new InvalidOperationException("This coupon has reached its total usage limit.");

        if (coupon.FirstBookingOnly)
        {
            var hasAnyPriorPaidBooking = await _db.Bookings
                .AnyAsync(b => b.CustomerId == customer.Id
                               && b.PaymentStatus == PaymentStatus.Paid
                               && b.Id != booking.Id, ct);
            if (hasAnyPriorPaidBooking)
                throw new InvalidOperationException("This coupon is only valid for your first booking.");
        }

        if (booking.TotalAmount < coupon.MinOrderAmount)
            throw new InvalidOperationException($"Minimum order of \u20b9{coupon.MinOrderAmount} required.");

        if (coupon.MaxUsesPerCustomer.HasValue)
        {
            var usedByCustomer = await _db.CouponRedemptions
                .CountAsync(r => r.CouponId == coupon.Id && r.CustomerId == customer.Id, ct);
            if (usedByCustomer >= coupon.MaxUsesPerCustomer.Value)
                throw new InvalidOperationException("You have already used this coupon the maximum number of times.");
        }

        var original = booking.OriginalAmount > 0 ? booking.OriginalAmount : booking.TotalAmount;
        decimal discount = coupon.DiscountType == CouponDiscountType.Percentage
            ? Math.Round(original * (coupon.DiscountValue / 100m), 2)
            : coupon.DiscountValue;

        if (coupon.DiscountType == CouponDiscountType.Percentage && coupon.MaxDiscountAmount.HasValue)
            discount = Math.Min(discount, coupon.MaxDiscountAmount.Value);

        if (discount > original) discount = original;
        var newAmount = Math.Round(original - discount, 2);

        booking.OriginalAmount = original;
        booking.DiscountAmount = discount;
        booking.TotalAmount = newAmount;
        booking.AppliedCouponId = coupon.Id;
        booking.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return new ApplyCouponResponse(coupon.Code, discount, original, newAmount);
    }

    public async Task RemoveFromBookingAsync(Guid customerUserId, Guid bookingId, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.UserId == customerUserId, ct)
            ?? throw new InvalidOperationException("Customer not found.");

        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId && b.CustomerId == customer.Id, ct)
            ?? throw new InvalidOperationException("Booking not found.");

        if (booking.PaymentStatus == PaymentStatus.Paid)
            throw new InvalidOperationException("Cannot remove coupon from a paid booking.");
        if (!booking.DiscountAmount.HasValue)
            throw new InvalidOperationException("No coupon currently applied.");

        booking.TotalAmount = booking.OriginalAmount;
        booking.DiscountAmount = null;
        booking.OriginalAmount = 0;
        booking.AppliedCouponId = null;
        booking.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
    }

    public async Task<CouponStatsDto> GetStatsAsync(DateTime? fromUtc, DateTime? toUtc, CancellationToken ct = default)
    {
        var q = _db.CouponRedemptions.AsQueryable();
        if (fromUtc.HasValue) q = q.Where(r => r.CreatedAtUtc >= fromUtc.Value);
        if (toUtc.HasValue)   q = q.Where(r => r.CreatedAtUtc <  toUtc.Value);

        var totalDiscount = await q.SumAsync(r => (decimal?)r.DiscountApplied, ct) ?? 0m;
        var totalRedeemed = await q.CountAsync(ct);

        var top = await q
            .GroupBy(r => r.CouponId)
            .Select(g => new { CouponId = g.Key, Uses = g.Count() })
            .OrderByDescending(x => x.Uses)
            .FirstOrDefaultAsync(ct);

        string? topCode = null;
        int topUses = 0;
        if (top != null)
        {
            topCode = await _db.Coupons.Where(c => c.Id == top.CouponId)
                                       .Select(c => c.Code)
                                       .FirstOrDefaultAsync(ct);
            topUses = top.Uses;
        }

        return new CouponStatsDto(totalDiscount, totalRedeemed, topCode, topUses);
    }

    private static CouponDto ToDto(Coupon c) =>
        new(c.Id, c.Code, c.Description, c.DiscountType.ToString(),
            c.DiscountValue, c.MaxDiscountAmount, c.MinOrderAmount,
            c.ValidFromUtc, c.ValidUntilUtc, c.MaxTotalUses,
            c.CurrentUses, c.MaxUsesPerCustomer, c.IsActive, c.CreatedAtUtc,
            c.FirstBookingOnly);
}