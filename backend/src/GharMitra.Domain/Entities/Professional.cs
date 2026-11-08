using GharMitra.Domain.Common;
using GharMitra.Domain.Enums;

namespace GharMitra.Domain.Entities;

public class Professional : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string City { get; set; } = string.Empty;
    public bool IsVerified { get; set; }
    // Verification workflow
    public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Pending;
    public string? IdProofType { get; set; }        // "Aadhaar", "PAN", "VoterID", "Passport"
    public string? IdProofUrl { get; set; }         // uploaded file path
    public string? SelfieUrl { get; set; }          // uploaded selfie path
    public string? RejectionReason { get; set; }    // set when admin rejects
    public DateTime? VerifiedAtUtc { get; set; }
    public string? VerificationNotes { get; set; }
    public bool IsAvailable { get; set; } = true;
    public decimal Rating { get; set; }
    public int TotalJobs { get; set; }
    
    // NEW: Location tracking
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DateTime? LastLocationUpdateUtc { get; set; }

    public ICollection<BookingAssignment> Assignments { get; set; } = new List<BookingAssignment>();
}