import React, { useRef, useEffect } from 'react';

export const OTPInput = ({ value = '', onChange, length = 6, error = false }) => {
  const inputRefs = useRef([]);

  // Ensure digits array matches length
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0] && !value) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (e, index) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;

    const newDigits = [...digits];
    // Take only the last entered digit
    newDigits[index] = val.slice(-1);
    const updatedValue = newDigits.join('');
    onChange(updatedValue);

    // Auto-focus next input box if digit entered
    if (val && index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0 && inputRefs.current[index - 1]) {
        // Auto-focus previous box on Backspace if current is empty
        inputRefs.current[index - 1].focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    if (!/^\d+$/.test(pastedData)) return;

    const pastedDigits = pastedData.slice(0, length).split('');
    const newDigits = [...digits];
    pastedDigits.forEach((digit, i) => {
      newDigits[i] = digit;
    });

    const updatedValue = newDigits.join('');
    onChange(updatedValue);

    // Focus last filled box or first empty
    const focusIndex = Math.min(pastedDigits.length, length - 1);
    if (inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex].focus();
    }
  };

  return (
    <div className="w-full flex items-center justify-between gap-1.5 sm:gap-3 my-4" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digits[index]}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className={`
            w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-2xl border transition-all duration-200 shadow-sm
            bg-white text-slate-900 focus:outline-none
            ${error
              ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 bg-red-50/30 text-red-600'
              : digits[index]
                ? 'border-terracotta-500 bg-terracotta-50/20 text-terracotta-800 focus:ring-4 focus:ring-terracotta-500/20'
                : 'border-slate-200 hover:border-slate-300 focus:border-terracotta-500 focus:ring-4 focus:ring-terracotta-500/20'
            }
          `}
          aria-label={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  );
};
