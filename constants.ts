
import { AdminConfig } from './types';

export const DEFAULT_CONFIG: AdminConfig = {
  adminPassword: 'admin',
  isVaultInitialized: false,
  appName: 'VOLTCALC',
  themeColor: 'indigo',
  currencySymbol: 'RS'
};

export const STORAGE_KEYS = {
  CONFIG: 'voltcalc_config_v3',
  RECORDS: 'voltcalc_records_v3',
  ROOMS: 'voltcalc_rooms_v3'
};
