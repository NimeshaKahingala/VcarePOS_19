const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { pool } = require('../utils/db');
const { authenticate, hasPermission } = require('../middleware/auth');
const { generateToken, hashPassword, comparePassword } = require('../utils/auth');
const { handleRouteError, logger } = require('../utils/loggerUtils');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for temporary receipt uploads
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/temp_receipts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `temp-receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const tempUpload = multer({
  storage: tempStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  }
});

// Configure multer for permanent receipt uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/receipts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `receipt-${req.params.orderId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  }
});

/**
 * @swagger
 * tags:
 *   name: E-commerce
 *   description: E-commerce website API endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     EcommerceProduct:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *         price:
 *           type: number
 *         stock:
 *           type: integer
 *         image:
 *           type: string
 *         colors:
 *           type: array
 *           items:
 *             type: object
 *     EcommerceOrder:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         customerName:
 *           type: string
 *         customerEmail:
 *           type: string
 *         customerPhone:
 *           type: string
 *         customerAddress:
 *           type: string
 *         totalAmount:
 *           type: number
 *         paymentMethod:
 *           type: string
 *         orderStatus:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             type: object
 */

// ============= PUBLIC ENDPOINTS (No Authentication Required) =============

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
 
 /**
 * @swagger
 * /ecommerce/products:
 *   get:
 *     summary: Get all products for e-commerce display
 *     tags: [E-commerce]
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EcommerceProduct'
 */
router.get('/products', async (req, res) => {
  try {
    logger.info('E-commerce products endpoint hit', { 
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip 
    });
    
    const client = await pool.connect();
    
    // Get all active products with their colors and sizes
    const productsResult = await client.query(`
      SELECT * FROM products
      ORDER BY created_at DESC
    `);
    
    logger.debug('Raw products from database', { 
      productCount: productsResult.rows.length,
      sampleProduct: productsResult.rows[0] ? {
        id: productsResult.rows[0].id,
        name: productsResult.rows[0].name,
        stock: productsResult.rows[0].stock,
        category: productsResult.rows[0].category
      } : null
    });
    
    // Get all product colors
    const colorsResult = await client.query(`
      SELECT * FROM product_colors
    `);
    
    logger.debug('Product colors from database', { 
      colorCount: colorsResult.rows.length,
      sampleColor: colorsResult.rows[0] ? {
        id: colorsResult.rows[0].id,
        product_id: colorsResult.rows[0].product_id,
        name: colorsResult.rows[0].name
      } : null
    });
    
    // Get all product sizes
    const sizesResult = await client.query(`
      SELECT * FROM product_sizes
    `);
    
    logger.debug('Product sizes from database', { 
      sizeCount: sizesResult.rows.length,
      sampleSize: sizesResult.rows[0] ? {
        id: sizesResult.rows[0].id,
        product_color_id: sizesResult.rows[0].product_color_id,
        name: sizesResult.rows[0].name,
        stock: sizesResult.rows[0].stock
      } : null
    });
    
    client.release();
    
    // Map colors and sizes to their respective products
    const products = productsResult.rows.map(product => {
      logger.debug('Processing product', { 
        productId: product.id,
        productName: product.name,
        productStock: product.stock
      });
      
      const colors = colorsResult.rows
        .filter(color => color.product_id === product.id)
        .map(color => {
          logger.debug('Processing color for product', { 
            productId: product.id,
            colorId: color.id,
            colorName: color.name
          });
          
          const colorSizes = sizesResult.rows
            .filter(size => size.product_color_id === color.id)
            .map(size => ({
              id: size.id,
              name: size.name,
              stock: size.stock,
              dimensions: size.dimensions,
              weight: parseFloat(size.weight || 0)
            }));
          
          logger.debug('Color sizes mapped', { 
            colorId: color.id,
            sizesCount: colorSizes.length,
            totalSizeStock: colorSizes.reduce((sum, s) => sum + (s.stock || 0), 0)
          });
          
          return {
            id: color.id,
            name: color.name,
            colorCode: color.color_code,
            image: color.image,
            sizes: colorSizes
          };
        });
      
      // Calculate total stock from all color sizes
      // Use robust stock calculation: if no colors/sizes exist, use product.stock
      const totalStock = colors.length > 0 
        ? colors.reduce((total, color) => 
            total + color.sizes.reduce((colorTotal, size) => colorTotal + (size.stock || 0), 0), 0
          )
        : product.stock; // Fallback to main product stock if no variants
      
      logger.debug('Product stock calculation', { 
        productId: product.id,
        originalStock: product.stock,
        calculatedTotalStock: totalStock,
        colorsCount: colors.length
      });
      
      const formattedProduct = {
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        price: parseFloat(product.price),
        stock: totalStock || 0, // Ensure stock is never null/undefined
        barcode: product.barcode,
        image: product.image,
        colors,
        createdAt: product.created_at
      };
      
      logger.debug('Formatted product', { 
        productId: formattedProduct.id,
        finalStock: formattedProduct.stock,
        hasColors: formattedProduct.colors.length > 0
      });
      
      return formattedProduct;
    });
    
    logger.info('E-commerce products response prepared', { 
      totalProducts: products.length,
      productsWithStock: products.filter(p => p.stock > 0).length,
      productsWithColors: products.filter(p => p.colors.length > 0).length,
      sampleProductIds: products.slice(0, 3).map(p => p.id)
    });
    
    res.json(products);
  } catch (error) {
    logger.error('E-commerce products endpoint error', { 
      error: error.message,
      stack: error.stack
    });
    handleRouteError(error, req, res, 'E-commerce - Fetch Products');
  }
});

