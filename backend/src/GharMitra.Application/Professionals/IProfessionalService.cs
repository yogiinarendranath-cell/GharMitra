namespace GharMitra.Application.Professionals;

public interface IProfessionalService
{
    Task<ProfessionalProfileDto> GetMyProfileAsync(Guid userId, CancellationToken ct = default);
    Task<List<AssignmentDto>> GetMyAssignmentsAsync(Guid userId, CancellationToken ct = default);
    Task<AssignmentDto> AcceptAsync(Guid userId, Guid assignmentId, CancellationToken ct = default);
    Task VerifyAsync(Guid professionalId, string? notes, CancellationToken ct = default);
}