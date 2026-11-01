using GharMitra.Domain.Common;
using GharMitra.Domain.Enums;

namespace GharMitra.Domain.Entities;

public class Booking : BaseEntity
{
    public string BookingNumber { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public Guid ServiceId { get; set; }
    public Service Service { get; set; } = null!;

    public DateTime ScheduledStartUtc { get; set; }
    public int DurationMinutes { get; set; }
    public string AddressLine { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? Pincode { get; set; }
    public string? Notes { get; set; }

    public decimal TotalAmount { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Pending;

    public BookingAssignment? Assignment { get; set; }
}