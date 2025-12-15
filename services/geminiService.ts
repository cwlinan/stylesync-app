import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, OutfitRecommendation, ClothingCategory, WardrobeItem, Gender, Occasion, WeatherType } from '../types';

// Store API key in memory if needed for complex flows, but primarily rely on env
let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
    if (!aiClient) {
        // The API key is injected via vite.config.ts define plugin
        // accessible as process.env.API_KEY
        const envKey = process.env.API_KEY;

        if (envKey) {
            aiClient = new GoogleGenAI({ apiKey: envKey });
        }
    }
    
    if (!aiClient) {
        // More descriptive error for debugging
        console.error("Gemini Client Init Failed: process.env.API_KEY is missing or empty.");
        throw new Error("API_KEY_MISSING");
    }
    return aiClient;
}

// --- Helper: Analyze Image ---
export const analyzeWardrobeItem = async (base64Image: string): Promise<{ category: ClothingCategory, description: string, tags: string[] }> => {
  try {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash';
    const prompt = `分析這張衣物圖片。
    1. 將其分類為以下之一: ${Object.values(ClothingCategory).join(', ')}。
    2. 提供簡短描述（例如：深藍色牛仔外套，復古水洗）。
    3. 提供 3-5 個關鍵字標籤（顏色、材質、風格）。
    請以 JSON 格式回傳，包含 category, description, tags 欄位。`;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                category: { type: Type.STRING },
                description: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    // Fallback if category doesn't match enum exactly, default to TOP
    let category = ClothingCategory.TOP;
    const matchedCategory = Object.values(ClothingCategory).find(c => c === result.category);
    if (matchedCategory) category = matchedCategory;

    return {
        category,
        description: result.description || "未知單品",
        tags: result.tags || []
    };

  } catch (error: any) {
    if (error.message === "API_KEY_MISSING") throw error;
    console.error("Analysis Error:", error);
    return {
        category: ClothingCategory.TOP,
        description: "已上傳單品",
        tags: []
    };
  }
}

// --- Schemas ---
const outfitItemSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    color: { type: Type.STRING },
    type: { type: Type.STRING },
    wardrobeItemId: { type: Type.STRING, description: "If choosing from user wardrobe, provide the exact ID. If generic suggestion, leave empty." },
  },
  required: ["name", "color", "type"],
};

const recommendationSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: outfitItemSchema,
    },
    reasoning: { type: Type.STRING },
    colorPalette: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["title", "description", "items", "reasoning", "colorPalette"],
};

const responseSchema = {
  type: Type.ARRAY,
  items: recommendationSchema,
};

// --- Main Recommendation Service ---
export const generateOutfitRecommendations = async (
  prefs: UserPreferences
): Promise<OutfitRecommendation[]> => {
  try {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash';
    
    let wardrobeContext = "";
    if (prefs.useWardrobe && prefs.wardrobeItems && prefs.wardrobeItems.length > 0) {
        const itemsList = prefs.wardrobeItems.map(item => 
            `- ID: ${item.id}, 類別: ${item.category}, 描述: ${item.description}`
        ).join('\n');
        
        wardrobeContext = `
        使用者擁有以下衣櫥庫存（數位衣櫥）。
        請優先從這些單品中挑選來組合成套。
        當你使用庫存單品時，務必在 items 的 wardrobeItemId 欄位填入對應的 ID。
        如果缺少女生單品或鞋子來完成造型，你可以建議通用的單品。
        
        庫存列表:
        ${itemsList}
        `;
    }

    let prompt = `你是一位專業個人造型師。請為一位${prefs.gender}提供 3 套穿搭建議。
    請使用繁體中文回答。
    
    情境：
    - 場合：${prefs.occasion}
    - 天氣：${prefs.weather}
    - 風格：${prefs.styleParams || '時尚, 簡約'}
    
    ${wardrobeContext}
    
    若沒有使用庫存，請提供通用的購買建議。
    `;

    const parts: any[] = [{ text: prompt }];

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "你是一位擅長混搭的時尚顧問。請根據現有衣物最大化利用，並給出具體的搭配理由。",
      },
    });

    const text = response.text;
    if (!text) throw new Error("無法生成建議");

    const rawData = JSON.parse(text);
    
    return rawData.map((item: any, index: number) => ({
      ...item,
      id: `rec-${Date.now()}-${index}`,
      context: prefs // Attach context for image generation
    }));

  } catch (error) {
    console.error("Gemini Outfit Gen Error:", error);
    throw error;
  }
};

