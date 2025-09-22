/**
 * Barcode Scanner Configuration
 * Centralized configuration for barcode scanning functionality
 */

export const BARCODE_SCANNER_CONFIG = {
  // Whether the barcode scanner is enabled
  ENABLED: import.meta.env.VITE_BARCODE_SCANNER_ENABLED === 'true',
  
  // Keys that trigger the end of barcode input (scanner sends these after barcode)
  END_KEYS: import.meta.env.VITE_BARCODE_END_KEYS?.split(',') || ['Enter', 'Tab'],
  
  // Minimum length of a valid barcode
  MIN_LENGTH: parseInt(import.meta.env.VITE_BARCODE_MIN_LENGTH) || 4,
  
  // Maximum time between keystrokes for barcode input (milliseconds)
  TIMEOUT_MS: parseInt(import.meta.env.VITE_BARCODE_TIMEOUT_MS) || 80,
  
  // Whether to allow barcode scanning when focused on input elements
  ALLOW_IN_INPUTS: import.meta.env.VITE_BARCODE_ALLOW_IN_INPUTS === 'true',
  
  // Prefix to remove from scanned barcodes (if scanner adds one)
  PREFIX: import.meta.env.VITE_BARCODE_PREFIX || '',
  
  // Suffix to remove from scanned barcodes (if scanner adds one)
  SUFFIX: import.meta.env.VITE_BARCODE_SUFFIX || '',
  
  // Whether to show the barcode simulator (for testing)
  SIMULATOR_VISIBLE: import.meta.env.VITE_BARCODE_SIMULATOR_VISIBLE === 'true'
};

/**
 * Default barcode scanner options
 */
export const DEFAULT_SCANNER_OPTIONS = {
  enabled: BARCODE_SCANNER_CONFIG.ENABLED,
  endKeys: BARCODE_SCANNER_CONFIG.END_KEYS,
  minLength: BARCODE_SCANNER_CONFIG.MIN_LENGTH,
  scanTimeoutMs: BARCODE_SCANNER_CONFIG.TIMEOUT_MS,
  allowInInputs: BARCODE_SCANNER_CONFIG.ALLOW_IN_INPUTS,
  prefix: BARCODE_SCANNER_CONFIG.PREFIX,
  suffix: BARCODE_SCANNER_CONFIG.SUFFIX,
  onScan: null // Must be provided by consumer
};

/**
 * Barcode validation patterns
 */
export const BARCODE_PATTERNS = {
  // Common barcode formats
  CODE128: /^[!-~]+$/, // ASCII printable characters
  CODE39: /^[A-Z0-9\-. $/+%]+$/, // CODE39 character set
  EAN13: /^\d{13}$/, // 13 digits
  EAN8: /^\d{8}$/, // 8 digits
  UPC: /^\d{12}$/, // 12 digits
  NUMERIC: /^\d+$/, // Any numeric sequence
  ALPHANUMERIC: /^[A-Z0-9]+$/ // Letters and numbers only
};

/**
 * Scanner status constants
 */
export const SCANNER_STATUS = {
  IDLE: 'idle',
  SCANNING: 'scanning',
  PROCESSING: 'processing',
  ERROR: 'error',
  DISABLED: 'disabled'
};

export default {
  BARCODE_SCANNER_CONFIG,
  DEFAULT_SCANNER_OPTIONS,
  BARCODE_PATTERNS,
  SCANNER_STATUS
};