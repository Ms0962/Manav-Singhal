
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
  isRentOnly?: boolean;
  status?: 'paid' | 'pending';
}

export interface PartnerAccess {
  id: string;
  name: string;
  pin: string;
  role: 'admin' | 'viewer';
}

export interface AdminConfig {
  userId: string;
  pin: string;
  recoveryEmail: string;
  masterKey: string; // Used for OTP simulation
  isVaultInitialized: boolean;
  currencySymbol?: string;
  appName?: string;
  themeColor?: 'indigo' | 'rose' | 'emerald' | 'amber' | 'violet' | 'cyan';
  partners: PartnerAccess[];
  googleSheetUrl?: string;
}

export interface EncryptedVault {
  iv: string;
  data: string;
  salt: string;
}
