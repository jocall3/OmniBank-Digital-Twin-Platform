
import { GoogleGenAI, Type } from "@google/genai";
import { TwinCategory, DigitalTwinInstance } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const geminiService = {
  /**
   * Generates a digital twin schema based on user description.
   */
  async generateSchema(prompt: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Design a JSON schema for a digital twin based on this description: "${prompt}". 
      Include properties with name, type (string, number, boolean), description, and optional unit/enum.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING, enum: Object.values(TwinCategory) },
            version: { type: Type.STRING },
            schema: {
              type: Type.OBJECT,
              properties: {
                properties: {
                  type: Type.OBJECT,
                  additionalProperties: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ["string", "number", "boolean"] },
                      description: { type: Type.STRING },
                      unit: { type: Type.STRING },
                      writable: { type: Type.BOOLEAN }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text);
  },

  /**
   * Analyzes current data for anomalies.
   */
  async detectAnomalies(instance: DigitalTwinInstance, definition: any) {
    const context = JSON.stringify({ instance, definition });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this digital twin instance for anomalies. 
      Context: ${context}. 
      Return a list of anomalies with severity and message.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            anomalies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  severity: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
                  message: { type: Type.STRING }
                }
              }
            },
            summary: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text);
  },

  /**
   * Predicts future trends based on provided context.
   */
  async predictFutureState(instance: DigitalTwinInstance, horizon: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Given the current state of twin "${instance.name}": ${JSON.stringify(instance.properties)}, 
      predict the state and potential issues over the next ${horizon}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  property: { type: Type.STRING },
                  trend: { type: Type.STRING },
                  projectedValue: { type: Type.STRING },
                  confidence: { type: Type.NUMBER }
                }
              }
            },
            insights: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text);
  }
};
