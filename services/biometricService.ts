
/**
 * Biometric Service
 * Uses WebAuthn API to provide local hardware-backed authentication.
 */

export const biometricService = {
  isSupported: (): boolean => {
    return !!(window.PublicKeyCredential && 
           window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable);
  },

  checkAvailability: async (): Promise<boolean> => {
    if (!biometricService.isSupported()) return false;
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  },

  // Note: For a pure frontend app, we use WebAuthn to "verify" the user 
  // before retrieving the master key from a local (un-indexed) store.
  register: async (username: string): Promise<boolean> => {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userID = crypto.getRandomValues(new Uint8Array(16));

      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: { name: "VoltCalc Vault", id: window.location.hostname || "localhost" },
        user: {
          id: userID,
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      };

      const credential = await navigator.credentials.create({ publicKey });
      return !!credential;
    } catch (err) {
      console.error("Biometric Registration Error:", err);
      return false;
    }
  },

  authenticate: async (): Promise<boolean> => {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: window.location.hostname || "localhost",
        userVerification: "required",
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({ publicKey });
      return !!assertion;
    } catch (err) {
      console.error("Biometric Auth Error:", err);
      return false;
    }
  }
};
