namespace GharMitra.Application.Professionals;

public record SubmitVerificationRequest(string IdProofType, string IdProofUrl, string SelfieUrl);

public record VerificationStatusDto(
    Guid ProfessionalId,
    string Status,
    string? IdProofType,
    string? IdProofUrl,
    string? SelfieUrl,
    string? RejectionReason,
    DateTime? SubmittedAtUtc);

public interface IProfessionalVerificationService
{
    Task<VerificationStatusDto> SubmitAsync(Guid userId, SubmitVerificationRequest req, CancellationToken ct = default);
    Task<VerificationStatusDto> GetStatusAsync(Guid userId, CancellationToken ct = default);
    Task<List<VerificationStatusDto>> GetQueueAsync(CancellationToken ct = default);
    Task<VerificationStatusDto> ApproveAsync(Guid professionalId, Guid adminUserId, CancellationToken ct = default);
    Task<VerificationStatusDto> RejectAsync(Guid professionalId, Guid adminUserId, string reason, CancellationToken ct = default);
}