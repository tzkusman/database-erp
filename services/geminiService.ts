
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Google GenAI SDK with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getInventoryInsights = async (items: any[]) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this inventory data and suggest 3 business actions: ${JSON.stringify(items)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              insight: { type: Type.STRING },
              action: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] }
            },
            required: ['insight', 'action', 'priority']
          }
        }
      }
    });
    // Extracting text from response and parsing it as JSON.
    const text = response.text || '[]';
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
};
