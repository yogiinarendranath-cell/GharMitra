using GharMitra.Application.Common.Notifications;
using Microsoft.AspNetCore.SignalR;

namespace GharMitra.Api.Hubs;

public class BookingNotifier : IBookingNotifier
{
    private readonly IHubContext<BookingHub> _hub;

    public BookingNotifier(IHubContext<BookingHub> hub)
    {
        _hub = hub;
    }

    public async Task NotifyAsync(BookingEventType eventType, BookingNotificationDto dto, CancellationToken ct = default)
    {
        var method = eventType switch
        {
            BookingEventType.Created   => "BookingCreated",
            BookingEventType.Assigned  => "BookingAssigned",
            BookingEventType.Accepted  => "BookingAccepted",
            BookingEventType.Cancelled => "BookingCancelled",
            _ => "BookingUpdated"
        };

        await _hub.Clients.Group($"customer:{dto.CustomerUserId}").SendAsync(method, dto, ct);
        await _hub.Clients.Group("admins").SendAsync(method, dto, ct);

        if (dto.ProfessionalUserId.HasValue)
            await _hub.Clients.Group($"professional:{dto.ProfessionalUserId}").SendAsync(method, dto, ct);
    }
}