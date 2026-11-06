using System.Security.Claims;
using GharMitra.Application.Referrals;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GharMitra.Api.Controllers;

[ApiController]
[Route("api/referrals")]
[Authorize(Roles = "Customer")]
public class ReferralsController : ControllerBase
{
    private readonly IReferralService _referrals;
    public ReferralsController(IReferralService referrals) => _referrals = referrals;

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>
    /// Get the current customer's referral code (auto-generates if missing).
    /// </summary>
    [HttpGet("my-code")]
    public async Task<ActionResult<MyReferralCodeDto>> GetMyCode(
        CancellationToken ct)
        => Ok(await _referrals.GetMyReferralCodeAsync(CurrentUserId, ct));

    /// <summary>
    /// List all referrals this customer has made + their stats.
    /// </summary>
    [HttpGet("my")]
    public async Task<ActionResult<MyReferralsListDto>> GetMyReferrals(
        CancellationToken ct)
        => Ok(await _referrals.GetMyReferralsAsync(CurrentUserId, ct));

    /// <summary>
    /// Accept a referral code. Called after successful signup.
    /// Returns success + reward info.
    /// </summary>
    [HttpPost("accept")]
    public async Task<ActionResult<AcceptReferralResponse>> Accept(
        [FromBody] AcceptReferralRequest request,
        CancellationToken ct)
    {
        try
        {
            var result = await _referrals.AcceptReferralAsync(CurrentUserId, request, ct);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}