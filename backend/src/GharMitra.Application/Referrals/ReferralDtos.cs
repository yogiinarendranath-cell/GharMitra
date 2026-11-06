namespace GharMitra.Application.Referrals;

// ───── Customer-facing DTOs ─────

public record MyReferralCodeDto(
    string ReferralCode,
    string ShareUrl,
    int SuccessfulReferrals,
    decimal TotalEarned);

public record MyReferralsListDto(
    string ReferralCode,
    string ShareUrl,
    int TotalShared,
    int TotalRedeemed,
    decimal TotalEarned,
    List<ReferralItemDto> Items);

public record ReferralItemDto(
    string ReferralCode,
    string? RefereeName,
    string? RefereeEmail,
    bool IsRedeemed,
    DateTime? RedeemedAtUtc,
    decimal ReferrerReward,
    DateTime CreatedAtUtc);

// ───── Signup acceptance ─────

public record AcceptReferralRequest(
    string ReferralCode,
    string RefereeEmail);

public record AcceptReferralResponse(
    bool Success,
    string Message,
    decimal RefereeDiscount,
    decimal ReferrerReward);

// ───── Admin DTOs ─────

public record AdminReferralListDto(
    Guid Id,
    string ReferrerName,
    string ReferrerEmail,
    string ReferralCode,
    string? RefereeName,
    string? RefereeEmail,
    bool IsRedeemed,
    DateTime? RedeemedAtUtc,
    decimal ReferrerReward,
    DateTime CreatedAtUtc);

public record ReferralAdminStatsDto(
    int TotalReferrals,
    int RedeemedReferrals,
    decimal TotalRewardsPaid,
    List<TopReferrerDto> TopReferrers);

public record TopReferrerDto(
    string FullName,
    string ReferralCode,
    int SuccessfulReferrals,
    decimal TotalEarned);