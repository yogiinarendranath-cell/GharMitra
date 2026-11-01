using GharMitra.Domain.Common;

namespace GharMitra.Domain.Entities;

public class Service : BaseEntity
{
    public Guid ServiceCategoryId { get; set; }
    public ServiceCategory ServiceCategory { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal BasePrice { get; set; }
    public int DurationMinutes { get; set; } = 60;
    public bool IsActive { get; set; } = true;
}