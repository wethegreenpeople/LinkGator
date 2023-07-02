using ActivityPub;

namespace LinkGatorApi.Models
{
    public class WebFingerResponse
    {
        public string Subject { get; set; }

        public List<Link> Links { get; set; }
    }
}
