using GharMitra.Domain.Common;

namespace GharMitra.Domain.Entities;

public class Professional : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string City { get; set; } = string.Empty;
    public bool IsVerified { get; set; }
    public bool IsAvailable { get; set; } = true;
    public decimal Rating { get; set; }
    public int TotalJobs { get; set; }

    public ICollection<BookingAssignment> Assignments { get; set; } = new List<BookingAssignment>();
}