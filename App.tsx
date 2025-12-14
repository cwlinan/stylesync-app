import React, { useState, useEffect, useCallback } from 'react';
import OutfitForm from './components/OutfitForm';
import OutfitCard from './components/OutfitCard';
import WardrobeManager from './components/WardrobeManager';
import { UserPreferences, OutfitRecommendation, WardrobeItem } from './types';
import { generateOutfitRecommendations, setGeminiApiKey } from './services/geminiService';
import { getAllWardrobeItems } from './utils/db';
import { Shirt, ArrowLeft, Grid, Sparkles, Settings, X, Check, Smartphone, Key, AlertTriangle, Heart } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'STYLIST' | 'WARDROBE' | 'SETTINGS'>('STYLIST');
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);

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

  // App 初始化：載入衣櫥資料與 API Key
  useEffect(() => {
    // 1. 立即載入衣櫥
    refreshWardrobe();

    // 2. 載入 API Key
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) {
        setApiKey(savedKey);
        setGeminiApiKey(savedKey);
        setIsApiKeySaved(true);
    }
  }, [refreshWardrobe]);

  // 當切換分頁時，也重新整理衣櫥（確保 WardrobeManager 的更動同步）
  useEffect(() => {
      refreshWardrobe();
  }, [activeTab, refreshWardrobe]);

  const handleSaveApiKey = () => {
      if (!apiKey.trim()) {
          alert('請輸入有效的 API Key (´• ω •`)');
          return;
      }
      localStorage.setItem('GEMINI_API_KEY', apiKey);
      setGeminiApiKey(apiKey);
      setIsApiKeySaved(true);
      setShowSettingsModal(false);
  };

  const handleClearApiKey = () => {
      localStorage.removeItem('GEMINI_API_KEY');
      setApiKey('');
      setGeminiApiKey('');
      setIsApiKeySaved(false);
  };

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
          setError("請先設定 API Key 喔！");
          setShowSettingsModal(true);
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
              {activeTab === 'STYLIST' ? (hasSearched ? '✨ 穿搭建議' : 'StyleSync') : 
               activeTab === 'WARDROBE' ? '🎀 我的衣櫥' : '⚙️ 設定'}
          </h1>
          {activeTab === 'STYLIST' && hasSearched && (
            <button 
                onClick={handleReset}
                className="absolute left-4 p-2 text-choco-light hover:text-sakura transition-colors rounded-full hover:bg-white"
            >
                <ArrowLeft className="w-6 h-6" strokeWidth={3} />
            </button>
          )}
          
          {!isApiKeySaved && (
             <button 
                onClick={() => setShowSettingsModal(true)}
                className="absolute right-4 text-sakura animate-bounce-slight"
             >
                <Settings className="w-6 h-6" />
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
            
            {activeTab === 'SETTINGS' && (
                <div className="px-5 py-6 animate-fade-in space-y-6">
                     <div className="bg-white rounded-[2rem] p-6 shadow-cute border-2 border-milk-tea">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-choco">
                            <Key className="w-5 h-5 text-sakura" strokeWidth={2.5} /> 魔法金鑰 (API Key)
                        </h3>
                        <p className="text-xs text-choco-light mb-4 font-medium">
                             Stylist AI 需要 Google Gemini 的力量才能運作喔！
                        </p>
                        
                        <div className="space-y-3">
                            <input 
                                type="password" 
                                placeholder="貼上 API Key..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full p-4 bg-cream border-2 border-milk-tea rounded-2xl text-sm focus:border-sakura focus:ring-0 outline-none transition-all placeholder:text-milk-tea text-choco"
                            />
                            <button 
                                onClick={handleSaveApiKey}
                                className="w-full bg-choco text-white py-3 rounded-2xl font-bold text-sm shadow-[0_4px_0_0_#3E2723] active:translate-y-[4px] active:shadow-none transition-all"
                            >
                                儲存設定
                            </button>
                            {isApiKeySaved && (
                                <button 
                                    onClick={handleClearApiKey}
                                    className="w-full text-choco-light py-2 text-xs font-bold hover:text-sakura"
                                >
                                    清除 Key
                                </button>
                            )}
                        </div>
                     </div>

                     <div className="bg-white rounded-[2rem] p-6 shadow-cute border-2 border-milk-tea">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-choco">
                            <Heart className="w-5 h-5 text-sakura" fill="#FFB7B2" /> 關於 StyleSync
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-cream rounded-xl border border-milk-tea">
                                <Check size={18} className="text-mint" strokeWidth={3} />
                                <span className="text-xs text-choco font-bold">隱私安全：照片不存雲端</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-cream rounded-xl border border-milk-tea">
                                <Check size={18} className="text-mint" strokeWidth={3} />
                                <span className="text-xs text-choco font-bold">離線可用：PWA 技術支援</span>
                            </div>
                        </div>
                     </div>
                </div>
            )}

        </div>
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-choco/40 backdrop-blur-sm animate-pop-in">
            <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl relative border-4 border-white">
                <button 
                    onClick={() => setShowSettingsModal(false)}
                    className="absolute top-4 right-4 bg-cream p-2 rounded-full text-choco-light hover:text-choco"
                >
                    <X className="w-6 h-6" strokeWidth={3} />
                </button>
                <div className="text-center mb-6 mt-2">
                    <div className="bg-sakura/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce-slight">
                        <Key className="w-8 h-8 text-sakura" />
                    </div>
                    <h3 className="text-xl font-bold text-choco">需要 API Key</h3>
                    <p className="text-sm text-choco-light mt-2 font-medium">請輸入 Google Gemini API Key<br/>讓我啟動魔法！✨</p>
                </div>
                <input 
                    type="password" 
                    placeholder="貼上你的 Key..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full p-4 bg-cream border-2 border-milk-tea rounded-2xl mb-4 outline-none focus:border-sakura transition-colors text-choco text-center"
                />
                <button 
                    onClick={handleSaveApiKey}
                    className="w-full py-4 bg-sakura text-white rounded-2xl font-bold text-lg shadow-[0_4px_0_0_#FF9E99] active:translate-y-[4px] active:shadow-none transition-all"
                >
                    確認儲存
                </button>
            </div>
        </div>
      )}

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
            
            <button 
                onClick={() => { setActiveTab('SETTINGS'); handleReset(); }}
                className={`flex-1 flex flex-col items-center justify-center h-full gap-1 transition-all rounded-2xl ${activeTab === 'SETTINGS' ? 'text-choco' : 'text-milk-tea'}`}
            >
                <div className={`p-1.5 rounded-xl transition-all duration-300 ${activeTab === 'SETTINGS' ? 'bg-sky text-white rotate-[6deg] scale-110 shadow-sm' : ''}`}>
                    <Settings className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <span className={`text-[10px] font-bold ${activeTab === 'SETTINGS' ? 'scale-100' : 'scale-0 h-0 opacity-0'} transition-all`}>設定</span>
            </button>
        </div>
      </nav>
    </div>
  );
};

export default App;