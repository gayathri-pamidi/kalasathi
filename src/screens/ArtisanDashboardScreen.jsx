import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { VirtualBusinessManager } from '../components/VirtualBusinessManager';
import { B2BBuyerOpportunities } from '../components/B2BBuyerOpportunities';
import { B2BInquiries } from '../components/B2BInquiries';
import { B2BOrders } from '../components/B2BOrders';
import { enhanceImage, generateCatalog, predictPrice, analyzeImage } from '../services/imageAIService';
import { authService } from '../services/authService';
import { 
  Sparkles, 
  Camera, 
  DollarSign, 
  Globe, 
  Plus, 
  MapPin, 
  LogOut, 
  CheckCircle2, 
  Sliders, 
  TrendingUp, 
  User,
  HeartHandshake,
  PackageOpen,
  Languages,
  Loader2,
  X,
  Download,
  AlertCircle,
  RefreshCw,
  Tag,
  Box,
  Check,
  Eye,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Edit3,
  Info,
  Coins,
  Clock,
  Wrench
} from 'lucide-react';

const blobToBase64 = (blobOrFile) => {
  return new Promise((resolve, reject) => {
    if (!blobOrFile) return resolve('');
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blobOrFile);
  });
};

/**
 * Format a number as Indian Rupee currency string (e.g. 1200 → "₹1,200")
 */
const formatINR = (amount) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '₹—';
  return '₹' + Number(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 0
  });
};

