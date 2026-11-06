using GharMitra.Domain.Common;

namespace GharMitra.Domain.Entities;

public class Customer : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string City { get; set; } = string.Empty;
    public string? DefaultAddress { get; set; }

    
    // Referral fields
    public string? ReferralCode { get; set; }
    public bool HasBeenReferred { get; set; }

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}