
import { STORAGE_KEYS, DEFAULT_CONFIG } from '../constants';
import { AdminConfig, BillingRecord, Room, EncryptedVault } from '../types';
import { vaultSecurity } from './encryptionService';

export const storage = {
  isVaultInitialized: (): boolean => {
    return !!localStorage.getItem(STORAGE_KEYS.CONFIG);
  },

  saveVault: async (password: string, rooms: Room[], records: BillingRecord[]) => {
    const vault = await vaultSecurity.encrypt({ rooms, records }, password);
    localStorage.setItem('voltcalc_vault_v2', JSON.stringify(vault));
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify({ isVaultInitialized: true }));
  },

  loadVault: async (password: string): Promise<{ rooms: Room[], records: BillingRecord[] } | null> => {
    const vaultStr = localStorage.getItem('voltcalc_vault_v2');
    if (!vaultStr) return null;
    
    const vault: EncryptedVault = JSON.parse(vaultStr);
    return await vaultSecurity.decrypt(vault, password);
  },

  changeVaultPassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    const data = await storage.loadVault(oldPassword);
    if (!data) throw new Error("Could not access vault to re-encrypt");
    await storage.saveVault(newPassword, data.rooms, data.records);
  },

  exportVault: (): string | null => {
    return localStorage.getItem('voltcalc_vault_v2');
  },

  importVault: (vaultData: string) => {
    try {
      const parsed = JSON.parse(vaultData);
      if (!parsed.iv || !parsed.data || !parsed.salt) throw new Error("Invalid format");
      localStorage.setItem('voltcalc_vault_v2', vaultData);
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify({ isVaultInitialized: true }));
    } catch (e) {
      throw new Error("Failed to import vault: Invalid file format");
    }
  },

  clearAll: () => {
    localStorage.removeItem('voltcalc_vault_v2');
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
    localStorage.removeItem(STORAGE_KEYS.RECORDS);
    localStorage.removeItem(STORAGE_KEYS.ROOMS);
  }
};
