using System.Text;
using System.Threading.RateLimiting;
using GharMitra.Api.Hubs;
using GharMitra.Application;
using GharMitra.Application.Common.Notifications;
using GharMitra.Infrastructure;
using GharMitra.Infrastructure.Persistence;
using GharMitra.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) => cfg
    .WriteTo.Console()
    .WriteTo.File("logs/gharmitra-.log", rollingInterval: RollingInterval.Day)
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database.Command", Serilog.Events.LogEventLevel.Warning));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddApplication();
builder.Services.AddHttpClient();
builder.Services.AddInfrastructure(builder.Configuration);

// ─── DataProtection: persist keys in the database ───
// Ensures encryption keys survive Render redeploys (sessions stay valid).
builder.Services.AddDataProtection()
    .PersistKeysToDbContext<GharMitra.Infrastructure.Persistence.GharMitraDbContext>()
    .SetApplicationName("GharMitra");

builder.Services.AddScoped<IBookingNotifier, BookingNotifier>();
builder.Services.AddSignalR();

builder.Services.AddHostedService<GharMitra.Api.Workers.AutoDispatchWorker>();

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
    ?? throw new InvalidOperationException("Jwt configuration missing.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) &&
                    context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// WIDE OPEN CORS FOR DEPLOYMENT TESTING
builder.Services.AddCors(o => o.AddPolicy("spa", p => p
    .SetIsOriginAllowed(_ => true)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

var authPermit = builder.Environment.IsDevelopment() ? 60 : 10;
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddFixedWindowLimiter("auth", opt =>
    {
        opt.PermitLimit = authPermit;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });
    
    // Coupon attempts rate limit — 10 per minute per customer
    o.AddPolicy("coupon-attempts", httpContext =>
    {
        var userId = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                     ?? httpContext.Connection.RemoteIpAddress?.ToString()
                     ?? "anonymous";
        return System.Threading.RateLimiting.RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: userId,
            factory: _ => new System.Threading.RateLimiting.SlidingWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6,
                QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseSerilogRequestLogging();

// CRITICAL: CORS MUST BE CALLED BEFORE AUTHENTICATION
app.UseStaticFiles(); // serve /wwwroot and /uploads
app.UseCors("spa");

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<BookingHub>("/hubs/booking");

// ─── MIGRATIONS: run in ALL environments when MIGRATIONS_ENABLED=true ───
// This ensures production DB schema stays in sync with code.
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<GharMitraDbContext>();
    var runMigrations = Environment.GetEnvironmentVariable("MIGRATIONS_ENABLED")
        ?.Equals("true", StringComparison.OrdinalIgnoreCase) ?? false;
    
    if (runMigrations)
    {
        Log.Information("Applying migrations (MIGRATIONS_ENABLED=true)...");
        await db.Database.MigrateAsync();
        Log.Information("Migrations applied successfully.");
    }
    else
    {
        Log.Information("Skipping migrations (MIGRATIONS_ENABLED not set to true).");
    }

    // Seeding only in Development
    if (app.Environment.IsDevelopment())
    {
        await DbSeeder.SeedAsync(db);
    }
}

app.Run();

