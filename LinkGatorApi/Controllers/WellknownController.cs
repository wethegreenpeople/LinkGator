using Microsoft.AspNetCore.Mvc;
using ActivityPub;
using LinkGatorApi.Models;

namespace LinkGatorApi.Controllers
{
    [Route(".well-known")]
    public class WellknownController : Controller
    {
        [HttpGet("webfinger")]
        public IActionResult GetResource([FromQuery] string resource)
        {
            if (!resource.ToLower().StartsWith("acct:")) return BadRequest();

            var webFingerObject = new WebFingerResponse()
            {
                Subject = resource,
                Links = new List<Link>()
                {
                    new Link()
                    {
                        Rel = "self",
                        Type = "application/activity+json",
                        Href = $"{Request.Scheme}://{Request.Host}/user/{resource[5..]}"
                    }
                }
            };

            return Ok(webFingerObject);
        }
    }
}
