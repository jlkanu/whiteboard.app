/**
 * Notification & Toast Manager
 * Provides non-intrusive status toast announcements.
 */

export function showToast(message, type = 'info', duration = 3000) {
  if (typeof document === 'undefined') return;

  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.role = 'alert';
  
  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  toast.appendChild(textSpan);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-icon sm btn-subtle';
  closeBtn.style.color = '#ffffff';
  closeBtn.innerHTML = '&#215;';
  closeBtn.ariaLabel = 'Close notification';
  closeBtn.onclick = () => removeToast(toast);
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      removeToast(toast);
    }, duration);
  }
}

function removeToast(toast) {
  if (toast.parentNode) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 200ms ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  }
}
