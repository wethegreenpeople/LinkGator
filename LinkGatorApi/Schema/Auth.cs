using HotChocolate.Authorization;
using HotChocolate.Utilities;
using LinkGatorApi.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Text;
using fr = FluentResults;
using SchemaUser = LinkGatorApi.Schema.User;

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

        [AllowAnonymous]
        [GraphQLDescription("Signs a user in, with a given username and password")]
        public async Task<ResultDto<AuthResponse>> SignIn(string username, string password, [Service] SignInManager<User> signInManager, [Service] IConfiguration config)
        {
            var result = await signInManager.PasswordSignInAsync(username, password, false, false);

            if (!result?.Succeeded ?? true)
                return fr.Result.Fail("Could not sign in").ToResultDto<AuthResponse>();

            var signingKey = config.GetValue<string>("Auth:SigningKey");
            if (signingKey.IsNullOrEmpty()) return fr.Result.Fail("Invalid Configuration").ToResultDto<AuthResponse>();

            var authResponse = new AuthResponse()
            {
                AccessToken = AuthHelpers.CreateAccessToken(signingKey, $"{config["Urls"]}/graphql"),
                RefreshToken = AuthHelpers.CreateRefreshToken(signingKey, $"{config["Urls"]}/graphql"),
            };

            return fr.Result.Ok(authResponse).ToResultDto();
        }
    }

    [Authorize]
    public class AuthMutations
    {
        [GraphQLDescription("Refreshes your access token, and provides a new refresh token")]
        public async Task<ResultDto<AuthResponse>> RefreshAccessToken([Service]IConfiguration config, ClaimsPrincipal claimsPrincipal)
        {
            var audience = claimsPrincipal?.FindFirst("AUD")?.Value ?? null;
            if (audience == null || !audience.EqualsInvariantIgnoreCase("refresh")) return fr.Result.Fail("Refresh token not provided").ToResultDto<AuthResponse>();

            var signingKey = config.GetValue<string>("Auth:SigningKey");
            if (signingKey.IsNullOrEmpty()) return fr.Result.Fail("Invalid Configuration").ToResultDto<AuthResponse>();

            var authResponse = new AuthResponse()
            {
                AccessToken = AuthHelpers.CreateAccessToken(signingKey, $"{config["Urls"]}/graphql"),
                RefreshToken = AuthHelpers.CreateRefreshToken(signingKey, $"{config["Urls"]}/graphql"),
            };
            return fr.Result.Ok(authResponse).ToResultDto();
        }

        [AllowAnonymous]
        [GraphQLDescription("Creates a user with the given username and password")]
        public async Task<ResultDto<SchemaUser>> CreateUser(string username, string password, [Service]IUserStore<User> userStore, [Service]UserManager<User> userManager)
        {
            var user = new User();
            var emailUserStore = (IUserEmailStore<User>)userStore;
            await emailUserStore.SetUserNameAsync(user, username, CancellationToken.None);
            await emailUserStore.SetEmailAsync(user, "", CancellationToken.None);

            var result = await userManager.CreateAsync(user, password);

            if (!result?.Succeeded ?? true) 
                return fr.Result.Fail("Could not create user")
                    .WithErrors(result.Errors.Select(s => s.Description.ToString()))
                    .ToResultDto<SchemaUser>();

            var schemaUser = new SchemaUser(user);
            return fr.Result.Ok(schemaUser).ToResultDto();
        }
    }

    public static class AuthHelpers
    {
        public static string CreateAccessToken(string signingKey, string issuer)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "wethegreenpeople"),
                new Claim(ClaimTypes.Role, "User"),
                new Claim(ClaimTypes.Role, "Admin"),
            };

            var token = new JwtSecurityToken(issuer,
                "ACCESS",
                claims,
                expires: DateTime.Now.AddMinutes(15),
                signingCredentials: credentials);
            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public static string CreateRefreshToken(string signingKey, string issuer)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var refreshToken = new JwtSecurityToken(issuer,
                "REFRESH",
                null,
                expires: DateTime.Now.AddDays(7),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(refreshToken);
        }
    }
}
