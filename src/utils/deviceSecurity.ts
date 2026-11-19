/**
 * Device Security & Unique Session Identification
 * Enforces single active mobile device login for regular users.
 * Exempts APP_MODERATOR.
 */

const DEVICE_ID_KEY = 'basis_device_id_v1';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server_session';
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id || id.length < 8) {
      id = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'dev_fallback_' + Date.now();
  }
}
