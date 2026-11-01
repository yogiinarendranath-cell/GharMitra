using GharMitra.Domain.Common;

namespace GharMitra.Domain.Entities;

public class Review : BaseEntity
{
    public Guid BookingId { get; set; }
    public Booking Booking { get; set; } = null!;
    public int Rating { get; set; }          // 1..5
    public string? Comment { get; set; }
}