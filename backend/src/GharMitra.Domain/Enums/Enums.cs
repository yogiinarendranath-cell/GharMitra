namespace GharMitra.Domain.Enums;

public enum UserRole
{
    Customer = 1,
    Professional = 2,
    Admin = 3
}

public enum BookingStatus
{
    Pending = 0,
    Assigned = 1,
    Accepted = 2,
    InProgress = 3,
    Completed = 4,
    Cancelled = 5
}

public enum PaymentStatus
{
    Unpaid = 0,
    Paid = 1,
    Refunded = 2
}