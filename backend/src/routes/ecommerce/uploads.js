const express = require('express');
const { authenticate, hasPermission } = require('../../middleware/auth');
const { handleRouteError } = require('../../utils/loggerUtils');
const { tempUpload } = require('../../utils/uploadConfig');
const path = require('path');
const fs = require('fs');

const router = express.Router();

/**
  * @swagger
  * /ecommerce/receipts/temp-upload:
  *   post:
  *     summary: Upload bank transfer receipt temporarily
  *     tags: [E-commerce]
  *     security:
  *       - bearerAuth: []
  *     requestBody:
  *       required: true
  *       content:
  *         multipart/form-data:
  *           schema:
  *             type: object
  *             properties:
  *               receipt:
  *                 type: string
  *                 format: binary
  *     responses:
  *       200:
  *         description: Receipt uploaded successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 success:
  *                   type: boolean
  *                 filePath:
  *                   type: string
  *                 originalFilename:
  *                   type: string
  *                 fileSize:
  *                   type: integer
  *       400:
  *         description: Invalid file or validation error
  */
 router.post('/receipts/temp-upload', authenticate, tempUpload.single('receipt'), async (req, res) => {
   try {
     if (req.user.role !== 'customer') {
       return res.status(403).json({ message: 'Access denied' });
     }
     
     if (!req.file) {
       return res.status(400).json({ message: 'No file uploaded' });
     }
     
     res.json({
       success: true,
       filePath: req.file.path,
       originalFilename: req.file.originalname,
       fileSize: req.file.size,
       message: 'Receipt uploaded successfully'
     });
   } catch (error) {
     handleRouteError(error, req, res, 'E-commerce - Temporary Receipt Upload');
   }
 });

// Serve uploaded files
router.get('/receipts/:filename', authenticate, hasPermission('ecommerce-orders', 'view'), (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../../uploads/receipts', filename);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    handleRouteError(error, req, res, 'E-commerce - Serve Receipt File');
  }
});

module.exports = router;