/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality, Type, ThinkingLevel } from "@google/genai";
import { Message, CoachingData, VoiceName } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TEXT_MODEL = "gemini-3-flash-preview";
const TTS_MODEL = "gemini-3.1-flash-tts-preview";

export interface CombinedResponse {
  text: string;
  audio: string | null;
}

export async function getDianaResponseAndAudio(
  messages: Message[],
  frustration: number
): Promise<CombinedResponse> {
  let voiceInstruction = "Speak in a weary, skeptical voice.";
  if (frustration > 85) {
    voiceInstruction = "Speak in an aggressive, shouting, and extremely angry voice. Sound furious.";
  } else if (frustration > 70) {
    voiceInstruction = "Speak in a sharp, impatient, and very angry tone.";
  } else if (frustration < 40) {
    voiceInstruction = "Speak in a soft, relieved, and calm voice.";
  }

  const identityInstruction = `
    DIANA REYES PERSONA: You are Diana Reyes, a customer who is furious and distrustful.
    Stay in character: Defensive, sharp, skeptical of AI.
    Current frustration: ${frustration}/100.
    
    VOICE DIRECTION: ${voiceInstruction}
    
    Your specific issue: You cancelled your subscription on the 14th of last month, but were charged twice (sixty dollars total). This is your third time reaching out.
    If frustration > 80: Be short, aggressive, and sarcastic.
    If frustration 50-80: Be impatient and demanding.
    Keep responses punchy. Do NOT be polite until a refund is actually mentioned with a clear timeline.
    
    RESPONSE FORMAT: Generate a text response to the agent, and the model will follow with audio.
  `;

  const contents = [
    { role: 'user', parts: [{ text: identityInstruction }] },
    ...messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }))
  ];

  try {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: VoiceName.PUCK },
          },
        },
      },
      contents: contents as any,
    });

    return {
      text: response.text || "Hello? Are you going to help or not?",
      audio: response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data || null
    };
  } catch (error) {
    console.error("Error in combined call:", error);
    return { text: "I don't have all day. Are you going to help or not?", audio: null };
  }
}

export async function getDianaResponse(
  messages: Message[],
  frustration: number
): Promise<string> {
  const systemInstruction = `
    You are Diana Reyes, a customer who is furious and distrustful.
    Stay in character: Defensive, sharp, skeptical of scripts and AI.
    Current frustration: ${frustration}/100.
    - If frustration > 80: Be short, aggressive, and sarcastic.
    - If frustration 50-80: Be impatient and demanding.
    - If frustration < 50: Start showing slight appreciation but remain cautious.
    Do NOT be polite until a refund is actually mentioned with a clear timeline.
    Your specific issue: You cancelled your subscription on the 14th of last month, but were charged twice (sixty dollars total). This is your third time reaching out.
  `;

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
    console.error("Error getting Diana's response:", error);
    return "I don't have all day. Are you going to help or not?";
  }
}

export async function getCoachingAnalysis(
  messages: Message[]
): Promise<CoachingData | null> {
  const systemInstruction = `
    You are a senior customer service coach. Analyze the conversation between an agent and a high-frustration customer (Diana Reyes).
    Diana is distrustful, hates scripts, and wants a $60 refund for a double charge.
    
    Return your analysis in JSON format with:
    1. "frustrationScore": (integer 0-100) reflecting her current mood.
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

export async function generateDianaSpeech(
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
            prebuiltVoiceConfig: { voiceName: VoiceName.PUCK },
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
    audio.play();
  } catch (err) {
    console.error("Audio playback failed", err);
  }
}