/**
 * @swagger
 * /ecommerce/products/{id}:
 *   get:
 *     summary: Get product details by ID
 *     tags: [E-commerce]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await pool.connect();
    
    // Get product
    const productResult = await client.query(`
      SELECT * FROM products WHERE id = $1
    `, [id]);
    
    if (productResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = productResult.rows[0];
    
    // Get product colors and sizes (same logic as above)
    const colorsResult = await client.query(`
      SELECT * FROM product_colors WHERE product_id = $1
    `, [id]);
    
    const sizesResult = await client.query(`
      SELECT ps.*, pc.id as color_id
      FROM product_sizes ps
      JOIN product_colors pc ON ps.product_color_id = pc.id
      WHERE pc.product_id = $1
    `, [id]);
    
    client.release();
    
    const colors = colorsResult.rows.map(color => {
      const colorSizes = sizesResult.rows
        .filter(size => size.color_id === color.id)
        .map(size => ({
          id: size.id,
          name: size.name,
          stock: size.stock,
          dimensions: size.dimensions,
          weight: parseFloat(size.weight || 0)
        }));
      
      return {
        id: color.id,
        name: color.name,
        colorCode: color.color_code,
        image: color.image,
        sizes: colorSizes
      };
    });
    
    // Use robust stock calculation for single product view
    const totalStock = colors.length > 0 
      ? colors.reduce((total, color) => 
          total + color.sizes.reduce((colorTotal, size) => colorTotal + (size.stock || 0), 0), 0
        )
      : product.stock; // Fallback to main product stock if no variants
    
    const formattedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: parseFloat(product.price),
      stock: totalStock || 0, // Ensure stock is never null/undefined
      barcode: product.barcode,
      image: product.image,
      colors,
      createdAt: product.created_at
    };
    
    res.json(formattedProduct);
  } catch (error) {
    handleRouteError(error, req, res, 'E-commerce - Fetch Product Details');
  }
});

// ============= CUSTOMER AUTHENTICATION ENDPOINTS =============

/**
 * @swagger
 * /ecommerce/auth/register:
 *   post:
 *     summary: Register new customer
 *     tags: [E-commerce]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Customer registered successfully
 *       400:
 *         description: Validation error or email already exists
 */