export const ArtisanDashboardScreen = () => {
  const { user, handleLogout, setCurrentScreen, showToast } = useAuth();
  const { t, language, setLanguage, languages } = useTranslation();

  // Modals & UI Navigation State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  
  // Digitization Workflow Steps:
  // Step 1: Select Craft Image
  // Step 2: AI Processing (Image Enhancement & Catalog Generation)
  // Step 3: Review & Edit Details (Title, Category, Sector, Material, Size, Description)
  // Step 4: AI Price Guide (With optional material cost & labour hours)
  // Step 5: Final Price & Publish
  const [productStep, setProductStep] = useState(1);

  // Image AI & File Input State
  const fileInputRef = useRef(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiProcessingStage, setAiProcessingStage] = useState('image'); // 'image' | 'catalog' | 'pricing'
  const [enhancementError, setEnhancementError] = useState(null);
  const [catalogError, setCatalogError] = useState(null);
  const [pricingError, setPricingError] = useState(null);
  
  const [originalFile, setOriginalFile] = useState(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);
  const [enhancedResultUrl, setEnhancedResultUrl] = useState(null);
  const [enhancedBlob, setEnhancedBlob] = useState(null);
  const [useOriginalPhoto, setUseOriginalPhoto] = useState(false);
  const [selectedFileMeta, setSelectedFileMeta] = useState(null);
  const [showOriginalToggle, setShowOriginalToggle] = useState(false);

  // Product Form & AI Attributes State
  const [productForm, setProductForm] = useState({
    title: '',
    category: '',
    sector: '',
    material: '',
    product_size: 'Medium',
    description: '',
    price: '',
    stock: '1',
    material_cost: '',
    labour_hours: '',
    dominant_colors: [],
    visual_features: []
  });

  // AI Pricing Result State
  const [aiPricingResult, setAiPricingResult] = useState(null);
  const [isPredictingPrice, setIsPredictingPrice] = useState(false);

  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [saveProductError, setSaveProductError] = useState(null);
  const [publishSuccessMessage, setPublishSuccessMessage] = useState(null);

  // Catalog Products State
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [bmRefreshKey, setBmRefreshKey] = useState(0);

  const handleOrderCompleted = () => {
    setBmRefreshKey(prev => prev + 1);
  };

  // ── Edit Product State ──────────────────────────────────────────────────
  // editTarget: the full product object being edited (null = modal closed)
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    sector: '',
    material: '',
    product_size: 'Medium',
    price: '',
    stock: ''
  });
  const [editError, setEditError] = useState(null);
  const [editSuccess, setEditSuccess] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  // AI pricing inside the edit modal
  const [editAiPricing, setEditAiPricing] = useState(null);
  const [isEditPredicting, setIsEditPredicting] = useState(false);
  const [editPricingError, setEditPricingError] = useState(null);
  // ──────────────────────────────────────────────────────────────────────

  // Fetch Products on Mount
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const res = await authService.getProducts();
      if (res.success && res.products) {
        setProducts(res.products);
      }
    } catch (err) {
      console.warn('[Fetch Products Error]', err.message);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Object URL cleanup
  useEffect(() => {
    return () => {
      if (originalPreviewUrl && originalPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(originalPreviewUrl);
      if (enhancedResultUrl && enhancedResultUrl.startsWith('blob:')) URL.revokeObjectURL(enhancedResultUrl);
    };
  }, [originalPreviewUrl, enhancedResultUrl]);

  // Reset Add Product Workflow State
  const resetAddProductFlow = () => {
    if (originalPreviewUrl && originalPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(originalPreviewUrl);
    if (enhancedResultUrl && enhancedResultUrl.startsWith('blob:')) URL.revokeObjectURL(enhancedResultUrl);
    setOriginalFile(null);
    setOriginalPreviewUrl(null);
    setEnhancedResultUrl(null);
    setEnhancedBlob(null);
    setSelectedFileMeta(null);
    setEnhancementError(null);
    setCatalogError(null);
    setPricingError(null);
    setIsProcessingAI(false);
    setUseOriginalPhoto(false);
    setShowOriginalToggle(false);
    setProductStep(1);
    setSaveProductError(null);
    setIsSavingProduct(false);
    setAiPricingResult(null);
    setIsPredictingPrice(false);
    setProductForm({
      title: '',
      category: user?.categoryName || user?.category || '',
      sector: 'Handicraft',
      material: '',
      product_size: 'Medium',
      description: '',
      price: '',
      stock: '1',
      material_cost: '',
      labour_hours: '',
      dominant_colors: [],
      visual_features: []
    });
    setShowAddProductModal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Open Add Product Flow
  const openAddProductFlow = () => {
    resetAddProductFlow();
    setShowAddProductModal(true);
    setProductStep(1);
  };

  // Trigger File Input Picker
  const triggerImagePicker = () => {
    if (isProcessingAI) return;
    setEnhancementError(null);
    setCatalogError(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle Image Selection & Trigger FastAPI Image Enhancement + AI Catalog Generation
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isProcessingAI) return;

    // Cleanup previous object URLs
    if (originalPreviewUrl && originalPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(originalPreviewUrl);
    if (enhancedResultUrl && enhancedResultUrl.startsWith('blob:')) URL.revokeObjectURL(enhancedResultUrl);
    setEnhancedResultUrl(null);
    setEnhancedBlob(null);
    setEnhancementError(null);
    setCatalogError(null);
    setUseOriginalPhoto(false);
    setOriginalFile(file);

    const origUrl = URL.createObjectURL(file);
    setOriginalPreviewUrl(origUrl);
    setSelectedFileMeta({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: file.type
    });

    // Advance to Step 2: AI Processing (Enhancement & Catalog)
    setProductStep(2);
    setIsProcessingAI(true);
    setAiProcessingStage('image');

    try {
      // 1. Image Enhancement Call
      setAiProcessingStage('image');
      try {
        const enhanceRes = await enhanceImage(file);
        setEnhancedResultUrl(enhanceRes.enhancedUrl);
        setEnhancedBlob(enhanceRes.blob);
      } catch (err) {
        console.warn('[Enhancement Failed]', err.message);
        setEnhancementError(err.message || 'Image enhancement unavailable. Using original photo.');
      }

      // 2. Catalog Generation Call
      setAiProcessingStage('catalog');
      try {
        const catalogData = await generateCatalog(file);
        setProductForm(prev => ({
          ...prev,
          title: catalogData.product_name || 'Handcrafted Artisan Craft Item',
          category: catalogData.category || user?.categoryName || 'Wood Craft',
          sector: catalogData.sector || 'Handicraft',
          material: catalogData.material || 'Natural Material',
          product_size: catalogData.product_size || 'Medium',
          description: catalogData.description || 'Authentic handcrafted product made by skilled artisans.',
          dominant_colors: catalogData.dominant_colors || [],
          visual_features: catalogData.visual_features || []
        }));
      } catch (catErr) {
        try {
          const analyzeRes = await analyzeImage(file);
          if (analyzeRes?.success && analyzeRes?.analysis) {
            const { analysis } = analyzeRes;
            setProductForm(prev => ({
              ...prev,
              title: prev.title || analysis.suggested_title || 'Handcrafted Artisan Item',
              category: prev.category || (analysis.product_category && analysis.product_category !== 'handicrafts' ? analysis.product_category.toUpperCase() : prev.category || 'Handicraft'),
              description: prev.description || analysis.suggested_description || 'Beautiful handcrafted craft item created with traditional technique.'
            }));
          } else {
            throw new Error('Analysis offline');
          }
        } catch (anErr) {
          console.warn('[Catalog Generation Failed]', catErr.message);
          setCatalogError('AI identification temporarily offline. You can manually enter details.');
          setProductForm(prev => ({
            ...prev,
            title: 'Handcrafted Artisan Item',
            category: user?.categoryName || user?.category || 'Handicraft',
            sector: 'Handicraft',
            material: 'Wood',
            product_size: 'Medium',
            description: 'Beautiful handcrafted craft item created with traditional technique.'
          }));
        }
      }
    } catch (err) {
      setEnhancementError(err.message || 'Photo enhancement is temporarily unavailable. You can try again.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Fetch AI Price Prediction (Step 4)
  const handleFetchAiPrice = async () => {
    setIsPredictingPrice(true);
    setPricingError(null);
    try {
      const payload = {
        category: productForm.category || 'Wood Craft',
        sector: productForm.sector || 'Handicraft',
        material: productForm.material || 'Wood',
        product_size: productForm.product_size || 'Medium',
        state: user?.location || 'Andhra Pradesh',
        quantity: Number(productForm.stock) || 1,
        labour_hours: productForm.labour_hours ? Number(productForm.labour_hours) : null,
        material_cost: productForm.material_cost ? Number(productForm.material_cost) : null
      };
      
      const pricingData = await predictPrice(payload);
      setAiPricingResult(pricingData);
      
      // Auto-suggest price in form if empty
      if (!productForm.price && pricingData?.predicted_market_price) {
        setProductForm(prev => ({ ...prev, price: String(pricingData.predicted_market_price) }));
      }
    } catch (err) {
      console.warn('[Pricing Prediction Error]', err.message);
      setPricingError(err.message || 'AI price guide temporarily unavailable. You can still set your own price.');
    } finally {
      setIsPredictingPrice(false);
    }
  };

const compressImageForPayload = (blobOrFile, maxWidth = 1000, maxHeight = 1000, quality = 0.85) => {
  if (!blobOrFile) return Promise.resolve('');
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/png', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target.result || '');
      img.src = e.target.result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blobOrFile);
  });
};

  // Save Final Product to Catalog (Step 5)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.title || !productForm.title.trim()) {
      setSaveProductError('Please enter a product title.');
      return;
    }

    const priceNum = Number(productForm.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setSaveProductError('Please enter a valid positive selling price.');
      return;
    }

    const stockNum = Number(productForm.stock);
    if (isNaN(stockNum) || stockNum < 1) {
      setSaveProductError('Please enter a valid available stock quantity (1 or more).');
      return;
    }

    setIsSavingProduct(true);
    setSaveProductError(null);

    try {
      // Safely convert image to permanent Base64 data URL string (NEVER sending blob: URLs)
      let imageString = '';
      if (!useOriginalPhoto && enhancedBlob) {
        imageString = await compressImageForPayload(enhancedBlob);
      } else if (originalFile) {
        imageString = await compressImageForPayload(originalFile);
      }

      console.log('[Frontend Boundary 1 - handleSaveProduct]', {
        title: productForm.title.trim(),
        price: priceNum,
        stock: stockNum,
        imageStringLength: imageString ? imageString.length : 0,
        isBase64DataUrl: imageString.startsWith('data:image/')
      });

      const payload = {
        title: productForm.title.trim(),
        category: productForm.category.trim() || 'Handicraft',
        sector: productForm.sector.trim() || 'Handicraft',
        material: productForm.material.trim() || 'Wood',
        product_size: productForm.product_size || 'Medium',
        description: productForm.description.trim(),
        price: priceNum,
        stock: stockNum,
        images: imageString ? [imageString] : []
      };

      const res = await authService.createProduct(payload);
      if (res.success) {
        setPublishSuccessMessage('Product published successfully!');
        await fetchProducts();
        setTimeout(() => {
          setPublishSuccessMessage(null);
          resetAddProductFlow();
        }, 1200);
      } else {
        setSaveProductError(res.message || 'Unable to publish product. Please check the product details and try again.');
      }
    } catch (err) {
      console.error('[Publish Error]', err);
      setSaveProductError(err.message || 'Unable to publish product. Please check the product details and try again.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Delete Product Handler
  const handleDeleteProduct = async (productId) => {
    try {
      await authService.deleteProduct(productId);
      fetchProducts();
    } catch (err) {
      console.warn('[Delete Product Error]', err.message);
    }
  };

  // ── Edit Product Handlers ────────────────────────────────────────────────

  /** Open edit modal — pre-populate form with ACTUAL saved product values */
  const handleOpenEditModal = (prod) => {
    setEditTarget(prod);
    setEditForm({
      title: prod.title || '',
      description: prod.description || '',
      category: prod.category || '',
      sector: prod.sector || '',
      material: prod.material || '',
      product_size: prod.product_size || 'Medium',
      price: prod.price !== undefined ? String(prod.price) : '',
      stock: prod.stock !== undefined ? String(prod.stock) : '1'
    });
    setEditError(null);
    setEditSuccess(null);
    setEditAiPricing(null);
    setEditPricingError(null);
  };

  /** Close edit modal and reset edit state */
  const handleCloseEditModal = () => {
    setEditTarget(null);
    setEditError(null);
    setEditSuccess(null);
    setEditAiPricing(null);
    setEditPricingError(null);
    setIsSavingEdit(false);
    setIsEditPredicting(false);
  };

  /** Generic field change handler for edit form */
  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    setEditError(null);
  };

  /**
   * Recalculate AI market price inside edit modal.
   * Calls the existing XGBoost FastAPI endpoint — does NOT change the
   * selling price field automatically.
   */
  const handleEditAiPrice = async () => {
    setIsEditPredicting(true);
    setEditPricingError(null);
    setEditAiPricing(null);
    try {
      const payload = {
        category: editForm.category || 'Handicraft',
        sector: editForm.sector || 'Handicraft',
        material: editForm.material || 'Wood',
        product_size: editForm.product_size || 'Medium',
        state: user?.location || 'Andhra Pradesh',
        quantity: Number(editForm.stock) || 1,
        // Pass preserved cost info if available on the saved product
        labour_hours: editTarget?.labour_hours ? Number(editTarget.labour_hours) : null,
        material_cost: editTarget?.material_cost ? Number(editTarget.material_cost) : null
      };
      const pricingData = await predictPrice(payload);
      setEditAiPricing(pricingData);
    } catch (err) {
      console.warn('[Edit AI Pricing Error]', err.message);
      setEditPricingError(err.message || 'AI pricing temporarily unavailable.');
    } finally {
      setIsEditPredicting(false);
    }
  };

  /**
   * Save edited product.
   * 1. Frontend validates fields.
   * 2. Sends PUT /api/artisan/products/:product_id
   * 3. Backend verifies JWT + ownership before updating.
   * 4. On success: refreshes catalog and shows success message.
   */
  const handleEditSaveProduct = async (e) => {
    e.preventDefault();

    if (!editForm.title || !editForm.title.trim()) {
      setEditError('Product title must not be empty.');
      return;
    }
    const priceNum = Number(editForm.price);
    if (isNaN(priceNum) || priceNum < 0) {
      setEditError('Please enter a valid non-negative selling price.');
      return;
    }
    const stockNum = Number(editForm.stock);
    if (isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
      setEditError('Please enter a valid whole number for stock (0 or more).');
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      const updateData = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        category: editForm.category.trim(),
        sector: editForm.sector.trim(),
        material: editForm.material.trim(),
        product_size: editForm.product_size,
        price: priceNum,
        stock: stockNum
      };

      console.log('[Edit Product] Sending PUT for', editTarget?.product_id, updateData);
      const res = await authService.updateProduct(editTarget.product_id, updateData);

      if (res.success) {
        setEditSuccess('Product updated successfully!');
        // Refresh catalog immediately — no full page reload
        await fetchProducts();
        setTimeout(() => {
          handleCloseEditModal();
        }, 1400);
      } else {
        setEditError(res.message || 'Failed to update product.');
      }
    } catch (err) {
      console.error('[Edit Save Error]', err);
      setEditError(err.message || 'Failed to update product. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-[#F6F3EE] flex flex-col justify-between animate-fade-in pb-16 text-left relative">
      {/* Hidden File Input for Product Image AI Selection */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-terracotta-600 text-white flex items-center justify-center font-bold shadow-sm">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 leading-tight">
              Kala<span className="text-terracotta-600">Saathi</span>
            </h3>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 w-max">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('common.verifiedManager')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Header Language Dropdown Selector */}
          <div className="relative flex items-center bg-slate-100 hover:bg-slate-200 rounded-xl px-2 py-1 transition-colors">
            <Languages className="w-4 h-4 text-terracotta-600 mr-1 flex-shrink-0" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer pr-1"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.native} ({lang.code.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowProfileModal(true)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title={t('nav.profile')}
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
            title={t('common.logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* Artisan Hero Banner */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-terracotta-700 via-terracotta-800 to-slate-900 text-white shadow-floating relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            <Sparkles className="w-48 h-48" />
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-full border-2 border-amber-300 shadow-md overflow-hidden bg-slate-700 flex-shrink-0">
              {user?.profilePic ? (
                <img src={user.profilePic} alt={user.fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-full h-full p-3 text-slate-300" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <h2 className="font-extrabold text-lg sm:text-xl text-white">
                  {user?.businessName || user?.fullName || t('dashboard.artisanUser')}
                </h2>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
              </div>
              <p className="text-xs text-terracotta-200 font-medium">
                {user?.categoryName || user?.category || t('dashboard.categoryNotSet')}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-300 pt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-300" />
                  {user?.location || t('dashboard.locationNotSet')}
                </span>
                <span>•</span>
                <span>{user?.experience ? `${user.experience}` : t('dashboard.experienceNotSet')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action CTA — Digitize New Craft Item */}
        <div className="flex items-center justify-between bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-purple-500/10 border border-amber-500/30 p-4 rounded-3xl shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-md">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-slate-900 leading-tight">{t('dashboard.digitizeCraft')}</h4>
              <p className="text-xs text-slate-600 pt-0.5">{t('dashboard.digitizeDesc')}</p>
            </div>
          </div>
          <button
            onClick={openAddProductFlow}
            className="p-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
            title={t('dashboard.digitizeCraft')}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* B2B Buyer Opportunities Section */}
        <B2BBuyerOpportunities showToast={showToast} />

        {/* B2B Inquiries Section */}
        <B2BInquiries showToast={showToast} />

        {/* B2B Orders Section */}
        <B2BOrders showToast={showToast} onOrderCompleted={handleOrderCompleted} />

        {/* Virtual Business Manager Section */}
        <VirtualBusinessManager key={bmRefreshKey} />

        {/* Product Catalog Section — ownership-filtered: only current artisan's products */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900">{t('dashboard.yourProductCatalog')}</h3>
            <span className="text-xs font-bold text-slate-500">
              {products.length} {products.length === 1 ? 'Product' : 'Products'}
            </span>
          </div>

          {isLoadingProducts ? (
            <div className="p-6 text-center text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-terracotta-600" />
              <p className="text-xs">Loading craft products...</p>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {products.map((prod) => (
                <div
                  key={prod.product_id || prod._id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft flex flex-col justify-between"
                >
                  {/* Image area — hover overlay applied here via catalog-card class */}
                  <div className="aspect-square bg-slate-100 catalog-card">
                    {prod.images && prod.images[0] ? (
                      <img
                        src={prod.images[0]}
                        alt={prod.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <PackageOpen className="w-8 h-8" />
                      </div>
                    )}

                    {/* AI badge */}
                    <span className="absolute top-2 right-2 text-[10px] font-extrabold bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-xs z-10">
                      AI Enhanced
                    </span>

                    {/* Hover Overlay: title + description + final selling price */}
                    <div className="catalog-card-overlay" aria-hidden="true">
                      <p className="catalog-card-overlay-title">{prod.title}</p>
                      {prod.description ? (
                        <p className="catalog-card-overlay-desc">{prod.description}</p>
                      ) : null}
                      <span className="catalog-card-overlay-price">{formatINR(prod.price)}</span>
                    </div>
                  </div>

                  {/* Normal card footer: product name + edit/delete buttons */}
                  <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 line-clamp-1">{prod.title}</h4>
                      <p className="text-[11px] text-slate-500">{prod.category || 'Handicraft'}</p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="font-black text-sm text-slate-900">{formatINR(prod.price)}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                          Qty: {prod.stock ?? 0}
                        </span>
                        {/* Edit button */}
                        <button
                          onClick={() => handleOpenEditModal(prod)}
                          className="text-terracotta-600 hover:text-terracotta-800 p-1 transition cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteProduct(prod.product_id)}
                          className="text-red-400 hover:text-red-600 p-1 transition cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty state — shown when artisan has no published products yet */
            <div className="p-8 rounded-2xl bg-white border border-dashed border-slate-300 text-center space-y-3">
              <PackageOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h4 className="font-bold text-sm text-slate-800">No products yet</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Digitize your first craft to add it to your personal product catalog.
                </p>
              </div>
              <button
                onClick={openAddProductFlow}
                className="mt-1 inline-flex items-center gap-1.5 px-4 py-2.5 bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Digitize Your First Craft</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
           EDIT PRODUCT MODAL
           Opens when artisan clicks the Edit (pencil) button on a
           product card. Pre-filled with the product's saved values.
           Ownership is verified on the backend via JWT.
      ════════════════════════════════════════════════════════════ */}
      {editTarget && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-floating animate-pop-in text-left max-h-[94vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-terracotta-600 text-white shadow-sm">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Edit Product</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Update your craft product details</p>
                </div>
              </div>
              {!isSavingEdit && (
                <button
                  onClick={handleCloseEditModal}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Success Banner */}
            {editSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl mb-4">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <p className="text-xs font-bold text-emerald-800">{editSuccess}</p>
              </div>
            )}

            {/* Error Banner */}
            {editError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl mb-4">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-xs font-bold text-red-700">{editError}</p>
              </div>
            )}

            <form onSubmit={handleEditSaveProduct} className="space-y-4">

              {/* Product Name */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Product Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => handleEditFormChange('title', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-terracotta-400 transition"
                  placeholder="Product name"
                  disabled={isSavingEdit}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={e => handleEditFormChange('description', e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-terracotta-400 transition resize-none"
                  placeholder="Describe your craft..."
                  disabled={isSavingEdit}
                />
              </div>

              {/* Category + Sector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={e => handleEditFormChange('category', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-terracotta-400 transition"
                    placeholder="e.g. Pottery"
                    disabled={isSavingEdit}
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Sector</label>
                  <input
                    type="text"
                    value={editForm.sector}
                    onChange={e => handleEditFormChange('sector', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-terracotta-400 transition"
                    placeholder="e.g. Handicraft"
                    disabled={isSavingEdit}
                  />
                </div>
              </div>

              {/* Material + Product Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Material</label>
                  <input
                    type="text"
                    value={editForm.material}
                    onChange={e => handleEditFormChange('material', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-terracotta-400 transition"
                    placeholder="e.g. Terracotta"
                    disabled={isSavingEdit}
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Product Size</label>
                  <select
                    value={editForm.product_size}
                    onChange={e => handleEditFormChange('product_size', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-terracotta-400 transition bg-white"
                    disabled={isSavingEdit}
                  >
                    {['Small', 'Medium', 'Large', 'Extra Large'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── AI Market Price Recalculation ───────────────────────────── */}
              <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-extrabold text-amber-800">AI Market Price Guide</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleEditAiPrice}
                    disabled={isEditPredicting || isSavingEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {isEditPredicting ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /><span>Calculating...</span></>
                    ) : (
                      <><RefreshCw className="w-3 h-3" /><span>Recalculate AI Market Price</span></>
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-amber-700">
                  Uses your product's current attributes with the XGBoost pricing model.
                  {editTarget?.material_cost || editTarget?.labour_hours
                    ? ' Preserved cost data will be included.'
                    : ' No material cost / labour time saved — model uses estimated defaults.'}
                </p>

                {editPricingError && (
                  <p className="text-xs text-red-600 font-medium">{editPricingError}</p>
                )}

                {editAiPricing && (
                  <div className="space-y-2 pt-1">
                    {/* AI Recommendation Panel */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded-xl p-2 border border-amber-200">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">AI Market Price</p>
                        <p className="font-black text-sm text-amber-700">{formatINR(editAiPricing.predicted_market_price)}</p>
                      </div>
                      <div className="bg-white rounded-xl p-2 border border-slate-200">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Recommended Min</p>
                        <p className="font-bold text-sm text-slate-700">{formatINR(editAiPricing.recommended_min_price)}</p>
                      </div>
                      <div className="bg-white rounded-xl p-2 border border-slate-200">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Recommended Max</p>
                        <p className="font-bold text-sm text-slate-700">{formatINR(editAiPricing.recommended_max_price)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-slate-200">
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Your Current Selling Price</p>
                        <p className="font-black text-sm text-slate-800">{formatINR(editForm.price || 0)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditFormChange('price', String(Math.round(editAiPricing.predicted_market_price)))}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Use AI Price
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditAiPricing(null)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Keep Current
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-700 text-center">
                      AI recommendation does not automatically change your price. Click "Use AI Price" or type your own price below.
                    </p>
                  </div>
                )}
              </div>
              {/* ────────────────────────────────────────────────────────── */}

              {/* Selling Price + Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Selling Price (₹) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.price}
                    onChange={e => handleEditFormChange('price', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-terracotta-400 transition"
                    placeholder="e.g. 1200"
                    disabled={isSavingEdit}
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Stock Quantity <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.stock}
                    onChange={e => handleEditFormChange('stock', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-terracotta-400 transition"
                    placeholder="e.g. 5"
                    disabled={isSavingEdit}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isSavingEdit}
                  className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 py-2.5 rounded-2xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-extrabold text-sm shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSavingEdit ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></>
                  ) : (
                    <><Check className="w-4 h-4" /><span>Save Changes</span></>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product / Digitize Craft Step-by-Step Modal Overlay */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-floating animate-pop-in text-left max-h-[94vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="border-b border-slate-100 pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">
                      {productStep === 1 && 'Step 1: Add Craft Image'}
                      {productStep === 2 && 'Step 2: AI Processing'}
                      {productStep === 3 && 'Step 3: Review & Edit Details'}
                      {productStep === 4 && 'Step 4: AI Price Guide'}
                      {productStep === 5 && 'Step 5: Final Price & Publish'}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">KalaSaathi AI Craft Digitization</p>
                  </div>
                </div>

                {!isSavingProduct && (
                  <button
                    onClick={resetAddProductFlow}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Step Progress Bar Indicator */}
              <div className="grid grid-cols-5 gap-1 pt-1">
                {[
                  { num: 1, label: 'Image' },
                  { num: 2, label: 'AI Details' },
                  { num: 3, label: 'Review' },
                  { num: 4, label: 'Price' },
                  { num: 5, label: 'Publish' }
                ].map((s) => (
                  <div key={s.num} className="text-center">
                    <div
                      className={`h-1.5 rounded-full transition-colors ${
                        productStep >= s.num ? 'bg-amber-500' : 'bg-slate-200'
                      }`}
                    />
                    <span
                      className={`text-[9px] font-extrabold block pt-1 ${
                        productStep === s.num ? 'text-amber-700' : 'text-slate-400'
                      }`}
                    >
                      {s.num}. {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* STEP 1: Add Craft Image */}
            {productStep === 1 && (
              <div className="py-4 text-center space-y-4">
                <div
                  onClick={triggerImagePicker}
                  className="border-2 border-dashed border-slate-300 hover:border-terracotta-500 rounded-3xl p-8 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer space-y-3 group"
                >
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900">Snap or Upload Craft Photo</h4>
                    <p className="text-xs text-slate-500 pt-1 max-w-xs mx-auto">
                      Select photo from camera or gallery. AI automatically enhances background, identifies craft category, and suggests pricing.
                    </p>
                  </div>
                  <button className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-2xl shadow-sm cursor-pointer group-hover:bg-terracotta-600 transition-colors">
                    Browse Photo
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: AI Image Enhancement & Catalog Generation */}
            {productStep === 2 && (
              <div className="space-y-4">
                {/* State 2A: Processing Spinner */}
                {isProcessingAI && (
                  <div className="py-8 text-center space-y-3">
                    <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
                      <Sparkles className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-slate-900">
                        {aiProcessingStage === 'image' && 'Enhancing your craft image...'}
                        {aiProcessingStage === 'catalog' && 'AI is identifying your craft...'}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto pt-1">
                        Extracting studio lighting details, craft material, category, and generating your catalog story.
                      </p>
                    </div>
                    {originalPreviewUrl && (
                      <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden border border-slate-200 shadow-sm opacity-60">
                        <img src={originalPreviewUrl} alt="Uploading" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                )}

                {/* State 2B: Success Enhanced & AI Generated Result */}
                {!isProcessingAI && (enhancedResultUrl || originalPreviewUrl) && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">File: {selectedFileMeta?.name}</span>
                      <span className="text-[11px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Photo & AI Analysis Ready
                      </span>
                    </div>

                    {/* Image Preview Container */}
                    <div className="aspect-square rounded-2xl bg-slate-900 border-2 border-amber-500 overflow-hidden relative shadow-md">
                      <img
                        src={showOriginalToggle ? originalPreviewUrl : (enhancedResultUrl || originalPreviewUrl)}
                        alt="Product Craft"
                        className="w-full h-full object-contain bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]"
                      />

                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <button
                          onClick={() => setShowOriginalToggle(!showOriginalToggle)}
                          className="px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md text-white font-bold text-[10px] hover:bg-slate-900 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          {showOriginalToggle ? 'Showing Original' : 'Showing Enhanced'}
                        </button>
                      </div>
                    </div>

                    {/* Friendly Alert if Backend Fallback happened */}
                    {(enhancementError || catalogError) && (
                      <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">AI Note</p>
                          <p className="text-[11px]">
                            {enhancementError || catalogError || 'Some AI features are offline. You can edit all details manually.'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={triggerImagePicker}
                        className="py-2.5 px-4 rounded-2xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
                      >
                        Retake Photo
                      </button>
                      <button
                        onClick={() => setProductStep(3)}
                        className="flex-1 py-2.5 rounded-2xl bg-terracotta-600 text-white font-bold text-xs hover:bg-terracotta-700 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span>Review AI Details</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Review & Edit AI Generated Product Details */}
            {productStep === 3 && (
              <div className="space-y-4">
                <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-start gap-2 text-xs text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block">AI Generated Product Details</span>
                    <span className="text-[11px] text-amber-800">
                      Review AI extracted information below. All fields are editable—your edits have final authority.
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Product Name */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                      <span>Product Name / Title <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-slate-400 font-normal">AI Suggested ✏️</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Handcrafted Terracotta Clay Pitcher"
                      value={productForm.title}
                      onChange={(e) => setProductForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-terracotta-600 focus:ring-1 focus:ring-terracotta-600 outline-none text-slate-900 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Category */}
                    <div>
                      <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                        <span>Craft Category</span>
                        <span className="text-[10px] text-slate-400 font-normal">✏️</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Pottery / Wood Craft"
                        value={productForm.category}
                        onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-terracotta-600 focus:ring-1 focus:ring-terracotta-600 outline-none text-slate-900 font-semibold"
                      />
                    </div>

                    {/* Sector */}
                    <div>
                      <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                        <span>Sector</span>
                        <span className="text-[10px] text-slate-400 font-normal">✏️</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Handicraft / Handloom"
                        value={productForm.sector}
                        onChange={(e) => setProductForm(prev => ({ ...prev, sector: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-terracotta-600 focus:ring-1 focus:ring-terracotta-600 outline-none text-slate-900 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Material */}
                    <div>
                      <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                        <span>Material</span>
                        <span className="text-[10px] text-slate-400 font-normal">✏️</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Clay / Wood / Metal"
                        value={productForm.material}
                        onChange={(e) => setProductForm(prev => ({ ...prev, material: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-terracotta-600 focus:ring-1 focus:ring-terracotta-600 outline-none text-slate-900 font-semibold"
                      />
                    </div>

                    {/* Product Size */}
                    <div>
                      <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                        <span>Product Size</span>
                        <span className="text-[10px] text-slate-400 font-normal">✏️</span>
                      </label>
                      <select
                        value={productForm.product_size}
                        onChange={(e) => setProductForm(prev => ({ ...prev, product_size: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-terracotta-600 focus:ring-1 focus:ring-terracotta-600 outline-none text-slate-900 font-semibold bg-white cursor-pointer"
                      >
                        <option value="Small">Small</option>
                        <option value="Medium">Medium</option>
                        <option value="Large">Large</option>
                      </select>
                    </div>
                  </div>

                  {/* Dominant Colors Badges */}
                  {productForm.dominant_colors && productForm.dominant_colors.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="font-bold text-slate-600 text-[11px]">Dominant Colors:</span>
                      <div className="flex flex-wrap gap-1">
                        {productForm.dominant_colors.map((c, idx) => (
                          <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-md text-[10px] capitalize">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                      <span>Craft Description / Story</span>
                      <span className="text-[10px] text-slate-400 font-normal">AI Generated ✏️</span>
                    </label>
                    <textarea
                      rows="3"
                      placeholder="Describe your craft technique, heritage story, and materials used..."
                      value={productForm.description}
                      onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-terracotta-600 focus:ring-1 focus:ring-terracotta-600 outline-none text-slate-900 font-semibold resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setProductStep(2)}
                    className="py-2.5 px-4 rounded-2xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 transition cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setProductStep(4);
                      handleFetchAiPrice();
                    }}
                    className="flex-1 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span>Next: Get AI Price Guide</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Separate AI Price Guide (With Optional Real-World Inputs) */}
            {productStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                  <span>Target: {productForm.title}</span>
                  <span className="text-[11px] font-bold text-terracotta-600 bg-terracotta-50 px-2 py-0.5 rounded-md">
                    {productForm.category} • {productForm.material} ({productForm.product_size})
                  </span>
                </div>

                {/* Optional Real-World Pricing Refinement Inputs */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <span className="font-extrabold text-slate-900 block flex items-center justify-between">
                    <span>Optional Price Refinement Inputs</span>
                    <span className="text-[10px] font-normal text-slate-500">Improves ML estimate</span>
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        Raw Material Cost (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 300 (Optional)"
                        value={productForm.material_cost}
                        onChange={(e) => setProductForm(prev => ({ ...prev, material_cost: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-terracotta-600 outline-none text-slate-900 font-semibold text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        Labour Time (Hours)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="e.g. 5.0 (Optional)"
                        value={productForm.labour_hours}
                        onChange={(e) => setProductForm(prev => ({ ...prev, labour_hours: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-terracotta-600 outline-none text-slate-900 font-semibold text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleFetchAiPrice}
                      disabled={isPredictingPrice}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isPredictingPrice ? 'animate-spin' : ''}`} />
                      <span>Update Price Estimate</span>
                    </button>
                  </div>
                </div>

                {isPredictingPrice ? (
                  <div className="py-8 text-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-600" />
                    <div>
                      <h4 className="font-extrabold text-base text-slate-900">Analyzing market price...</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto pt-1">
                        Evaluating ML feature configurations for {productForm.category} ({productForm.material}) in {user?.location || 'Andhra Pradesh'}...
                      </p>
                    </div>
                  </div>
                ) : pricingError ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>AI Pricing Temporarily Unavailable</span>
                    </div>
                    <p>{pricingError}</p>
                    <p className="text-[11px] text-amber-700">
                      You can still proceed directly to enter your own custom selling price.
                    </p>
                  </div>
                ) : aiPricingResult ? (
                  <div className="space-y-3">
                    {/* Visually Separate AI PRICE GUIDE Card */}
                    <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-purple-500/10 border-2 border-amber-500/40 space-y-3 text-center shadow-soft relative overflow-hidden">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white font-extrabold text-[11px] shadow-xs">
                        <Coins className="w-3.5 h-3.5" />
                        <span>AI PRICE GUIDE</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-extrabold text-slate-600 block uppercase tracking-wider">
                          AI Suggested Market Price
                        </span>
                        <div className="text-3xl font-black text-slate-900 tracking-tight">
                          ₹{aiPricingResult.predicted_market_price}
                        </div>
                      </div>

                      {/* Recommended Price Range */}
                      <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between px-4 text-xs">
                        <span className="font-bold text-slate-600">Recommended Range:</span>
                        <span className="font-extrabold text-slate-900 bg-white/80 px-3 py-1 rounded-xl border border-amber-300">
                          ₹{aiPricingResult.recommended_min_price} – ₹{aiPricingResult.recommended_max_price}
                        </span>
                      </div>

                      {/* Provenance Badges */}
                      <div className="pt-2 border-t border-amber-200/40 flex flex-wrap justify-center gap-1.5 text-[10px]">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                          Category: {productForm.category} (Artisan Confirmed)
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                          Material: {productForm.material} (Artisan Confirmed)
                        </span>
                        <span className={productForm.labour_hours ? "bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold" : "bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold"}>
                          Labour: {productForm.labour_hours ? `${productForm.labour_hours} hrs (Artisan)` : '8.0 hrs (Dataset Default)'}
                        </span>
                        <span className={productForm.material_cost ? "bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold" : "bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold"}>
                          Material Cost: {productForm.material_cost ? `₹${productForm.material_cost} (Artisan)` : '₹150 (Dataset Default)'}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1 pt-1">
                        <Info className="w-3 h-3 text-amber-600" />
                        <span>Price recommendation is based on market variance around XGBoost prediction. Cost assumptions were estimated safely.</span>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setProductStep(3)}
                    className="py-2.5 px-4 rounded-2xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 transition cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={() => setProductStep(5)}
                    className="flex-1 py-2.5 rounded-2xl bg-terracotta-600 text-white font-bold text-xs hover:bg-terracotta-700 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span>Next: Set Your Selling Price</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Final Selling Price & Publish Product */}
            {productStep === 5 && (
              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                  <span className="font-extrabold text-slate-900 block">Product Summary</span>
                  <div className="flex items-center justify-between text-slate-600 text-[11px]">
                    <span>Title: {productForm.title}</span>
                    <span>{productForm.category} ({productForm.material})</span>
                  </div>
                  {aiPricingResult && (
                    <div className="text-[11px] text-amber-700 font-bold">
                      AI Recommendation: ₹{aiPricingResult.predicted_market_price} (Range: ₹{aiPricingResult.recommended_min_price} - ₹{aiPricingResult.recommended_max_price})
                    </div>
                  )}
                </div>

                {saveProductError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                    {saveProductError}
                  </div>
                )}

                {publishSuccessMessage && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{publishSuccessMessage}</span>
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  {/* Final Selling Price Input */}
                  <div>
                    <label className="block font-bold text-slate-900 mb-1 text-sm">
                      Your Final Selling Price (₹ INR) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-500 text-base">₹</span>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="e.g. 1200"
                        value={productForm.price}
                        onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full pl-8 pr-3.5 py-3 rounded-xl border-2 border-slate-300 focus:border-terracotta-600 focus:ring-1 focus:ring-terracotta-600 outline-none text-slate-900 font-black text-lg"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 pt-1">
                      You hold final authority over your craft pricing.
                    </p>
                  </div>

                  {/* Stock Quantity */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Available Stock Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="1"
                      value={productForm.stock}
                      onChange={(e) => setProductForm(prev => ({ ...prev, stock: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-terracotta-600 focus:ring-1 focus:ring-terracotta-600 outline-none text-slate-900 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setProductStep(4)}
                    disabled={isSavingProduct}
                    className="py-2.5 px-4 rounded-2xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 transition cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProduct}
                    className="flex-1 py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    {isSavingProduct ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-terracotta-500" />
                        Publishing Craft Product...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        Publish Product to Catalog
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Profile Settings Modal Overlay */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-floating animate-pop-in text-left">
            <h3 className="font-extrabold text-lg text-slate-900">{t('profile.settingsTitle')}</h3>
            <div className="space-y-2 text-sm text-slate-700">
              <p><strong>{t('profile.name')}:</strong> {user?.fullName || t('common.notProvided')}</p>
              <p><strong>{t('profile.userId')}:</strong> {user?.userId || t('common.notProvided')}</p>
              <p><strong>{t('profile.email')}:</strong> {user?.email || t('common.notProvided')}</p>
              <p><strong>{t('profile.businessName')}:</strong> {user?.businessName || t('common.notProvided')}</p>
              <p><strong>{t('profile.craftCategory')}:</strong> {user?.categoryName || user?.category || t('common.notProvided')}</p>
              <p><strong>{t('profile.location')}:</strong> {user?.location || t('common.notProvided')}</p>
              <p><strong>{t('profile.experience')}:</strong> {user?.experience || t('common.notProvided')}</p>
              <p><strong>{t('profile.language')}:</strong> {user?.language?.toUpperCase() || language.toUpperCase()}</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setCurrentScreen('PROFILE_SETUP');
                }}
                className="flex-1 py-2.5 rounded-2xl bg-terracotta-600 text-white font-bold text-xs hover:bg-terracotta-700 transition cursor-pointer"
              >
                {t('profile.editProfile')}
              </button>
              <button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 py-2.5 rounded-2xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
