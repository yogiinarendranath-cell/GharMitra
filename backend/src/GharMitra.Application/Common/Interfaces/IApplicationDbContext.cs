using GharMitra.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Customer> Customers { get; }
    DbSet<Professional> Professionals { get; }
    DbSet<ServiceCategory> ServiceCategories { get; }
    DbSet<Service> Services { get; }
    DbSet<Booking> Bookings { get; }
    DbSet<BookingAssignment> BookingAssignments { get; }
    DbSet<Review> Reviews { get; }
    DbSet<Coupon> Coupons { get; }
    DbSet<CouponRedemption> CouponRedemptions { get; }
    DbSet<Referral> Referrals { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}