router.post('/auth/register', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { firstName, lastName, email, password, phone } = req.body;

  try {
    const client = await pool.connect();
    
    // Check if email already exists
    const existingUser = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      client.release();
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Generate customer ID
    const customerId = `CUSTOMER-${Date.now()}`;
    
    // Create customer permissions (limited to viewing their own orders)
    const customerPermissions = {
      "ecommerce": {"view": true, "edit": false, "delete": false}
    };
    
    // Insert new customer
    const result = await client.query(`
      INSERT INTO users (
        id, username, password, email, first_name, last_name, role, is_active, permissions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, username, email, first_name, last_name, role, created_at
    `, [
      customerId,
      email, // Use email as username for customers
      hashedPassword,
      email,
      firstName,
      lastName,
      'customer',
      true,
      JSON.stringify(customerPermissions)
    ]);
    
    client.release();
    
    const customer = result.rows[0];
    
    // Generate JWT token
    const token = generateToken(customer);
    
    res.status(201).json({
      success: true,
      token,
      customer: {
        id: customer.id,
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email,
        role: customer.role,
        createdAt: customer.created_at
      }
    });
  } catch (error) {
    handleRouteError(error, req, res, 'E-commerce - Customer Registration');
  }
});

/**
 * @swagger
 * /ecommerce/auth/login:
 *   post:
 *     summary: Customer login
 *     tags: [E-commerce]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/auth/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const client = await pool.connect();
    
    // Find customer by email
    const result = await client.query(
      'SELECT * FROM users WHERE email = $1 AND role = $2',
      [email, 'customer']
    );
    
    if (result.rows.length === 0) {
      client.release();
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const customer = result.rows[0];
    
    // Check if customer is active
    if (!customer.is_active) {
      client.release();
      return res.status(401).json({ message: 'Account is inactive' });
    }
    
    // Check password
    const isMatch = await comparePassword(password, customer.password);
    if (!isMatch) {
      client.release();
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    await client.query(
      'UPDATE users SET last_login = $1 WHERE id = $2',
      [new Date(), customer.id]
    );
    
    client.release();
    
    // Generate JWT token
    const token = generateToken(customer);
    
    res.json({
      success: true,
      token,
      customer: {
        id: customer.id,
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email,
        role: customer.role,
        lastLogin: new Date()
      }
    });
  } catch (error) {
    handleRouteError(error, req, res, 'E-commerce - Customer Login');
  }
});

/**
 * @swagger
 * /ecommerce/auth/me:
 *   get:
 *     summary: Get current customer profile
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer profile
 *       401:
 *         description: Unauthorized
 */
router.get('/auth/me', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const client = await pool.connect();
    const result = await client.query(
      'SELECT id, username, email, first_name, last_name, role, created_at, last_login FROM users WHERE id = $1',
      [req.user.id]
    );
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    const customer = result.rows[0];
    
    res.json({
      id: customer.id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      role: customer.role,
      createdAt: customer.created_at,
      lastLogin: customer.last_login
    });
  } catch (error) {
    handleRouteError(error, req, res, 'E-commerce - Get Customer Profile');
  }
});

// ============= CUSTOMER ORDER ENDPOINTS =============

/**
 * @swagger
 * /ecommerce/orders:
 *   post:
 *     summary: Place a new order
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerName:
 *                 type: string
 *               customerEmail:
 *                 type: string
 *               customerPhone:
 *                 type: string
 *               customerAddress:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error
 */
