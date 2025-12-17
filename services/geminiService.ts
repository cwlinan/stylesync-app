import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, OutfitRecommendation, ClothingCategory, WardrobeItem, Gender, Occasion, WeatherType } from '../types';

// Store API key in memory if needed for complex flows, but primarily rely on env
let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
    if (!aiClient) {
        // Robust API Key Detection
        const envKey = process.env.API_KEY || 
                       (import.meta as any).env?.VITE_API_KEY || 
                       (import.meta as any).env?.GOOGLE_API_KEY ||
                       (import.meta as any).env?.API_KEY;

        if (envKey) {
            aiClient = new GoogleGenAI({ apiKey: envKey });
        }
    }
    
    if (!aiClient) {
        console.error("Gemini Client Init Failed: API_KEY is missing from environment.");
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
    2. 提供簡短描述（例如：淺藍色寬版牛仔外套，韓系風格）。
    3. 提供 3-5 個關鍵字標籤（顏色、材質、風格，例如：Y2K, CityBoy, 復古）。
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
    description: { type: Type.STRING, description: "Max 15 words summary." },
    items: {
      type: Type.ARRAY,
      items: outfitItemSchema,
    },
    reasoning: { type: Type.STRING, description: "Max 1 sentence punchy tip." },
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
        使用者擁有數位衣櫥庫存。
        請優先從庫存挑選。使用庫存時，務必在 items 的 wardrobeItemId 填入 ID。
        若缺搭配單品，可建議通用單品。
        
        庫存:
        ${itemsList}
        `;
    }

    // Updated Prompt: 2 sets, Very short text
    let prompt = `你是一位年輕潮流造型師（IG/Threads 風格）。
    為一位${prefs.gender}提供 **2 套** 穿搭建議。
    
    風格要求：
    - 年輕、活潑、韓系/日系/CityBoy/Y2K。
    - **文字極度精簡**：說明請在 15 字以內，理由請用一句話解決。不要廢話。
    
    情境：
    - 場合：${prefs.occasion}
    - 天氣：${prefs.weather}
    - 偏好：${prefs.styleParams || '簡約質感'}
    
    ${wardrobeContext}
    `;

    const parts: any[] = [{ text: prompt }];

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "你是一位話少但精準的年輕穿搭客。拒絕老氣。請用 JSON 格式回傳。",
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
    
    // Switch to gemini-2.5-flash-image for better stability on free tier
    // Do NOT use 'imagen-3.0-generate-001' if it fails with permission errors
    const model = 'gemini-2.5-flash-image'; 
    
    const isFemale = context.gender === Gender.FEMALE;
    const isMale = context.gender === Gender.MALE;
    
    let subjectPrompt = "young fashion model";
    if (isFemale) subjectPrompt = "young trendy female, street style";
    else if (isMale) subjectPrompt = "young trendy male, city boy style";

    let bg = "street corner";
    if (context.occasion === Occasion.WORK) bg = "modern office";
    if (context.occasion === Occasion.PARTY) bg = "neon night city";
    if (context.occasion === Occasion.GYM) bg = "gym";

    let outfitDetails = description;
    // Add visual cues from reference items if available
    if (referenceItems && referenceItems.length > 0) {
        // We can't easily pass the image bytes to this specific generation call without making it a multimodal prompt for 'content' generation
        // For now, we rely on the text description of the items + the overall style
        const itemDescs = referenceItems.map(i => i.description).join(", ");
        outfitDetails += `, including ${itemDescs}`;
    }

    const prompt = `Generate a high-quality fashion photo. 
    Subject: ${subjectPrompt}
    Wearing: ${outfitDetails}
    Background: ${bg}
    Style: Photorealistic, 8k, cinematic lighting, full body shot.`;
    
    console.log("Generating visual with Gemini Flash Image...");

    // Use generateContent for gemini-2.5-flash-image (Nano Banana)
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: prompt }],
      },
      // Note: responseMimeType is NOT supported for image generation models in this mode
      config: {} 
    });

    // Iterate through parts to find the image
    const candidates = response.candidates;
    if (candidates && candidates[0].content.parts) {
        for (const part of candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    
    return null;
  } catch (error: any) {
    console.error("Visual Generation Error:", error);
    return null;
  }
};