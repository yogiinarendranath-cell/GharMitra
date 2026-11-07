using GharMitra.Application.Common.Interfaces;
using GharMitra.Application.Common.Notifications;
using GharMitra.Domain.Entities;
using GharMitra.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Application.Bookings;

public class BookingService : IBookingService
{
    private readonly IApplicationDbContext _db;
    private readonly IBookingNotifier _notifier;
    private readonly IPaymentGatewayService _payments;

    public BookingService(
        IApplicationDbContext db,
        IBookingNotifier notifier,
        IPaymentGatewayService payments)
    {
        _db = db;
        _notifier = notifier;
        _payments = payments;
    }

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

        await _notifier.NotifyAsync(BookingEventType.Created, new BookingNotificationDto(
            booking.Id, booking.BookingNumber, service.Name, booking.Status.ToString(),
            booking.AddressLine, booking.City, booking.TotalAmount, booking.ScheduledStartUtc,
            null, customerUserId, null, DateTime.UtcNow), ct);

        return new BookingDto(booking.Id, booking.BookingNumber, service.Name,
            booking.ScheduledStartUtc, booking.DurationMinutes, booking.AddressLine,
            booking.City, booking.TotalAmount, booking.Status.ToString(), booking.PaymentStatus.ToString(), null, null, null);
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
                b.Assignment == null ? null : b.Assignment.Professional.User.FullName,
                b.Assignment == null ? null : b.Assignment.Professional.Latitude,
                b.Assignment == null ? null : b.Assignment.Professional.Longitude))
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
                b.Assignment == null ? null : b.Assignment.Professional.User.FullName,
                b.Assignment == null ? null : b.Assignment.Professional.Latitude,
                b.Assignment == null ? null : b.Assignment.Professional.Longitude))
            .ToListAsync(ct);
    }

    public async Task AssignAsync(Guid bookingId, Guid professionalId, CancellationToken ct = default)
    {
        var booking = await _db.Bookings
            .Include(b => b.Customer)
            .Include(b => b.Service)
            .Include(b => b.Assignment)
            .FirstOrDefaultAsync(b => b.Id == bookingId, ct)
            ?? throw new InvalidOperationException("Booking not found.");

        if (booking.Assignment is not null)
            throw new InvalidOperationException("Booking already assigned.");
        if (booking.Status != BookingStatus.Pending)
            throw new InvalidOperationException($"Cannot assign a booking in status {booking.Status}.");
        if (booking.PaymentStatus != PaymentStatus.Paid)
            throw new InvalidOperationException("Cannot assign a booking that has not been paid for.");

        var pro = await _db.Professionals.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == professionalId, ct)
            ?? throw new InvalidOperationException("Professional not found.");
        if (!pro.IsVerified)
            throw new InvalidOperationException("Professional is not verified. Verify the profile first.");

        _db.BookingAssignments.Add(new BookingAssignment { BookingId = booking.Id, ProfessionalId = pro.Id });
        booking.Status = BookingStatus.Assigned;
        booking.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        await _notifier.NotifyAsync(BookingEventType.Assigned, new BookingNotificationDto(
            booking.Id, booking.BookingNumber, booking.Service.Name, booking.Status.ToString(),
            booking.AddressLine, booking.City, booking.TotalAmount, booking.ScheduledStartUtc,
            pro.User.FullName, booking.Customer.UserId, pro.UserId, DateTime.UtcNow), ct);
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

        await _notifier.NotifyAsync(BookingEventType.Cancelled, new BookingNotificationDto(
            booking.Id, booking.BookingNumber, booking.Service.Name, booking.Status.ToString(),
            booking.AddressLine, booking.City, booking.TotalAmount, booking.ScheduledStartUtc,
            booking.Assignment?.Professional.User.FullName, customerUserId,
            booking.Assignment?.Professional.UserId, DateTime.UtcNow), ct);

        return new BookingDto(
            booking.Id, booking.BookingNumber, booking.Service.Name,
            booking.ScheduledStartUtc, booking.DurationMinutes, booking.AddressLine, booking.City,
            booking.TotalAmount, booking.Status.ToString(), booking.PaymentStatus.ToString(),
            booking.Assignment?.Professional.User.FullName,
            booking.Assignment?.Professional.Latitude,
            booking.Assignment?.Professional.Longitude);
    }

    public async Task<RefundResultDto> RefundAsync(
        Guid customerUserId,
        Guid bookingId,
        string reason,
        CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.UserId == customerUserId, ct)
            ?? throw new InvalidOperationException("Customer not found.");

        var booking = await _db.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId && b.CustomerId == customer.Id, ct)
            ?? throw new InvalidOperationException("Booking not found.");

        if (booking.PaymentStatus != PaymentStatus.Paid)
            return new RefundResultDto(false, 0, "not_paid",
                "Cannot refund a booking that hasn't been paid.");

        if (booking.RefundedAtUtc.HasValue)
            return new RefundResultDto(false, 0, "already_refunded",
                $"This booking was already refunded on {booking.RefundedAtUtc.Value:MMM dd, yyyy}.");

        var hoursUntilService = (booking.ScheduledStartUtc - DateTime.UtcNow).TotalHours;

        decimal refundPercent;
        string refundReasonLabel;

        if (hoursUntilService >= 24)
        {
            refundPercent = 1.0m;
            refundReasonLabel = "Full refund (more than 24h before service)";
        }
        else if (hoursUntilService > 0)
        {
            refundPercent = 0.5m;
            refundReasonLabel = "50% refund (less than 24h before service)";
        }
        else
        {
            return new RefundResultDto(false, 0, "service_started",
                "Cannot refund after the service has started. Contact support.");
        }

        var refundAmount = Math.Round(booking.TotalAmount * refundPercent, 2);

        if (string.IsNullOrEmpty(booking.RazorpayPaymentId))
            return new RefundResultDto(false, 0, "no_payment_id",
                "No payment record found for this booking.");

        var refundId = await _payments.RefundAsync(
            booking.RazorpayPaymentId,
            refundAmount,
            reason,
            ct);

        if (refundId == null)
            return new RefundResultDto(false, 0, "razorpay_failed",
                "Refund could not be processed by Razorpay. Please contact support.");

        booking.RefundAmount = refundAmount;
        booking.RefundedAtUtc = DateTime.UtcNow;
        booking.RefundReason = $"{reason} ({refundReasonLabel}) — Razorpay refund ID: {refundId}";
        booking.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return new RefundResultDto(true, refundAmount, "success",
            $"₹{refundAmount} refunded successfully. {refundReasonLabel}.");
    }

    public Task<List<AdminProfessionalDto>> GetProfessionalsAsync(CancellationToken ct = default) =>
        _db.Professionals
            .Select(p => new AdminProfessionalDto(p.Id, p.User.FullName, p.City, p.IsVerified, p.IsAvailable, p.Rating))
            .ToListAsync(ct);
}