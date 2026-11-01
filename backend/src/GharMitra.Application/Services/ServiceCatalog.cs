using GharMitra.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace GharMitra.Application.Services;

public record ServiceDto(Guid Id, string Name, string? Description, decimal BasePrice, int DurationMinutes);
public record ServiceCategoryDto(Guid Id, string Name, string Slug, string? Description, List<ServiceDto> Services);

public interface IServiceCatalog
{
    Task<List<ServiceCategoryDto>> GetCatalogAsync(CancellationToken ct = default);
}

public class ServiceCatalog : IServiceCatalog
{
    private readonly IApplicationDbContext _db;
    public ServiceCatalog(IApplicationDbContext db) => _db = db;

    public async Task<List<ServiceCategoryDto>> GetCatalogAsync(CancellationToken ct = default)
    {
        return await _db.ServiceCategories
            .Where(c => c.IsActive)
            .OrderBy(c => c.DisplayOrder)
            .Select(c => new ServiceCategoryDto(
                c.Id, c.Name, c.Slug, c.Description,
                c.Services.Where(s => s.IsActive)
                          .Select(s => new ServiceDto(s.Id, s.Name, s.Description, s.BasePrice, s.DurationMinutes))
                          .ToList()))
            .ToListAsync(ct);
    }
}