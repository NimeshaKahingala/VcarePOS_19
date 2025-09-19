const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { pool } = require('../utils/db');
const { authenticate, hasPermission } = require('../middleware/auth');
const { handleRouteError } = require('../utils/loggerUtils');
const { updateInventoryStock, getSafeColorId, getSafeSizeId } = require('../utils/stockUtils');
const { validatePurchaseOrderItemsMiddleware } = require('../middleware/purchaseOrderValidation');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: PurchaseOrders
 *   description: Purchase order management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PurchaseOrder:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: PO-123456
 *         vendorId:
 *           type: string
 *           example: VENDOR-001
 *         vendorName:
 *           type: string
 *           example: ABC Suppliers
 *         vendorEmail:
 *           type: string
 *           example: vendor@example.com
 *         vendorPhone:
 *           type: string
 *           example: '+94112223344'
 *         vendorAddress:
 *           type: string
 *           example: '123 Main St, City'
 *         orderDate:
 *           type: string
 *           format: date
 *         expectedDeliveryDate:
 *           type: string
 *           format: date
 *         shippingAddress:
 *           type: string
 *         paymentTerms:
 *           type: string
 *         shippingMethod:
 *           type: string
 *         notes:
 *           type: string
 *         total:
 *           type: number
 *           example: 1000.50
 *         status:
 *           type: string
 *           example: pending
 *         createdBy:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         items:
 *           type: array
 *           items:
 *             type: object
 *         timeline:
 *           type: array
 *           items:
 *             type: object
 *         goodsReceiveNotes:
 *           type: array
 *           items:
 *             type: object
 */

/**
 * @swagger
 * /purchase-orders:
 *   get:
 *     summary: Get all purchase orders
 *     tags: [PurchaseOrders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of purchase orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PurchaseOrder'
 *   post:
 *     summary: Create a new purchase order
 *     tags: [PurchaseOrders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PurchaseOrder'
 *           example:
 *             vendorId: "V001"
 *             vendorName: "ABC Suppliers"
 *             vendorEmail: "vendor@example.com"
 *             vendorPhone: "+94112223344"
 *             vendorAddress: "123 Main St, City"
 *             orderDate: "2025-07-18"
 *             expectedDeliveryDate: "2025-07-25"
 *             shippingAddress: "456 Delivery Rd, City"
 *             paymentTerms: "Net 30"
 *             shippingMethod: "Standard"
 *             notes: "Urgent delivery requested"
 *             items:
 *               - itemId: "PROD-001"
 *                 type: "product"
 *                 name: "Office Chair"
 *                 sku: "CHAIR-001"
 *                 category: "Furniture"
 *                 unit: "pcs"
 *                 quantity: 10
 *                 unitPrice: 15000
 *                 total: 150000
 *               - itemId: "MAT-002"
 *                 type: "material"
 *                 name: "Wood Plank"
 *                 sku: "WOOD-PLK-002"
 *                 category: "Raw Material"
 *                 unit: "ft"
 *                 quantity: 50
 *                 unitPrice: 500
 *                 total: 25000
 *             status: "pending"
 *     responses:
 *       201:
 *         description: Purchase order created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseOrder'
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /purchase-orders/{id}:
 *   get:
 *     summary: Get a purchase order by ID
 *     tags: [PurchaseOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     responses:
 *       200:
 *         description: Purchase order found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseOrder'
 *       404:
 *         description: Purchase order not found
 *   put:
 *     summary: Update a purchase order
 *     tags: [PurchaseOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PurchaseOrder'
 *     responses:
 *       200:
 *         description: Purchase order updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseOrder'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Purchase order not found
 *   delete:
 *     summary: Delete a purchase order
 *     tags: [PurchaseOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     responses:
 *       200:
 *         description: Purchase order deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Purchase order deleted successfully
 *       400:
 *         description: Cannot delete purchase order that is not pending
 *       404:
 *         description: Purchase order not found
 */

/**
 * @swagger
 * /purchase-orders/{id}/status:
 *   put:
 *     summary: Update purchase order status
 *     tags: [PurchaseOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, ordered, received, completed, cancelled]
 *                 example: approved
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Purchase order status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 status:
 *                   type: string
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                 timeline:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Validation error
 *       404:
 *         description: Purchase order not found
 */

