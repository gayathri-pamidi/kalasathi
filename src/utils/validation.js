/**
 * Form Validation Utilities tailored for low digital literacy
 */

export const validatePhoneNumber = (phone) => {
  if (!phone || !phone.trim()) return 'Mobile number is required';
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  if (!/^\d{7,15}$/.test(cleanPhone)) {
    return 'Please enter a valid mobile number (10 digits)';
  }
  return null;
};

export const validateUserId = (userId) => {
  if (!userId || !userId.trim()) return 'User ID is required';
  if (userId.trim().length < 3) return 'User ID must be at least 3 characters';
  if (!/^[a-zA-Z0-9._]+$/.test(userId)) {
    return 'Only letters, numbers, dots, and underscores allowed';
  }
  return null;
};

export const validateEmail = (email, isRequired = false) => {
  if (!email || !email.trim()) {
    return isRequired ? 'Email Address is required' : null;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const evaluatePasswordStrength = (password) => {
  if (!password) {
    return { score: 0, label: '', colorClass: 'bg-slate-200', widthPercent: '0%', textClass: 'text-slate-400' };
  }

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  switch (score) {
    case 1:
      return {
        score: 1,
        label: 'Too Short',
        colorClass: 'bg-red-500',
        widthPercent: '25%',
        textClass: 'text-red-600 font-semibold'
      };
    case 2:
      return {
        score: 2,
        label: 'Fair',
        colorClass: 'bg-amber-500',
        widthPercent: '50%',
        textClass: 'text-amber-600 font-semibold'
      };
    case 3:
      return {
        score: 3,
        label: 'Good',
        colorClass: 'bg-blue-500',
        widthPercent: '75%',
        textClass: 'text-blue-600 font-semibold'
      };
    case 4:
      return {
        score: 4,
        label: 'Strong',
        colorClass: 'bg-emerald-500',
        widthPercent: '100%',
        textClass: 'text-emerald-600 font-semibold'
      };
    default:
      return {
        score: 0,
        label: 'Very Weak',
        colorClass: 'bg-red-400',
        widthPercent: '15%',
        textClass: 'text-red-500'
      };
  }
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
};
