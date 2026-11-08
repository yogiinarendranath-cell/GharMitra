using GharMitra.Application.Common.Interfaces;
using GharMitra.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Application.Professionals;

public class ProfessionalVerificationService : IProfessionalVerificationService
{
    private readonly IApplicationDbContext _db;
    public ProfessionalVerificationService(IApplicationDbContext db) => _db = db;

    public async Task<VerificationStatusDto> SubmitAsync(Guid userId, SubmitVerificationRequest req, CancellationToken ct = default)
    {
        var pro = await _db.Professionals.FirstOrDefaultAsync(p => p.UserId == userId, ct)
            ?? throw new InvalidOperationException("Professional profile not found.");

        if (pro.VerificationStatus == VerificationStatus.Verified)
            throw new InvalidOperationException("Already verified.");

        if (string.IsNullOrWhiteSpace(req.IdProofUrl) || string.IsNullOrWhiteSpace(req.SelfieUrl))
            throw new InvalidOperationException("Both ID proof and selfie are required.");

        pro.IdProofType = req.IdProofType?.Trim();
        pro.IdProofUrl = req.IdProofUrl.Trim();
        pro.SelfieUrl = req.SelfieUrl.Trim();
        pro.VerificationStatus = VerificationStatus.UnderReview;
        pro.RejectionReason = null;
        pro.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return MapToDto(pro);
    }

    public async Task<VerificationStatusDto> GetStatusAsync(Guid userId, CancellationToken ct = default)
    {
        var pro = await _db.Professionals.FirstOrDefaultAsync(p => p.UserId == userId, ct)
            ?? throw new InvalidOperationException("Professional profile not found.");
        return MapToDto(pro);
    }

    public async Task<List<VerificationStatusDto>> GetQueueAsync(CancellationToken ct = default)
    {
        return await _db.Professionals
            .Where(p => p.VerificationStatus == VerificationStatus.UnderReview)
            .Select(p => new VerificationStatusDto(
                p.Id, p.VerificationStatus.ToString(), p.IdProofType, p.IdProofUrl,
                p.SelfieUrl, p.RejectionReason, p.UpdatedAtUtc))
            .ToListAsync(ct);
    }

    public async Task<VerificationStatusDto> ApproveAsync(Guid professionalId, Guid adminUserId, CancellationToken ct = default)
    {
        var pro = await _db.Professionals.FirstOrDefaultAsync(p => p.Id == professionalId, ct)
            ?? throw new InvalidOperationException("Professional not found.");

        if (pro.VerificationStatus != VerificationStatus.UnderReview)
            throw new InvalidOperationException($"Cannot approve a professional in status {pro.VerificationStatus}.");

        pro.VerificationStatus = VerificationStatus.Verified;
        pro.IsVerified = true;
        pro.VerifiedAtUtc = DateTime.UtcNow;
        pro.VerificationNotes = $"Approved by admin {adminUserId} on {DateTime.UtcNow:yyyy-MM-dd}";
        pro.RejectionReason = null;
        pro.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return MapToDto(pro);
    }

    public async Task<VerificationStatusDto> RejectAsync(Guid professionalId, Guid adminUserId, string reason, CancellationToken ct = default)
    {
        var pro = await _db.Professionals.FirstOrDefaultAsync(p => p.Id == professionalId, ct)
            ?? throw new InvalidOperationException("Professional not found.");

        if (pro.VerificationStatus != VerificationStatus.UnderReview)
            throw new InvalidOperationException($"Cannot reject a professional in status {pro.VerificationStatus}.");

        pro.VerificationStatus = VerificationStatus.Rejected;
        pro.IsVerified = false;
        pro.RejectionReason = reason?.Trim() ?? "No reason given";
        pro.VerificationNotes = $"Rejected by admin {adminUserId} on {DateTime.UtcNow:yyyy-MM-dd}";
        pro.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return MapToDto(pro);
    }

    private static VerificationStatusDto MapToDto(Domain.Entities.Professional pro) =>
        new(pro.Id, pro.VerificationStatus.ToString(), pro.IdProofType, pro.IdProofUrl,
            pro.SelfieUrl, pro.RejectionReason, pro.UpdatedAtUtc);
}