// --- Visualization ---
export const generateOutfitVisual = async (description: string, context: UserPreferences, referenceItems: WardrobeItem[] = []): Promise<string | null> => {
  try {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash-image'; 
    
    // 1. Determine Gender & Body Type Params
    const isFemale = context.gender === Gender.FEMALE;
    const isMale = context.gender === Gender.MALE;
    
    let subjectPrompt = "";
    if (isFemale) {
        subjectPrompt = "A fashionable Taiwanese woman, height approx 160cm. Petite but well-proportioned figure.";
    } else if (isMale) {
        subjectPrompt = "A stylish Taiwanese man, height approx 175cm. Slim to average build.";
    } else {
        // Unisex/Default
        subjectPrompt = "A stylish Taiwanese person, height approx 165cm, natural build.";
    }

    // 2. Determine Background based on Occasion
    let backgroundPrompt = "";
    switch (context.occasion) {
        case Occasion.CASUAL:
            backgroundPrompt = "Taiwanese street scene, nearby a bubble tea shop or convenience store, relaxed daytime vibe.";
            break;
        case Occasion.WORK:
            backgroundPrompt = "Modern office setting in Taipei or a clean urban business district background.";
            break;
        case Occasion.DATE:
            backgroundPrompt = "A cozy cafe interior with warm lighting or a scenic spot in a creative park (like Huashan 1914).";
            break;
        case Occasion.PARTY:
            backgroundPrompt = "A trendy evening bistro or lounge bar entrance with ambient lighting.";
            break;
        case Occasion.GYM:
            backgroundPrompt = "A bright modern gym interior or an outdoor riverside running track in Taipei.";
            break;
        case Occasion.FORMAL:
            backgroundPrompt = "A high-end hotel lobby or banquet hall entrance.";
            break;
        default:
            backgroundPrompt = "A clean, aesthetic urban street corner in Taiwan.";
    }

    // 3. Determine Weather/Atmosphere
    let weatherPrompt = "";
    switch (context.weather) {
        case WeatherType.SUNNY:
            weatherPrompt = "Sunny day, bright natural sunlight, distinct shadows, vibrant colors.";
            break;
        case WeatherType.CLOUDY:
            weatherPrompt = "Overcast day, soft diffused lighting, no harsh shadows, cozy atmosphere.";
            break;
        case WeatherType.RAINY:
            weatherPrompt = "Rainy day, holding a clear plastic umbrella, wet pavement reflections, moody cinematic lighting.";
            break;
        case WeatherType.SNOWY:
        case WeatherType.COLD:
            weatherPrompt = "Cold weather, visible breath, soft winter lighting.";
            break;
        case WeatherType.HOT:
            weatherPrompt = "Hot summer day, bright intense sun, summer vibe.";
            break;
        default:
            weatherPrompt = "Natural daylight.";
    }

    // 4. Detailed Outfit Description from References
    let outfitDetails = description;
    if (referenceItems && referenceItems.length > 0) {
        // 將衣櫥的圖片轉換為文字描述
        outfitDetails += " \n\nWEARING THE FOLLOWING SPECIFIC ITEMS (MATCH COLOR AND STYLE EXACTLY):";
        referenceItems.forEach(item => {
            outfitDetails += `\n- ${item.category}: ${item.description} (Keywords: ${item.tags.join(', ')})`;
        });
    }

    // Construct the full prompt
    let prompt = `
    High-quality fashion photography, street snap style.
    Subject: ${subjectPrompt}
    Skin Tone: Natural Asian/Taiwanese skin tone.
    Pose: Natural, standing, confident look.
    
    Outfit: ${outfitDetails}
    
    Background: ${backgroundPrompt}
    Lighting: ${weatherPrompt}
    
    Style: Photorealistic, 8k, shot on 35mm film, highly detailed textures, depth of field.
    Ensure the clothing colors match the description exactly.
    `;
    
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4"
        }
      }
    });

    if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    
    return null;
  } catch (error) {
    console.error("Gemini Visual Generation Error:", error);
    return null;
  }
};