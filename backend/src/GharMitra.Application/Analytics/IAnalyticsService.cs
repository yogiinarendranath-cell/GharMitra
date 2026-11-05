namespace GharMitra.Application.Analytics;

public interface IAnalyticsService
{
    Task<AnalyticsDto> GetAnalyticsAsync(CancellationToken ct = default);
}