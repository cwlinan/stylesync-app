export enum Occasion {
  CASUAL = '休閒',
  WORK = '工作/商務',
  DATE = '約會',
  PARTY = '派對',
  GYM = '運動/健身',
  FORMAL = '正式場合'
}

export enum WeatherType {
  SUNNY = '晴天',
  CLOUDY = '多雲',
  RAINY = '雨天',
  SNOWY = '雪天',
  COLD = '寒冷',
  HOT = '炎熱'
}

export enum Gender {
  FEMALE = '女性',
  MALE = '男性',
  UNISEX = '中性/通用'
}

export enum ClothingCategory {
  TOP = '上衣',
  BOTTOM = '下身',
  SHOES = '鞋履',
  OUTERWEAR = '外套',
  ACCESSORY = '配件',
  ONE_PIECE = '連身裝'
}

export interface WardrobeItem {
  id: string;
  imageData: string; // Base64
  mimeType: string; // e.g., 'image/jpeg'
  category: ClothingCategory;
  description: string; // AI generated description (e.g., "Blue denim jacket")
  tags: string[];
  createdAt: number;
}

export interface OutfitItem {
  name: string;
  color: string;
  type: string;
  wardrobeItemId?: string; // Link to specific inventory item if available
}

export interface OutfitRecommendation {
  id: string;
  title: string;
  description: string;
  items: OutfitItem[];
  reasoning: string;
  colorPalette: string[];
  generatedVisual?: string;
  // 新增 Context 欄位，用於傳遞給生圖功能
  context?: UserPreferences;
}

export interface UserPreferences {
  occasion: Occasion;
  weather: WeatherType;
  styleParams: string;
  gender: Gender;
  useWardrobe: boolean; // Toggle to strictly use own clothes
  wardrobeItems?: WardrobeItem[]; // Passed to service for context
}