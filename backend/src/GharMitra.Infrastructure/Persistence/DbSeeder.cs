using GharMitra.Domain.Entities;
using GharMitra.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Infrastructure.Persistence;

public static class DbSeeder
{
    public static async Task SeedAsync(GharMitraDbContext db, CancellationToken ct = default)
    {
        if (await db.ServiceCategories.AnyAsync(ct)) return;

        var cleaning = new ServiceCategory
        {
            Name = "Home Cleaning", Slug = "home-cleaning", DisplayOrder = 1,
            Description = "Sweeping, mopping, dusting and general cleaning."
        };
        cleaning.Services.Add(new Service { Name = "Standard Home Cleaning", Description = "Sweep, mop, dust and tidy living areas.", BasePrice = 149, DurationMinutes = 60 });
        cleaning.Services.Add(new Service { Name = "Deep Home Cleaning", Description = "Detailed cleaning of all rooms.", BasePrice = 399, DurationMinutes = 180 });

        var kitchen = new ServiceCategory
        {
            Name = "Kitchen & Utensils", Slug = "kitchen-cleaning", DisplayOrder = 2,
            Description = "Kitchen surfaces and utensil washing."
        };
        kitchen.Services.Add(new Service { Name = "Kitchen Cleaning", Description = "Counters, hob, sink and cabinet exteriors.", BasePrice = 199, DurationMinutes = 60 });
        kitchen.Services.Add(new Service { Name = "Utensil Washing", Description = "Wash and arrange utensils.", BasePrice = 99, DurationMinutes = 45 });

        var laundry = new ServiceCategory
        {
            Name = "Laundry", Slug = "laundry", DisplayOrder = 3,
            Description = "Washing, drying, folding and ironing."
        };
        laundry.Services.Add(new Service { Name = "Laundry & Folding", Description = "Wash, dry and fold up to 5 kg.", BasePrice = 199, DurationMinutes = 60 });

        var cook = new ServiceCategory
        {
            Name = "Home Cook", Slug = "home-cook", DisplayOrder = 4,
            Description = "Daily meal preparation in your kitchen."
        };
        cook.Services.Add(new Service { Name = "Home Cook (2 Hours)", Description = "Prepare daily meals for the family.", BasePrice = 299, DurationMinutes = 120 });

        db.ServiceCategories.AddRange(cleaning, kitchen, laundry, cook);

        db.Users.Add(new User
        {
            FullName = "GharMitra Admin",
            Email = "admin@gharmitra.local",
            PhoneNumber = "9999999999",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@1234"),
            Role = UserRole.Admin
        });

        db.Users.Add(new User
        {
            FullName = "Test Professional",
            Email = "pro@gharmitra.local",
            PhoneNumber = "9999900001",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pro@1234"),
            Role = UserRole.Professional,
            Professional = new Professional
            {
                City = "Pune",
                IsVerified = true,
                VerifiedAtUtc = DateTime.UtcNow,
                VerificationNotes = "Seeded verified professional"
            }
        });

        await db.SaveChangesAsync(ct);
    }
}