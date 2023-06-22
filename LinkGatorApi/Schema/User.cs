using IdentityUser = LinkGatorApi.Models.User;

namespace LinkGatorApi.Schema
{
    public class User
    {
        public string Username { get; set; }

        public User(IdentityUser user)
        {
            this.Username = user.UserName;
        }
    }
}
