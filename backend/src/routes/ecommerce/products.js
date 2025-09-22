const express = require('express');
const { pool } = require('../../utils/db');
const { handleRouteError } = require('../../utils/loggerUtils');
const logger = require('../../utils/logger');

const router = express.Router();

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

module.exports = router;