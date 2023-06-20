using HotChocolate.Authorization;
using LinkGatorApi.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using fr = FluentResults;

namespace LinkGatorApi.Queries
{
    [Authorize(Roles = new []{"Admin"})]
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
        public async Task<ResultDto<AuthResponse>> CreateAuthToken()
        {
            var signingKey = _config.GetValue<string>("Auth:SigningKey");
            if (signingKey.IsNullOrEmpty()) return fr.Result.Fail("Invalid Configuration").ToResultDto<AuthResponse>();

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "wethegreenpeople"),
                new Claim(ClaimTypes.Role, "Admin")
            };


            var accessToken = new JwtSecurityToken($"{_config["Urls"]}/graphql",
                "ACCESS",
                claims,
                expires: DateTime.Now.AddMinutes(15),
                signingCredentials: credentials);
            var refreshToken = new JwtSecurityToken($"{_config["Urls"]}/graphql",
                "REFRESH",
                null,
                expires: DateTime.Now.AddDays(7),
                signingCredentials: credentials);

            var authResponse = new AuthResponse()
            {
                AccessToken = new JwtSecurityTokenHandler().WriteToken(accessToken),
                RefreshToken = new JwtSecurityTokenHandler().WriteToken(refreshToken),
            };
            return fr.Result.Ok(authResponse).ToResultDto();
        }
    }
}
