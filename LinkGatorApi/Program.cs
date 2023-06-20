using LinkGatorApi;
using LinkGatorApi.Queries;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var config = builder.Configuration;
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Auth:SigningKey"]));
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidIssuer = $"{config["Urls"]}/graphql",
                ValidateIssuerSigningKey = true,
                ValidateIssuer = true,
                ValidateAudience = false,
                ValidateLifetime = true,
                IssuerSigningKey = signingKey
            };
    });

builder.Services.AddAuthorization();

builder.Services
    .AddGraphQLServer()
    .AddAuthorization()
    .AddQueryType<AuthQueries>()
    .AddMutationType<AuthMutations>();

builder.Services
    .AddDbContext<ApplicationDbContext>(options =>
    {
        options.UseNpgsql(config["Database:ConnectionString"]);
    });

var app = builder.Build();

app.UseRouting();

app.UseAuthorization();
app.UseAuthentication();

app.MapGraphQL();

app.MapGet("/", () => "Hello World!");

app.Run();
