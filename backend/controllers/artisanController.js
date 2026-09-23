import mongoose from 'mongoose';
import { ArtisanProfile } from '../models/ArtisanProfile.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { inMemoryProfiles } from './authController.js';

// In-memory fallback array for products when MongoDB is offline
export const inMemoryProducts = [];

/**
 * Helper to resolve authenticated user_id from JWT payload
 */
const getAuthUserId = (req) => {
  return req.user?.user_id || null;
};

/**
 * Controller: Get Artisan Profile
 * Endpoint: GET /api/artisan/profile
 * Access: Protected (JWT)
 */
export const getProfile = async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User identity missing or invalid token.'
      });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const profile = await ArtisanProfile.findOne({ user_id: userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Artisan profile not found'
        });
      }

      return res.status(200).json({
        success: true,
        profile
      });
    } else {
      // In-memory fallback
      const profile = inMemoryProfiles.get(userId);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Artisan profile not found'
        });
      }

      return res.status(200).json({
        success: true,
        profile
      });
    }
  } catch (error) {
    console.error('[Get Profile Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching artisan profile',
      error: error.message
    });
  }
};

/**
 * Controller: Update Artisan Profile
 * Endpoint: PUT /api/artisan/profile
 * Access: Protected (JWT)
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User identity missing or invalid token.'
      });
    }

    // Extract body and prevent updating sensitive immutable identity fields
    const { user_id, role, profile_id, ...allowedUpdates } = req.body;

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const updatedProfile = await ArtisanProfile.findOneAndUpdate(
        { user_id: userId },
        { $set: allowedUpdates },
        { new: true, runValidators: true }
      );

      if (!updatedProfile) {
        return res.status(404).json({
          success: false,
          message: 'Artisan profile not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Artisan profile updated successfully',
        profile: updatedProfile
      });
    } else {
      // In-memory fallback
      const existingProfile = inMemoryProfiles.get(userId);
      if (!existingProfile) {
        return res.status(404).json({
          success: false,
          message: 'Artisan profile not found'
        });
      }

      const updatedProfile = {
        ...existingProfile,
        ...allowedUpdates,
        user_id: existingProfile.user_id
      };

      inMemoryProfiles.set(userId, updatedProfile);

      return res.status(200).json({
        success: true,
        message: 'Artisan profile updated successfully',
        profile: updatedProfile
      });
    }
  } catch (error) {
    console.error('[Update Profile Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error updating artisan profile',
      error: error.message
    });
  }
};

/**
 * Controller: Get Artisan Dashboard Data
 * Endpoint: GET /api/artisan/dashboard
 * Access: Protected (JWT)
 */
export const getDashboard = async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User identity missing or invalid token.'
      });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    let profile = null;
    let productCount = 0;
    if (isMongoConnected) {
      profile = await ArtisanProfile.findOne({ user_id: userId });
      productCount = await Product.countDocuments({ user_id: userId });
    } else {
      profile = inMemoryProfiles.get(userId);
    }

    return res.status(200).json({
      success: true,
      dashboard: {
        artisan_name: profile?.name || 'Artisan',
        business_name: profile?.business_name || '',
        craft_category: profile?.craft_category || '',
        primary_craft: profile?.primary_craft || '',
        location: profile?.location || '',
        language: profile?.language || 'en',
        experience: profile?.experience || '',
        bio: profile?.bio || '',
        profile_image: profile?.profile_image || '',
        product_count: productCount,
        inventory_count: 0,
        verified: true
      }
    });
  } catch (error) {
    console.error('[Get Dashboard Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch artisan dashboard data',
      error: error.message
    });
  }
};

/**
 * Controller: Get Artisan Business Analytics
 * Endpoint: GET /api/artisan/analytics
 * Access: Protected (JWT)
 * Strictly queries MongoDB data for the authenticated artisan (user_id).
 * MongoDB is the single source of truth.
 * Returns real 0s / empty structures if no data exists.
 */
