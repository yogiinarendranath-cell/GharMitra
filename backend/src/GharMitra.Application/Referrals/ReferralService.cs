using GharMitra.Application.Common.Interfaces;
using GharMitra.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Application.Referrals;

public class ReferralService : IReferralService
{
    private readonly IApplicationDbContext _db;
    public ReferralService(IApplicationDbContext db) => _db = db;

    // ───── SAFEGUARDS (configuration) ─────
    private const int MaxReferralsPerHour = 3;
    private const int MaxReferralsPerMonth = 10;
    private static readonly string[] BlockedEmailDomains = new[]
    {
        "mailinator.com", "10minutemail.com", "guerrillamail.com",
        "tempmail.com", "yopmail.com", "throwawaymail.com",
        "temp-mail.org", "sharklasers.com", "getairmail.com"
    };

    // ───── CUSTOMER ENDPOINTS ─────

    public async Task<MyReferralCodeDto> GetMyReferralCodeAsync(Guid customerUserId, CancellationToken ct = default)
    {
        var customer = await _db.Customers
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.UserId == customerUserId, ct)
            ?? throw new InvalidOperationException("Customer not found.");

        if (string.IsNullOrEmpty(customer.ReferralCode))
        {
            customer.ReferralCode = await GenerateUniqueReferralCodeAsync(customer, ct);
            await _db.SaveChangesAsync(ct);
        }

        var successfulReferrals = await _db.Referrals
            .CountAsync(r => r.ReferrerCustomerId == customer.Id && r.IsRedeemed, ct);

        var totalEarned = await _db.Referrals
            .Where(r => r.ReferrerCustomerId == customer.Id && r.IsRedeemed)
            .SumAsync(r => (decimal?)r.ReferrerReward, ct) ?? 0m;

