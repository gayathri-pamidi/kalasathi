import React, { useRef } from 'react';
import { Camera, User, Check } from 'lucide-react';
import { PRESET_AVATARS } from '../services/mockData';

export const ProfileImagePicker = ({ selectedImage, onImageChange }) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageChange(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full text-center space-y-4">
      <div className="relative inline-block">
        <div className="w-28 h-28 rounded-full border-4 border-white shadow-floating overflow-hidden bg-slate-100 mx-auto flex items-center justify-center relative">
          {selectedImage ? (
            <img src={selectedImage} alt="Artisan Profile" className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-slate-400" />
          )}
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 p-2.5 rounded-full bg-terracotta-600 hover:bg-terracotta-700 text-white shadow-md active:scale-95 transition-all cursor-pointer"
          aria-label="Upload photo"
        >
          <Camera className="w-5 h-5" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div>
        <p className="text-xs text-slate-500 font-medium mb-2">Or choose a craft profile avatar:</p>
        <div className="flex justify-center items-center gap-3">
          {PRESET_AVATARS.map((avatar) => {
            const isSelected = selectedImage === avatar.url;
            return (
              <button
                key={avatar.id}
                type="button"
                onClick={() => onImageChange(avatar.url)}
                className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                  isSelected ? 'border-terracotta-600 ring-2 ring-terracotta-500/30 scale-105' : 'border-slate-200 hover:border-slate-300'
                }`}
                title={avatar.label}
              >
                <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
                {isSelected && (
                  <div className="absolute inset-0 bg-terracotta-600/40 flex items-center justify-center text-white">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
