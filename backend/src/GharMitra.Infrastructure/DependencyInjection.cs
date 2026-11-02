using GharMitra.Application.Common.Interfaces;
using GharMitra.Infrastructure.Persistence;
using GharMitra.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace GharMitra.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<GharMitraDbContext>(o =>
            o.UseNpgsql(config.GetConnectionString("Default"))); // <-- UseNpgsql

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<GharMitraDbContext>());

        services.Configure<JwtSettings>(config.GetSection("Jwt"));
        services.Configure<RazorpaySettings>(config.GetSection("Razorpay"));
        services.AddScoped<GharMitra.Application.Payments.IPaymentService, GharMitra.Infrastructure.Payments.PaymentService>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        return services;
    }
}