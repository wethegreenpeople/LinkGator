using FluentAssertions;
using LinkGatorApi.Models;
using LinkGatorApi.Queries;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using static System.Formats.Asn1.AsnWriter;

namespace LinkGatorApiTests.Unit.Schema
{
    public class AuthUnitTests
    {
        [Fact]
        public async void RefreshAccessToken_GivenRefreshToken_ReturnsAuthObject()
        {
            // Arrange
            var inMemorySettings = new Dictionary<string, string> {
                {"Auth:SigningKey", "TestingSigningKey"},
                {"Urls", "https://localhost:7292"},
            };
            var config = new ConfigurationBuilder().AddInMemoryCollection(inMemorySettings).Build();
            var authMutations = new AuthMutations();

            var claimsPrincipal = new Mock<ClaimsPrincipal>();
            claimsPrincipal.Setup(s => s.FindFirst(It.IsAny<string>())).Returns(new Claim("AUD", "refresh"));

            // Act
            var token = await authMutations.RefreshAccessToken(config, claimsPrincipal.Object);

            // Assert
            token.IsSuccess.Should()
                .BeTrue();
            token.Value.Should()
                .NotBeNull()
                .And
                .BeOfType<AuthResponse>();
            token.Value.RefreshToken.Should()
                .NotBeEmpty();
            token.Value.AccessToken.Should()
                .NotBeEmpty();
        }

        [Fact]
        public async void RefreshAccessToken_GivenAccessToken_ReturnsFailure()
        {
            // Arrange
            var inMemorySettings = new Dictionary<string, string> {
                {"Auth:SigningKey", "TestingSigningKey"},
                {"Urls", "https://localhost:7292"},
            };
            var config = new ConfigurationBuilder().AddInMemoryCollection(inMemorySettings).Build();
            var authMutations = new AuthMutations();

            var claimsPrincipal = new Mock<ClaimsPrincipal>();
            claimsPrincipal.Setup(s => s.FindFirst(It.IsAny<string>())).Returns(new Claim("AUD", "access"));

            // Act
            var token = await authMutations.RefreshAccessToken(config, claimsPrincipal.Object);

            // Assert
            token.IsSuccess.Should()
                .BeFalse();
        }

        [Fact]
        public async void CreateUser_ReturnsUserObject()
        {
            // Arrange
            var inMemorySettings = new Dictionary<string, string>();
            var config = new ConfigurationBuilder().AddInMemoryCollection(inMemorySettings).Build();
            var authMutations = new AuthMutations();

            var username = "wethegreenpeople";
            var password = "";

            var userStore = new Mock<IUserEmailStore<User>>();

            var userManager = new Mock<UserManager<User>>(userStore.Object, null, null, null, null, null, null, null, null);
            userManager.Setup(s => s.CreateAsync(It.IsAny<User>(), It.IsAny<string>())).ReturnsAsync(IdentityResult.Success);


            // Act
            var user = await authMutations.CreateUser(username, password, userStore.Object, userManager.Object);

            // Assert
            user.IsSuccess.Should()
                .BeTrue();
            user.Value.Should()
                .NotBeNull();
        }

        [Fact]
        public async void CreateUser_ReturnsFail()
        {
            // Arrange
            var inMemorySettings = new Dictionary<string, string>();
            var config = new ConfigurationBuilder().AddInMemoryCollection(inMemorySettings).Build();
            var authMutations = new AuthMutations();

            var username = "wethegreenpeople";
            var password = "";

            var userStore = new Mock<IUserEmailStore<User>>();

            var userManager = new Mock<UserManager<User>>(userStore.Object, null, null, null, null, null, null, null, null);
            userManager.Setup(s => s.CreateAsync(It.IsAny<User>(), It.IsAny<string>())).ReturnsAsync(IdentityResult.Failed());


            // Act
            var user = await authMutations.CreateUser(username, password, userStore.Object, userManager.Object);

            // Assert
            user.IsSuccess.Should()
                .BeFalse();
        }
    }
}
