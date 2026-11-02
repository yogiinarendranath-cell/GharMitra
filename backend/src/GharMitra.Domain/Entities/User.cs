using GharMitra.Domain.Common;
using GharMitra.Domain.Enums;

namespace GharMitra.Domain.Entities;

public class User : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;

    // NEW: OTP Verification Fields
    public bool IsEmailVerified { get; set; } = false;
    public string? OtpCode { get; set; }
    public DateTime? OtpExpiryUtc { get; set; }

    public Customer? Customer { get; set; }
    public Professional? Professional { get; set; }
}