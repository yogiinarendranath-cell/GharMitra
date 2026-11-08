using GharMitra.Application.Auth;
using GharMitra.Application.Bookings;
using GharMitra.Application.Professionals;
using GharMitra.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace GharMitra.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IServiceCatalog, ServiceCatalog>();
        services.AddScoped<IBookingService, BookingService>();
        services.AddScoped<GharMitra.Application.Analytics.IAnalyticsService, GharMitra.Application.Analytics.AnalyticsService>();
        services.AddScoped<IProfessionalService, ProfessionalService>();
        services.AddScoped<IProfessionalVerificationService, ProfessionalVerificationService>();
        services.AddScoped<GharMitra.Application.Reviews.IReviewService, GharMitra.Application.Reviews.ReviewService>();
        services.AddScoped<GharMitra.Application.Coupons.ICouponService, GharMitra.Application.Coupons.CouponService>();
                services.AddScoped<GharMitra.Application.Referrals.IReferralService, GharMitra.Application.Referrals.ReferralService>();
        return services;
    }
}


