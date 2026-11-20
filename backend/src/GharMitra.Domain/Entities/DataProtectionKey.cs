using GharMitra.Domain.Common;

namespace GharMitra.Domain.Entities;

public class DataProtectionKey : BaseEntity
{
    public string? FriendlyName { get; set; }
    public string? Xml { get; set; }
}