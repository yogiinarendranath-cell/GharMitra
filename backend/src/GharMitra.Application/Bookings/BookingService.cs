using GharMitra.Application.Common.Interfaces;
using GharMitra.Domain.Entities;
using GharMitra.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Application.Bookings;

public class BookingService : IBookingService
{
    private readonly IApplicationDbContext _db;
    public BookingService(IApplicationDbContext db) => _db = db;

    public async Task<BookingDto> CreateAsync(Guid customerUserId, CreateBookingRequest r, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.UserId == customerUserId, ct)
            ?? throw new InvalidOperationException("Customer profile not found.");

        var service = await _db.Services.FirstOrDefaultAsync(s => s.Id == r.ServiceId && s.IsActive, ct)
            ?? throw new InvalidOperationException("Service not found or inactive.");

        if (r.ScheduledStartUtc < DateTime.UtcNow.AddMinutes(-5))
            throw new InvalidOperationException("Scheduled start time must be in the future.");

        var duration = r.DurationMinutes > 0 ? r.DurationMinutes : service.DurationMinutes;
        var units = Math.Max(1, (int)Math.Ceiling(duration / (double)Math.Max(service.DurationMinutes, 30)));
        var total = Math.Round(service.BasePrice * units, 2);

        var booking = new Booking
        {
            BookingNumber = $"GM-{DateTime.UtcNow:yyMMddHHmmss}-{Random.Shared.Next(100, 999)}",
            CustomerId = customer.Id,
            ServiceId = service.Id,
            ScheduledStartUtc = r.ScheduledStartUtc.ToUniversalTime(),
            DurationMinutes = duration,
            AddressLine = r.AddressLine.Trim(),
            City = r.City.Trim(),
            Pincode = r.Pincode?.Trim(),
            Notes = r.Notes?.Trim(),
            TotalAmount = total,
            Status = BookingStatus.Pending
        };

        _db.Bookings.Add(booking);
        await _db.SaveChangesAsync(ct);

        return new BookingDto(booking.Id, booking.BookingNumber, service.Name,
            booking.ScheduledStartUtc, booking.DurationMinutes, booking.AddressLine,
            booking.City, booking.TotalAmount, booking.Status.ToString(), booking.PaymentStatus.ToString(), null);
    }

    public async Task<List<BookingDto>> GetMyAsync(Guid customerUserId, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.UserId == customerUserId, ct)
            ?? throw new InvalidOperationException("Customer profile not found.");

        return await _db.Bookings
            .Where(b => b.CustomerId == customer.Id)
            .OrderByDescending(b => b.CreatedAtUtc)
            .Select(b => new BookingDto(
                b.Id, b.BookingNumber, b.Service.Name,
                b.ScheduledStartUtc, b.DurationMinutes, b.AddressLine, b.City,
                b.TotalAmount, b.Status.ToString(), b.PaymentStatus.ToString(),
                b.Assignment == null ? null : b.Assignment.Professional.User.FullName))
            .ToListAsync(ct);
    }

    public async Task<List<BookingDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.Bookings
            .OrderByDescending(b => b.CreatedAtUtc)
            .Take(200)
            .Select(b => new BookingDto(
                b.Id, b.BookingNumber, b.Service.Name,
                b.ScheduledStartUtc, b.DurationMinutes, b.AddressLine, b.City,
                b.TotalAmount, b.Status.ToString(), b.PaymentStatus.ToString(),
                b.Assignment == null ? null : b.Assignment.Professional.User.FullName))
            .ToListAsync(ct);
    }

    public async Task AssignAsync(Guid bookingId, Guid professionalId, CancellationToken ct = default)
    {
        var booking = await _db.Bookings
            .Include(b => b.Assignment)
            .FirstOrDefaultAsync(b => b.Id == bookingId, ct)
            ?? throw new InvalidOperationException("Booking not found.");

        if (booking.Assignment is not null)
            throw new InvalidOperationException("Booking already assigned.");

        if (booking.Status != BookingStatus.Pending)
            throw new InvalidOperationException($"Cannot assign a booking in status {booking.Status}.");
        
        if (booking.PaymentStatus != PaymentStatus.Paid)
            throw new InvalidOperationException("Cannot assign a booking that has not been paid for.");

        var pro = await _db.Professionals.FirstOrDefaultAsync(p => p.Id == professionalId, ct)
            ?? throw new InvalidOperationException("Professional not found.");

        if (!pro.IsVerified)
            throw new InvalidOperationException("Professional is not verified. Verify the profile first.");

        _db.BookingAssignments.Add(new BookingAssignment
        {
            BookingId = booking.Id,
            ProfessionalId = pro.Id
        });

        booking.Status = BookingStatus.Assigned;
        booking.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
    }

    public async Task<BookingDto> CancelAsync(Guid customerUserId, Guid bookingId, string? reason, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.UserId == customerUserId, ct)
            ?? throw new InvalidOperationException("Customer profile not found.");

        var booking = await _db.Bookings
            .Include(b => b.Service)
            .Include(b => b.Assignment).ThenInclude(a => a!.Professional).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(b => b.Id == bookingId && b.CustomerId == customer.Id, ct)
            ?? throw new InvalidOperationException("Booking not found.");

        if (booking.Status is BookingStatus.Completed or BookingStatus.Cancelled)
            throw new InvalidOperationException($"Cannot cancel a booking in status {booking.Status}.");

        booking.Status = BookingStatus.Cancelled;
        booking.CancelledAtUtc = DateTime.UtcNow;
        booking.CancellationReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        booking.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return new BookingDto(
            booking.Id, booking.BookingNumber, booking.Service.Name,
            booking.ScheduledStartUtc, booking.DurationMinutes, booking.AddressLine, booking.City,
            booking.TotalAmount, booking.Status.ToString(), booking.PaymentStatus.ToString(),
            booking.Assignment?.Professional.User.FullName);
    }

    public Task<List<AdminProfessionalDto>> GetProfessionalsAsync(CancellationToken ct = default) =>
        _db.Professionals
            .Select(p => new AdminProfessionalDto(
                p.Id, p.User.FullName, p.City, p.IsVerified, p.IsAvailable, p.Rating))
            .ToListAsync(ct);
}

