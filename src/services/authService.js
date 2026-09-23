const API_BASE_URL = 'http://localhost:5000/api';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.token = localStorage.getItem('artisan_token') || null;
  }

  getToken() {
    return this.token || localStorage.getItem('artisan_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('artisan_token', token);
    } else {
      localStorage.removeItem('artisan_token');
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email Address and password are required.');
    }

    const cleanEmail = email.trim().toLowerCase();

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      if (data.requiresVerification) {
        const err = new Error(data.message || 'Please verify your email address before logging in.');
        err.requiresVerification = true;
        err.email = data.email;
        err.user_id = data.user_id;
        throw err;
      }
      throw new Error(data.message || 'Login failed. Please check credentials.');
    }

    this.setToken(data.token);

    // Fetch full artisan profile from MongoDB using the new JWT token
    let profileData = null;
    try {
      const profileRes = await this.getProfile();
      if (profileRes.success) {
        profileData = profileRes.profile;
      }
    } catch (e) {
      console.warn('Profile fetch post-login:', e.message);
    }

    const userObj = {
      id: data.user.user_id,
      userId: data.user.user_id,
      role: data.user.role,
      email: data.user.email,
      fullName: profileData?.name || data.user.user_id,
      businessName: profileData?.business_name || '',
      category: profileData?.craft_category || '',
      categoryName: profileData?.craft_category || '',
      primaryCraft: profileData?.primary_craft || '',
      location: profileData?.location || '',
      language: profileData?.language || 'en',
      experience: profileData?.experience || '',
      bio: profileData?.bio || '',
      profilePic: profileData?.profile_image || '',
      profileCompleted: true
    };

    this.currentUser = userObj;

    return {
      success: true,
      user: userObj,
      token: data.token,
      message: data.message || 'Login successful!'
    };
  }

  /**
   * POST /api/auth/register
   */
  async register(registrationData) {
    const { fullName, email, userId, password, phone } = registrationData;
    if (!fullName || !email || !userId || !password) {
      throw new Error('Please fill in all mandatory fields.');
    }

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        email: email.trim().toLowerCase(),
        phone: phone || undefined,
        password: password,
        name: fullName,
        business_name: registrationData.businessName || '',
        craft_category: registrationData.category || '',
        primary_craft: registrationData.primaryCraft || '',
        location: registrationData.location || '',
        language: registrationData.language || 'en',
        experience: registrationData.experience || '',
        bio: registrationData.bio || ''
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Registration failed.');
    }

    return {
      success: true,
      email: email.trim().toLowerCase(),
      userId,
      message: data.message || 'Registration successful! Verification code sent to your email.'
    };
  }

  /**
   * POST /api/auth/send-otp
   */
  async sendOTP(emailAddress, purpose = 'email_verification') {
    const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAddress, purpose })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to send OTP email.');
    }

    return {
      success: true,
      message: data.message
    };
  }

  /**
   * POST /api/auth/verify-otp
   */
  async verifyOTP(emailAddress, otpCode, purpose = 'email_verification') {
    if (!otpCode || otpCode.length !== 6) {
      throw new Error('Please enter the full 6-digit verification code.');
    }

    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAddress, otp: otpCode, purpose })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'OTP verification failed.');
    }

    if (data.token) {
      this.setToken(data.token);
    }

    return {
      success: true,
      token: data.token,
      user: data.user,
      message: data.message || 'Email verified successfully!'
    };
  }

  /**
   * POST /api/auth/resend-otp
   */
  async resendOTP(emailAddress, purpose = 'email_verification') {
    const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAddress, purpose })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to resend OTP email.');
    }

    return {
      success: true,
      message: data.message
    };
  }

  /**
   * POST /api/auth/forgot-password
   */
  async forgotPassword(emailAddress) {
    if (!emailAddress) throw new Error('Please enter your registered Email Address.');

    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAddress })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to process forgot password request.');
    }

    return {
      success: true,
      email: emailAddress,
      message: data.message
    };
  }

  /**
   * POST /api/auth/reset-password
   */
  async resetPassword(emailAddress, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters.');
    }

    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAddress, newPassword })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to reset password.');
    }

    return {
      success: true,
      message: data.message || 'Password reset successfully! You can now log in.'
    };
  }

  /**
   * PUT /api/artisan/profile
   */
  async updateProfile(profileData) {
    const token = this.getToken();

    if (!token) {
      throw new Error('Not authenticated. Token missing.');
    }

    const response = await fetch(`${API_BASE_URL}/artisan/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: profileData.businessName || profileData.fullName || profileData.name,
        business_name: profileData.businessName || '',
        craft_category: profileData.category || profileData.craft_category || '',
        primary_craft: profileData.primaryCraft || profileData.primary_craft || '',
        location: profileData.location || '',
        language: profileData.language || 'en',
        experience: profileData.experience || '',
        bio: profileData.bio || '',
        profile_image: profileData.profilePic || profileData.profile_image || ''
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to update profile in database');
    }

    const updatedProfile = data.profile;
    const userObj = {
      ...(this.currentUser || {}),
      id: updatedProfile.user_id,
      userId: updatedProfile.user_id,
      fullName: updatedProfile.name,
      businessName: updatedProfile.business_name,
      category: updatedProfile.craft_category,
      categoryName: updatedProfile.craft_category,
      primaryCraft: updatedProfile.primary_craft,
      location: updatedProfile.location,
      language: updatedProfile.language,
      experience: updatedProfile.experience,
      bio: updatedProfile.bio,
      profilePic: updatedProfile.profile_image,
      profileCompleted: true
    };

    this.currentUser = userObj;

    return {
      success: true,
      user: userObj,
      message: 'Artisan profile saved successfully to MongoDB!'
    };
  }

  /**
   * GET /api/artisan/profile
   */
  async getProfile() {
    const token = this.getToken();

    if (!token) {
      throw new Error('No authentication token found.');
    }

    const response = await fetch(`${API_BASE_URL}/artisan/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch profile');
    }

    const prof = data.profile;
    const userObj = {
      id: prof.user_id,
      userId: prof.user_id,
      fullName: prof.name,
      businessName: prof.business_name,
      category: prof.craft_category,
      categoryName: prof.craft_category,
      primaryCraft: prof.primary_craft,
      location: prof.location,
      language: prof.language,
      experience: prof.experience,
      bio: prof.bio,
      profilePic: prof.profile_image,
      profileCompleted: true
    };

    this.currentUser = userObj;

    return {
      success: true,
      profile: prof,
      user: userObj
    };
  }

  /**
   * GET /api/artisan/analytics
   */
  async getAnalytics() {
    const token = this.getToken();

    if (!token) {
      throw new Error('No authentication token found.');
    }

    const response = await fetch(`${API_BASE_URL}/artisan/analytics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch business analytics');
    }

    return {
      success: true,
      analytics: data.analytics
    };
  }

  /**
   * POST /api/artisan/products
   */
  async createProduct(productData) {
    const token = this.getToken();

    if (!token) {
      throw new Error('Not authenticated. Token missing.');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/artisan/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('[Create Product API Error]', response.status, data);
        throw new Error(data.message || 'Unable to publish product. Please check product details and try again.');
      }

      return data;
    } catch (err) {
      console.error('[Create Product Fetch Error]', err.message);
      throw err;
    }
  }

  /**
   * PUT /api/artisan/products/:productId
   * Updates an existing craft product (ownership verified on backend).
   * @param {string} productId - The product_id of the product to update
   * @param {Object} updateData - Fields to update (title, description, category, sector, material, product_size, price, stock)
   */
  async updateProduct(productId, updateData) {
    const token = this.getToken();

    if (!token) {
      throw new Error('Not authenticated. Token missing.');
    }

    if (!productId) {
      throw new Error('Product ID is required for update.');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/artisan/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('[Update Product API Error]', response.status, data);
        throw new Error(data.message || 'Failed to update product.');
      }

      return data;
    } catch (err) {
      console.error('[Update Product Fetch Error]', err.message);
      throw err;
    }
  }

  /**
   * GET /api/artisan/products
   */
  async getProducts() {
    const token = this.getToken();

    if (!token) {
      throw new Error('No authentication token found.');
    }

    const response = await fetch(`${API_BASE_URL}/artisan/products`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch products');
    }

    return data;
  }

  /**
   * DELETE /api/artisan/products/:id
   */
  async deleteProduct(productId) {
    const token = this.getToken();

    if (!token) {
      throw new Error('No authentication token found.');
    }

    const response = await fetch(`${API_BASE_URL}/artisan/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to delete product');
    }

    return data;
  }

  /**
   * GET /api/artisan/b2b-recommendations
   * Fetch B2B buyer opportunities matching artisan craft category
   */
  async getB2BRecommendations() {
    const token = this.getToken();

    if (!token) {
      throw new Error('No authentication token found.');
    }

    const response = await fetch(`${API_BASE_URL}/artisan/b2b-recommendations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch B2B recommendations.');
    }

    return data;
  }

  /**
   * POST /api/artisan/b2b/connect
   * Initiate connection request to a B2B buyer
   */
  async connectB2BBuyer(buyerId, productId = '') {
    const token = this.getToken();
    if (!token) throw new Error('No authentication token found.');

    const response = await fetch(`${API_BASE_URL}/artisan/b2b/connect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ buyer_id: buyerId, product_id: productId })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to send connection request.');
    return data;
  }

  /**
   * GET /api/artisan/b2b/connections
   * Get all active connections and statuses for logged-in artisan
   */
  async getB2BConnections() {
    const token = this.getToken();
    if (!token) throw new Error('No authentication token found.');

    const response = await fetch(`${API_BASE_URL}/artisan/b2b/connections`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch B2B connections.');
    return data;
  }

  /**
   * GET /api/artisan/b2b/inquiries
   */
  async getB2BInquiries() {
    const token = this.getToken();
    if (!token) throw new Error('No authentication token found.');

    const response = await fetch(`${API_BASE_URL}/artisan/b2b/inquiries`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch B2B inquiries.');
    return data;
  }

  /**
   * PUT /api/artisan/b2b/inquiries/:id/status
   */
  async updateB2BInquiryStatus(inquiryId, status) {
    const token = this.getToken();
    if (!token) throw new Error('No authentication token found.');

    const response = await fetch(`${API_BASE_URL}/artisan/b2b/inquiries/${inquiryId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to update inquiry status.');
    return data;
  }

  /**
   * GET /api/artisan/b2b/orders
   */
  async getB2BOrders() {
    const token = this.getToken();
    if (!token) throw new Error('No authentication token found.');

    const response = await fetch(`${API_BASE_URL}/artisan/b2b/orders`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch B2B orders.');
    return data;
  }

  /**
   * PUT /api/artisan/b2b/orders/:id/status
   */
  async updateB2BOrderStatus(orderId, status) {
    const token = this.getToken();
    if (!token) throw new Error('No authentication token found.');

    const response = await fetch(`${API_BASE_URL}/artisan/b2b/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to update order status.');
    return data;
  }

  /**
   * Google Social Login — Real Top-Level Browser Navigation to OAuth Endpoint
   */
  loginWithSocial(provider) {
    if (provider === 'google') {
      window.location.href = `${API_BASE_URL}/auth/google`;
      return;
    }
    throw new Error('Social login provider not supported.');
  }

  logout() {
    this.currentUser = null;
    this.setToken(null);
    return { success: true };
  }
}

export const authService = new AuthService();
