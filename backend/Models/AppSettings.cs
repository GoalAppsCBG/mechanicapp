using System.ComponentModel.DataAnnotations;

namespace MechanicApp.Server.Models
{
    public class AppSettings
    {
        public int Id { get; set; }

        [Required, StringLength(100)]
        public string AppName { get; set; } = "MechanicApp";

        [StringLength(500)]
        public string? LogoUrl { get; set; }

        [StringLength(500)]
        public string? FaviconUrl { get; set; }

        [StringLength(300)]
        public string? Address { get; set; }

        [StringLength(30)]
        public string? Phone { get; set; }

        [StringLength(30)]
        public string? WhatsAppPhone { get; set; }

        [StringLength(100)]
        public string? Email { get; set; }

        // Photo cleanup configuration
        public int PhotoCleanupDays { get; set; } = 0;
        public DateTime? PhotoCleanupLastRun { get; set; }

        [StringLength(100)]
        public string? PhotoCleanupLastUser { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}
