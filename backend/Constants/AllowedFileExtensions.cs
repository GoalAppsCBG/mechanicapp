namespace MechanicApp.Server.Constants
{
    /// <summary>
    /// Defines allowed file extensions for upload validation.
    /// </summary>
    public static class AllowedFileExtensions
    {
        /// <summary>Permitted extensions for branding images (logo, favicon).</summary>
        public static readonly string[] Branding = { ".png", ".jpg", ".jpeg", ".svg", ".ico", ".webp" };

        /// <summary>Permitted extensions for repair order photos.</summary>
        public static readonly string[] Photos = { ".png", ".jpg", ".jpeg", ".webp", ".gif" };
    }
}
