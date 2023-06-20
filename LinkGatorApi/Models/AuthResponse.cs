namespace LinkGatorApi.Models
{
    public class AuthResponse
    {
        public required string RefreshToken { get; set; }
        public required string AccessToken { get; set; }
    }
}