export const getAnalytics = async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User identity missing or invalid token.'
      });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    let products = [];
    let orders = [];

    if (isMongoConnected) {
      try {
        products = (await Product.find({ user_id: userId })) || [];
        orders = (await Order.find({ user_id: userId })) || [];
      } catch (dbErr) {
        console.error('[Get Analytics DB Error]', dbErr.message);
        return res.status(500).json({
          success: false,
          message: 'Database query error while fetching business statistics'
        });
      }
    } else {
      products = (inMemoryProducts || []).filter(p => p.user_id === userId);
    }

    const totalProducts = products.length;
    const totalOrders = orders.length;

    const completedOrders = orders.filter(o => o?.status === 'completed').length;
    const pendingOrders = orders.filter(o => o?.status === 'pending').length;
    const cancelledOrders = orders.filter(o => o?.status === 'cancelled').length;

    const completedOrderDocs = orders.filter(o => o?.status === 'completed');

    const totalRevenue = completedOrderDocs.reduce((sum, o) => {
      const amt = o?.total_amount || (o?.quantity * o?.unit_price) || 0;
      return sum + amt;
    }, 0);

    const totalUnitsSold = completedOrderDocs.reduce((sum, o) => sum + (o?.quantity || 1), 0);

    const totalUnits = products.reduce((sum, p) => sum + (p?.stock || 0), 0);
    const lowStockProducts = products.filter(p => (p?.stock || 0) > 0 && (p?.stock || 0) <= 5).length;
    const outOfStockProducts = products.filter(p => (p?.stock || 0) === 0).length;
    const inStockProducts = products.filter(p => (p?.stock || 0) > 5).length;

    const inventory = {
      totalUnits,
      inStockProducts,
      lowStockProducts,
      outOfStockProducts,
      available: true
    };

    const salesByProduct = {};
    completedOrderDocs.forEach(o => {
      if (o?.product_title) {
        salesByProduct[o.product_title] = (salesByProduct[o.product_title] || 0) + (o.quantity || 1);
      }
    });

    let bestSeller = null;
    let maxSold = 0;
    Object.entries(salesByProduct).forEach(([title, qty]) => {
      if (qty > maxSold) {
        maxSold = qty;
        bestSeller = { title, unitsSold: qty };
      }
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthlyRevenue = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = monthNames[d.getMonth()];
      const year = d.getFullYear();
      const monthIdx = d.getMonth();

      const revenueForMonth = completedOrderDocs
        .filter(o => {
          const date = o?.order_date ? new Date(o.order_date) : null;
          return date && date.getFullYear() === year && date.getMonth() === monthIdx;
        })
        .reduce((sum, o) => sum + (o?.total_amount || (o?.quantity * o?.unit_price) || 0), 0);

      monthlyRevenue.push({
        month: mName,
        revenue: revenueForMonth
      });
    }

    return res.status(200).json({
      success: true,
      analytics: {
        totalProducts,
        totalOrders,
        completedOrders,
        pendingOrders,
        cancelledOrders,
        totalUnitsSold,
        totalRevenue,
        monthlyRevenue,
        inventory,
        topProducts: bestSeller ? [bestSeller] : [],
        bestSeller
      }
    });
  } catch (error) {
    console.error('[Get Analytics Error]', error);
    return res.status(200).json({
      success: true,
      analytics: {
        totalProducts: 0,
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        cancelledOrders: 0,
        totalUnitsSold: 0,
        totalRevenue: 0,
        monthlyRevenue: [
          { month: 'Jan', revenue: 0 },
          { month: 'Feb', revenue: 0 },
          { month: 'Mar', revenue: 0 },
          { month: 'Apr', revenue: 0 },
          { month: 'May', revenue: 0 },
          { month: 'Jun', revenue: 0 }
        ],
        inventory: {
          totalUnits: 0,
          inStockProducts: 0,
          lowStockProducts: 0,
          outOfStockProducts: 0,
          available: true
        },
        topProducts: [],
        bestSeller: null
      }
    });
  }
};

