using System.Text.Json;
using MechanicApp.Server.Constants;
using MechanicApp.Server.Models;
using MechanicApp.Server.Options;
using MechanicApp.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace MechanicApp.Server.Controllers
{
    /// <summary>
    /// Manages subscription status, Hotmart webhook processing, and admin overrides.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class SubscriptionController(IDbService db, IOptions<HotmartSettings> hotmart) : ControllerBase
    {
        private readonly HotmartSettings _hotmart = hotmart.Value;

        // ────────────────────────────────────────────────────────
        // Public: Check current subscription status (used by frontend guard)
        // ────────────────────────────────────────────────────────
        [AllowAnonymous]
        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var sub = await db.GetAsync<Subscription>(
                @"SELECT * FROM mechanic_db.""Subscriptions""
                  ORDER BY ""Id"" DESC LIMIT 1", new { });

            if (sub == null)
                return Ok(new { active = false, status = "none", message = "No subscription found" });

            var isActive = sub.Status == SubscriptionStatus.Active &&
                           (sub.ExpiresAt == null || sub.ExpiresAt > DateTime.UtcNow);

            return Ok(new
            {
                active = isActive,
                status = sub.Status,
                planName = sub.PlanName,
                expiresAt = sub.ExpiresAt,
                email = sub.Email
            });
        }

        // ────────────────────────────────────────────────────────
        // Public: Return Hotmart checkout/config info for the frontend
        // ────────────────────────────────────────────────────────
        [AllowAnonymous]
        [HttpGet("config")]
        public IActionResult GetConfig()
        {
            return Ok(new
            {
                checkoutUrl = _hotmart.CheckoutUrl,
                productId = _hotmart.ProductId
            });
        }

        // ────────────────────────────────────────────────────────
        // Admin: Get full subscription details
        // ────────────────────────────────────────────────────────
        [Authorize]
        [HttpGet("details")]
        public async Task<IActionResult> GetDetails()
        {
            var subs = await db.GetAll<Subscription>(
                @"SELECT * FROM mechanic_db.""Subscriptions""
                  ORDER BY ""UpdatedAt"" DESC", new { });
            return Ok(subs);
        }

        // ────────────────────────────────────────────────────────
        // Admin: Manually activate subscription (for testing / override)
        // ────────────────────────────────────────────────────────
        [Authorize]
        [HttpPost("activate")]
        public async Task<IActionResult> ManualActivate([FromBody] ManualActivateRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.PlanName) || req.ExpiresAt == null)
                return BadRequest(new { message = "Some required fields are not filled. Please check them." });
            var existing = await db.GetAsync<Subscription>(
                @"SELECT * FROM mechanic_db.""Subscriptions""
                  ORDER BY ""Id"" DESC LIMIT 1", new { });

            if (existing != null)
            {
                await db.EditData(
                    @"UPDATE mechanic_db.""Subscriptions"" SET
                      ""Status""='active',
                      ""PlanName""=@PlanName,
                      ""ExpiresAt""=@ExpiresAt,
                      ""UpdatedAt""=CURRENT_TIMESTAMP
                      WHERE ""Id""=@Id",
                    new { PlanName = req.PlanName ?? "Manual", ExpiresAt = req.ExpiresAt, Id = existing.Id });
            }
            else
            {
                await db.EditData(
                    @"INSERT INTO mechanic_db.""Subscriptions""
                      (""Email"", ""Status"", ""PlanName"", ""ExpiresAt"", ""StartDate"")
                      VALUES (@Email, 'active', @PlanName, @ExpiresAt, CURRENT_TIMESTAMP)",
                    new { Email = req.Email ?? "admin@mechanicapp.local", PlanName = req.PlanName ?? "Manual", ExpiresAt = req.ExpiresAt });
            }

            return Ok(new { message = "Subscription activated" });
        }

        // ────────────────────────────────────────────────────────
        // Hotmart Webhook — receives payment notifications
        // Docs: https://developers.hotmart.com/docs/en/webhooks/
        // ────────────────────────────────────────────────────────
        [AllowAnonymous]
        [HttpPost("webhook/hotmart")]
        public async Task<IActionResult> HotmartWebhook()
        {
            // Read raw body
            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();

            // Verify hottok
            var expectedToken = _hotmart.Hottok;
            var receivedToken = Request.Headers["X-HOTMART-HOTTOK"].FirstOrDefault();

            if (!string.IsNullOrEmpty(expectedToken) && receivedToken != expectedToken)
                return Unauthorized(new { message = "Invalid hottok" });

            // Parse the webhook payload
            JsonDocument? doc;
            try
            {
                doc = JsonDocument.Parse(body);
            }
            catch
            {
                return BadRequest(new { message = "Invalid JSON body" });
            }

            var root = doc.RootElement;

            // Extract key fields from Hotmart webhook
            var eventName = root.TryGetProperty("event", out var ev) ? ev.GetString() : null;
            var buyerEmail = "";
            var transactionId = "";
            var subscriptionId = "";

            if (root.TryGetProperty("data", out var data))
            {
                if (data.TryGetProperty("buyer", out var buyer) &&
                    buyer.TryGetProperty("email", out var email))
                    buyerEmail = email.GetString() ?? "";

                if (data.TryGetProperty("purchase", out var purchase))
                {
                    if (purchase.TryGetProperty("transaction", out var txn))
                        transactionId = txn.GetString() ?? "";
                    if (purchase.TryGetProperty("order_date", out _)) { }
                }

                if (data.TryGetProperty("subscription", out var sub) &&
                    sub.TryGetProperty("subscriber", out var subscriber) &&
                    subscriber.TryGetProperty("code", out var code))
                    subscriptionId = code.GetString() ?? "";
            }

            // Determine action based on event type
            var status = eventName switch
            {
                "PURCHASE_APPROVED" => SubscriptionStatus.Active,
                "PURCHASE_COMPLETE" => SubscriptionStatus.Active,
                "SUBSCRIPTION_CANCELLATION" => SubscriptionStatus.Cancelled,
                "PURCHASE_REFUNDED" => SubscriptionStatus.Refunded,
                "PURCHASE_CHARGEBACK" => SubscriptionStatus.Refunded,
                "PURCHASE_DELAYED" => SubscriptionStatus.Inactive,
                "PURCHASE_PROTEST" => SubscriptionStatus.Inactive,
                _ => (string?)null
            };

            if (status == null)
                return Ok(new { message = $"Event '{eventName}' acknowledged but no action taken" });

            // Upsert subscription
            var existing = await db.GetAsync<Subscription>(
                @"SELECT * FROM mechanic_db.""Subscriptions""
                  WHERE ""HotmartTransactionId"" = @TransactionId
                     OR ""Email"" = @Email
                  ORDER BY ""Id"" DESC LIMIT 1",
                new { TransactionId = transactionId, Email = buyerEmail });

            if (existing != null)
            {
                await db.EditData(
                    @"UPDATE mechanic_db.""Subscriptions"" SET
                      ""Status""=@Status,
                      ""HotmartTransactionId""=COALESCE(@TransactionId, ""HotmartTransactionId""),
                      ""HotmartSubscriptionId""=COALESCE(@SubscriptionId, ""HotmartSubscriptionId""),
                      ""HotmartPayload""=@Payload::JSONB,
                      ""ExpiresAt""= CASE WHEN @Status='active' THEN CURRENT_TIMESTAMP + INTERVAL '30 days' ELSE ""ExpiresAt"" END,
                      ""UpdatedAt""=CURRENT_TIMESTAMP
                      WHERE ""Id""=@Id",
                    new
                    {
                        Status = status,
                        TransactionId = string.IsNullOrEmpty(transactionId) ? null : transactionId,
                        SubscriptionId = string.IsNullOrEmpty(subscriptionId) ? null : subscriptionId,
                        Payload = body,
                        Id = existing.Id
                    });
            }
            else
            {
                await db.EditData(
                    @"INSERT INTO mechanic_db.""Subscriptions""
                      (""Email"", ""HotmartTransactionId"", ""HotmartSubscriptionId"", ""Status"",
                       ""PlanName"", ""StartDate"", ""ExpiresAt"", ""HotmartPayload"")
                      VALUES (@Email, @TransactionId, @SubscriptionId, @Status,
                              'Hotmart', CURRENT_TIMESTAMP,
                              CASE WHEN @Status='active' THEN CURRENT_TIMESTAMP + INTERVAL '30 days' ELSE NULL END,
                              @Payload::JSONB)",
                    new
                    {
                        Email = buyerEmail,
                        TransactionId = string.IsNullOrEmpty(transactionId) ? null : transactionId,
                        SubscriptionId = string.IsNullOrEmpty(subscriptionId) ? null : subscriptionId,
                        Status = status,
                        Payload = body
                    });
            }

            return Ok(new { message = $"Webhook processed: {eventName} -> {status}" });
        }
    }
}