router.post('/orders', [
  authenticate,
  body('customerName').notEmpty().withMessage('Customer name is required'),
  body('customerEmail').isEmail().withMessage('Valid email is required'),
  body('customerAddress').notEmpty().withMessage('Customer address is required'),
  body('paymentMethod').isIn(['cash_on_delivery', 'bank_transfer']).withMessage('Invalid payment method'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  // Conditional validation for bank transfer receipt
  body('receiptDetails').custom((value, { req }) => {
    if (req.body.paymentMethod === 'bank_transfer') {
      if (!value || !value.filePath || !value.originalFilename || !value.fileSize) {
        throw new Error('Receipt details are required for bank transfer orders');
      }
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  if (req.user.role !== 'customer') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const {
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    paymentMethod,
    items,
    receiptDetails
  } = req.body;

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Calculate total amount
    let totalAmount = 0;
    const validatedItems = [];
    
    for (const item of items) {
      // Validate product exists and has stock
      const productResult = await client.query(
        'SELECT * FROM products WHERE id = $1',
        [item.productId]
      );
      
      if (productResult.rows.length === 0) {
        throw new Error(`Product ${item.productId} not found`);
      }
      
      const product = productResult.rows[0];
      
      // Check stock availability
      if (item.selectedColorId && item.selectedSize) {
        const sizeResult = await client.query(`
          SELECT ps.* FROM product_sizes ps
          JOIN product_colors pc ON ps.product_color_id = pc.id
          WHERE pc.id = $1 AND ps.name = $2
        `, [item.selectedColorId, item.selectedSize]);
        
        if (sizeResult.rows.length === 0) {
          throw new Error(`Size ${item.selectedSize} not found for product ${product.name}`);
        }
        
        const size = sizeResult.rows[0];
        if (size.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name} - ${item.selectedSize}`);
        }
      } else {
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
      }
      
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      validatedItems.push({
        productId: item.productId,
        productName: product.name,
        selectedColorId: item.selectedColorId,
        selectedSize: item.selectedSize,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: itemTotal
      });
    }
    
    // Generate order ID
    const orderId = `ECOM-${Date.now()}`;
    
    // Insert order
    const orderResult = await client.query(`
      INSERT INTO ecommerce_orders (
        id, customer_id, customer_name, customer_email, customer_phone,
        customer_address, total_amount, payment_method, order_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      orderId,
      req.user.id,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      totalAmount,
      paymentMethod,
      paymentMethod === 'cash_on_delivery' ? 'processing' : 'processing'
    ]);
    
    // Handle bank transfer receipt if provided
    if (paymentMethod === 'bank_transfer' && receiptDetails) {
      // Generate receipt ID
      const receiptId = `RECEIPT-${Date.now()}`;
      
      // Move file from temp location to permanent location
      const tempPath = receiptDetails.filePath;
      const permanentDir = path.join(__dirname, '../../uploads/receipts');
      if (!fs.existsSync(permanentDir)) {
        fs.mkdirSync(permanentDir, { recursive: true });
      }
      
      const permanentFilename = `receipt-${orderId}-${Date.now()}${path.extname(receiptDetails.originalFilename)}`;
      const permanentPath = path.join(permanentDir, permanentFilename);
      
      // Move file from temp to permanent location
      if (fs.existsSync(tempPath)) {
        fs.renameSync(tempPath, permanentPath);
      }
      
      // Insert receipt record
      await client.query(`
        INSERT INTO bank_receipts (
          id, ecommerce_order_id, file_path, original_filename, file_size, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        receiptId,
        orderId,
        permanentPath,
        receiptDetails.originalFilename,
        receiptDetails.fileSize,
        'pending_verification'
      ]);
    }
    
    // Insert order items
    for (const item of validatedItems) {
      await client.query(`
        INSERT INTO ecommerce_order_items (
          ecommerce_order_id, product_id, product_name, selected_color_id,
          selected_size, quantity, unit_price, total_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        orderId,
        item.productId,
        item.productName,
        item.selectedColorId,
        item.selectedSize,
        item.quantity,
        item.unitPrice,
        item.totalPrice
      ]);
      
      // Update product stock
      if (item.selectedColorId && item.selectedSize) {
        await client.query(`
          UPDATE product_sizes
          SET stock = stock - $1
          WHERE id = (
            SELECT ps.id 
            FROM product_sizes ps
            JOIN product_colors pc ON ps.product_color_id = pc.id
            WHERE pc.id = $2 AND ps.name = $3
          )
        `, [item.quantity, item.selectedColorId, item.selectedSize]);
        
        // Update total product stock
        await client.query(`
          UPDATE products
          SET stock = (
            SELECT COALESCE(SUM(ps.stock), 0)
            FROM product_sizes ps
            JOIN product_colors pc ON ps.product_color_id = pc.id
            WHERE pc.product_id = $1
          )
          WHERE id = $1
        `, [item.productId]);
      } else {
        await client.query(`
          UPDATE products
          SET stock = GREATEST(0, stock - $1)
          WHERE id = $2
        `, [item.quantity, item.productId]);
      }
    }
    
    await client.query('COMMIT');
    
    const order = orderResult.rows[0];
    
    res.status(201).json({
      id: order.id,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      totalAmount: parseFloat(order.total_amount),
      paymentMethod: order.payment_method,
      orderStatus: order.order_status,
      createdAt: order.created_at,
      items: validatedItems
    });
  } catch (error) {
    await client.query('ROLLBACK');
    
    // Clean up temporary file if it exists
    if (req.body.receiptDetails && req.body.receiptDetails.filePath) {
      try {
        if (fs.existsSync(req.body.receiptDetails.filePath)) {
          fs.unlinkSync(req.body.receiptDetails.filePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }
    }
    
    handleRouteError(error, req, res, 'E-commerce - Create Order');
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /ecommerce/users/{userId}/orders:
 *   get:
 *     summary: Get customer order history
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer orders
 *       403:
 *         description: Access denied
 */
router.get('/users/:userId/orders', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ensure customer can only view their own orders
    if (req.user.role === 'customer' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const client = await pool.connect();
    
    // Get customer orders
    const ordersResult = await client.query(`
      SELECT * FROM ecommerce_orders 
      WHERE customer_id = $1 
      ORDER BY created_at DESC
    `, [userId]);
    
    // Get order items
    const itemsResult = await client.query(`
      SELECT * FROM ecommerce_order_items 
      WHERE ecommerce_order_id IN (
        SELECT id FROM ecommerce_orders WHERE customer_id = $1
      )
    `, [userId]);
    
    client.release();
    
    // Map items to orders
    const orders = ordersResult.rows.map(order => {
      const orderItems = itemsResult.rows
        .filter(item => item.ecommerce_order_id === order.id)
        .map(item => ({
          productId: item.product_id,
          productName: item.product_name,
          selectedColorId: item.selected_color_id,
          selectedSize: item.selected_size,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price),
          totalPrice: parseFloat(item.total_price)
        }));
      
      return {
        id: order.id,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        customerAddress: order.customer_address,
        totalAmount: parseFloat(order.total_amount),
        paymentMethod: order.payment_method,
        orderStatus: order.order_status,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: orderItems
      };
    });
    
    res.json(orders);
  } catch (error) {
    handleRouteError(error, req, res, 'E-commerce - Get Customer Orders');
  }
});

// ============= POS ADMIN ENDPOINTS (Authentication Required) =============

/**
 * @swagger
 * /ecommerce/orders:
 *   get:
 *     summary: Get all e-commerce orders (POS Admin)
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all e-commerce orders
 */
router.get('/orders', authenticate, hasPermission('ecommerce-orders', 'view'), async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Get all e-commerce orders
    const ordersResult = await client.query(`
      SELECT * FROM ecommerce_orders 
      ORDER BY created_at DESC
    `);
    
    // Get all order items
    const itemsResult = await client.query(`
      SELECT * FROM ecommerce_order_items
    `);
    
    // Get all bank receipts
    const receiptsResult = await client.query(`
      SELECT * FROM bank_receipts
    `);
    
    client.release();
    
    // Map items and receipts to orders
    const orders = ordersResult.rows.map(order => {
      const orderItems = itemsResult.rows
        .filter(item => item.ecommerce_order_id === order.id)
        .map(item => ({
          productId: item.product_id,
          productName: item.product_name,
          selectedColorId: item.selected_color_id,
          selectedSize: item.selected_size,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price),
          totalPrice: parseFloat(item.total_price)
        }));
      
      const bankReceipt = receiptsResult.rows.find(receipt => receipt.ecommerce_order_id === order.id);
      
      return {
        id: order.id,
        customerId: order.customer_id,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        customerAddress: order.customer_address,
        totalAmount: parseFloat(order.total_amount),
        paymentMethod: order.payment_method,
        orderStatus: order.order_status,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: orderItems,
        bankReceipt: bankReceipt ? {
          id: bankReceipt.id,
          filePath: bankReceipt.file_path,
          originalFilename: bankReceipt.original_filename,
          fileSize: bankReceipt.file_size,
          uploadedAt: bankReceipt.uploaded_at,
          status: bankReceipt.status
        } : null
      };
    });
    
    res.json(orders);
  } catch (error) {
    handleRouteError(error, req, res, 'E-commerce - Get All Orders (POS)');
  }
});

/**
 * @swagger
 * /ecommerce/orders/{orderId}:
 *   get:
 *     summary: Get e-commerce order details (POS Admin)
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get('/orders/:orderId', authenticate, hasPermission('ecommerce-orders', 'view'), async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const client = await pool.connect();
    
    // Get order
    const orderResult = await client.query(`
      SELECT * FROM ecommerce_orders WHERE id = $1
    `, [orderId]);
    
    if (orderResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = orderResult.rows[0];
    
    // Get order items
    const itemsResult = await client.query(`
      SELECT * FROM ecommerce_order_items WHERE ecommerce_order_id = $1
    `, [orderId]);
    
    // Get bank receipt if exists
    const receiptResult = await client.query(`
      SELECT * FROM bank_receipts WHERE ecommerce_order_id = $1
    `, [orderId]);
    
    client.release();
    
    const orderItems = itemsResult.rows.map(item => ({
      productId: item.product_id,
      productName: item.product_name,
      selectedColorId: item.selected_color_id,
      selectedSize: item.selected_size,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unit_price),
      totalPrice: parseFloat(item.total_price)
    }));
    
    const bankReceipt = receiptResult.rows.length > 0 ? {
      id: receiptResult.rows[0].id,
      filePath: receiptResult.rows[0].file_path,
      originalFilename: receiptResult.rows[0].original_filename,
      fileSize: receiptResult.rows[0].file_size,
      uploadedAt: receiptResult.rows[0].uploaded_at,
      status: receiptResult.rows[0].status
    } : null;
    
    res.json({
      id: order.id,
      customerId: order.customer_id,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      customerAddress: order.customer_address,
      totalAmount: parseFloat(order.total_amount),
      paymentMethod: order.payment_method,
      orderStatus: order.order_status,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: orderItems,
      bankReceipt
    });
  } catch (error) {
    handleRouteError(error, req, res, 'E-commerce - Get Order Details (POS)');
  }
});

/**
 * @swagger
 * /ecommerce/orders/{orderId}/status:
 *   put:
 *     summary: Update e-commerce order status (POS Admin)
 *     tags: [E-commerce]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated
 *       404:
 *         description: Order not found
 */
router.put('/orders/:orderId/status', [
  authenticate,
  hasPermission('ecommerce-orders', 'edit'),
  param('orderId').notEmpty().withMessage('Order ID is required'),
  body('status').isIn(['pending_payment', 'processing', 'shipped', 'completed', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { orderId } = req.params;
  const { status, notes } = req.body;
  
  try {
    const client = await pool.connect();
    
    // Check if order exists
    const checkResult = await client.query(
      'SELECT * FROM ecommerce_orders WHERE id = $1',
      [orderId]
    );
    
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Update order status
    const result = await client.query(
      'UPDATE ecommerce_orders SET order_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, orderId]
    );
    
    client.release();
    
    const order = result.rows[0];
    
    res.json({
      id: order.id,
      orderStatus: order.order_status,
      updatedAt: order.updated_at
    });
  } catch (error) {
    handleRouteError(error, req, res, 'E-commerce - Update Order Status');
  }
});

// Serve uploaded files
router.get('/receipts/:filename', authenticate, hasPermission('ecommerce-orders', 'view'), (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads/receipts', filename);
    
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