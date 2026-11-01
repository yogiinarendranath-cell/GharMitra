using GharMitra.Application.Auth;
using GharMitra.Application.Bookings;
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
        return services;
    }
}