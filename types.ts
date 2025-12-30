
export interface Room {
  id: string;
  name: string;
  lastReading: number;
  defaultUnitRate?: number;
  defaultFixedCharge?: number;
  type?: 'room' | 'shop';
}

export interface BillingRecord {
  id: string;
  roomId: string;
  occupantName: string;
  previousUnit: number;
  currentUnit: number;
  totalUnits: number;
  unitRate: number;
  roomRent: number;
  previousBalance: number;
  totalAmount: number;
  date: string;
  aiInsight?: string;
}

export interface AdminConfig {
  adminPassword: string;
  isVaultInitialized: boolean;
  currencySymbol?: string;
  securityHint?: string;
  appName?: string;
  appLogo?: string; // Base64 Data URL
  themeColor?: 'indigo' | 'rose' | 'emerald' | 'amber' | 'violet' | 'cyan';
}

export interface EncryptedVault {
  iv: string;
  data: string;
  salt: string;
}
