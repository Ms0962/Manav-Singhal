
import { AdminConfig } from './types';

// Corrected DEFAULT_CONFIG to match the AdminConfig interface by removing 'adminPassword' and adding missing required fields.
export const DEFAULT_CONFIG: AdminConfig = {
  userId: '',
  pin: '',
  recoveryEmail: '',
  masterKey: '',
  isVaultInitialized: false,
  appName: 'VOLTCALC',
  themeColor: 'indigo',
  currencySymbol: 'RS',
  partners: []
};

export const STORAGE_KEYS = {
  CONFIG: 'voltcalc_config_v3',
  RECORDS: 'voltcalc_records_v3',
  ROOMS: 'voltcalc_rooms_v3'
};
