using GharMitra.Domain.Common;

namespace GharMitra.Domain.Entities;

public class BookingAssignment : BaseEntity
{
    public Guid BookingId { get; set; }
    public Booking Booking { get; set; } = null!;
    public Guid ProfessionalId { get; set; }
    public Professional Professional { get; set; } = null!;
    public DateTime AssignedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? AcceptedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
}