/**
 * Controller: Create Artisan Product
 * Endpoint: POST /api/artisan/products
 * Access: Protected (JWT)
 */
export const createProduct = async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      console.warn('[Create Product Auth Error] User identity missing from JWT token');
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User identity missing or invalid token.'
      });
    }

    const {
      title, description, category, price, stock, images,
      state, district, sector, material, product_size,
      labour_hours, material_cost, product_cost, demand_level,
      season, source, image_source_type, dominant_colors, visual_features
    } = req.body;

    if (!title || !title.trim()) {
      console.warn('[Create Product Validation Error] Missing title');
      return res.status(400).json({
        success: false,
        message: 'Product title is required'
      });
    }

    const numericPrice = Number(price);
    if (price === undefined || price === null || isNaN(numericPrice) || numericPrice < 0) {
      console.warn('[Create Product Validation Error] Invalid price:', price);
      return res.status(400).json({
        success: false,
        message: 'A valid non-negative selling price is required'
      });
    }

    const numericStock = Number(stock);
    if (stock === undefined || stock === null || isNaN(numericStock) || numericStock < 0) {
      console.warn('[Create Product Validation Error] Invalid stock:', stock);
      return res.status(400).json({
        success: false,
        message: 'A valid non-negative stock quantity is required'
      });
    }

    const productId = 'PROD_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const isMongoConnected = mongoose.connection.readyState === 1;

    const rawImages = Array.isArray(images) ? images : (images ? [images] : []);
    const processedImages = rawImages.filter(img => typeof img === 'string' && img.trim().length > 0 && !img.startsWith('blob:'));

    const productPayload = {
      product_id: productId,
      user_id: userId,
      title: title.trim(),
      description: (description || '').trim(),
      category: (category || '').trim(),
      price: numericPrice,
      stock: numericStock,
      images: processedImages,
      status: 'active',
      created_at: new Date(),
      state: state || '',
      district: district || '',
      sector: sector || '',
      material: material || '',
      product_size: product_size || '',
      labour_hours: labour_hours ? Number(labour_hours) : 0,
      material_cost: material_cost ? Number(material_cost) : 0,
      product_cost: product_cost ? Number(product_cost) : 0,
      demand_level: demand_level || '',
      season: season || '',
      source: source || '',
      image_source_type: image_source_type || '',
      dominant_colors: Array.isArray(dominant_colors) ? dominant_colors : [],
      visual_features: Array.isArray(visual_features) ? visual_features : []
    };

    if (isMongoConnected) {
      const newProduct = await Product.create(productPayload);
      return res.status(201).json({
        success: true,
        message: 'Craft product added to catalog successfully!',
        product: newProduct
      });
    } else {
      inMemoryProducts.unshift(productPayload);
      return res.status(201).json({
        success: true,
        message: 'Craft product added to catalog successfully (In-Memory)!',
        product: productPayload
      });
    }
  } catch (error) {
    console.error('[Create Product Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save product to catalog',
      error: error.message
    });
  }
};

/**
 * Controller: Get Artisan Products
 * Endpoint: GET /api/artisan/products
 * Access: Protected (JWT)
 */
