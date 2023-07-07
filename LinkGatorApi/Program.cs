using LinkGatorApi;
using LinkGatorApi.Models;
using LinkGatorApi.Queries;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var config = builder.Configuration;
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Auth:SigningKey"]));
builder.Services
    .AddAuthentication(s =>
    {
        s.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        s.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        s.DefaultSignInScheme = "Identity.Application";
    })
    .AddCookie("Identity.Application")
    .AddJwtBearer(options =>
    {
        options.SaveToken = true;
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidIssuer = $"{config["Urls"]}",
                // ValidAudience = "ACCESS",
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
    .AddQueryType(s => s.Name("Query"))
        .AddTypeExtension<PersonQuery>()
        .AddTypeExtension<AuthQuery>()
    .AddMutationType<AuthMutations>();

builder.Services
    .AddDbContext<ApplicationDbContext>(options =>
    {
        options.UseNpgsql(config["Database:ConnectionString"]);
    });

builder.Services
    .AddIdentityCore<User>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddSignInManager<SignInManager<User>>();

builder.Services.AddControllers();

builder.Services.AddSwaggerGen(opt => 
{
    opt.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "bearer"
    });

    opt.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type=ReferenceType.SecurityScheme,
                    Id="Bearer"
                }
            },
            new string[]{}
        }
    });
});

var app = builder.Build();

app.UseRouting();

app.UseAuthorization();
app.UseAuthentication();

app.MapGraphQL();

app.MapGet("/", () => "Hello World!!");
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;

    var context = services.GetRequiredService<ApplicationDbContext>();
    if (context.Database.GetPendingMigrations().Any())
    {
        context.Database.Migrate();
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    // In non-development environments, bind to the correct port
    var port = Environment.GetEnvironmentVariable("PORT");
    if (!string.IsNullOrEmpty(port))
    {
        builder.WebHost.UseUrls($"http://*:{port}");
    }
}

app.UseSwagger();
app.UseSwaggerUI();

app.Run();
