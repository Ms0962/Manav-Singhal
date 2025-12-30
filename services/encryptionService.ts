
/**
 * Encryption Service
 * Implements AES-GCM 256-bit encryption with PBKDF2 key derivation.
 */

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export const vaultSecurity = {
  encrypt: async (data: any, password: string): Promise<{ iv: string; data: string; salt: string }> => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(JSON.stringify(data))
    );

    return {
      iv: btoa(String.fromCharCode(...iv)),
      salt: btoa(String.fromCharCode(...salt)),
      data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    };
  },

  decrypt: async (encryptedVault: { iv: string; data: string; salt: string }, password: string): Promise<any> => {
    try {
      const iv = new Uint8Array(atob(encryptedVault.iv).split('').map(c => c.charCodeAt(0)));
      const salt = new Uint8Array(atob(encryptedVault.salt).split('').map(c => c.charCodeAt(0)));
      const data = new Uint8Array(atob(encryptedVault.data).split('').map(c => c.charCodeAt(0)));
      
      const key = await deriveKey(password, salt);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decrypted));
    } catch (e) {
      throw new Error("Invalid decryption key");
    }
  }
};
