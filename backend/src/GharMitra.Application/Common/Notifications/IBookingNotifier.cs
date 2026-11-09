namespace GharMitra.Application.Common.Notifications;

public enum BookingEventType { Created, Assigned, Accepted, Cancelled, Updated }

public record BookingNotificationDto(
    Guid BookingId,
    string BookingNumber,
    string ServiceName,
    string Status,
    string AddressLine,
    string City,
    decimal TotalAmount,
    DateTime ScheduledStartUtc,
    string? ProfessionalName,
    Guid CustomerUserId,
    Guid? ProfessionalUserId,
    DateTime ChangedAtUtc);

public interface IBookingNotifier
{
    Task NotifyAsync(BookingEventType eventType, BookingNotificationDto dto, CancellationToken ct = default);
}