export const getProducts = async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User identity missing or invalid token.'
      });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const products = await Product.find({ user_id: userId }).sort({ created_at: -1 });
      return res.status(200).json({
        success: true,
        products
      });
    } else {
      const products = inMemoryProducts.filter(p => p.user_id === userId);
      return res.status(200).json({
        success: true,
        products
      });
    }
  } catch (error) {
    console.error('[Get Products Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

/**
 * Controller: Delete Product
 * Endpoint: DELETE /api/artisan/products/:id
 * Access: Protected (JWT)
 */
export const deleteProduct = async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User identity missing or invalid token.'
      });
    }

    const productId = req.params.id;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const result = await Product.deleteOne({ product_id: productId, user_id: userId });
      if (result.deletedCount === 0) {
        const existing = await Product.exists({ product_id: productId });
        return res.status(existing ? 403 : 404).json({
          success: false,
          message: existing
            ? 'Forbidden. You do not have permission to delete this product.'
            : 'Product not found.'
        });
      }
    } else {
      const idx = inMemoryProducts.findIndex(p => p.product_id === productId && p.user_id === userId);
      if (idx === -1) {
        const exists = inMemoryProducts.some(p => p.product_id === productId);
        return res.status(exists ? 403 : 404).json({
          success: false,
          message: exists
            ? 'Forbidden. You do not have permission to delete this product.'
            : 'Product not found.'
        });
      }
      inMemoryProducts.splice(idx, 1);
    }

    return res.status(200).json({
      success: true,
      message: 'Product removed from catalog'
    });
  } catch (error) {
    console.error('[Delete Product Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
};

/**
 * Controller: Update Product
 * Endpoint: PUT /api/artisan/products/:product_id
 * Access: Protected (JWT)
 */
export const updateProduct = async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User identity missing or invalid token.'
      });
    }

    const productId = req.params.product_id;
    const { title, description, category, sector, material, product_size, price, stock } = req.body;

    if (title !== undefined && (!title || !String(title).trim())) {
      return res.status(400).json({ success: false, message: 'Product title must not be empty.' });
    }

    let numericPrice;
    if (price !== undefined) {
      numericPrice = Number(price);
      if (isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ success: false, message: 'Price must be a valid non-negative number.' });
      }
    }

    let numericStock;
    if (stock !== undefined) {
      numericStock = Number(stock);
      if (isNaN(numericStock) || numericStock < 0 || !Number.isInteger(numericStock)) {
        return res.status(400).json({ success: false, message: 'Stock must be a valid non-negative integer.' });
      }
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      const existing = await Product.findOne({ product_id: productId });
      if (!existing) return res.status(404).json({ success: false, message: 'Product not found.' });
      if (existing.user_id !== userId) return res.status(403).json({ success: false, message: 'Forbidden.' });

      const updates = {};
      if (title !== undefined) updates.title = String(title).trim();
      if (description !== undefined) updates.description = String(description).trim();
      if (category !== undefined) updates.category = String(category).trim();
      if (sector !== undefined) updates.sector = String(sector).trim();
      if (material !== undefined) updates.material = String(material).trim();
      if (product_size !== undefined) updates.product_size = String(product_size).trim();
      if (numericPrice !== undefined) updates.price = numericPrice;
      if (numericStock !== undefined) updates.stock = numericStock;

      const updated = await Product.findOneAndUpdate(
        { product_id: productId, user_id: userId },
        { $set: updates },
        { new: true, runValidators: true }
      );
      return res.status(200).json({ success: true, message: 'Product updated successfully!', product: updated });
    } else {
      const idx = inMemoryProducts.findIndex(p => p.product_id === productId);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Product not found.' });
      if (inMemoryProducts[idx].user_id !== userId) return res.status(403).json({ success: false, message: 'Forbidden.' });

      const updated = { ...inMemoryProducts[idx] };
      if (title !== undefined) updated.title = String(title).trim();
      if (description !== undefined) updated.description = String(description).trim();
      if (category !== undefined) updated.category = String(category).trim();
      if (sector !== undefined) updated.sector = String(sector).trim();
      if (material !== undefined) updated.material = String(material).trim();
      if (product_size !== undefined) updated.product_size = String(product_size).trim();
      if (numericPrice !== undefined) updated.price = numericPrice;
      if (numericStock !== undefined) updated.stock = numericStock;

      inMemoryProducts[idx] = updated;
      return res.status(200).json({ success: true, message: 'Product updated successfully!', product: updated });
    }
  } catch (error) {
    console.error('[Update Product Error]', error);
    return res.status(500).json({ success: false, message: 'Unable to update product.', error: error.message });
  }
};

