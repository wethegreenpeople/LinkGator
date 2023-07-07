using Microsoft.AspNetCore.Mvc;
using LinkGatorApi.Models;
using Microsoft.AspNetCore.Identity;
using fr = FluentResults;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using LinkGatorApi.Queries;

namespace LinkGatorApi.Controllers
{
    [Authorize(AuthenticationSchemes = "Bearer")]
    public class AuthController : Controller
    {
        private readonly SignInManager<User> _signInManager;
        private readonly IConfiguration _config;
        private readonly IUserStore<User> _userStore;
        private readonly UserManager<User> _userManager;

        public AuthController(SignInManager<User> signInManager, IConfiguration config, IUserStore<User> userStore, UserManager<User> userManager)
        {
            _signInManager = signInManager;
            _config = config;
            _userStore = userStore;
            _userManager = userManager;
        }

        [AllowAnonymous]
        [HttpGet("/signin")]
        public async Task<ResultDto<AuthResponse>> SignIn(string username, string password)
        {
            var result = await _signInManager.PasswordSignInAsync(username, password, false, false);

            if (!result?.Succeeded ?? true)
                return fr.Result.Fail("Could not sign in").ToResultDto<AuthResponse>();

            var signingKey = _config.GetValue<string>("Auth:SigningKey");
            if (string.IsNullOrEmpty(signingKey)) return fr.Result.Fail("Invalid Configuration").ToResultDto<AuthResponse>();

            var authResponse = new AuthResponse()
            {
                AccessToken = AuthHelpers.CreateAccessToken(signingKey, $"{_config["Urls"]}"),
                RefreshToken = AuthHelpers.CreateRefreshToken(signingKey, $"{_config["Urls"]}"),
            };

            return fr.Result.Ok(authResponse).ToResultDto();
        }

        [HttpPost("/refresh")]
        [AllowAnonymous]
        public async Task<ResultDto<AuthResponse>> RefreshAccessToken()
        {
            var audience = User.FindFirst(s => s.Type.Equals("aud", StringComparison.OrdinalIgnoreCase));
            if (audience == null || !string.Equals(audience.Value, "refresh", StringComparison.OrdinalIgnoreCase)) return fr.Result.Fail("Refresh token not provided").ToResultDto<AuthResponse>();

            var signingKey = _config.GetValue<string>("Auth:SigningKey");
            if (signingKey.IsNullOrEmpty()) return fr.Result.Fail("Invalid Configuration").ToResultDto<AuthResponse>();

            var authResponse = new AuthResponse()
            {
                AccessToken = AuthHelpers.CreateAccessToken(signingKey, $"{_config["Urls"]}"),
                RefreshToken = AuthHelpers.CreateRefreshToken(signingKey, $"{_config["Urls"]}"),
            };
            return fr.Result.Ok(authResponse).ToResultDto();
        }

        [HttpPost("/create")]
        [AllowAnonymous]
        public async Task<ResultDto<Person>> CreateUser(string username, string password)
        {
            var user = new User();
            var emailUserStore = (IUserEmailStore<User>)_userStore;
            await emailUserStore.SetUserNameAsync(user, username, CancellationToken.None);
            await emailUserStore.SetEmailAsync(user, "", CancellationToken.None);

            var result = await _userManager.CreateAsync(user, password);

            if (!result?.Succeeded ?? true)
                return fr.Result.Fail("Could not create user")
                    .WithErrors(result.Errors.Select(s => s.Description.ToString()))
                    .ToResultDto<Person>();

            var schemaUser = new Person(user);
            return fr.Result.Ok(schemaUser).ToResultDto();
        }
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
            expires: DateTime.Now.AddDays(7),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(refreshToken);
    }
}