/**
 * @swagger
 * /purchase-orders/{id}/receive:
 *   post:
 *     summary: Create a goods receive note for a purchase order
 *     tags: [PurchaseOrders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               receivedDate:
 *                 type: string
 *                 format: date
 *               receivedBy:
 *                 type: string
 *               checkedBy:
 *                 type: string
 *               notes:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Goods receive note created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Validation error
 *       404:
 *         description: Purchase order not found
 */

/**
 * @route   GET /api/purchase-orders
 * @desc    Get all purchase orders
 * @access  Private
 */
router.get('/', authenticate, hasPermission('purchase-orders', 'view'), async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Get all purchase orders
    const ordersResult = await client.query(`
      SELECT * FROM purchase_orders
      ORDER BY created_at DESC
    `);
    
    // Get all purchase order items
    const itemsResult = await client.query(`
     select
        poi.* ,
        pc."name" as color_name,
        ps."name" as size_name
      from
        purchase_order_items poi
      left join product_colors pc on
        poi.color_id = pc.id
      left join product_sizes ps on
        poi.size_id = ps.id;
    `);
    
    // Get all purchase order timeline events
    const timelineResult = await client.query(`
      SELECT * FROM purchase_order_timeline
      ORDER BY timestamp
    `);
    
    client.release();
    
    // Map items and timeline events to their respective orders
    const purchaseOrders = ordersResult.rows.map(order => {
      const items = itemsResult.rows
        .filter(item => item.purchase_order_id === order.id)
        .map(item => ({
          itemId: item.item_id,
          type: item.type,
          name: item.name,
          sku: item.sku,
          category: item.category,
          unit: item.unit,
          quantity: parseFloat(item.quantity),
          color: {id: item.color_id, name: item.color_name}, 
          size: {id: item.size_id, name: item.size_name},
          unitPrice: parseFloat(item.unit_price),
          total: parseFloat(item.total)
        }));
      
      const timeline = timelineResult.rows
        .filter(event => event.purchase_order_id === order.id)
        .map(event => ({
          status: event.status,
          timestamp: event.timestamp,
          user: event.user_name,
          notes: event.notes
        }));
      
      return {
        id: order.id,
        vendorId: order.vendor_id,
        vendorName: order.vendor_name,
        vendorEmail: order.vendor_email,
        vendorPhone: order.vendor_phone,
        vendorAddress: order.vendor_address,
        orderDate: order.order_date,
        expectedDeliveryDate: order.expected_delivery_date,
        shippingAddress: order.shipping_address,
        paymentTerms: order.payment_terms,
        shippingMethod: order.shipping_method,
        notes: order.notes,
        total: parseFloat(order.total),
        status: order.status,
        createdBy: order.created_by,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items,
        timeline
      };
    });
    
    res.json(purchaseOrders);
  } catch (error) {
    handleRouteError(error, req, res, 'PurchaseOrders - Fetching purchase orders:');
  }
});

/**
 * @route   GET /api/purchase-orders/:id
 * @desc    Get purchase order by ID
 * @access  Private
 */
