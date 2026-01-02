
import { GoogleGenAI } from "@google/genai";
import { BillingRecord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getBillingInsight(units: number, type: string, amount: number): Promise<string> {
  try {
    // Included thinkingConfig with a thinkingBudget because maxOutputTokens is specified, following the GenAI SDK best practices for models that support reasoning.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an energy efficiency expert. Provide a concise, 2-sentence energy saving tip for a ${type} consumer who used ${units} units of electricity costing ${amount.toFixed(0)}.`,
      config: { 
        temperature: 0.8, 
        maxOutputTokens: 200,
        thinkingConfig: { thinkingBudget: 100 }
      }
    });
    return response.text || "Conserve energy by switching to LED bulbs.";
  } catch (error) {
    return "Optimize energy usage by using natural light during the day.";
  }
}

export async function generateWhatsAppBill(record: BillingRecord, currency: string): Promise<string> {
  try {
    const prompt = `Format a professional WhatsApp electricity bill for ${record.occupantName}. 
    Units: ${record.previousUnit} to ${record.currentUnit} (Total: ${record.totalUnits}). 
    Rate: ${record.unitRate}. Rent: ${record.roomRent}. Arrears: ${record.previousBalance}. 
    Total Amount: ${currency} ${record.totalAmount}. 
    Include emojis, professional spacing, and a "Thank you" note. Keep it clean for mobile screens.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 0.7 }
    });
    return response.text || `*BILLING NOTICE*\n\nName: ${record.occupantName}\nUnits: ${record.totalUnits}\nTotal: ${currency} ${record.totalAmount}`;
  } catch (error) {
    return `*E-BILL SERVICE*\n\nCustomer: ${record.occupantName}\nUnits: ${record.totalUnits}\nTotal: ${currency} ${record.totalAmount}`;
  }
}
