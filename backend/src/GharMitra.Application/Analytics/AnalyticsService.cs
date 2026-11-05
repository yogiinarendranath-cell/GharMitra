using GharMitra.Application.Common.Interfaces;
using GharMitra.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Application.Analytics;

public class AnalyticsService : IAnalyticsService
{
    private readonly IApplicationDbContext _db;
    public AnalyticsService(IApplicationDbContext db) => _db = db;

    public async Task<AnalyticsDto> GetAnalyticsAsync(CancellationToken ct = default)
    {
        var bookings = await _db.Bookings
            .Include(b => b.Customer).ThenInclude(c => c.User)
            .Include(b => b.Service)
            .Include(b => b.Assignment).ThenInclude(a => a!.Professional).ThenInclude(p => p.User)
            .ToListAsync(ct);

        var totalBookings = bookings.Count;
        var paidBookings = bookings.Count(b => b.PaymentStatus == PaymentStatus.Paid);
        var pendingBookings = bookings.Count(b => b.Status == BookingStatus.Pending);
        var assignedBookings = bookings.Count(b => b.Status == BookingStatus.Assigned);
        var acceptedBookings = bookings.Count(b => b.Status == BookingStatus.Accepted);
        var completedBookings = bookings.Count(b => b.Status == BookingStatus.Completed);
        var cancelledBookings = bookings.Count(b => b.Status == BookingStatus.Cancelled);

        var totalRevenue = bookings
            .Where(b => b.PaymentStatus == PaymentStatus.Paid)
            .Sum(b => b.TotalAmount);

        var cancellationRate = totalBookings > 0
            ? Math.Round((decimal)cancelledBookings / totalBookings * 100, 1)
            : 0;

        var totalCustomers = await _db.Customers.CountAsync(ct);
        var totalProfessionals = await _db.Professionals.CountAsync(ct);
        var activeProfessionals = await _db.Professionals.CountAsync(p => p.IsVerified && p.IsAvailable, ct);

        var kpis = new KpiDto(
            totalRevenue,
            totalBookings,
            paidBookings,
            pendingBookings,
            assignedBookings,
            acceptedBookings,
            completedBookings,
            cancelledBookings,
            cancellationRate,
            totalCustomers,
            totalProfessionals,
            activeProfessionals);

        // Last 7 days revenue
        var today = DateTime.UtcNow.Date;
        var last7Days = Enumerable.Range(0, 7)
            .Select(i => today.AddDays(-i))
            .Reverse()
            .ToList();

        var last7DaysRevenue = last7Days
            .Select(day => new DailyRevenueDto(
                day,
                bookings.Where(b => b.PaymentStatus == PaymentStatus.Paid && b.CreatedAtUtc.Date == day)
                        .Sum(b => b.TotalAmount),
                bookings.Count(b => b.CreatedAtUtc.Date == day)))
            .ToList();

        // Top professionals — defensive against null Assignment or Professional
        var topProfessionals = bookings
            .Where(b => b.Assignment?.Professional != null && b.PaymentStatus == PaymentStatus.Paid)
            .GroupBy(b => b.Assignment!.Professional)
            .Select(g => new TopProfessionalDto(
                g.Key.Id,
                g.Key.User?.FullName ?? "Unknown",
                g.Key.City ?? "Unknown",
                g.Count(),
                g.Sum(b => b.TotalAmount),
                g.Key.Rating,
                g.Key.IsVerified))
            .OrderByDescending(p => p.TotalRevenue)
            .Take(5)
            .ToList();

        // Top services — defensive against null Service
        var topServices = bookings
            .Where(b => b.Service != null)
            .GroupBy(b => b.Service.Name)
            .Select(g => new TopServiceDto(
                g.Key,
                g.Count(),
                g.Sum(b => b.TotalAmount)))
            .OrderByDescending(s => s.BookingCount)
            .Take(5)
            .ToList();

        // Recent bookings — defensive against all nulls
        var recentBookings = bookings
            .OrderByDescending(b => b.CreatedAtUtc)
            .Take(10)
            .Select(b => new RecentBookingDto(
                b.BookingNumber ?? "—",
                b.Service?.Name ?? "—",
                b.Customer?.User?.FullName ?? "—",
                b.Assignment?.Professional?.User?.FullName,
                b.TotalAmount,
                b.Status.ToString(),
                b.PaymentStatus.ToString(),
                b.CreatedAtUtc))
            .ToList();

        return new AnalyticsDto(kpis, last7DaysRevenue, topProfessionals, topServices, recentBookings);
    }
}