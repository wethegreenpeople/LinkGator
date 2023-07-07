using HotChocolate.Authorization;
using HotChocolate.Utilities;
using LinkGatorApi.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using fr = FluentResults;

namespace LinkGatorApi.Queries
{
    [Authorize]
    [ExtendObjectType("Query")]
    public partial class AuthQuery
    {
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
        public async Task<ResultDto<Person>> CreateUser(string username, string password, [Service]IUserStore<User> userStore, [Service]UserManager<User> userManager)
        {
            var user = new User();
            var emailUserStore = (IUserEmailStore<User>)userStore;
            await emailUserStore.SetUserNameAsync(user, username, CancellationToken.None);
            await emailUserStore.SetEmailAsync(user, "", CancellationToken.None);

            var result = await userManager.CreateAsync(user, password);

            if (!result?.Succeeded ?? true) 
                return fr.Result.Fail("Could not create user")
                    .WithErrors(result.Errors.Select(s => s.Description.ToString()))
                    .ToResultDto<Person>();

            var schemaUser = new Person(user);
            return fr.Result.Ok(schemaUser).ToResultDto();
        }
    }
}
