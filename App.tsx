import React, { useState, useEffect, useCallback } from 'react';
import OutfitForm from './components/OutfitForm';
import OutfitCard from './components/OutfitCard';
import WardrobeManager from './components/WardrobeManager';
import { UserPreferences, OutfitRecommendation, WardrobeItem } from './types';
import { generateOutfitRecommendations } from './services/geminiService';
import { getAllWardrobeItems } from './utils/db';
import { ArrowLeft, Grid, Sparkles, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'STYLIST' | 'WARDROBE'>('STYLIST');
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  
  // 定義載入衣櫥的函式，使用 useCallback 避免不必要的依賴變更
  const refreshWardrobe = useCallback(async () => {
      try {
          const items = await getAllWardrobeItems();
          // 確保資料載入後更新狀態
          setWardrobeItems(items || []);
          console.log(`Loaded ${items.length} items from wardrobe.`);
      } catch (e) {
          console.error("Failed to load wardrobe items:", e);
      }
  }, []);

  // App 初始化：載入衣櫥資料
  useEffect(() => {
    refreshWardrobe();
    // 我們移除了 localStorage 的讀取邏輯
    // 現在 App 會全權依賴 Vite 編譯時注入的環境變數 (GitHub Secret)
  }, [refreshWardrobe]);

  // 當切換分頁時，也重新整理衣櫥（確保 WardrobeManager 的更動同步）
  useEffect(() => {
      refreshWardrobe();
  }, [activeTab, refreshWardrobe]);

  const handleGetRecommendations = async (prefs: UserPreferences) => {
    setIsLoading(true);
    setError(null);
    try {
      // 在生成建議前再次確認最新的衣櫥資料
      const currentItems = await getAllWardrobeItems();
      setWardrobeItems(currentItems);

      const prefsWithData = {
          ...prefs,
          wardrobeItems: prefs.useWardrobe ? currentItems : []
      };
      
      const results = await generateOutfitRecommendations(prefsWithData);
      setRecommendations(results);
      setHasSearched(true);
    } catch (err: any) {
      console.error(err);
      if (err.message === 'API_KEY_MISSING') {
          setError("系統設定錯誤：找不到 API Key (環境變數)");
      } else {
          setError("AI 好像睡著了...請再試一次 (｡•́︿•̀｡)");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setHasSearched(false);
    setRecommendations([]);
    setError(null);
  };

  return (
    <div className="h-[100dvh] flex flex-col text-choco font-sans overflow-hidden">
      
      {/* Top Bar - Cute & Minimal */}
      <div className="h-safe-top w-full bg-cream/90 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-center px-4 py-4">
          <h1 className="text-xl font-extrabold tracking-wide text-choco flex items-center gap-2">
              {activeTab === 'STYLIST' ? (hasSearched ? '✨ 穿搭建議' : 'StyleSync') : '🎀 我的衣櫥'}
          </h1>
          {activeTab === 'STYLIST' && hasSearched && (
            <button 
                onClick={handleReset}
                className="absolute left-4 p-2 text-choco-light hover:text-sakura transition-colors rounded-full hover:bg-white"
            >
                <ArrowLeft className="w-6 h-6" strokeWidth={3} />
            </button>
          )}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-28 no-scrollbar">
        <div className="max-w-md mx-auto min-h-full">
            
            {activeTab === 'WARDROBE' && (
                <div className="px-5 py-4 animate-fade-in">
                    <WardrobeManager onItemChange={refreshWardrobe} />
                </div>
            )}

            {activeTab === 'STYLIST' && (
                <div className="px-5 py-4">
                    {!hasSearched ? (
                        <div className="flex flex-col gap-6 animate-fade-in">
                             {/* Welcome Card */}
                             <div className="bg-white rounded-[2rem] p-6 shadow-cute border-2 border-milk-tea relative overflow-hidden">
                                <div className="absolute -right-4 -top-4 w-20 h-20 bg-sakura/20 rounded-full"></div>
                                <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-mint/20 rounded-full"></div>
                                
                                <div className="flex items-center gap-4 mb-4 relative z-10">
                                    <div className="bg-sakura text-white p-3 rounded-2xl transform -rotate-6 shadow-sm">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-choco">早安！今天要穿什麼？</h2>
                                        <p className="text-xs text-choco-light font-bold">AI 造型小幫手</p>
                                    </div>
                                </div>
                                <p className="text-sm text-choco-light leading-relaxed relative z-10">
                                    {wardrobeItems.length > 0 
                                        ? `衣櫥裡有 ${wardrobeItems.length} 件寶貝單品，讓我來幫你搭配吧！`
                                        : "你的衣櫥還是空的呢～先去新增幾件衣服吧！(◕‿◕)"}
                                </p>
                             </div>

                             <OutfitForm 
                                onSubmit={handleGetRecommendations} 
                                isLoading={isLoading} 
                                hasWardrobeItems={wardrobeItems.length > 0}
                            />

                            {error && (
                                <div className="p-4 bg-red-50 text-red-400 rounded-2xl border-2 border-red-100 flex items-center gap-3 text-sm font-bold shadow-sm">
                                    <AlertTriangle size={20} className="shrink-0"/>
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6 animate-fade-in">
                            {recommendations.map((rec) => (
                                <OutfitCard key={rec.id} recommendation={rec} allWardrobeItems={wardrobeItems} />
                            ))}
                            <div className="h-8"></div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </main>

      {/* Floating Bottom Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 z-40">
        <div className="bg-white/95 backdrop-blur-xl border-2 border-milk-tea rounded-[2rem] shadow-cute h-16 flex justify-around items-center px-2">
            <button 
                onClick={() => { setActiveTab('WARDROBE'); handleReset(); }}
                className={`flex-1 flex flex-col items-center justify-center h-full gap-1 transition-all rounded-2xl ${activeTab === 'WARDROBE' ? 'text-choco' : 'text-milk-tea'}`}
            >
                <div className={`p-1.5 rounded-xl transition-all duration-300 ${activeTab === 'WARDROBE' ? 'bg-mint text-white rotate-[-6deg] scale-110 shadow-sm' : ''}`}>
                    <Grid className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <span className={`text-[10px] font-bold ${activeTab === 'WARDROBE' ? 'scale-100' : 'scale-0 h-0 opacity-0'} transition-all`}>衣櫥</span>
            </button>
            
            <button 
                onClick={() => setActiveTab('STYLIST')}
                className={`flex-1 flex flex-col items-center justify-center h-full gap-1 transition-all rounded-2xl ${activeTab === 'STYLIST' ? 'text-choco' : 'text-milk-tea'}`}
            >
                <div className={`p-1.5 rounded-xl transition-all duration-300 ${activeTab === 'STYLIST' ? 'bg-sakura text-white scale-125 -translate-y-2 shadow-md' : ''}`}>
                    <Sparkles className="w-6 h-6" strokeWidth={2.5} fill={activeTab === 'STYLIST' ? "white" : "none"} />
                </div>
                <span className={`text-[10px] font-bold ${activeTab === 'STYLIST' ? 'translate-y-[-2px]' : 'scale-0 h-0 opacity-0'} transition-all`}>穿搭</span>
            </button>
        </div>
      </nav>
    </div>
  );
};

export default App;