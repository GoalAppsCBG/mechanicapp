namespace MechanicApp.Server.Options
{
    /// <summary>
    /// Strongly-typed configuration for Hotmart payment gateway integration.
    /// Bound from the "Hotmart" section in appsettings.json.
    /// </summary>
    public class HotmartSettings
    {
        /// <summary>Configuration section name.</summary>
        public const string SectionName = "Hotmart";

        /// <summary>The webhook verification token (hottok).</summary>
        public string Hottok { get; set; } = string.Empty;

        /// <summary>The Hotmart product identifier.</summary>
        public string ProductId { get; set; } = string.Empty;

        /// <summary>The Hotmart checkout URL for subscription purchases.</summary>
        public string CheckoutUrl { get; set; } = string.Empty;
    }
}
