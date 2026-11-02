using GharMitra.Application.Common.Interfaces;
using GharMitra.Domain.Entities;
using GharMitra.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Api.Workers;

public class AutoDispatchWorker : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<AutoDispatchWorker> _logger;

    public AutoDispatchWorker(IServiceProvider services, ILogger<AutoDispatchWorker> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Auto Dispatch Worker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

                // Find paid bookings that are pending and don't have an assignment yet
                var pendingBookings = await db.Bookings
                    .Where(b => b.Status == BookingStatus.Pending 
                             && b.PaymentStatus == PaymentStatus.Paid 
                             && b.Assignment == null)
                    .ToListAsync(stoppingToken);

                if (pendingBookings.Any())
                {
                    var availablePros = await db.Professionals
                        .Include(p => p.User)
                        .Where(p => p.IsAvailable && p.IsVerified && p.Latitude != null && p.Longitude != null)
                        .ToListAsync(stoppingToken);

                    foreach (var booking in pendingBookings)
                    {
                        // For this MVP, if the booking has no lat/lng, we default to a central Pune location
                        double bLat = booking.Latitude ?? 18.5204; 
                        double bLng = booking.Longitude ?? 73.8567;

                        Professional? nearestPro = null;
                        double shortestDistance = double.MaxValue;

                        foreach (var pro in availablePros)
                        {
                            double distance = CalculateDistance(bLat, bLng, pro.Latitude!.Value, pro.Longitude!.Value);
                            if (distance < shortestDistance)
                            {
                                shortestDistance = distance;
                                nearestPro = pro;
                            }
                        }

                        if (nearestPro != null)
                        {
                            db.BookingAssignments.Add(new BookingAssignment
                            {
                                BookingId = booking.Id,
                                ProfessionalId = nearestPro.Id
                            });
                            booking.Status = BookingStatus.Assigned;
                            booking.UpdatedAtUtc = DateTime.UtcNow;
                            
                            _logger.LogInformation($"Auto-assigned booking {booking.BookingNumber} to {nearestPro.User.FullName} (Distance: {shortestDistance:F2} km)");
                            
                            // Optional: Send SignalR notification here!
                        }
                    }

                    await db.SaveChangesAsync(stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in AutoDispatchWorker");
            }

            // Wait 30 seconds before checking again
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }

    // Haversine Formula
    private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        var R = 6371; // Radius of Earth in km
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private static double ToRadians(double angle) => Math.PI * angle / 180.0;
}