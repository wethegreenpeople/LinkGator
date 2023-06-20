using HotChocolate.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace LinkGatorApi.Queries
{
    [Authorize]
    public class AuthQueries
    {
        [GraphQLDescription("Gets an auth token associated with the user")]
        public string GetAuthToken()
        {
            return "doot";
        }
    }

    public class AuthMutations
    {
        private readonly IConfiguration _config;

        public AuthMutations(IConfiguration config)
        {
            _config = config;
        }

        [GraphQLDescription("Create an auth token")]
        public async Task<string> CreateAuthToken()
        {
            // Should check if a signing key is available, and return an error if not
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Auth:SigningKey"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "wethegreenpeople"),
                new Claim(ClaimTypes.Role, "Admin")
            };
            var token = new JwtSecurityToken($"{_config["Urls"]}/graphql",
                null,
                claims,
                expires: DateTime.Now.AddMinutes(15),
                signingCredentials: credentials);


            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