        return new MyReferralCodeDto(
            customer.ReferralCode,
            $"https://gharmitra-customer.vercel.app?ref={customer.ReferralCode}",
            successfulReferrals,
            totalEarned);
    }

    public async Task<MyReferralsListDto> GetMyReferralsAsync(Guid customerUserId, CancellationToken ct = default)
    {
        var customer = await _db.Customers
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.UserId == customerUserId, ct)
            ?? throw new InvalidOperationException("Customer not found.");

        if (string.IsNullOrEmpty(customer.ReferralCode))
        {
            customer.ReferralCode = await GenerateUniqueReferralCodeAsync(customer, ct);
            await _db.SaveChangesAsync(ct);
        }

        var referrals = await _db.Referrals
            .Include(r => r.RefereeCustomer)
            .ThenInclude(rc => rc.User)
            .Where(r => r.ReferrerCustomerId == customer.Id)
            .OrderByDescending(r => r.CreatedAtUtc)
            .ToListAsync(ct);

        var items = referrals.Select(r => new ReferralItemDto(
            r.ReferralCode,
            r.RefereeCustomer?.User?.FullName,
            r.RefereeEmail,
            r.IsRedeemed,
            r.RedeemedAtUtc,
            r.ReferrerReward,
            r.CreatedAtUtc)).ToList();

        var totalShared = referrals.Count;
        var totalRedeemed = referrals.Count(r => r.IsRedeemed);
        var totalEarned = referrals.Where(r => r.IsRedeemed).Sum(r => r.ReferrerReward);

        return new MyReferralsListDto(
            customer.ReferralCode,
            $"https://gharmitra-customer.vercel.app?ref={customer.ReferralCode}",
            totalShared,
            totalRedeemed,
            totalEarned,
            items);
    }

    // ───── SIGNUP ACCEPTANCE (with safeguards) ─────

    public async Task<AcceptReferralResponse> AcceptReferralAsync(
        Guid newCustomerUserId,
        AcceptReferralRequest request,
        CancellationToken ct = default)
    {
        var newCustomer = await _db.Customers
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.UserId == newCustomerUserId, ct)
            ?? throw new InvalidOperationException("Customer not found.");

        // ─── SAFEGUARD 1: Already referred? ───
        if (newCustomer.HasBeenReferred)
            return new AcceptReferralResponse(false, "This customer has already been referred.", 0, 0);

        // ─── Find referrer ───
        var normalizedCode = request.ReferralCode?.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(normalizedCode))
            return new AcceptReferralResponse(false, "Referral code is required.", 0, 0);

        var referrer = await _db.Customers
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.ReferralCode == normalizedCode, ct);

        if (referrer == null)
            return new AcceptReferralResponse(false, "Invalid referral code.", 0, 0);

        // ─── SAFEGUARD 2: Self-referral ───
        if (referrer.UserId == newCustomer.UserId)
            return new AcceptReferralResponse(false, "You cannot refer yourself.", 0, 0);

        // ─── SAFEGUARD 3: Disposable email domain ───
        var emailDomain = request.RefereeEmail?.Split('@').LastOrDefault()?.ToLowerInvariant();
        if (emailDomain != null && BlockedEmailDomains.Contains(emailDomain))
            return new AcceptReferralResponse(false, "Please use a valid email address to accept the referral.", 0, 0);

        // ─── SAFEGUARD 4: Rate limit — max 3 referrals per hour ───
        var oneHourAgo = DateTime.UtcNow.AddHours(-1);
        var recentCount = await _db.Referrals
            .CountAsync(r => r.ReferrerCustomerId == referrer.Id && r.CreatedAtUtc >= oneHourAgo, ct);
        if (recentCount >= MaxReferralsPerHour)
            return new AcceptReferralResponse(
                false,
                $"You've referred {MaxReferralsPerHour} friends in the last hour. Please wait before referring more.",
                0, 0);

        // ─── SAFEGUARD 5: Monthly cap — max 10 referrals per 30 days ───
        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
        var monthCount = await _db.Referrals
            .CountAsync(r => r.ReferrerCustomerId == referrer.Id && r.CreatedAtUtc >= thirtyDaysAgo, ct);
        if (monthCount >= MaxReferralsPerMonth)
            return new AcceptReferralResponse(
                false,
                $"You've reached your monthly referral limit ({MaxReferralsPerMonth}). Your limit resets every 30 days.",
                0, 0);

        // ─── All safeguards passed — create coupons + referral record ───

        var refereeCouponCode = GenerateUniqueCouponCode("REFER");
        var refereeCoupon = new Coupon
        {
            Code = refereeCouponCode,
            Description = $"Referral bonus — \u20b950 off your first booking",
            DiscountType = CouponDiscountType.FixedAmount,
            DiscountValue = 50m,
            MaxDiscountAmount = null,
            MinOrderAmount = 0m,
            ValidFromUtc = DateTime.UtcNow,
            ValidUntilUtc = DateTime.UtcNow.AddDays(90),
            MaxTotalUses = 1,
            CurrentUses = 0,
            MaxUsesPerCustomer = 1,
            FirstBookingOnly = true,
            IsActive = true,
        };
        _db.Coupons.Add(refereeCoupon);

        var referrerCouponCode = GenerateUniqueCouponCode("REFERREWARD");
        var referrerCoupon = new Coupon
        {
            Code = referrerCouponCode,
            Description = $"Referral reward — \u20b9100 off your next booking",
            DiscountType = CouponDiscountType.FixedAmount,
            DiscountValue = 100m,
            MaxDiscountAmount = null,
            MinOrderAmount = 0m,
            ValidFromUtc = DateTime.UtcNow,
            ValidUntilUtc = DateTime.UtcNow.AddDays(90),
            MaxTotalUses = 1,
            CurrentUses = 0,
            MaxUsesPerCustomer = 1,
            FirstBookingOnly = false,
            IsActive = true,
        };
        _db.Coupons.Add(referrerCoupon);

        // Save coupons first so they have IDs
        await _db.SaveChangesAsync(ct);

        // Create the referral record
        var referral = new Referral
        {
            ReferrerCustomerId = referrer.Id,
            RefereeCustomerId = newCustomer.Id,
            ReferralCode = normalizedCode,
            RefereeEmail = request.RefereeEmail,
            IsRedeemed = true,
            RedeemedAtUtc = DateTime.UtcNow,
            RefereeDiscount = 50m,
            ReferrerReward = 100m,
            RefereeCouponId = refereeCoupon.Id,
            ReferrerCouponId = referrerCoupon.Id,
        };
        _db.Referrals.Add(referral);

        // Mark customer as referred
        newCustomer.HasBeenReferred = true;

        await _db.SaveChangesAsync(ct);

        return new AcceptReferralResponse(
            true,
            $"Welcome! Your \u20b950 coupon ({refereeCouponCode}) is ready. Your friend earned \u20b9100 too.",
            50m,
            100m);
    }

    // ───── ADMIN ENDPOINTS ─────

    public async Task<List<AdminReferralListDto>> GetAllForAdminAsync(CancellationToken ct = default)
    {
        var referrals = await _db.Referrals
            .Include(r => r.ReferrerCustomer).ThenInclude(c => c.User)
            .Include(r => r.RefereeCustomer).ThenInclude(c => c!.User)
            .OrderByDescending(r => r.CreatedAtUtc)
            .Take(500)
            .ToListAsync(ct);

        return referrals.Select(r => new AdminReferralListDto(
            r.Id,
            r.ReferrerCustomer?.User?.FullName ?? "Unknown",
            r.ReferrerCustomer?.User?.Email ?? "unknown",
            r.ReferralCode,
            r.RefereeCustomer?.User?.FullName,
            r.RefereeEmail,
            r.IsRedeemed,
            r.RedeemedAtUtc,
            r.ReferrerReward,
            r.CreatedAtUtc)).ToList();
    }

    public async Task<ReferralAdminStatsDto> GetAdminStatsAsync(CancellationToken ct = default)
    {
        var totalReferrals = await _db.Referrals.CountAsync(ct);
        var redeemedReferrals = await _db.Referrals.CountAsync(r => r.IsRedeemed, ct);
        var totalRewardsPaid = await _db.Referrals
            .Where(r => r.IsRedeemed)
            .SumAsync(r => (decimal?)r.ReferrerReward, ct) ?? 0m;

        var topReferrers = await _db.Referrals
            .Where(r => r.IsRedeemed)
            .GroupBy(r => r.ReferrerCustomerId)
            .Select(g => new
            {
                CustomerId = g.Key,
                Count = g.Count(),
                TotalEarned = g.Sum(x => x.ReferrerReward)
            })
            .OrderByDescending(x => x.Count)
            .Take(10)
            .ToListAsync(ct);

        var topReferrerDtos = new List<TopReferrerDto>();
        foreach (var top in topReferrers)
        {
            var customer = await _db.Customers
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.Id == top.CustomerId, ct);
            
            if (customer != null)
            {
                topReferrerDtos.Add(new TopReferrerDto(
                    customer.User?.FullName ?? "Unknown",
                    customer.ReferralCode ?? "—",
                    top.Count,
                    top.TotalEarned));
            }
        }

        return new ReferralAdminStatsDto(
            totalReferrals,
            redeemedReferrals,
            totalRewardsPaid,
            topReferrerDtos);
    }

    // ───── HELPERS ─────

    private async Task<string> GenerateUniqueReferralCodeAsync(Customer customer, CancellationToken ct)
    {
        var fullName = customer.User?.FullName ?? "USER";
        var firstName = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "USER";
        
        var namePart = new string(firstName
            .ToUpperInvariant()
            .Where(char.IsLetterOrDigit)
            .ToArray());
        
        if (namePart.Length == 0) namePart = "USER";
        if (namePart.Length > 8) namePart = namePart.Substring(0, 8);

        for (int attempt = 0; attempt < 10; attempt++)
        {
            var randomPart = Guid.NewGuid().ToString("N").Substring(0, 4).ToUpperInvariant();
            var code = $"{namePart}-{randomPart}";
            
            var exists = await _db.Customers.AnyAsync(c => c.ReferralCode == code, ct);
            if (!exists) return code;
        }

        // Fallback (statistically impossible after 10 attempts)
        return $"REF-{Guid.NewGuid():N}".Substring(0, 12).ToUpperInvariant();
    }

    private static string GenerateUniqueCouponCode(string prefix)
    {
        var random = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpperInvariant();
        return $"{prefix}-{random}";
    }
}