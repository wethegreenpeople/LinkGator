using FluentAssertions;
using LinkGatorApi.Models;
using LinkGatorApi.Queries;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LinkGatorApiTests.Unit.Schema
{
    public class AuthUnitTests
    {
        [Fact]
        public async void CreateAuthToken_ReturnsAuthObject()
        {
            // Arrange
            var inMemorySettings = new Dictionary<string, string> {
                {"Auth:SigningKey", "TestingSigningKey"},
                {"Urls", "https://localhost:7292"},
            };
            var config = new ConfigurationBuilder().AddInMemoryCollection(inMemorySettings).Build();
            var authMutations = new AuthMutations(config);

            // Act
            var token = await authMutations.CreateAuthToken();

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
    }
}
