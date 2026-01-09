
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getInventoryInsights = async (items: any[]) => {
  if (!items || items.length === 0) return [];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert ERP Intelligence Analyst. Analyze the following inventory data for a corporation and provide 3 high-impact actionable business insights in JSON format. Focus on capital tied up in stock, low-inventory risks, and category balancing. Data: ${JSON.stringify(items)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              insight: { type: Type.STRING, description: "A data-driven observation about the inventory health." },
              action: { type: Type.STRING, description: "The recommended operational step to take." },
              priority: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] }
            },
            required: ['insight', 'action', 'priority']
          }
        }
      }
    });
    const text = response.text || '[]';
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini Intelligence Error:", error);
    return [{ 
      insight: "Intelligence core temporarily offline.", 
      action: "Check your API connection or data volume.", 
      priority: "Low" 
    }];
  }
};
