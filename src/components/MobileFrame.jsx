import React from 'react';

export const MobileFrame = ({ children }) => {
  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#F6F3EE] text-slate-800 antialiased font-sans flex flex-col items-center justify-start overflow-x-hidden selection:bg-terracotta-200 selection:text-terracotta-900 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="w-full max-w-md sm:max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto min-h-screen min-h-[100dvh] flex flex-col flex-1 relative bg-[#F6F3EE] shadow-xs sm:shadow-sm">
        {children}
      </div>
    </div>
  );
};

