using GharMitra.Domain.Enums;

namespace GharMitra.Application.Bookings;

public record CreateBookingRequest(
    Guid ServiceId,
    DateTime ScheduledStartUtc,
    int DurationMinutes,
    string AddressLine,
    string City,
    string? Pincode,
    string? Notes);

public record BookingDto(
    Guid Id,
    string BookingNumber,
    string ServiceName,
    DateTime ScheduledStartUtc,
    int DurationMinutes,
    string AddressLine,
    string City,
    decimal TotalAmount,
    string Status,
    string? ProfessionalName);

public record AssignBookingRequest(Guid ProfessionalId);

public record AdminProfessionalDto(Guid Id, string FullName, string City, bool IsVerified, bool IsAvailable, decimal Rating);