import express from 'express';
import { 
  getProfile, 
  updateProfile, 
  getDashboard, 
  getAnalytics,
  createProduct,
  getProducts,
  deleteProduct,
  updateProduct,
  getB2BRecommendations,
  getB2BInquiries,
  updateB2BInquiryStatus,
  getB2BOrders,
  updateB2BOrderStatus,
  createB2BConnection,
  getB2BConnections
} from '../controllers/artisanController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/artisan/profile
 * @desc    Get current authenticated artisan's profile
 * @access  Private (JWT Required)
 */
router.get('/profile', protect, getProfile);

/**
 * @route   PUT /api/artisan/profile
 * @desc    Update current authenticated artisan's profile
 * @access  Private (JWT Required)
 */
router.put('/profile', protect, updateProfile);

/**
 * @route   GET /api/artisan/dashboard
 * @desc    Get current authenticated artisan's dashboard metrics
 * @access  Private (JWT Required)
 */
router.get('/dashboard', protect, getDashboard);

/**
 * @route   GET /api/artisan/analytics
 * @desc    Get current authenticated artisan's real business analytics from MongoDB
 * @access  Private (JWT Required)
 */
router.get('/analytics', protect, getAnalytics);

/**
 * @route   GET /api/artisan/b2b-recommendations
 * @desc    Get matching B2B buyer recommendations for artisan craft category
 * @access  Private (JWT Required)
 */
router.get('/b2b-recommendations', protect, getB2BRecommendations);

/**
 * @route   POST /api/artisan/b2b/connect
 * @desc    Initiate connection request to a B2B buyer
 * @access  Private (JWT Required)
 */
router.post('/b2b/connect', protect, createB2BConnection);

/**
 * @route   GET /api/artisan/b2b/connections
 * @desc    Get all connection statuses for logged-in artisan
 * @access  Private (JWT Required)
 */
router.get('/b2b/connections', protect, getB2BConnections);

/**
 * @route   GET /api/artisan/b2b/inquiries
 * @desc    Get B2B buyer inquiries for logged-in artisan
 * @access  Private (JWT Required)
 */
router.get('/b2b/inquiries', protect, getB2BInquiries);

/**
 * @route   PUT /api/artisan/b2b/inquiries/:id/status
 * @desc    Update B2B buyer inquiry status (accept/reject/close)
 * @access  Private (JWT Required)
 */
router.put('/b2b/inquiries/:id/status', protect, updateB2BInquiryStatus);

/**
 * @route   GET /api/artisan/b2b/orders
 * @desc    Get B2B bulk orders for logged-in artisan
 * @access  Private (JWT Required)
 */
router.get('/b2b/orders', protect, getB2BOrders);

/**
 * @route   PUT /api/artisan/b2b/orders/:id/status
 * @desc    Update B2B order status (accept/reject/completed/cancelled)
 * @access  Private (JWT Required)
 */
router.put('/b2b/orders/:id/status', protect, updateB2BOrderStatus);

/**
 * @route   GET /api/artisan/products
 * @desc    Get all craft products for logged in artisan
 * @access  Private (JWT Required)
 */
router.get('/products', protect, getProducts);

/**
 * @route   POST /api/artisan/products
 * @desc    Create a new craft product in artisan catalog
 * @access  Private (JWT Required)
 */
router.post('/products', protect, createProduct);

/**
 * @route   PUT /api/artisan/products/:product_id
 * @desc    Update an existing craft product (owner only)
 * @access  Private (JWT Required)
 */
router.put('/products/:product_id', protect, updateProduct);

/**
 * @route   DELETE /api/artisan/products/:id
 * @desc    Delete a product from artisan catalog
 * @access  Private (JWT Required)
 */
router.delete('/products/:id', protect, deleteProduct);

export default router;



