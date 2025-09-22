const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

// =============== UPLOAD CONFIGURATION UTILITIES ===============

/**
 * Upload configuration constants
 * Centralized configuration for all file upload settings
 */
const UPLOAD_CONFIG = {
  // File size limits
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  
  // Allowed file extensions (case-insensitive)
  ALLOWED_EXTENSIONS: /\.(jpeg|jpg|png|pdf)$/i,
  
  // Allowed MIME types for security validation
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/pdf'
  ],
  
  // Upload directory paths
  UPLOAD_DIRECTORIES: {
    TEMP_RECEIPTS: path.join(__dirname, '../../uploads/temp_receipts'),
    RECEIPTS: path.join(__dirname, '../../uploads/receipts')
  }
};

/**
 * Creates a destination handler for multer storage
 * Ensures directory exists before allowing uploads
 * 
 * @param {string} uploadDir - The upload directory path
 * @returns {Function} Multer destination handler
 */
const createDestinationHandler = (uploadDir) => {
  return (req, file, cb) => {
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        logger.debug('Created upload directory', { 
          directory: uploadDir,
          fileOriginalName: file.originalname
        });
      }
      cb(null, uploadDir);
    } catch (error) {
      logger.error('Failed to create upload directory', { 
        directory: uploadDir, 
        error: error.message,
        fileOriginalName: file.originalname
      });
      cb(error);
    }
  };
};

/**
 * Generates unique filename with timestamp and random suffix
 * Prevents filename collisions and maintains file extensions
 * 
 * @param {string} prefix - Filename prefix (e.g., 'temp-receipt', 'receipt')
 * @param {Object} file - Multer file object
 * @param {Object} req - Express request object (optional, used for order ID)
 * @returns {string} Generated unique filename
 */
const generateUniqueFilename = (prefix, file, req = null) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const extension = path.extname(file.originalname);
  
  // Special handling for receipt files that include order ID
  if (prefix === 'receipt' && req && req.params && req.params.orderId) {
    return `receipt-${req.params.orderId}-${uniqueSuffix}${extension}`;
  }
  
  return `${prefix}-${uniqueSuffix}${extension}`;
};

/**
 * Enhanced file filter with detailed validation and logging
 * Validates both file extension and MIME type for security
 * 
 * @returns {Function} Multer file filter function
 */
const createFileFilter = () => {
  return (req, file, cb) => {
    try {
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const mimeType = file.mimetype.toLowerCase();
      
      logger.debug('File upload validation started', {
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileExtension,
        fileSize: file.size || 'unknown'
      });
      
      // Validate file extension
      const validExtension = UPLOAD_CONFIG.ALLOWED_EXTENSIONS.test(fileExtension);
      
      // Validate MIME type
      const validMimeType = UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(mimeType);
      
      // Reject invalid file extensions
      if (!validExtension) {
        const error = new Error(`Invalid file extension. Allowed: ${UPLOAD_CONFIG.ALLOWED_EXTENSIONS.source}`);
        logger.warn('File upload rejected - invalid extension', {
          fileName: file.originalname,
          extension: fileExtension,
          allowedExtensions: UPLOAD_CONFIG.ALLOWED_EXTENSIONS.source
        });
        return cb(error);
      }
      
      // Reject invalid MIME types
      if (!validMimeType) {
        const error = new Error(`Invalid file type. Allowed: ${UPLOAD_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`);
        logger.warn('File upload rejected - invalid MIME type', {
          fileName: file.originalname,
          mimeType: file.mimetype,
          allowedTypes: UPLOAD_CONFIG.ALLOWED_MIME_TYPES
        });
        return cb(error);
      }
      
      logger.debug('File validation passed', { 
        fileName: file.originalname,
        extension: fileExtension,
        mimeType: file.mimetype
      });
      
      cb(null, true);
      
    } catch (error) {
      logger.error('File filter error', { 
        error: error.message,
        fileName: file.originalname,
        stack: error.stack
      });
      cb(error);
    }
  };
};

/**
 * Factory function to create multer upload configurations
 * Creates standardized upload configs with consistent settings
 * 
 * @param {string} uploadDir - Upload directory path
 * @param {string} filenamePrefix - Prefix for generated filenames
 * @returns {Object} Configured multer instance
 */
const createUploadConfig = (uploadDir, filenamePrefix) => {
  return multer({
    storage: multer.diskStorage({
      destination: createDestinationHandler(uploadDir),
      filename: (req, file, cb) => {
        try {
          const filename = generateUniqueFilename(filenamePrefix, file, req);
          logger.debug('Generated filename for upload', { 
            originalName: file.originalname,
            generatedName: filename,
            prefix: filenamePrefix,
            uploadDir: uploadDir
          });
          cb(null, filename);
        } catch (error) {
          logger.error('Filename generation error', { 
            error: error.message,
            prefix: filenamePrefix,
            originalName: file.originalname,
            stack: error.stack
          });
          cb(error);
        }
      }
    }),
    limits: {
      fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE
    },
    fileFilter: createFileFilter()
  });
};

/**
 * Pre-configured upload instances for common use cases
 */
const uploadConfigs = {
  // Temporary receipt uploads (for bank transfer verification)
  tempUpload: createUploadConfig(
    UPLOAD_CONFIG.UPLOAD_DIRECTORIES.TEMP_RECEIPTS, 
    'temp-receipt'
  ),
  
  // Permanent receipt uploads (linked to confirmed orders)
  permanentUpload: createUploadConfig(
    UPLOAD_CONFIG.UPLOAD_DIRECTORIES.RECEIPTS,
    'receipt'
  )
};

module.exports = {
  // Configuration constants
  UPLOAD_CONFIG,
  
  // Utility functions
  createDestinationHandler,
  generateUniqueFilename,
  createFileFilter,
  createUploadConfig,
  
  // Pre-configured upload instances
  tempUpload: uploadConfigs.tempUpload,
  upload: uploadConfigs.permanentUpload
};