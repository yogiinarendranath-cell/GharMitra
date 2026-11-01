using GharMitra.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace GharMitra.Api.Controllers;

[ApiController]
[Route("api/services")]
public class ServicesController : ControllerBase
{
    private readonly IServiceCatalog _catalog;
    public ServicesController(IServiceCatalog catalog) => _catalog = catalog;

    [HttpGet]
    public async Task<ActionResult<List<ServiceCategoryDto>>> Get(CancellationToken ct)
        => Ok(await _catalog.GetCatalogAsync(ct));
}