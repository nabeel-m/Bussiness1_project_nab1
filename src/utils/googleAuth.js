// Google SSO Utility Functions & JWT Decoder

const GOOGLE_CLIENT_ID_STORAGE_KEY = 'smarttech_google_client_id';

/**
 * Retrieves the Google Client ID from environment variables or localStorage.
 */
export function getGoogleClientId() {
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (envClientId && envClientId.trim() !== '' && !envClientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
    return envClientId.trim();
  }
  const customSaved = localStorage.getItem(GOOGLE_CLIENT_ID_STORAGE_KEY);
  if (customSaved && customSaved.trim() !== '') {
    return customSaved.trim();
  }
  return '';
}

/**
 * Saves a custom Google Client ID to localStorage.
 */
export function setGoogleClientId(clientId) {
  if (clientId && clientId.trim() !== '') {
    localStorage.setItem(GOOGLE_CLIENT_ID_STORAGE_KEY, clientId.trim());
  } else {
    localStorage.removeItem(GOOGLE_CLIENT_ID_STORAGE_KEY);
  }
}

/**
 * Safely decodes a Google JWT credential (ID Token) payload.
 * Extracts: sub (googleId), email, name, picture, given_name, family_name.
 */
export function decodeGoogleJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to decode Google JWT token:', err);
    return null;
  }
}

/**
 * Formats Google user payload into standard SmartTech Auth User Object.
 */
export function formatGoogleUser(googlePayload, role = 'STAFF') {
  return {
    id: `usr-g-${googlePayload.sub ? String(googlePayload.sub).slice(0, 12) : Date.now()}`,
    googleId: googlePayload.sub,
    username: googlePayload.email || `google-user-${googlePayload.sub ? String(googlePayload.sub).slice(0, 6) : Date.now()}`,
    email: googlePayload.email,
    name: googlePayload.name || 'Google User',
    avatar: googlePayload.picture || '🌐',
    role: role, // 'ADMIN' | 'STAFF' | 'VIEWER'
    authProvider: 'GOOGLE'
  };
}