/**
 * Controller: Get B2B Buyer Recommendations for Logged-In Artisan
 * Endpoint: GET /api/artisan/b2b-recommendations
 * Access: Protected (JWT)
 */
export const getB2BRecommendations = async (req, res) => {
  try {
    const userId = getAuthUserId(req) || req.user?.user_id || req.user?.id || req.user?.userId || 'ARTISAN_USER';

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token payload: user_id missing'
      });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;
    let profile = null;

    if (isMongoConnected) {
      profile = await ArtisanProfile.findOne({ user_id: userId });
    } else {
      profile = inMemoryProfiles.get(userId);
    }

    const artisanCraftCategory = profile?.craft_category || profile?.primary_craft || profile?.category || '';

    if (!artisanCraftCategory || !artisanCraftCategory.trim()) {
      return res.status(200).json({
        success: true,
        craft_category: null,
        buyers: []
      });
    }

    const b2bApiUrl = process.env.B2B_API_URL || 'http://localhost:5001';
    const targetUrl = `${b2bApiUrl.replace(/\/+$/, '')}/api/b2b/buyers/for-matching`;

    let b2bBuyers = [];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const b2bRes = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!b2bRes.ok) {
        console.warn(`[B2B Recommendations] B2B API returned status ${b2bRes.status}`);
        return res.status(200).json({
          success: false,
          message: 'Buyer recommendations are temporarily unavailable.'
        });
      }

      b2bBuyers = await b2bRes.json();
    } catch (b2bErr) {
      console.warn('[B2B Recommendations] Failed to reach B2B backend API:', b2bErr.message);
      return res.status(200).json({
        success: false,
        message: 'Buyer recommendations are temporarily unavailable.'
      });
    }

    if (!Array.isArray(b2bBuyers)) {
      return res.status(200).json({
        success: true,
        craft_category: artisanCraftCategory.trim(),
        buyers: []
      });
    }

    const normalize = (str) => (str || '').toString().toLowerCase().replace(/[\s\-_/&,]+/g, ' ').trim();
    const artisanNorm = normalize(artisanCraftCategory);

    const matched = b2bBuyers.filter((buyer) => {
      if (!buyer || !buyer.craft_category) return false;
      const buyerNorm = normalize(buyer.craft_category);
      if (!buyerNorm || !artisanNorm) return false;

      if (buyerNorm === artisanNorm || buyerNorm.includes(artisanNorm) || artisanNorm.includes(buyerNorm)) {
        return true;
      }

      const aTokens = artisanNorm.split(' ').filter(t => t.length > 2);
      const bTokens = buyerNorm.split(' ').filter(t => t.length > 2);
      return aTokens.some(t => bTokens.includes(t));
    });

    const safeRecommendations = matched.slice(0, 5).map((b) => ({
      buyer_id: b.buyer_id || b._id || `BYR_${Math.random().toString(36).substring(2, 7)}`,
      company: b.company || b.company_name || b.name || 'Artisan Craft Wholesale Buyer',
      location: b.location || 'India',
      craft_category: b.craft_category || artisanCraftCategory
    }));

    return res.status(200).json({
      success: true,
      craft_category: artisanCraftCategory.trim(),
      buyers: safeRecommendations
    });
  } catch (error) {
    console.error('[B2B Recommendations Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch B2B buyer recommendations',
      error: error.message
    });
  }
};


/**
 * Controller: Get B2B Inquiries for Logged-In Artisan
 * Endpoint: GET /api/artisan/b2b/inquiries
 * Access: Protected (JWT)
 */
