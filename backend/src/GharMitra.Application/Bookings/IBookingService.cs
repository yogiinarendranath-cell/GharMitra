namespace GharMitra.Application.Bookings;

public interface IBookingService
{
    Task<BookingDto> CreateAsync(Guid customerUserId, CreateBookingRequest request, CancellationToken ct = default);
    Task<List<BookingDto>> GetMyAsync(Guid customerUserId, CancellationToken ct = default);
    Task<List<BookingDto>> GetAllAsync(CancellationToken ct = default);
    Task AssignAsync(Guid bookingId, Guid professionalId, CancellationToken ct = default);
    Task<BookingDto> CancelAsync(Guid customerUserId, Guid bookingId, string? reason, CancellationToken ct = default);
    Task<List<AdminProfessionalDto>> GetProfessionalsAsync(CancellationToken ct = default);
}