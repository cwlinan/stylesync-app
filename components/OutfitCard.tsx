import React, { useState } from 'react';
import { OutfitRecommendation, WardrobeItem, Gender, Occasion, WeatherType } from '../types';
import { generateOutfitVisual } from '../services/geminiService';
import { Sparkles, Check, RefreshCw, Shirt, Tag, Heart } from 'lucide-react';

interface OutfitCardProps {
  recommendation: OutfitRecommendation;
  allWardrobeItems: WardrobeItem[];
}

const OutfitCard: React.FC<OutfitCardProps> = ({ recommendation, allWardrobeItems }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleGenerateVisual = async () => {
    if (imageUrl) return;
    setIsGeneratingImage(true);
    setImageError(false);
    
    try {
        const usedWardrobeItems = recommendation.items
            .map(item => allWardrobeItems.find(w => w.id === item.wardrobeItemId))
            .filter((item): item is WardrobeItem => item !== undefined);

        const visualPrompt = `Outfit style: ${recommendation.title}. Items: ${recommendation.items.map(i => `${i.color} ${i.name}`).join(', ')}.`;
        
        // Use context if available, otherwise fallback to defaults (should not happen in new flow)
        const context = recommendation.context || {
            occasion: Occasion.CASUAL,
            weather: WeatherType.SUNNY,
            gender: Gender.UNISEX,
            styleParams: '',
            useWardrobe: false
        };

        const result = await generateOutfitVisual(visualPrompt, context, usedWardrobeItems);
        
        if (result) {
            setImageUrl(result);
        } else {
            setImageError(true);
        }
    } catch (e) {
        console.error(e);
        setImageError(true);
    } finally {
        setIsGeneratingImage(false);
    }
  };

  const ownedCount = recommendation.items.filter(i => i.wardrobeItemId).length;

  return (
    <div className="bg-white rounded-[2rem] overflow-hidden shadow-cute border-2 border-milk-tea flex flex-col mb-4 relative transform hover:-translate-y-1 transition-transform duration-300">
      
      {/* Decor: Washi Tape */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-4 bg-sakura/40 transform -rotate-1 z-10 opacity-80 backdrop-blur-sm"></div>

      {/* Header */}
      <div className="p-6 pb-4 pt-8 text-center">
          <h3 className="text-xl font-extrabold text-choco leading-tight">{recommendation.title}</h3>
          <div className="flex justify-center gap-2 mt-2">
            <span className="text-[10px] bg-sky/20 text-sky-700 px-2 py-1 rounded-full font-bold">#OOTD</span>
            <span className="text-[10px] bg-mint/20 text-mint-700 px-2 py-1 rounded-full font-bold">#Daily</span>
          </div>
          <p className="text-choco-light text-sm mt-3 line-clamp-2 font-medium bg-cream p-3 rounded-xl border border-milk-tea border-dashed">
            {recommendation.description}
          </p>
      </div>

      {/* Image Area - Polaroid Style */}
      <div className="px-4">
        <div className="relative aspect-[3/4] bg-cream border-2 border-milk-tea rounded-2xl overflow-hidden w-full shadow-inner-soft">
            {imageUrl ? (
            <img src={imageUrl} alt="Outfit Visual" className="w-full h-full object-cover animate-fade-in" />
            ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-cream">
                <div className="w-20 h-20 bg-white rounded-full border-2 border-milk-tea flex items-center justify-center mb-4 animate-bounce-slight">
                    <Sparkles className="w-10 h-10 text-sakura" />
                </div>
                <p className="text-sm font-bold text-choco-light mb-6 max-w-[200px]">
                    想看看穿起來的樣子嗎？
                </p>
                <button
                onClick={handleGenerateVisual}
                disabled={isGeneratingImage}
                className={`px-6 py-3 rounded-full text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 border-2 ${
                    isGeneratingImage 
                    ? 'bg-cream border-milk-tea text-choco-light' 
                    : imageError 
                        ? 'bg-red-50 border-red-200 text-red-400' 
                        : 'bg-white border-sakura text-sakura hover:bg-sakura hover:text-white'
                }`}
                >
                {isGeneratingImage ? (
                    <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> 繪製中...
                    </>
                ) : imageError ? (
                    <>失敗了 QQ</>
                ) : (
                    <>
                    <Sparkles className="w-4 h-4" /> 產生試穿照
                    </>
                )}
                </button>
            </div>
            )}
            
            {ownedCount > 0 && (
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-choco shadow-sm flex items-center gap-1 border border-milk-tea">
                    <Heart size={12} className="text-sakura fill-sakura" />
                    <span>{ownedCount} 件私服</span>
                </div>
            )}
        </div>
      </div>

      {/* Details Section */}
      <div className="p-6">
        <h4 className="text-xs font-extrabold text-milk-tea uppercase tracking-wider mb-4 flex items-center gap-2">
            <Tag size={14} /> 搭配清單
        </h4>
        <div className="space-y-3 mb-5">
            {recommendation.items.map((item, idx) => {
                const isOwned = !!item.wardrobeItemId;
                return (
                    <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded-xl border border-transparent hover:border-milk-tea transition-colors">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${isOwned ? 'bg-mint border-mint text-white' : 'bg-cream border-milk-tea text-milk-tea'}`}>
                            {isOwned ? <Check size={16} strokeWidth={4} /> : <div className="w-2 h-2 rounded-full bg-current" />}
                         </div>
                         <div className="flex-1">
                             <div className="flex justify-between items-center">
                                <span className={`text-sm font-bold ${isOwned ? 'text-choco' : 'text-choco-light'}`}>{item.name}</span>
                                {isOwned && <span className="text-[10px] bg-mint/20 text-mint-700 px-2 py-0.5 rounded-full font-bold">我的</span>}
                             </div>
                             <p className="text-xs text-choco-light/70 font-medium">{item.color} • {item.type}</p>
                         </div>
                    </div>
                );
            })}
        </div>

        <div className="bg-cream rounded-2xl p-4 border-2 border-milk-tea border-dashed relative">
            <div className="absolute -top-3 left-6 bg-cream border-2 border-milk-tea rounded-full p-1">
                <Sparkles size={12} className="text-sakura fill-sakura" />
            </div>
            <p className="text-sm text-choco font-medium leading-relaxed">
                {recommendation.reasoning}
            </p>
        </div>
      </div>
    </div>
  );
};

export default OutfitCard;