/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Message, CoachingData, VoiceName, Scenario } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TEXT_MODEL = "gemini-3-flash-preview";
const TTS_MODEL = "gemini-3.1-flash-tts-preview";

export interface CombinedResponse {
  text: string;
  audio: string | null;
}

export async function getCustomerResponseAndAudio(
  messages: Message[],
  frustration: number,
  scenario: Scenario
): Promise<CombinedResponse> {
  try {
    // 1. Get text response using the text model
    const text = await getCustomerResponse(messages, frustration, scenario);
    
    // 2. Synthesize audio for that specific response
    const audio = await generateCustomerSpeech(text, frustration);

    return { text, audio };
  } catch (error) {
    console.error("Error in combined call flow:", error);
    return { 
      text: "I don't have all day. Are you going to help or not?", 
      audio: null 
    };
  }
}

export async function getCustomerResponse(
  messages: Message[],
  frustration: number,
  scenario: Scenario
): Promise<string> {
  const systemInstruction = scenario.systemInstruction.replace('{{frustration}}', frustration.toString());

  // Format message history for Gemini
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      config: {
        systemInstruction,
        temperature: 0.8,
      },
      contents: contents as any,
    });

    return response.text || "Hello? Are you still there?";
  } catch (error) {
    console.error("Error getting customer response:", error);
    return "I don't have all day. Are you going to help or not?";
  }
}

export async function getCoachingAnalysis(
  messages: Message[],
  scenario: Scenario
): Promise<CoachingData | null> {
  const systemInstruction = `
    You are a senior customer service coach. Analyze the conversation between an agent and a high-frustration customer named ${scenario.customerName}.
    Context: ${scenario.description}
    
    Return your analysis in JSON format with:
    1. "frustrationScore": (integer 0-100) reflecting their current mood.
    2. "coachingTip": One brief sentence of advice for the agent.
    3. "suggestions": A list of 3 specific response strings the agent could use next.
  `;

  const prompt = `Analyze this interaction: ${JSON.stringify(messages)}`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            frustrationScore: { type: Type.INTEGER },
            coachingTip: { type: Type.STRING },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["frustrationScore", "coachingTip", "suggestions"]
        }
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    return JSON.parse(response.text || "{}") as CoachingData;
  } catch (error) {
    console.error("Error getting coaching analysis:", error);
    return null;
  }
}

export async function generateCustomerSpeech(
  text: string,
  mood: number
): Promise<string | null> {
  let voiceInstruction = "Say this in a weary, skeptical voice:";
  if (mood > 85) {
    voiceInstruction = "Say this in an aggressive, shouting, and extremely angry voice. Sound furious:";
  } else if (mood > 70) {
    voiceInstruction = "Say this in a sharp, impatient, and very angry tone:";
  } else if (mood < 40) {
    voiceInstruction = "Say this in a soft, relieved, and calm voice:";
  }

  try {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: `${voiceInstruction} ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: VoiceName.KORE },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("Error generating speech:", error);
    return null;
  }
}

/**
 * Standard utility to play PCM audio data from Gemini TTS
 */
export function playPCM(base64Data: string) {
  try {
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const sampleRate = 24000; 
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 32 + bytes.length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); 
    view.setUint16(22, 1, true); 
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, bytes.length, true);

    const blob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn("Audio autoplay blocked by browser. User interaction required:", error);
      });
    }
    return audio;
  } catch (err) {
    console.error("Audio playback preparation failed", err);
  }
}
