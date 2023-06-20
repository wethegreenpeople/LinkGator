using Microsoft.AspNetCore.Identity;

namespace LinkGatorApi.Models
{
    public class User : IdentityUser
    {
        public required string Username { get; set; }
    }
}
