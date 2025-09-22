import JsBarcode from 'jsbarcode';

/**
 * Barcode generation configuration constants
 */
export const BARCODE_CONFIG = {
  // Standard barcode formats
  FORMATS: {
    CODE128: 'CODE128',
    CODE39: 'CODE39',
    EAN13: 'EAN13',
    EAN8: 'EAN8',
    UPC: 'UPC'
  },

  // Size presets for different use cases
  SIZES: {
    SMALL: {
      width: 1,
      height: 24,
      displayWidth: '80px',
      displayHeight: '24px'
    },
    MEDIUM: {
      width: 1.5,
      height: 32,
      displayWidth: '96px',
      displayHeight: '32px'
    },
    LARGE: {
      width: 2,
      height: 48,
      displayWidth: '160px',
      displayHeight: '48px'
    },
    EXTRA_LARGE: {
      width: 2.5,
      height: 60,
      displayWidth: '200px',
      displayHeight: '60px'
    }
  },

  // Default settings
  DEFAULTS: {
    format: 'CODE128',
    size: 'LARGE',
    displayValue: false,
    margin: 0,
    background: 'transparent',
    lineColor: '#000000'
  }
};

/**
 * Validates if a barcode value is valid for generation
 * @param {string} barcodeValue - The barcode value to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateBarcodeValue = (barcodeValue) => {
  if (!barcodeValue || typeof barcodeValue !== 'string') {
    return false;
  }

  const trimmedValue = barcodeValue.trim();
  if (trimmedValue === '') {
    return false;
  }

  // Basic validation for CODE128 (most common format)
  // CODE128 can handle most ASCII characters (0-127)
  const code128Regex = /^[\u0020-\u007F]+$/;
  return code128Regex.test(trimmedValue);
};

/**
 * Generates a barcode as SVG data URL
 * @param {string} barcodeValue - The value to encode in the barcode
 * @param {Object} options - Configuration options
 * @param {string} options.format - Barcode format (default: CODE128)
 * @param {string} options.size - Size preset (small, medium, large, extra_large)
 * @param {boolean} options.displayValue - Whether to show the value below the barcode
 * @param {number} options.margin - Margin around the barcode
 * @param {string} options.background - Background color
 * @param {string} options.lineColor - Barcode line color
 * @param {number} options.width - Custom width (overrides size preset)
 * @param {number} options.height - Custom height (overrides size preset)
 * @returns {string|null} - SVG data URL or null if generation fails
 */
export const generateBarcode = (barcodeValue, options = {}) => {
  // Validate input
  if (!validateBarcodeValue(barcodeValue)) {
    console.warn('Invalid barcode value:', barcodeValue);
    return null;
  }

  try {
    // Merge options with defaults
    const config = {
      ...BARCODE_CONFIG.DEFAULTS,
      ...options
    };

    // Get size preset if specified
    const sizePreset = BARCODE_CONFIG.SIZES[config.size.toUpperCase()];
    if (sizePreset && !config.width && !config.height) {
      config.width = sizePreset.width;
      config.height = sizePreset.height;
    }

    // Create temporary SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    
    // Generate barcode
    JsBarcode(svg, barcodeValue.trim(), {
      format: config.format,
      width: config.width,
      height: config.height,
      displayValue: config.displayValue,
      margin: config.margin,
      background: config.background,
      lineColor: config.lineColor
    });

    // Convert SVG to data URL
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    return `data:image/svg+xml;base64,${btoa(svgString)}`;
  } catch (error) {
    console.warn('Failed to generate barcode for:', barcodeValue, error);
    return null;
  }
};

/**
 * Generates a barcode with specific display dimensions
 * @param {string} barcodeValue - The value to encode
 * @param {Object} displayDimensions - Display size configuration
 * @param {string} displayDimensions.width - CSS width (e.g., '160px')
 * @param {string} displayDimensions.height - CSS height (e.g., '48px')
 * @param {Object} options - Additional barcode options
 * @returns {Object} - Object containing dataUrl and display dimensions
 */
export const generateBarcodeWithDimensions = (barcodeValue, displayDimensions, options = {}) => {
  const dataUrl = generateBarcode(barcodeValue, options);
  
  if (!dataUrl) {
    return null;
  }

  return {
    dataUrl,
    width: displayDimensions.width,
    height: displayDimensions.height,
    value: barcodeValue.trim()
  };
};

/**
 * Get display dimensions for a size preset
 * @param {string} sizePreset - Size preset name
 * @returns {Object} - Display dimensions object
 */
export const getDisplayDimensions = (sizePreset) => {
  const preset = BARCODE_CONFIG.SIZES[sizePreset.toUpperCase()];
  if (!preset) {
    return BARCODE_CONFIG.SIZES.MEDIUM;
  }

  return {
    width: preset.displayWidth,
    height: preset.displayHeight
  };
};

/**
 * Predefined barcode generation functions for common use cases
 */
export const BarcodePresets = {
  /**
   * Generate a small barcode for compact displays
   */
  small: (value) => generateBarcodeWithDimensions(
    value,
    getDisplayDimensions('SMALL'),
    { size: 'SMALL' }
  ),

  /**
   * Generate a medium barcode for standard displays
   */
  medium: (value) => generateBarcodeWithDimensions(
    value,
    getDisplayDimensions('MEDIUM'),
    { size: 'MEDIUM' }
  ),

  /**
   * Generate a large barcode for product sheets and documents
   */
  large: (value) => generateBarcodeWithDimensions(
    value,
    getDisplayDimensions('LARGE'),
    { size: 'LARGE' }
  ),

  /**
   * Generate an extra large barcode for printing and signage
   */
  extraLarge: (value) => generateBarcodeWithDimensions(
    value,
    getDisplayDimensions('EXTRA_LARGE'),
    { size: 'EXTRA_LARGE' }
  )
};

export default {
  generateBarcode,
  generateBarcodeWithDimensions,
  validateBarcodeValue,
  getDisplayDimensions,
  BarcodePresets,
  BARCODE_CONFIG
};