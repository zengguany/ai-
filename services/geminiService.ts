import { GoogleGenAI, Modality } from "@google/genai";

// Initialize the client with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a story opening based on an image using Gemini 3 Pro Preview.
 */
export const generateStoryFromImage = async (imageBase64: string): Promise<string> => {
  try {
    // Remove header if present (e.g., "data:image/jpeg;base64,")
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    
    // Use standard MIME type for the upload (assuming JPEG or PNG)
    // The API is flexible, but let's default to image/jpeg for the metadata if unknown
    const mimeType = imageBase64.includes('image/png') ? 'image/png' : 'image/jpeg';

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: "请仔细分析这张图片的氛围、光影、场景和细节。基于你的分析，请用中文创作一个引人入胜的故事开篇段落。语言要优美、有画面感，能够通过文字传达出图片中的情绪。"
          }
        ]
      }
    });

    return response.text || "无法生成故事，请重试。";
  } catch (error) {
    console.error("Error generating story:", error);
    throw error;
  }
};

/**
 * Generates speech from text using Gemini 2.5 Flash TTS.
 * Returns the raw Base64 audio string.
 */
export const generateSpeechFromText = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("No audio data received from Gemini.");
    }

    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};