router.get('/:id', authenticate, hasPermission('purchase-orders', 'view'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await pool.connect();
    
    // Get purchase order
    const orderResult = await client.query(`
      SELECT * FROM purchase_orders WHERE id = $1
    `, [id]);
    
    if (orderResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    
    const order = orderResult.rows[0];
    
    // Get purchase order items
    const itemsResult = await client.query(`
           select
              poi.* ,
              pc."name" as color_name,
              ps."name" as size_name
            from
              purchase_order_items poi
            left join product_colors pc on
              poi.color_id = pc.id
            left join product_sizes ps on
              poi.size_id = ps.id WHERE poi.purchase_order_id = $1
    `, [id]);
    
    // Get purchase order timeline events
    const timelineResult = await client.query(`
      SELECT * FROM purchase_order_timeline
      WHERE purchase_order_id = $1
      ORDER BY timestamp
    `, [id]);
    
    // Get goods receive notes for this purchase order with variant information
    const grnResult = await client.query(`
      SELECT 
        g.*, gi.*,
        pc.name as color_name,
        ps.name as size_name
      FROM goods_receive_notes g
      LEFT JOIN goods_receive_note_items gi ON g.id = gi.grn_id
      LEFT JOIN product_colors pc ON gi.color_id = pc.id
      LEFT JOIN product_sizes ps ON gi.size_id = ps.id
      WHERE g.purchase_order_id = $1
    `, [id]);
    
    client.release();
    
    // Format items
    const items = itemsResult.rows.map(item => ({
      itemId: item.item_id,
      type: item.type,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      quantity: parseFloat(item.quantity),
      color: {id: item.color_id, name: item.color_name}, 
      size: {id: item.size_id, name: item.size_name},
      unitPrice: parseFloat(item.unit_price),
      total: parseFloat(item.total)
    }));
    
    // Format timeline events
    const timeline = timelineResult.rows.map(event => ({
      status: event.status,
      timestamp: event.timestamp,
      user: event.user_name,
      notes: event.notes
    }));
  
    // Format goods receive notes
    const goodsReceiveNotes = grnResult.rows.reduce((acc, row) => {
      // Find existing GRN or create new one
      const existingGrn = acc.find(grn => grn.id === row.id);
      if (existingGrn) {
        // Add item to existing GRN
        if (row.grn_id) {
          existingGrn.items.push({
            itemId: row.item_id,
            type: row.type,
            name: row.name,
            sku: row.sku,
            category: row.category,
            unit: row.unit,
            quantity: parseFloat(row.quantity),
            receivedQuantity: parseFloat(row.received_quantity),
            color: {id: row.color_id, name: row.color_name},
            size: {id: row.size_id, name: row.size_name},
            notes: row.notes
          });
        }
        return acc;
      } else {
        // Create new GRN
        return [...acc, {
          id: row.id,
          purchaseOrderId: row.purchase_order_id,
          vendorName: row.vendor_name,
          vendorId: row.vendor_id,
          receivedDate: row.received_date,
          receivedBy: row.received_by,
          checkedBy: row.checked_by,
          notes: row.notes,
          timestamp: row.timestamp,
          items: row.grn_id ? [{
            itemId: row.item_id,
            type: row.type,
            name: row.name,
            sku: row.sku,
            category: row.category,
            unit: row.unit,
            quantity: parseFloat(row.quantity),
            receivedQuantity: parseFloat(row.received_quantity),
            color: {id: row.color_id, name: row.color_name},
            size: {id: row.size_id, name: row.size_name},
            notes: row.notes
          }] : []
        }];
      }
    }, []);
    
    // Format response
    const formattedOrder = {
      id: order.id,
      vendorId: order.vendor_id,
      vendorName: order.vendor_name,
      vendorEmail: order.vendor_email,
      vendorPhone: order.vendor_phone,
      vendorAddress: order.vendor_address,
      orderDate: order.order_date,
      expectedDeliveryDate: order.expected_delivery_date,
      shippingAddress: order.shipping_address,
      paymentTerms: order.payment_terms,
      shippingMethod: order.shipping_method,
      notes: order.notes,
      total: parseFloat(order.total),
      status: order.status,
      createdBy: order.created_by,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items,
      timeline,
      goodsReceiveNotes
    };
    
    res.json(formattedOrder);
  } catch (error) {
    handleRouteError(error, req, res, 'PurchaseOrders - Fetching purchase order:');
  }
});

/**
 * @route   POST /api/purchase-orders
 * @desc    Create a new purchase order
 * @access  Private
 */
