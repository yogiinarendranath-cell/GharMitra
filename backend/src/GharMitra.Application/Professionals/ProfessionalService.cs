using GharMitra.Application.Common.Interfaces;
using GharMitra.Application.Common.Notifications;
using GharMitra.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Application.Professionals;

public class ProfessionalService : IProfessionalService
{
    private readonly IApplicationDbContext _db;
    private readonly IBookingNotifier _notifier;

    public ProfessionalService(IApplicationDbContext db, IBookingNotifier notifier)
    {
        _db = db;
        _notifier = notifier;
    }

    public async Task<ProfessionalProfileDto> GetMyProfileAsync(Guid userId, CancellationToken ct = default)
    {
        var p = await _db.Professionals.Include(x => x.User)
            .FirstOrDefaultAsync(x => x.UserId == userId, ct)
            ?? throw new InvalidOperationException("Professional profile not found.");

        return new ProfessionalProfileDto(
            p.Id, p.User.FullName, p.User.Email, p.User.PhoneNumber,
            p.City, p.IsVerified, p.IsAvailable, p.Rating, p.TotalJobs,
            p.VerifiedAtUtc, p.VerificationNotes);
    }

    public async Task<List<AssignmentDto>> GetMyAssignmentsAsync(Guid userId, CancellationToken ct = default)
    {
        var pro = await _db.Professionals.FirstOrDefaultAsync(x => x.UserId == userId, ct)
            ?? throw new InvalidOperationException("Professional profile not found.");

        return await _db.BookingAssignments
            .Where(a => a.ProfessionalId == pro.Id)
            .OrderByDescending(a => a.AssignedAtUtc)
            .Select(a => new AssignmentDto(
                a.Id, a.BookingId, a.Booking.BookingNumber,
                a.Booking.Service.Name,
                a.Booking.Customer.User.FullName,
                a.Booking.Customer.User.PhoneNumber,
                a.Booking.AddressLine, a.Booking.City, a.Booking.Pincode, a.Booking.Notes,
                a.Booking.ScheduledStartUtc, a.Booking.DurationMinutes, a.Booking.TotalAmount,
                a.Booking.Status.ToString(), a.AssignedAtUtc,
                a.AcceptedAtUtc, a.StartedAtUtc, a.CompletedAtUtc))
            .ToListAsync(ct);
    }

    public async Task<AssignmentDto> AcceptAsync(Guid userId, Guid assignmentId, CancellationToken ct = default)
    {
        var (pro, a) = await LoadForActionAsync(userId, assignmentId, ct);

        if (!pro.IsVerified)
            throw new InvalidOperationException("Profile not verified. Contact admin.");
        if (a.AcceptedAtUtc is not null)
            throw new InvalidOperationException("Assignment already accepted.");

        a.AcceptedAtUtc = DateTime.UtcNow;
        a.Booking.Status = BookingStatus.Accepted;
        a.Booking.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return ToDto(a);
    }

    public async Task<AssignmentDto> StartJobAsync(Guid userId, Guid assignmentId, CancellationToken ct = default)
    {
        var (pro, a) = await LoadForActionAsync(userId, assignmentId, ct);

        if (a.AcceptedAtUtc is null)
            throw new InvalidOperationException("Accept the job first.");
        if (a.StartedAtUtc is not null)
            throw new InvalidOperationException("Job already started.");
        if (a.Booking.Status == BookingStatus.Completed)
            throw new InvalidOperationException("Job already completed.");

        a.StartedAtUtc = DateTime.UtcNow;
        a.Booking.Status = BookingStatus.InProgress;
        a.Booking.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return ToDto(a);
    }

    public async Task<AssignmentDto> CompleteJobAsync(Guid userId, Guid assignmentId, CancellationToken ct = default)
    {
        var (pro, a) = await LoadForActionAsync(userId, assignmentId, ct);

        if (a.StartedAtUtc is null)
            throw new InvalidOperationException("Start the job first.");
        if (a.CompletedAtUtc is not null)
            throw new InvalidOperationException("Job already completed.");

        a.CompletedAtUtc = DateTime.UtcNow;
        a.Booking.Status = BookingStatus.Completed;
        a.Booking.UpdatedAtUtc = DateTime.UtcNow;
        pro.TotalJobs += 1;

        await _db.SaveChangesAsync(ct);
        return ToDto(a);
    }