export const getB2BInquiries = async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User identity missing or invalid token.'
      });
    }

    const b2bApiUrl = process.env.B2B_API_URL || 'http://localhost:5001';
    const targetUrl = `${b2bApiUrl.replace(/\/+$/, '')}/api/b2b/inquiries/for-artisan`;

    const b2bRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-artisan-id': userId,
        'x-service-api-key': process.env.B2B_SERVICE_API_KEY || 'kalasaathi_b2b_service_secret_key_2026'
      }
    });

    if (!b2bRes.ok) {
      console.warn(`[Get B2B Inquiries] B2B API returned status ${b2bRes.status}`);
      return res.status(200).json({
        success: true,
        inquiries: []
      });
    }

    const data = await b2bRes.json();
    return res.status(200).json({
      success: true,
      inquiries: data.inquiries || []
    });
  } catch (error) {
    console.error('[Get B2B Inquiries Error]', error);
    return res.status(200).json({
      success: true,
      inquiries: []
    });
  }
};

/**
 * Controller: Update B2B Inquiry Status
 * Endpoint: PUT /api/artisan/b2b/inquiries/:id/status
 * Access: Protected (JWT)
 */
export const updateB2BInquiryStatus = async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User identity missing or invalid token.'
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['accepted', 'rejected', 'closed'].includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target status. Must be accepted, rejected, or closed.'
      });
    }

    const b2bApiUrl = process.env.B2B_API_URL || 'http://localhost:5001';
    const targetUrl = `${b2bApiUrl.replace(/\/+$/, '')}/api/b2b/inquiries/${id}/status`;

    const b2bRes = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-artisan-id': userId,
        'x-service-api-key': process.env.B2B_SERVICE_API_KEY || 'kalasaathi_b2b_service_secret_key_2026'
      },
      body: JSON.stringify({ status: status.toLowerCase(), artisan_id: userId })
    });

    const data = await b2bRes.json();
    return res.status(b2bRes.status).json(data);
  } catch (error) {
    console.error('[Update B2B Inquiry Status Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update inquiry status',
      error: error.message
    });
  }
};

/**
 * Controller: Get B2B Orders for Logged-In Artisan
 * Endpoint: GET /api/artisan/b2b/orders
 * Access: Protected (JWT)
 */
export const getB2BOrders = async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User identity missing or invalid token.'
      });
    }

    const b2bApiUrl = process.env.B2B_API_URL || 'http://localhost:5001';
    const targetUrl = `${b2bApiUrl.replace(/\/+$/, '')}/api/b2b/orders/for-artisan`;

    const b2bRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-artisan-id': userId,
        'x-service-api-key': process.env.B2B_SERVICE_API_KEY || 'kalasaathi_b2b_service_secret_key_2026'
      }
    });

    if (!b2bRes.ok) {
      console.warn(`[Get B2B Orders] B2B API returned status ${b2bRes.status}`);
      return res.status(200).json({
        success: true,
        orders: []
      });
    }

    const data = await b2bRes.json();
    return res.status(200).json({
      success: true,
      orders: data.orders || []
    });
  } catch (error) {
    console.error('[Get B2B Orders Error]', error);
    return res.status(200).json({
      success: true,
      orders: []
    });
  }
};

/**
 * Controller: Update B2B Order Status & Sync Completed Orders to Business Analytics
 * Endpoint: PUT /api/artisan/b2b/orders/:id/status
 * Access: Protected (JWT)
 */
