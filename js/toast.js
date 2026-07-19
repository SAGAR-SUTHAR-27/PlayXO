/* ==========================================================================
   NEON GRID // TOAST NOTIFICATIONS
   ========================================================================== */

/**
 * Creates and animations a floating toast alert.
 * @param {string} message Text to display
 */
export function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Read toggle state directly from settings DOM
  const notificationsEnabled = document.getElementById('notifications-toggle')
    ? document.getElementById('notifications-toggle').checked
    : true;

  if (!notificationsEnabled) return;

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.textContent = message.toUpperCase();

  // Append to container
  container.appendChild(toast);

  // Auto clean up animations
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, -20px) scale(0.9)';
    
    // Remove from DOM after transition completes
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2200);
}
