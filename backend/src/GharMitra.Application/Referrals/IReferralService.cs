namespace GharMitra.Application.Referrals;

public interface IReferralService
{
    Task<MyReferralCodeDto> GetMyReferralCodeAsync(Guid customerUserId, CancellationToken ct = default);
    Task<MyReferralsListDto> GetMyReferralsAsync(Guid customerUserId, CancellationToken ct = default);
    Task<AcceptReferralResponse> AcceptReferralAsync(Guid newCustomerUserId, AcceptReferralRequest request, CancellationToken ct = default);
    Task<List<AdminReferralListDto>> GetAllForAdminAsync(CancellationToken ct = default);
    Task<ReferralAdminStatsDto> GetAdminStatsAsync(CancellationToken ct = default);
}