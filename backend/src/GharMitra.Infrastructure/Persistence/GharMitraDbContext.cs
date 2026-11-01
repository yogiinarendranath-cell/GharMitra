using GharMitra.Application.Common.Interfaces;
using GharMitra.Domain.Common;
using GharMitra.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Infrastructure.Persistence;

public class GharMitraDbContext : DbContext, IApplicationDbContext
{
    public GharMitraDbContext(DbContextOptions<GharMitraDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Professional> Professionals => Set<Professional>();
    public DbSet<ServiceCategory> ServiceCategories => Set<ServiceCategory>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingAssignment> BookingAssignments => Set<BookingAssignment>();
    public DbSet<Review> Reviews => Set<Review>();

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
                entry.Entity.CreatedAtUtc = now;
            else if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAtUtc = now;
        }
        return base.SaveChangesAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).HasMaxLength(200).IsRequired();
            e.Property(x => x.FullName).HasMaxLength(150).IsRequired();
            e.Property(x => x.PhoneNumber).HasMaxLength(20);
            e.Property(x => x.PasswordHash).IsRequired();
            e.HasOne(x => x.Customer).WithOne(x => x.User)
                .HasForeignKey<Customer>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Professional).WithOne(x => x.User)
                .HasForeignKey<Professional>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Customer>(e =>
        {
            e.Property(x => x.City).HasMaxLength(100);
            e.Property(x => x.DefaultAddress).HasMaxLength(500);
        });

        b.Entity<Professional>(e =>
        {
            e.Property(x => x.City).HasMaxLength(100);
            e.Property(x => x.Rating).HasPrecision(3, 2);
            e.Property(x => x.VerificationNotes).HasMaxLength(500);
        });

        b.Entity<ServiceCategory>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(120).IsRequired();
        });

        b.Entity<Service>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(150).IsRequired();
            e.Property(x => x.BasePrice).HasPrecision(10, 2);
            e.HasOne(x => x.ServiceCategory).WithMany(x => x.Services)
                .HasForeignKey(x => x.ServiceCategoryId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Booking>(e =>
        {
            e.HasIndex(x => x.BookingNumber).IsUnique();
            e.Property(x => x.BookingNumber).HasMaxLength(40).IsRequired();
            e.Property(x => x.TotalAmount).HasPrecision(10, 2);
            e.Property(x => x.AddressLine).HasMaxLength(500);
            e.Property(x => x.City).HasMaxLength(100);
            e.Property(x => x.CancellationReason).HasMaxLength(500);
            e.HasOne(x => x.Customer).WithMany(x => x.Bookings)
                .HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Service).WithMany()
                .HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<BookingAssignment>(e =>
        {
            e.HasIndex(x => x.BookingId).IsUnique();
            e.HasOne(x => x.Booking).WithOne(x => x.Assignment)
                .HasForeignKey<BookingAssignment>(x => x.BookingId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Professional).WithMany(x => x.Assignments)
                .HasForeignKey(x => x.ProfessionalId).OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Review>(e =>
        {
            e.HasIndex(x => x.BookingId).IsUnique();
            e.HasOne(x => x.Booking).WithMany()
                .HasForeignKey(x => x.BookingId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}