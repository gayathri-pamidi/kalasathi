/**
 * Mock data for Artisan Onboarding, Categories, Languages, and Country Codes
 */

export const CRAFT_CATEGORIES = [
  {
    id: 'handloom',
    title: 'Handloom & Textiles',
    titleHindi: 'हथकरघा और वस्त्र',
    iconName: 'Shirt',
    bgGradient: 'from-amber-500/10 to-amber-600/20',
    borderColor: 'border-amber-400',
    accentColor: 'bg-amber-600',
    description: 'Sarees, Shawls, Cotton & Silk weaving'
  },
  {
    id: 'pottery',
    title: 'Pottery & Terracotta',
    titleHindi: 'मिट्टी के बर्तन और टेराकोटा',
    iconName: 'Sparkles',
    bgGradient: 'from-terracotta-500/10 to-terracotta-600/20',
    borderColor: 'border-terracotta-400',
    accentColor: 'bg-terracotta-600',
    description: 'Clay pots, Vases, Planters & Sculptures'
  },
  {
    id: 'woodcraft',
    title: 'Woodcraft & Carving',
    titleHindi: 'काष्ठ कला और नक्काशी',
    iconName: 'Hammer',
    bgGradient: 'from-amber-800/10 to-amber-900/20',
    borderColor: 'border-amber-700',
    accentColor: 'bg-amber-800',
    description: 'Wooden toys, Wooden furniture & Panels'
  },
  {
    id: 'bamboo',
    title: 'Bamboo & Cane',
    titleHindi: 'बांस और बेंट कला',
    iconName: 'Grid',
    bgGradient: 'from-emerald-500/10 to-emerald-600/20',
    borderColor: 'border-emerald-500',
    accentColor: 'bg-emerald-600',
    description: 'Baskets, Floor mats, Lamps & Decor'
  },
  {
    id: 'jewellery',
    title: 'Jewellery & Beads',
    titleHindi: 'आभूषण और मनके',
    iconName: 'Gem',
    bgGradient: 'from-purple-500/10 to-purple-600/20',
    borderColor: 'border-purple-400',
    accentColor: 'bg-purple-600',
    description: 'Terracotta jewellery, Tribal beads & Silver'
  },
  {
    id: 'embroidery',
    title: 'Embroidery & Zardozi',
    titleHindi: 'कढ़ाई और ज़री का काम',
    iconName: 'Scissors',
    bgGradient: 'from-rose-500/10 to-rose-600/20',
    borderColor: 'border-rose-400',
    accentColor: 'bg-rose-600',
    description: 'Kantha, Chikankari, Phulkari & Mirrorwork'
  },
  {
    id: 'metalcraft',
    title: 'Metal Craft & Dhokra',
    titleHindi: 'धातु शिल्प और ढोकरा',
    iconName: 'Shield',
    bgGradient: 'from-orange-500/10 to-orange-600/20',
    borderColor: 'border-orange-400',
    accentColor: 'bg-orange-600',
    description: 'Brass idols, Bell metal, Copperware'
  },
  {
    id: 'leather',
    title: 'Leather Craft',
    titleHindi: 'चमड़ा शिल्प',
    iconName: 'Briefcase',
    bgGradient: 'from-amber-700/10 to-stone-700/20',
    borderColor: 'border-stone-500',
    accentColor: 'bg-stone-700',
    description: 'Juttis, Leather bags, Mojris & Drums'
  },
  {
    id: 'other',
    title: 'Other Traditional Art',
    titleHindi: 'अन्य पारंपरिक कला',
    iconName: 'Palette',
    bgGradient: 'from-blue-500/10 to-indigo-600/20',
    borderColor: 'border-indigo-400',
    accentColor: 'bg-indigo-600',
    description: 'Madhubani, Pattachitra, Tanjore painting'
  }
];

export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', isPopular: true },
  { code: 'hi', name: 'Hindi', native: 'हिंदी', isPopular: true },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', isPopular: true },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', isPopular: true },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', isPopular: false },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', isPopular: false },
  { code: 'mr', name: 'Marathi', native: 'मराठी', isPopular: true },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', isPopular: true },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', isPopular: false },
  { code: 'other', name: 'Other', native: 'अन्य', isPopular: false },
];

export const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
];

export const PRESET_AVATARS = [
  { id: 'avatar1', label: 'Weaver Master', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80' },
  { id: 'avatar2', label: 'Potter Artisan', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80' },
  { id: 'avatar3', label: 'Craftswoman', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80' },
  { id: 'avatar4', label: 'Senior Artisan', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80' },
];

export const DEMO_ARTISAN_PROFILE = {
  id: 'artisan_demo_01',
  fullName: 'Ramubhai Weaver',
  userId: 'ramu_weaver',
  phone: '9876543210',
  countryCode: '+91',
  email: 'ramu.handloom@gmail.com',
  businessName: 'Vankar Handloom Creations',
  category: 'handloom',
  categoryName: 'Handloom & Textiles',
  primaryCraft: 'Bhujodi Chanderi Sarees & Stoles',
  location: 'Kutch, Gujarat',
  language: 'hi',
  experience: '15+ Years',
  bio: 'Master weaver specializing in organic cotton and tussar silk handloom weaving. Preserving 3 generations of Gujarati textile craft.',
  profilePic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'
};
