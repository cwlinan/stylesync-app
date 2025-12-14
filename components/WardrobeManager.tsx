import React, { useState, useEffect, useRef } from 'react';
import { WardrobeItem, ClothingCategory } from '../types';
import { analyzeWardrobeItem } from '../services/geminiService';
import { addWardrobeItem, getAllWardrobeItems, deleteWardrobeItem } from '../utils/db';
import { Plus, Trash2, Loader2, Shirt, Download } from 'lucide-react';

interface WardrobeManagerProps {
    onItemChange?: () => void;
}

const WardrobeManager: React.FC<WardrobeManagerProps> = ({ onItemChange }) => {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const loadedItems = await getAllWardrobeItems();
    setItems(loadedItems.sort((a, b) => b.createdAt - a.createdAt));
  };

  const createPlaceholderImage = (color: string, text: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 500, 500);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(250, 250, 200, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 60px "M PLUS Rounded 1c"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 250, 250);
    }
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  };

  const handleImportMockData = async () => {
    setIsImporting(true);
    setTimeout(async () => {
        try {
            const mockItems = [
                { cat: ClothingCategory.TOP, desc: '可愛白T', color: '#FFB7B2', text: 'Tee' },
                { cat: ClothingCategory.BOTTOM, desc: '牛仔褲', color: '#C7CEEA', text: 'Jeans' },
                { cat: ClothingCategory.OUTERWEAR, desc: '暖暖大衣', color: '#E2D5C4', text: 'Coat' },
                { cat: ClothingCategory.SHOES, desc: '小白鞋', color: '#B5EAD7', text: 'Shoes' },
            ];

            for (const m of mockItems) {
                const newItem: WardrobeItem = {
                    id: crypto.randomUUID(),
                    imageData: createPlaceholderImage(m.color, m.text),
                    mimeType: 'image/jpeg',
                    category: m.cat,
                    description: m.desc,
                    tags: ['測試', m.text],
                    createdAt: Date.now()
                };
                await addWardrobeItem(newItem);
            }
            await loadItems();
            onItemChange?.();
        } catch (e) {
            console.error(e);
            alert('哎呀！匯入失敗了');
        } finally {
            setIsImporting(false);
        }
    }, 500);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      const mimeType = result.split(';')[0].split(':')[1] || 'image/jpeg';
      
      try {
        const analysis = await analyzeWardrobeItem(base64String);
        const newItem: WardrobeItem = {
          id: crypto.randomUUID(),
          imageData: base64String,
          mimeType: mimeType,
          category: analysis.category,
          description: analysis.description,
          tags: analysis.tags,
          createdAt: Date.now()
        };

        await addWardrobeItem(newItem);
        await loadItems();
        onItemChange?.();
      } catch (err) {
        console.error("Failed to add item", err);
        alert("分析圖片失敗，請再試一次 > <");
      } finally {
        setIsAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    if (confirm('真的要丟掉這件衣服嗎？(｡•́︿•̀｡)')) {
      await deleteWardrobeItem(id);
      loadItems();
      onItemChange?.();
    }
  };

  const filteredItems = filter === 'ALL' 
    ? items 
    : items.filter(item => item.category === filter);

  return (
    <div className="pb-20">
      {/* Category Filter */}
      <div className="sticky top-0 bg-cream/95 backdrop-blur-sm z-10 py-3 -mx-4 px-4 overflow-x-auto no-scrollbar flex gap-2 mb-2">
        <button 
            onClick={() => setFilter('ALL')}
            className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border-2 ${filter === 'ALL' ? 'bg-choco border-choco text-white shadow-md' : 'bg-white border-milk-tea text-choco-light hover:bg-milk-tea hover:text-white'}`}
        >
            全部 ({items.length})
        </button>
        {Object.values(ClothingCategory).map(cat => (
             <button 
             key={cat}
             onClick={() => setFilter(cat)}
             className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border-2 ${filter === cat ? 'bg-choco border-choco text-white shadow-md' : 'bg-white border-milk-tea text-choco-light hover:bg-milk-tea hover:text-white'}`}
         >
             {cat}
         </button>
        ))}
      </div>

      {/* Loading Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-choco/60 backdrop-blur-sm text-white animate-fade-in">
            <div className="bg-white p-6 rounded-3xl flex flex-col items-center shadow-2xl animate-pop-in">
                <Loader2 className="w-12 h-12 text-sakura animate-spin mb-4" />
                <p className="font-bold text-choco text-lg">AI 正在研究你的衣服...</p>
                <p className="text-choco-light text-xs mt-2">咻咻咻 ✨</p>
            </div>
        </div>
      )}

      {/* Content Grid */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="bg-white p-6 rounded-full shadow-cute border-2 border-milk-tea mb-6 animate-bounce-slight">
                <Shirt className="w-12 h-12 text-sakura" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-choco mb-2">這裡空空的耶</h3>
            <p className="text-choco-light text-sm mb-8 font-medium">
                拍幾張衣服的照片，<br/>讓我幫你整理衣櫥吧！
            </p>
            <button 
                onClick={handleImportMockData}
                disabled={isImporting}
                className="text-sakura text-sm font-bold flex items-center gap-2 hover:underline bg-white px-4 py-2 rounded-full border border-sakura/30 hover:bg-sakura/10 transition-colors"
            >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                試試看範例衣服
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          {filteredItems.map(item => (
            <div key={item.id} className="relative aspect-square rounded-[2rem] overflow-hidden bg-white shadow-sm border-2 border-milk-tea group hover:scale-[1.02] transition-transform duration-300">
              <img 
                  src={`data:${item.mimeType || 'image/jpeg'};base64,${item.imageData}`} 
                  alt={item.description} 
                  className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-choco/80 via-choco/40 to-transparent p-4 pt-8">
                 <p className="text-white text-xs font-bold truncate">{item.description}</p>
                 <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] text-white font-medium border border-white/30">
                    {item.category}
                 </span>
              </div>
              
              <button 
                  onClick={() => handleDelete(item.id)}
                  className="absolute top-3 right-3 p-2 bg-red-400 text-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 transform hover:scale-110"
              >
                  <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Cute FAB */}
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="fixed bottom-24 right-6 w-16 h-16 bg-sakura text-white rounded-full shadow-cute flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-20 border-2 border-white"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileSelect}
        />
    </div>
  );
};

export default WardrobeManager;