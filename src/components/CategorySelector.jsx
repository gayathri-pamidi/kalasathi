import React from 'react';
import { CRAFT_CATEGORIES } from '../services/mockData';
import { 
  Shirt, 
  Sparkles, 
  Hammer, 
  Grid, 
  Gem, 
  Scissors, 
  Shield, 
  Briefcase, 
  Palette,
  CheckCircle2
} from 'lucide-react';

const ICON_MAP = {
  Shirt,
  Sparkles,
  Hammer,
  Grid,
  Gem,
  Scissors,
  Shield,
  Briefcase,
  Palette
};

export const CategorySelector = ({ selectedCategory, onSelectCategory, error }) => {
  return (
    <div className="w-full text-left space-y-3">
      <div className="flex justify-between items-center px-0.5">
        <label className="block text-sm font-semibold text-slate-800">
          Craft Category <span className="text-terracotta-600 font-bold">*</span>
        </label>
        <span className="text-xs text-slate-400 font-medium">Select one that matches best</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CRAFT_CATEGORIES.map((cat) => {
          const IconComponent = ICON_MAP[cat.iconName] || Palette;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`
                relative p-3.5 rounded-2xl border-2 text-left transition-all duration-200 shadow-sm flex flex-col justify-between h-32 active:scale-[0.98] cursor-pointer
                ${isSelected
                  ? 'border-terracotta-500 bg-gradient-to-b from-terracotta-50/50 to-amber-50/30 text-terracotta-900 ring-4 ring-terracotta-500/15 shadow-craft'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50/50'
                }
              `}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 text-terracotta-600 animate-pop-in">
                  <CheckCircle2 className="w-5 h-5 fill-terracotta-600 text-white" />
                </div>
              )}

              <div className={`p-2.5 rounded-xl w-max ${isSelected ? 'bg-terracotta-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <IconComponent className="w-5 h-5" />
              </div>

              <div>
                <h4 className="font-bold text-sm leading-tight text-slate-900">{cat.title}</h4>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{cat.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-xs font-semibold text-red-600 px-1 pt-1">{error}</p>
      )}
    </div>
  );
};
