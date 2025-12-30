
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getBillingInsight(units: number, type: string, amount: number): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a short, 2-sentence energy saving tip for a ${type} consumer who just used ${units} units of electricity costing a total of $${amount.toFixed(2)}. Make it encouraging and practical.`,
      config: {
        temperature: 0.7,
        // Fix: Per SDK guidelines, when maxOutputTokens is set, thinkingBudget must also be specified to ensure tokens are reserved for the final response.
        maxOutputTokens: 200,
        thinkingConfig: {
          thinkingBudget: 100
        }
      }
    });
    return response.text || "Conserve energy by switching to LED bulbs and unplugging idle appliances.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Conserve energy by switching to LED bulbs and unplugging idle appliances.";
  }
}