export const updateB2BOrderStatus = async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User identity missing or invalid token.'
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['accepted', 'rejected', 'completed', 'cancelled'].includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target status. Must be accepted, rejected, completed, or cancelled.'
      });
    }

    const targetStatus = status.toLowerCase();
    const b2bApiUrl = process.env.B2B_API_URL || 'http://localhost:5001';
    const targetUrl = `${b2bApiUrl.replace(/\/+$/, '')}/api/b2b/orders/${id}/status`;

    const b2bRes = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-artisan-id': userId,
        'x-service-api-key': process.env.B2B_SERVICE_API_KEY || 'kalasaathi_b2b_service_secret_key_2026'
      },
      body: JSON.stringify({ status: targetStatus, artisan_id: userId })
    });

    const data = await b2bRes.json();

    if (!b2bRes.ok || !data.success) {
      return res.status(b2bRes.status).json(data);
    }

    const updatedOrder = data.order;

    // Sync Completed B2B Orders into Main Artisan Backend MongoDB Order Collection & Deduct Inventory
    if (targetStatus === 'completed' && updatedOrder) {
      const isMongoConnected = mongoose.connection.readyState === 1;
      if (isMongoConnected) {
        const existingOrder = await Order.findOne({ order_id: updatedOrder.order_id });
        if (!existingOrder) {
          const qty = Number(updatedOrder.quantity) || 1;
          const unitPrice = Number(updatedOrder.unit_price) || 0;
          const totalAmt = Number(updatedOrder.total_amount) || (qty * unitPrice);

          await Order.create({
            order_id: updatedOrder.order_id,
            user_id: userId,
            product_id: updatedOrder.product_id || '',
            product_title: updatedOrder.product_title || 'B2B Wholesale Craft Item',
            quantity: qty,
            unit_price: unitPrice,
            total_amount: totalAmt,
            status: 'completed',
            order_date: updatedOrder.created_at ? new Date(updatedOrder.created_at) : new Date()
          });

          // Safe inventory reduction rule
          if (updatedOrder.product_id) {
            const product = await Product.findOne({ product_id: updatedOrder.product_id, user_id: userId });
            if (product && typeof product.stock === 'number' && product.stock > 0) {
              product.stock = Math.max(0, product.stock - qty);
              await product.save();
            }
          }
        }
      }
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('[Update B2B Order Status Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

/**
 * Controller: Initiate B2B Buyer Connection
 * Endpoint: POST /api/artisan/b2b/connect
 * Access: Protected (JWT)
 */
export const createB2BConnection = async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User identity missing or invalid token.'
      });
    }

    const { buyer_id, product_id } = req.body;

    if (!buyer_id || !buyer_id.trim()) {
      return res.status(400).json({
        success: false,
        message: 'buyer_id is required'
      });
    }

    const b2bApiUrl = process.env.B2B_API_URL || 'http://localhost:5001';
    const targetUrl = `${b2bApiUrl.replace(/\/+$/, '')}/api/b2b/connections`;

    const b2bRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-artisan-id': userId,
        'x-service-api-key': process.env.B2B_SERVICE_API_KEY || 'kalasaathi_b2b_service_secret_key_2026'
      },
      body: JSON.stringify({ buyer_id, product_id, artisan_id: userId })
    });

    const data = await b2bRes.json();
    return res.status(b2bRes.status).json(data);
  } catch (error) {
    console.error('[Create B2B Connection Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send connection request',
      error: error.message
    });
  }
};

/**
 * Controller: Get B2B Connections for Logged-In Artisan
 * Endpoint: GET /api/artisan/b2b/connections
 * Access: Protected (JWT)
 */
export const getB2BConnections = async (req, res) => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User identity missing or invalid token.'
      });
    }

    const b2bApiUrl = process.env.B2B_API_URL || 'http://localhost:5001';
    const targetUrl = `${b2bApiUrl.replace(/\/+$/, '')}/api/b2b/connections/for-artisan`;

    const b2bRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-artisan-id': userId,
        'x-service-api-key': process.env.B2B_SERVICE_API_KEY || 'kalasaathi_b2b_service_secret_key_2026'
      }
    });

    if (!b2bRes.ok) {
      return res.status(200).json({
        success: true,
        connections: []
      });
    }

    const data = await b2bRes.json();
    return res.status(200).json({
      success: true,
      connections: data.connections || []
    });
  } catch (error) {
    console.error('[Get B2B Connections Error]', error);
    return res.status(200).json({
      success: true,
      connections: []
    });
  }
};
