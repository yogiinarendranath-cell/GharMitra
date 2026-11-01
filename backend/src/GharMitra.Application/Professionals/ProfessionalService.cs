using GharMitra.Application.Common.Interfaces;
using GharMitra.Domain.Entities;
using GharMitra.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Application.Professionals;

public class ProfessionalService : IProfessionalService
{
    private readonly IApplicationDbContext _db;
    public ProfessionalService(IApplicationDbContext db) => _db = db;

    public async Task<ProfessionalProfileDto> GetMyProfileAsync(Guid userId, CancellationToken ct = default)
    {
        var p = await _db.Professionals
            .Include(x => x.User)
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
                a.Booking.Status.ToString(), a.AssignedAtUtc, a.AcceptedAtUtc))
            .ToListAsync(ct);
    }

    public async Task<AssignmentDto> AcceptAsync(Guid userId, Guid assignmentId, CancellationToken ct = default)
    {
        var pro = await _db.Professionals.FirstOrDefaultAsync(x => x.UserId == userId, ct)
            ?? throw new InvalidOperationException("Professional profile not found.");

        var a = await _db.BookingAssignments
            .Include(x => x.Booking).ThenInclude(b => b.Service)
            .Include(x => x.Booking).ThenInclude(b => b.Customer).ThenInclude(c => c.User)
            .FirstOrDefaultAsync(x => x.Id == assignmentId, ct)
            ?? throw new InvalidOperationException("Assignment not found.");

        if (a.ProfessionalId != pro.Id)
            throw new InvalidOperationException("Assignment does not belong to you.");

        if (!pro.IsVerified)
            throw new InvalidOperationException("Profile not verified. Contact admin.");

        if (a.AcceptedAtUtc is not null)
            throw new InvalidOperationException("Assignment already accepted.");

        a.AcceptedAtUtc = DateTime.UtcNow;
        a.Booking.Status = BookingStatus.Accepted;
        a.Booking.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return new AssignmentDto(
            a.Id, a.BookingId, a.Booking.BookingNumber,
            a.Booking.Service.Name,
            a.Booking.Customer.User.FullName,
            a.Booking.Customer.User.PhoneNumber,
            a.Booking.AddressLine, a.Booking.City, a.Booking.Pincode, a.Booking.Notes,
            a.Booking.ScheduledStartUtc, a.Booking.DurationMinutes, a.Booking.TotalAmount,
            a.Booking.Status.ToString(), a.AssignedAtUtc, a.AcceptedAtUtc);
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
}