/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Scenario {
  id: string;
  customerName: string;
  title: string;
  description: string;
  initialMessage: string;
  systemInstruction: string;
  crmHistory: string[];
  initialFrustration: number;
  priority: 'Standard' | 'High' | 'CRITICAL';
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface CoachingData {
  frustrationScore: number;
  coachingTip: string;
  suggestions: string[];
}

export enum VoiceName {
  PUCK = 'Puck',
  CHARON = 'Charon',
  KORE = 'Kore',
  FENRIR = 'Fenrir',
  ZEPHYR = 'Zephyr',
}
