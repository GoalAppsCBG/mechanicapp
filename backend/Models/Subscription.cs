namespace MechanicApp.Server.Models
{
    public class Subscription
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? HotmartTransactionId { get; set; }
        public string? HotmartSubscriptionId { get; set; }

        /// <summary>active, inactive, cancelled, refunded, expired</summary>
        public string Status { get; set; } = "inactive";

        public string? PlanName { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public string? HotmartPayload { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