router.post(
  '/',
  [
    authenticate,
    hasPermission('purchase-orders', 'edit'),
    body('vendorName').notEmpty().withMessage('Vendor name is required'),
    body('orderDate').notEmpty().withMessage('Order date is required'),
    body('shippingAddress').notEmpty().withMessage('Shipping address is required'),
    body('items').isArray().withMessage('Items must be an array'),
    body('items.*.name').notEmpty().withMessage('Item name is required'),
    body('items.*.quantity').isNumeric().withMessage('Item quantity must be a number'),
    body('items.*.unitPrice').isNumeric().withMessage('Item unit price must be a number'),
    validatePurchaseOrderItemsMiddleware
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        vendorId,
        vendorName,
        vendorEmail,
        vendorPhone,
        vendorAddress,
        orderDate,
        expectedDeliveryDate,
        shippingAddress,
        paymentTerms,
        shippingMethod,
        notes,
        items,
        status = 'pending'
      } = req.body;
      
      // Calculate total
      const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      
      // Generate purchase order ID
      const purchaseOrderId = req.body.id || `PO-${Date.now()}`;

      console.log('Creating purchase order with ID:', purchaseOrderId);
      
      // Insert purchase order
      const orderResult = await client.query(`
        INSERT INTO purchase_orders (
          id, vendor_id, vendor_name, vendor_email, vendor_phone,
          vendor_address, order_date, expected_delivery_date, shipping_address,
          payment_terms, shipping_method, notes, total, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
        purchaseOrderId,
        vendorId,
        vendorName,
        vendorEmail,
        vendorPhone,
        vendorAddress,
        new Date(orderDate),
        expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        shippingAddress,
        paymentTerms,
        shippingMethod,
        notes,
        total,
        status,
        `${req.user.firstName} ${req.user.lastName}`
      ]);
      
      // Insert purchase order items
      for (const item of items) {
        const colorId = getSafeColorId(item);
        const sizeId = getSafeSizeId(item);

        await client.query(`
          INSERT INTO purchase_order_items (
            purchase_order_id, item_id, type, name, sku,
            category, unit, quantity, unit_price, total, color_id, size_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          purchaseOrderId,
          item.itemId,
          item.type,
          item.name,
          item.sku,
          item.category,
          item.unit,
          item.quantity,
          item.unitPrice,
          item.quantity * item.unitPrice,
          colorId,
          sizeId
        ]);
      }
      
      // Insert initial timeline event
      await client.query(`
        INSERT INTO purchase_order_timeline (
          purchase_order_id, status, user_name, notes
        ) VALUES ($1, $2, $3, $4)
      `, [
        purchaseOrderId,
        status,
        `${req.user.firstName} ${req.user.lastName}`,
        'Purchase order created'
      ]);
      
      await client.query('COMMIT');
      
      // Return the created purchase order
      const order = orderResult.rows[0];
      
      res.status(201).json({
        id: order.id,
        vendorId: order.vendor_id,
        vendorName: order.vendor_name,
        vendorEmail: order.vendor_email,
        vendorPhone: order.vendor_phone,
        vendorAddress: order.vendor_address,
        orderDate: order.order_date,
        expectedDeliveryDate: order.expected_delivery_date,
        shippingAddress: order.shipping_address,
        paymentTerms: order.payment_terms,
        shippingMethod: order.shipping_method,
        notes: order.notes,
        total: parseFloat(order.total),
        status: order.status,
        createdBy: order.created_by,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items,
        timeline: [{
          status,
          timestamp: new Date(),
          user: `${req.user.firstName} ${req.user.lastName}`,
          notes: 'Purchase order created'
        }]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      handleRouteError(error, req, res, 'PurchaseOrders - Creating purchase order:');
    } finally {
      client.release();
    }
  }
);

/**
 * @route   PUT /api/purchase-orders/:id
 * @desc    Update a purchase order
 * @access  Private
 */
