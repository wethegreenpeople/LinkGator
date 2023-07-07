using ActivityPub;
using HotChocolate.Authorization;
using IdentityUser = LinkGatorApi.Models.User;

namespace LinkGatorApi.Queries
{
    public class Person
    {
        public string Username { get; set; }

        public Person(IdentityUser user)
        {
            this.Username = user.UserName;
        }
    }


    [Authorize]
    [ExtendObjectType("Query")]
    public partial class PersonQuery
    {
        [AllowAnonymous]
        [GraphQLDescription("Retrieves a user profile")]
        public ActivityObject getUser(string username)
        {
            var person = new ActivityObject() 
            {
                Id = username,
                Type = "Person",
            };

            return person;
        }
    }
}
