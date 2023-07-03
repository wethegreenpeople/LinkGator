using FluentAssertions;
using LinkGatorApi.Controllers;
using LinkGatorApi.Models;
using LinkGatorApi.Queries;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using System.Security.Claims;

namespace LinkGatorApiTests.Unit.Controllers
{
    public class WellknownControllerUnitTests
    {
        [Fact]
        public async void GetResource_GivenNonAcctResource_Return400()
        {
            // Arrange
            var userStore = new Mock<IUserStore<User>>();
            userStore.Setup(s => s.FindByNameAsync(It.IsAny<string>(), It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(null as User);

            var controller = new WellknownController(userStore.Object);

            // Act
            var result = await controller.GetResource("notacct");

            // Assert
            result.Result.Should()
                .BeOfType<BadRequestResult>();
        }

        [Fact]
        public async void GetResource_GivenMissingUser_Return404()
        {
            // Arrange
            var userStore = new Mock<IUserStore<User>>();
            userStore.Setup(s => s.FindByNameAsync(It.IsAny<string>(), It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(null as User);

            var controller = new WellknownController(userStore.Object);

            // Act
            var result = await controller.GetResource("acct:wethegreenpeople");

            // Assert
            result.Result.Should()
                .BeOfType<NotFoundResult>();
        }

        [Fact]
        public async void GetResource_GivenAcctResource_ReturnWebFingerResponse()
        {
            // Arrange
            var userStore = new Mock<IUserStore<User>>();
            userStore.Setup(s => s.FindByNameAsync(It.IsAny<string>(), It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync(new User() { UserName = "wethegreenpeople" });

            var request = new Mock<HttpRequest>();
            request.Setup(x => x.Scheme).Returns("https");
            request.Setup(x => x.Host).Returns(HostString.FromUriComponent("localhost:5000"));

            var httpContext = Mock.Of<HttpContext>(_ => 
                _.Request == request.Object
            );

            //Controller needs a controller context 
            var controllerContext = new ControllerContext() {
                HttpContext = httpContext,
            };
            //assign context to controller
            var controller = new WellknownController(userStore.Object)
            {
                ControllerContext = controllerContext
            };

            // Act
            var response = await controller.GetResource("acct:wethegreenpeople@localhost.xyz");

            // Assert
            response.Result.Should()
                .BeOfType<OkObjectResult>();

            ((OkObjectResult)response.Result).Value.Should()
                .BeOfType<WebFingerResponse>();

            (((OkObjectResult)response.Result).Value as WebFingerResponse).Links.Should()
                .HaveCount(1);
        }
    }
}