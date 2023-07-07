using Microsoft.AspNetCore.Mvc;
using LinkGatorApi.Models;
using Microsoft.AspNetCore.Identity;

namespace LinkGatorApi.Controllers
{
    [Route(".well-known")]
    public class WellknownController : Controller
    {
        private readonly IUserStore<User> _userStore;
        public WellknownController(IUserStore<User> userStore)
        {
            _userStore = userStore;
        }

        [HttpGet("webfinger")]
        public async Task<ActionResult<WebFingerResponse>> GetResource([FromQuery] string resource)
        {
            if (!resource.ToLower().StartsWith("acct:")) return BadRequest();

            var userNameFromResource = resource[5..];
            var user = await _userStore.FindByNameAsync(userNameFromResource.ToUpper(), CancellationToken.None);

            if (user == null) return NotFound();

            var webFingerObject = new WebFingerResponse()
            {
                Subject = resource,
                Links = new List<object>()
                {
                    new
                    {
                        Rel = "self",
                        Type = "application/activity+json",
                        Href = $"{Request.Scheme}://{Request.Host}/user/{user.UserName}"
                    }
                }
            };

            return Ok(webFingerObject);
        }
    }
}
