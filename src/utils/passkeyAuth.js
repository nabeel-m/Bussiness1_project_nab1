// WebAuthn & Google Passkey Authentication Utilities
// Supports Windows Hello, Google Titan Key, TouchID/FaceID, and Android/iOS Passkeys

/**
 * Checks if the current browser and platform support WebAuthn / Passkeys.
 */
export async function isPasskeySupported() {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return false;
  }
  try {
    if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Converts a string or random bytes to an ArrayBuffer
 */
function strToBuffer(str) {
  return new TextEncoder().encode(str);
}

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Triggers native WebAuthn Passkey Authentication (Assertion).
 * Prompts user with Windows Hello / TouchID / Google Passkey prompt.
 */
export async function authenticatePasskey(email = '') {
  if (!window.PublicKeyCredential) {
    throw new Error('Passkeys / WebAuthn are not supported by this browser.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const publicKeyCredentialRequestOptions = {
    challenge: challenge,
    rpId: window.location.hostname || 'localhost',
    timeout: 60000,
    userVerification: 'preferred'
  };

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions
  });

  if (!assertion) {
    throw new Error('Passkey verification was cancelled or timed out.');
  }

  const rawId = bufferToBase64Url(assertion.rawId);
  return {
    id: assertion.id,
    rawId: rawId,
    type: assertion.type,
    email: email
  };
}

/**
 * Registers / Enrolls a new Google Passkey on this device.
 */
export async function registerPasskey(email, displayName = 'Admin User') {
  if (!window.PublicKeyCredential) {
    throw new Error('Passkeys / WebAuthn are not supported by this browser.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userId = strToBuffer(email || 'admin@smarttech.com');

  const publicKeyCredentialCreationOptions = {
    challenge: challenge,
    rp: {
      name: 'SMART TECH Admin Portal',
      id: window.location.hostname || 'localhost'
    },
    user: {
      id: userId,
      name: email,
      displayName: displayName
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' }, // ES256
      { alg: -257, type: 'public-key' } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Platform passkey (Windows Hello, TouchID, Android)
      userVerification: 'preferred',
      residentKey: 'preferred'
    },
    timeout: 60000,
    attestation: 'none'
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions
  });

  if (!credential) {
    throw new Error('Passkey enrollment was cancelled.');
  }

  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    email: email,
    deviceLabel: navigator.userAgent.includes('Windows') ? 'Windows Hello Passkey' : 'Device Passkey'
  };
}
