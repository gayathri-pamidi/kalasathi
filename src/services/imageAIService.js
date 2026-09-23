/**
 * Image AI & Pricing Service for KalaSaathi Frontend
 * Communicates with FastAPI Backend (http://127.0.0.1:8000 or http://localhost:8000)
 */

/**
 * Helper to get primary API base URL and fallback URL
 */
function getApiUrls(endpointPath) {
  const currentHost = typeof window !== 'undefined' && window.location ? window.location.hostname : '127.0.0.1';
  
  const primaryHost = currentHost || '127.0.0.1';
  const fallbackHost = primaryHost === '127.0.0.1' ? 'localhost' : '127.0.0.1';

  // Support both full path (e.g. 'image/enhance-image') or short path (e.g. 'analyze' -> 'image/analyze')
  const fullPath = endpointPath.includes('/') ? endpointPath : `image/${endpointPath}`;

  return {
    primaryUrl: `http://${primaryHost}:8000/api/v1/${fullPath}`,
    fallbackUrl: `http://${fallbackHost}:8000/api/v1/${fullPath}`
  };
}

/**
 * Robust fetch wrapper with automatic host fallback
 */
async function fetchWithFallback(endpointPath, options) {
  const { primaryUrl, fallbackUrl } = getApiUrls(endpointPath);

  try {
    const response = await fetch(primaryUrl, options);
    return response;
  } catch (primaryErr) {
    console.warn(`[AI Service] Primary request to ${primaryUrl} failed. Retrying fallback to ${fallbackUrl}...`, primaryErr);
    try {
      const fallbackResponse = await fetch(fallbackUrl, options);
      return fallbackResponse;
    } catch (fallbackErr) {
      console.error('[AI Service] Both primary and fallback endpoints failed:', fallbackErr);
      throw primaryErr;
    }
  }
}

/**
 * Sends a product image to FastAPI Real-ESRGAN x2 AI model for enhancement.
 * Returns an Object URL for the resulting binary PNG blob.
 *
 * @param {File} file - Browser File object (JPEG, PNG, WEBP)
 * @returns {Promise<{success: boolean, enhancedUrl: string, blob: Blob, originalName: string, mediaType: string}>}
 */
export async function enhanceImage(file) {
  if (!file) {
    throw new Error('Please select an image file to enhance.');
  }

  // Validate image MIME type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (file.type && !validTypes.includes(file.type.toLowerCase())) {
    throw new Error(`Unsupported image type '${file.type}'. Allowed formats: JPEG, PNG, WEBP.`);
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetchWithFallback('image/enhance-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' 
            ? errorData.detail 
            : JSON.stringify(errorData.detail);
        }
      } catch (e) {
        // Response was not JSON
      }
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('Received empty image response from server.');
    }

    const enhancedUrl = URL.createObjectURL(blob);

    return {
      success: true,
      enhancedUrl,
      blob,
      originalName: file.name,
      mediaType: response.headers.get('content-type') || 'image/png',
    };
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Unable to connect to FastAPI AI Backend. Ensure server is running at http://127.0.0.1:8000 or http://localhost:8000');
    }
    throw err;
  }
}

/**
 * Calls FastAPI Catalog Generation Service (POST /api/v1/catalog/generate).
 * Extracts AI product attributes (title, category, sector, material, size, description, colors).
 *
 * @param {File} file - Browser File object
 * @returns {Promise<{product_name: string, category: string, sector: string, material: string, product_size: string, description: string, dominant_colors: string[], visual_features: string[]}>}
 */
export async function generateCatalog(file) {
  if (!file) {
    throw new Error('Please select an image file for catalog generation.');
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetchWithFallback('catalog/generate', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `Catalog API error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch (e) {}
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Unable to connect to FastAPI AI Backend. Ensure server is running at http://127.0.0.1:8000 or http://localhost:8000');
    }
    throw err;
  }
}

/**
 * Calls FastAPI Pricing ML Service (POST /api/v1/pricing/predict).
 * Predicts market price using trained XGBoost Regressor model.
 *
 * @param {Object} payload - { category, sector, material, product_size, state, quantity }
 * @returns {Promise<{success: boolean, predicted_market_price: number, recommended_min_price: number, recommended_max_price: number, model: string, business_assumptions: Object}>}
 */
export async function predictPrice(payload) {
  try {
    const response = await fetchWithFallback('pricing/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `Pricing API error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch (e) {}
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Unable to connect to FastAPI AI Backend. Ensure server is running at http://127.0.0.1:8000 or http://localhost:8000');
    }
    throw err;
  }
}

/**
 * Sends a product image to FastAPI PyTorch vision AI model for taxonomy & description analysis.
 * Returns structured metadata including suggested_title and suggested_description.
 *
 * @param {File} file - Browser File object (JPEG, PNG, WEBP)
 * @returns {Promise<{success: boolean, analysis: Object}>}
 */
export async function analyzeImage(file) {
  if (!file) {
    throw new Error('Please select an image file to analyze.');
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetchWithFallback('image/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.detail) {
          errorMessage = typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail);
        }
      } catch (e) {}
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
      success: true,
      analysis: data.analysis,
    };
  } catch (err) {
    console.warn('[AI Image Analysis Error]', err);
    return {
      success: false,
      error: err.message,
    };
  }
}
