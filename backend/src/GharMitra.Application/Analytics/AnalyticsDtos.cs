namespace GharMitra.Application.Analytics;

public record KpiDto(
    decimal TotalRevenue,
    int TotalBookings,
    int PaidBookings,
    int PendingBookings,
    int AssignedBookings,
    int AcceptedBookings,
    int CompletedBookings,
    int CancelledBookings,
    decimal CancellationRate,
    int TotalCustomers,
    int TotalProfessionals,
    int ActiveProfessionals);

public record DailyRevenueDto(DateTime Date, decimal Revenue, int Bookings);

public record TopProfessionalDto(
    Guid Id,
    string FullName,
    string City,
    int TotalJobs,
    decimal TotalRevenue,
    decimal Rating,
    bool IsVerified);

public record TopServiceDto(
    string ServiceName,
    int BookingCount,
    decimal Revenue);

public record RecentBookingDto(
    string BookingNumber,
    string ServiceName,
    string CustomerName,
    string? ProfessionalName,
    decimal Amount,
    string Status,
    string PaymentStatus,
    DateTime CreatedAtUtc);

public record AnalyticsDto(
    KpiDto Kpis,
    List<DailyRevenueDto> Last7DaysRevenue,
    List<TopProfessionalDto> TopProfessionals,
    List<TopServiceDto> TopServices,
    List<RecentBookingDto> RecentBookings);