    public async Task<EarningsDto> GetEarningsAsync(Guid userId, CancellationToken ct = default)
    {
        var pro = await _db.Professionals.FirstOrDefaultAsync(x => x.UserId == userId, ct)
            ?? throw new InvalidOperationException("Professional profile not found.");

        var completed = await _db.BookingAssignments
            .Where(a => a.ProfessionalId == pro.Id && a.CompletedAtUtc != null)
            .Include(a => a.Booking)
            .ToListAsync(ct);

        var totalEarnings = completed.Sum(a => a.Booking.TotalAmount);
        var completedJobs = completed.Count;

        var thisMonth = DateTime.UtcNow;
        var monthEarnings = completed
            .Where(a => a.CompletedAtUtc!.Value.Year == thisMonth.Year && a.CompletedAtUtc!.Value.Month == thisMonth.Month)
            .Sum(a => a.Booking.TotalAmount);
        var monthJobs = completed
            .Count(a => a.CompletedAtUtc!.Value.Year == thisMonth.Year && a.CompletedAtUtc!.Value.Month == thisMonth.Month);

        var today = DateTime.UtcNow.Date;
        var last7Days = Enumerable.Range(0, 7)
            .Select(i => today.AddDays(-i))
            .Reverse()
            .Select(day => new DailyEarningDto(
                day,
                completed.Where(a => a.CompletedAtUtc!.Value.Date == day).Sum(a => a.Booking.TotalAmount),
                completed.Count(a => a.CompletedAtUtc!.Value.Date == day)))
            .ToList();

        return new EarningsDto(totalEarnings, completedJobs, monthEarnings, monthJobs, last7Days);
    }

    public async Task ToggleAvailabilityAsync(Guid userId, bool isAvailable, CancellationToken ct = default)
    {
        var pro = await _db.Professionals.FirstOrDefaultAsync(x => x.UserId == userId, ct)
            ?? throw new InvalidOperationException("Professional profile not found.");

        pro.IsAvailable = isAvailable;
        pro.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task VerifyAsync(Guid professionalId, string? notes, CancellationToken ct = default)
    {
        var pro = await _db.Professionals.FirstOrDefaultAsync(x => x.Id == professionalId, ct)
            ?? throw new InvalidOperationException("Professional not found.");

        if (pro.IsVerified)
            throw new InvalidOperationException("Professional is already verified.");

        pro.IsVerified = true;
        pro.VerifiedAtUtc = DateTime.UtcNow;
        pro.VerificationNotes = notes;
        pro.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
    }

    private async Task<(GharMitra.Domain.Entities.Professional, GharMitra.Domain.Entities.BookingAssignment)> LoadForActionAsync(
        Guid userId, Guid assignmentId, CancellationToken ct)
    {
        var pro = await _db.Professionals.Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == userId, ct)
            ?? throw new InvalidOperationException("Professional profile not found.");

        var a = await _db.BookingAssignments
            .Include(x => x.Booking).ThenInclude(b => b.Service)
            .Include(x => x.Booking).ThenInclude(b => b.Customer).ThenInclude(c => c.User)
            .FirstOrDefaultAsync(x => x.Id == assignmentId, ct)
            ?? throw new InvalidOperationException("Assignment not found.");

        if (a.ProfessionalId != pro.Id)
            throw new InvalidOperationException("Assignment does not belong to you.");

        return (pro, a);
    }

    private static AssignmentDto ToDto(GharMitra.Domain.Entities.BookingAssignment a) =>
        new AssignmentDto(
            a.Id, a.BookingId, a.Booking.BookingNumber,
            a.Booking.Service.Name,
            a.Booking.Customer.User.FullName,
            a.Booking.Customer.User.PhoneNumber,
            a.Booking.AddressLine, a.Booking.City, a.Booking.Pincode, a.Booking.Notes,
            a.Booking.ScheduledStartUtc, a.Booking.DurationMinutes, a.Booking.TotalAmount,
            a.Booking.Status.ToString(), a.AssignedAtUtc,
            a.AcceptedAtUtc, a.StartedAtUtc, a.CompletedAtUtc);
}