router.put(
  '/:id',
  [
    authenticate,
    hasPermission('purchase-orders', 'edit'),
    param('id').notEmpty().withMessage('Purchase order ID is required'),
    body('vendorName').notEmpty().withMessage('Vendor name is required'),
    body('orderDate').notEmpty().withMessage('Order date is required'),
    body('shippingAddress').notEmpty().withMessage('Shipping address is required'),
    validatePurchaseOrderItemsMiddleware
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      vendorId,
      vendorName,
      vendorEmail,
      vendorPhone,
      vendorAddress,
      orderDate,
      expectedDeliveryDate,
      shippingAddress,
      paymentTerms,
      shippingMethod,
      notes,
      items,
      status
    } = req.body;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if purchase order exists
      const checkResult = await client.query(
        'SELECT * FROM purchase_orders WHERE id = $1',
        [id]
      );
      
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      const existingOrder = checkResult.rows[0];
      
      // Only allow updates if order is pending
      if (existingOrder.status !== 'pending' && !status) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({ 
          message: 'Cannot update purchase order that is not pending' 
        });
      }
      
      // Calculate total if items provided
      let total = existingOrder.total;
      if (items && items.length > 0) {
        total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      }
      
      // Update purchase order
      const orderResult = await client.query(`
        UPDATE purchase_orders
        SET vendor_id = $1, vendor_name = $2, vendor_email = $3,
            vendor_phone = $4, vendor_address = $5, order_date = $6,
            expected_delivery_date = $7, shipping_address = $8,
            payment_terms = $9, shipping_method = $10, notes = $11,
            total = $12, status = $13, updated_at = CURRENT_TIMESTAMP
        WHERE id = $14
        RETURNING *
      `, [
        vendorId,
        vendorName,
        vendorEmail,
        vendorPhone,
        vendorAddress,
        new Date(orderDate),
        expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        shippingAddress,
        paymentTerms,
        shippingMethod,
        notes,
        total,
        status || existingOrder.status,
        id
      ]);
      
      // Update items if provided
      if (items && items.length > 0) {
        // Delete existing items
        await client.query('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [id]);
        
        // Insert new items
        for (const item of items) {
          const colorId = getSafeColorId(item);
          const sizeId = getSafeSizeId(item);

          await client.query(`
            INSERT INTO purchase_order_items (
              purchase_order_id, item_id, type, name, sku,
              category, unit, quantity, unit_price, total, color_id, size_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [
            id,
            item.itemId,
            item.type,
            item.name,
            item.sku,
            item.category,
            item.unit,
            item.quantity,
            item.unitPrice,
            item.quantity * item.unitPrice,
            colorId,
            sizeId
          ]);
        }
      }

      if(status && status === "completed") { 
        // Use standardized stock management for purchase order completion
        for (const item of items) { 
          try {
            await updateInventoryStock(client, item, item.quantity, 'add');
          } catch (error) {
            console.error(`Failed to update stock for item ${item.itemId}:`, error.message);
            throw error; // Will trigger transaction rollback
          }
        }
      }

      // Add timeline event if status changed
      if (status && status !== existingOrder.status) {
        await client.query(`
          INSERT INTO purchase_order_timeline (
            purchase_order_id, status, user_name, notes
          ) VALUES ($1, $2, $3, $4)
        `, [
          id,
          status,
          `${req.user.firstName} ${req.user.lastName}`,
          `Status changed from ${existingOrder.status} to ${status}`
        ]);
      }
      
      await client.query('COMMIT');
      
      // Get updated purchase order
      const order = orderResult.rows[0];
      
      // Get updated items
      const updatedItemsResult = await client.query(
        'SELECT * FROM purchase_order_items WHERE purchase_order_id = $1',
        [id]
      );
      
      const updatedItems = updatedItemsResult.rows.map(item => ({
        itemId: item.item_id,
        type: item.type,
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unit_price),
        total: parseFloat(item.total)
      }));
      
      // Get updated timeline
      const timelineResult = await client.query(
        'SELECT * FROM purchase_order_timeline WHERE purchase_order_id = $1 ORDER BY timestamp',
        [id]
      );
      
      const timeline = timelineResult.rows.map(event => ({
        status: event.status,
        timestamp: event.timestamp,
        user: event.user_name,
        notes: event.notes
      }));
      
      // client.release();
      
      res.json({
        id: order.id,
        vendorId: order.vendor_id,
        vendorName: order.vendor_name,
        vendorEmail: order.vendor_email,
        vendorPhone: order.vendor_phone,
        vendorAddress: order.vendor_address,
        orderDate: order.order_date,
        expectedDeliveryDate: order.expected_delivery_date,
        shippingAddress: order.shipping_address,
        paymentTerms: order.payment_terms,
        shippingMethod: order.shipping_method,
        notes: order.notes,
        total: parseFloat(order.total),
        status: order.status,
        createdBy: order.created_by,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: updatedItems,
        timeline
      });
    } catch (error) {
      await client.query('ROLLBACK');
      handleRouteError(error, req, res, 'PurchaseOrders - Updating purchase order:');
    } finally {
      client.release();
    }
  }
);

/**
 * @route   DELETE /api/purchase-orders/:id
 * @desc    Delete a purchase order
 * @access  Private
 */
router.delete(
  '/:id',
  [
    authenticate,
    hasPermission('purchase-orders', 'delete'),
    param('id').notEmpty().withMessage('Purchase order ID is required')
  ],
  async (req, res) => {
    const { id } = req.params;
    
    try {
      const client = await pool.connect();
      
      // Check if purchase order exists
      const checkResult = await client.query(
        'SELECT * FROM purchase_orders WHERE id = $1',
        [id]
      );
      
      if (checkResult.rows.length === 0) {
        client.release();
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      const order = checkResult.rows[0];
      
      // Only allow deletion if order is pending
      if (order.status !== 'pending') {
        client.release();
        return res.status(400).json({ 
          message: 'Cannot delete purchase order that is not pending' 
        });
      }
      
      // Delete purchase order (cascade will delete items and timeline events)
      await client.query('DELETE FROM purchase_orders WHERE id = $1', [id]);
      
      client.release();
      
      res.json({ message: 'Purchase order deleted successfully' });
    } catch (error) {
      handleRouteError(error, req, res, 'PurchaseOrders - Deleting purchase order:');
    }
  }
);

/**
 * @route   PUT /api/purchase-orders/:id/status
 * @desc    Update purchase order status
 * @access  Private
 */
router.put(
  '/:id/status',
  [
    authenticate,
    hasPermission('purchase-orders', 'edit'),
    param('id').notEmpty().withMessage('Purchase order ID is required'),
    body('status').isIn(['pending', 'approved', 'ordered', 'received', 'completed', 'cancelled']).withMessage('Invalid status')
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, notes } = req.body;
    
    try {
      const client = await pool.connect();
      
      // Check if purchase order exists
      const checkResult = await client.query(
        'SELECT * FROM purchase_orders WHERE id = $1',
        [id]
      );
      
      if (checkResult.rows.length === 0) {
        client.release();
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      // Update purchase order status
      const orderResult = await client.query(
        'UPDATE purchase_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
      );
      
      // Add timeline event
      await client.query(`
        INSERT INTO purchase_order_timeline (
          purchase_order_id, status, user_name, notes
        ) VALUES ($1, $2, $3, $4)
      `, [
        id,
        status,
        `${req.user.firstName} ${req.user.lastName}`,
        notes || `Status changed to ${status}`
      ]);
      
      // Get updated timeline
      const timelineResult = await client.query(
        'SELECT * FROM purchase_order_timeline WHERE purchase_order_id = $1 ORDER BY timestamp',
        [id]
      );
      
      client.release();
      
      const order = orderResult.rows[0];
      const timeline = timelineResult.rows.map(event => ({
        status: event.status,
        timestamp: event.timestamp,
        user: event.user_name,
        notes: event.notes
      }));
      
      res.json({
        id: order.id,
        status: order.status,
        updatedAt: order.updated_at,
        timeline
      });
    } catch (error) {
      handleRouteError(error, req, res, 'PurchaseOrders - Updating purchase order status:');
    }
  }
);

/**
 * @route   POST /api/purchase-orders/:id/receive
 * @desc    Create a goods receive note for a purchase order
 * @access  Private
 */
router.post(
  '/:id/receive',
  [
    authenticate,
    hasPermission('purchase-orders', 'edit'),
    param('id').notEmpty().withMessage('Purchase order ID is required'),
    body('receivedDate').notEmpty().withMessage('Received date is required'),
    body('receivedBy').notEmpty().withMessage('Received by is required'),
    body('checkedBy').notEmpty().withMessage('Checked by is required'),
    body('items').isArray().withMessage('Items must be an array')
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const {
      receivedDate,
      receivedBy,
      checkedBy,
      notes,
      items
    } = req.body;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if purchase order exists
      const orderResult = await client.query(
        'SELECT * FROM purchase_orders WHERE id = $1',
        [id]
      );
      
      if (orderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      const order = orderResult.rows[0];
      
      // Generate GRN ID
      const grnId = req.body.id || `GRN-${Date.now()}`;
      
      // Insert goods receive note
      const grnResult = await client.query(`
        INSERT INTO goods_receive_notes (
          id, purchase_order_id, vendor_name, vendor_id,
          received_date, received_by, checked_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        grnId,
        id,
        order.vendor_name,
        order.vendor_id,
        new Date(receivedDate),
        receivedBy,
        checkedBy,
        notes
      ]);
      
      // Insert GRN items with variant information
      for (const item of items) {
        if (item.received) {
          // Get original purchase order item to retrieve variant info
          const poItemResult = await client.query(`
            SELECT color_id, size_id FROM purchase_order_items 
            WHERE purchase_order_id = $1 AND item_id = $2
            LIMIT 1
          `, [id, item.itemId]);
          
          const poItem = poItemResult.rows[0];
          const colorId = poItem?.color_id || null;
          const sizeId = poItem?.size_id || null;
          
          await client.query(`
            INSERT INTO goods_receive_note_items (
              grn_id, item_id, type, name, sku, category,
              unit, quantity, received_quantity, notes, color_id, size_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [
            grnId,
            item.itemId,
            item.type,
            item.name,
            item.sku,
            item.category,
            item.unit,
            item.quantity,
            item.receivedQuantity,
            item.notes,
            colorId,
            sizeId
          ]);
          
          // Use standardized stock management for inventory updates
          const itemWithVariants = {
            ...item,
            quantity: item.receivedQuantity, // Use received quantity for stock update
            color: colorId ? { id: colorId } : null,
            size: sizeId ? { id: sizeId } : null
          };
          
          try {
            await updateInventoryStock(client, itemWithVariants, item.receivedQuantity, 'add');
          } catch (error) {
            console.error(`Failed to update stock for received item ${item.itemId}:`, error.message);
            throw error; // Will trigger transaction rollback
          }
        }
      }
      
      // Check if all items were received in full
      const allItemsReceived = items.every(item => 
        !item.received || item.receivedQuantity >= item.quantity
      );
      
      // Update purchase order status
      const newStatus = allItemsReceived ? 'completed' : 'received';
      await client.query(
        'UPDATE purchase_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStatus, id]
      );
      
      // Add timeline event
      await client.query(`
        INSERT INTO purchase_order_timeline (
          purchase_order_id, status, user_name, notes
        ) VALUES ($1, $2, $3, $4)
      `, [
        id,
        newStatus,
        `${req.user.firstName} ${req.user.lastName}`,
        `Goods received. Status changed to ${newStatus}`
      ]);
      
      await client.query('COMMIT');
      
      // Get the created GRN
      const grn = grnResult.rows[0];
      
      // Format response
      const formattedGrn = {
        id: grn.id,
        purchaseOrderId: grn.purchase_order_id,
        vendorName: grn.vendor_name,
        vendorId: grn.vendor_id,
        receivedDate: grn.received_date,
        receivedBy: grn.received_by,
        checkedBy: grn.checked_by,
        notes: grn.notes,
        timestamp: grn.timestamp,
        items: items.filter(item => item.received).map(item => {
          // Get variant info that was stored during GRN creation
          const colorId = item.color?.id || null;
          const sizeId = item.size?.id || null;
          
          return {
            itemId: item.itemId,
            type: item.type,
            name: item.name,
            sku: item.sku,
            category: item.category,
            unit: item.unit,
            quantity: item.quantity,
            receivedQuantity: item.receivedQuantity,
            color: colorId ? {id: colorId, name: item.color?.name} : {id: null, name: null},
            size: sizeId ? {id: sizeId, name: item.size?.name} : {id: null, name: null},
            notes: item.notes
          };
        })
      };
      
      res.status(201).json(formattedGrn);
    } catch (error) {
      await client.query('ROLLBACK');
      handleRouteError(error, req, res, 'PurchaseOrders - Creating goods receive note:');
    } finally {
      client.release();
    }
  }
);

module.exports = router;