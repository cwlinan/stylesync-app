import React, { useState } from 'react';
import { Occasion, WeatherType, Gender, UserPreferences } from '../types';
import { Sparkles, Layers, CheckCircle2, CloudSun, CalendarHeart, User } from 'lucide-react';

interface OutfitFormProps {
  onSubmit: (prefs: UserPreferences) => void;
  isLoading: boolean;
  hasWardrobeItems: boolean;
}

const OutfitForm: React.FC<OutfitFormProps> = ({ onSubmit, isLoading, hasWardrobeItems }) => {
  const [occasion, setOccasion] = useState<Occasion>(Occasion.CASUAL);
  const [weather, setWeather] = useState<WeatherType>(WeatherType.SUNNY);
  const [gender, setGender] = useState<Gender>(Gender.UNISEX);
  const [styleParams, setStyleParams] = useState('');
  const [useWardrobe, setUseWardrobe] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      occasion,
      weather,
      gender,
      styleParams,
      useWardrobe: useWardrobe && hasWardrobeItems,
    });
  };

  const SelectionRow = ({ label, icon: Icon, options, selected, onSelect }: { label: string, icon: any, options: string[], selected: string, onSelect: (val: any) => void }) => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon size={16} className="text-sakura" strokeWidth={3} />
        <label className="text-xs font-extrabold text-choco-light tracking-wide">{label}</label>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={`flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
              selected === opt 
                ? 'bg-mint text-choco shadow-cute transform -translate-y-1' 
                : 'bg-white border-2 border-milk-tea text-choco-light hover:bg-cream'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {/* Wardrobe Toggle - Sticker Style */}
      <div 
        onClick={() => hasWardrobeItems && setUseWardrobe(!useWardrobe)}
        className={`mb-6 p-4 rounded-[2rem] border-2 transition-all cursor-pointer relative overflow-hidden group ${
            useWardrobe && hasWardrobeItems 
            ? 'bg-sky/20 border-sky shadow-sm' 
            : 'bg-white border-milk-tea opacity-80'
        }`}
      >
        <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl border-2 transition-colors ${useWardrobe && hasWardrobeItems ? 'bg-sky border-sky text-white rotate-[-6deg]' : 'bg-gray-100 border-gray-200 text-gray-400'}`}>
                    <Layers className="w-6 h-6" strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className={`text-base font-bold ${useWardrobe && hasWardrobeItems ? 'text-choco' : 'text-gray-500'}`}>
                        {hasWardrobeItems ? '使用我的衣櫥' : '衣櫥是空的喔'}
                    </h3>
                    <p className="text-xs font-medium text-choco-light/80 mt-0.5">
                        {hasWardrobeItems ? '優先搭配你的收藏 ✨' : '先去新增衣服吧！'}
                    </p>
                </div>
            </div>
            {hasWardrobeItems && (
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${useWardrobe ? 'bg-sky border-sky' : 'border-milk-tea bg-white'}`}>
                    {useWardrobe && <CheckCircle2 size={20} className="text-white" strokeWidth={3} />}
                </div>
            )}
        </div>
      </div>

      <SelectionRow 
        label="要去哪裡呢？" 
        icon={CalendarHeart}
        options={Object.values(Occasion)} 
        selected={occasion} 
        onSelect={setOccasion} 
      />

      <SelectionRow 
        label="天氣如何？" 
        icon={CloudSun}
        options={Object.values(WeatherType)} 
        selected={weather} 
        onSelect={setWeather} 
      />

      <SelectionRow 
        label="對象" 
        icon={User}
        options={Object.values(Gender)} 
        selected={gender} 
        onSelect={setGender} 
      />

      <div className="mb-8">
        <label className="flex items-center gap-2 mb-3 px-1 text-xs font-extrabold text-choco-light">
             <Sparkles size={16} className="text-sakura" strokeWidth={3} /> 想要什麼風格？
        </label>
        <input 
          type="text" 
          placeholder="例如：日系可愛、寬鬆休閒..."
          value={styleParams}
          onChange={(e) => setStyleParams(e.target.value)}
          className="w-full p-4 bg-white border-2 border-milk-tea rounded-2xl text-choco placeholder:text-milk-tea font-bold focus:border-sakura focus:ring-0 outline-none shadow-inner-soft transition-all"
        />
      </div>

      <button 
        type="submit" 
        disabled={isLoading}
        className={`w-full py-4 rounded-2xl font-bold text-white text-lg transition-all transform active:translate-y-[4px] active:shadow-none ${
          isLoading ? 'bg-milk-tea shadow-none cursor-not-allowed' : 'bg-sakura hover:bg-sakura-dark shadow-[0_4px_0_0_#FF9E99]'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2 animate-pulse">
            <Sparkles className="w-6 h-6 animate-spin" /> 正在動腦筋...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 fill-white" /> 變身！開始搭配
          </span>
        )}
      </button>
    </form>
  );
};

export default OutfitForm;