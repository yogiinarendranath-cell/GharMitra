using GharMitra.Application.Common.Interfaces;
using GharMitra.Domain.Entities;
using GharMitra.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Application.Reviews;

public class ReviewService : IReviewService
{
    private readonly IApplicationDbContext _db;
    public ReviewService(IApplicationDbContext db) => _db = db;

    public async Task<bool> CanReviewAsync(Guid customerUserId, Guid bookingId, CancellationToken ct = default)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.UserId == customerUserId, ct);
        if (customer == null) return false;

        var booking = await _db.Bookings
            .Include(b => b.Assignment)
            .FirstOrDefaultAsync(b => b.Id == bookingId && b.CustomerId == customer.Id, ct);

        if (booking == null) return false;
        if (booking.Status != BookingStatus.Completed) return false;
        if (booking.Assignment == null) return false;

        var alreadyReviewed = await _db.Reviews.AnyAsync(r => r.BookingId == bookingId, ct);
        return !alreadyReviewed;
    }

    public async Task<ReviewDto> SubmitReviewAsync(Guid customerUserId, Guid bookingId, CreateReviewRequest request, CancellationToken ct = default)
    {
        if (request.Rating < 1 || request.Rating > 5)
            throw new InvalidOperationException("Rating must be between 1 and 5.");

        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.UserId == customerUserId, ct)
            ?? throw new InvalidOperationException("Customer not found.");

        var booking = await _db.Bookings
            .Include(b => b.Service)
            .Include(b => b.Assignment).ThenInclude(a => a!.Professional).ThenInclude(p => p.User)
            .Include(b => b.Customer).ThenInclude(c => c.User)
            .FirstOrDefaultAsync(b => b.Id == bookingId && b.CustomerId == customer.Id, ct)
            ?? throw new InvalidOperationException("Booking not found.");

        if (booking.Status != BookingStatus.Completed)
            throw new InvalidOperationException("You can only review completed bookings.");
        if (booking.Assignment == null)
            throw new InvalidOperationException("Booking has no professional to review.");

        var existing = await _db.Reviews.AnyAsync(r => r.BookingId == bookingId, ct);
        if (existing)
            throw new InvalidOperationException("You've already reviewed this booking.");

        var pro = booking.Assignment.Professional;
        var review = new Review
        {
            BookingId = booking.Id,
            CustomerId = booking.CustomerId,
            ProfessionalId = pro.Id,
            Rating = request.Rating,
            Comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim()
        };

        _db.Reviews.Add(review);
        await _db.SaveChangesAsync(ct);

        // Recalculate professional rating
        var allRatings = await _db.Reviews
            .Where(r => r.ProfessionalId == pro.Id)
            .Select(r => r.Rating)
            .ToListAsync(ct);

        pro.Rating = Math.Round((decimal)allRatings.Average(), 2);
        pro.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return new ReviewDto(
            review.Id,
            review.Rating,
            review.Comment,
            booking.Customer.User.FullName,
            pro.User.FullName,
            booking.Service.Name,
            review.CreatedAtUtc);
    }

    public async Task<List<ReviewDto>> GetReviewsForProfessionalAsync(Guid professionalId, CancellationToken ct = default)
    {
        return await _db.Reviews
            .Where(r => r.ProfessionalId == professionalId)
            .OrderByDescending(r => r.CreatedAtUtc)
            .Select(r => new ReviewDto(
                r.Id,
                r.Rating,
                r.Comment,
                r.Customer.User.FullName,
                r.Professional.User.FullName,
                r.Booking.Service.Name,
                r.CreatedAtUtc))
            .ToListAsync(ct);
    }
}