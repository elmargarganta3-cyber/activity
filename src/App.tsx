/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  User, 
  CheckCircle, 
  RefreshCcw, 
  History, 
  Sparkles, 
  MessageSquareQuote, 
  Volume2, 
  VolumeX,
  AlertCircle,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getDianaResponse, 
  getCoachingAnalysis, 
  generateDianaSpeech, 
  playPCM 
} from './lib/gemini';
import { Message, CoachingData } from './types';

const INITIAL_MESSAGE: Message = { 
  role: 'assistant', 
  content: "Hello? Is this a real person this time or am I talking to another one of those useless 'digital assistants'? Look, I've already wasted two lunch breaks trying to sort this out. I cancelled my subscription on the 14th of last month—I have the confirmation email right here—and yet, I look at my bank statement this morning and I've been charged twice. That's sixty dollars total. Are you going to actually fix this, or am I just wasting my breath for a third time?" 
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [frustration, setFrustration] = useState(70);
  const [isResolved, setIsResolved] = useState(false);
  const [coachingTip, setCoachingTip] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  const historyNotes = [
    "Oct 15: Customer called regarding cancellation. Agent promised follow-up.",
    "Oct 20: Customer chat. Issue escalated to billing. No refund issued yet.",
    "Oct 25: Automated notification sent - failed to process refund due to system error."
  ];

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, coachingTip, suggestions]);

  // Initial greeting audio
  useEffect(() => {
    if (!isMuted && messages.length === 1) {
      generateDianaSpeech(messages[0].content, 70).then(audio => {
        if (audio) playPCM(audio);
      });
    }
  }, []);

  const handleSend = async (customInput?: string) => {
    const input = customInput || userInput;
    if (!input.trim() || loading || isResolved) return;

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setUserInput('');
    setSuggestions([]);
    setLoading(true);

    try {
      // 1. Get Diana's text response
      const dianaText = await getDianaResponse(updatedMessages, frustration);
      const assistantMessage: Message = { role: 'assistant', content: dianaText };
      const finalMessages = [...updatedMessages, assistantMessage];
      
      setMessages(finalMessages);
      setLoading(false);

      // 2. Background: Speech synthesis
      if (!isMuted) {
        generateDianaSpeech(dianaText, frustration).then(audio => {
          if (audio) playPCM(audio);
        });
      }

      // 3. Background: Coaching Analysis
      getCoachingAnalysis(finalMessages).then((analysis: CoachingData | null) => {
        if (analysis) {
          setFrustration(analysis.frustrationScore);
          setCoachingTip(analysis.coachingTip);
          setSuggestions(analysis.suggestions);

          // Resolution check: If frustration is low and Diana is thanking/appreciating
          const lowerText = dianaText.toLowerCase();
          if (analysis.frustrationScore < 30 && (lowerText.includes('thank') || lowerText.includes('appreciate') || lowerText.includes('helped'))) {
            setIsResolved(true);
          }
        }
      });

    } catch (error) {
      console.error("Interaction failed:", error);
      setLoading(false);
    }
  };

  const getUrgencyLevel = () => {
    if (frustration > 85) return { color: 'text-red-600', bg: 'bg-red-50', label: 'CRITICAL ESCALATION', icon: ShieldAlert };
    if (frustration > 60) return { color: 'text-orange-600', bg: 'bg-orange-50', label: 'HIGH FRUSTRATION', icon: AlertCircle };
    return { color: 'text-green-600', bg: 'bg-green-50', label: 'STABLE INTERACTION', icon: CheckCircle };
  };

  const urgency = getUrgencyLevel();

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-slate-200 font-sans overflow-hidden transition-colors duration-700">
      {/* Header Section: High Stakes Simulation Feel */}
      <header className={`h-22 border-b border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-between px-8 relative z-50 transition-all duration-500 ${frustration > 85 ? 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : ''}`}>
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className={`w-14 h-14 rounded-full border-2 p-0.5 transition-all duration-500 ${frustration > 85 ? 'border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-white/10'}`}>
              <div className={`w-full h-full rounded-full flex items-center justify-center transition-all duration-500 ${frustration > 85 ? 'bg-gradient-to-tr from-red-600 to-red-400' : 'bg-white/5'}`}>
                <User className={frustration > 85 ? 'text-white' : 'text-slate-400'} size={24} />
              </div>
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full border-2 border-black transition-colors ${frustration > 85 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Diana Reyes</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-[10px] border px-2 py-0.5 rounded font-black uppercase tracking-tighter transition-colors ${frustration > 85 ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-white/5 text-slate-500 border-white/10'}`}>
                Priority: {frustration > 85 ? 'CRITICAL' : 'Standard'}
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1">
                <Clock size={10} /> Tier 3 Escalation
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-12">
          <div className="hidden lg:flex flex-col items-end">
            <div className="flex justify-between w-64 text-[10px] font-black uppercase tracking-widest mb-2 transition-colors">
              <span className={frustration > 85 ? 'text-red-400' : 'text-slate-500'}>Frustration Level</span>
              <span className={frustration > 85 ? 'text-red-400' : 'text-slate-500'}>{frustration}%</span>
            </div>
            <div className="w-64 h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
              <motion.div 
                className={`h-full shadow-[0_0_15px_rgba(239,68,68,0.3)] ${frustration > 70 ? 'bg-gradient-to-r from-orange-500 via-red-500 to-red-600' : frustration > 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${frustration}%` }}
                transition={{ type: 'spring', stiffness: 50, damping: 15 }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 border-l border-white/10 pl-8">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all border ${isMuted ? 'bg-white/5 text-slate-500 border-white/10' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20'}`}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all shadow-lg"
            >
              <RefreshCcw size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Contextual Intel */}
        <aside className="w-80 border-r border-white/10 bg-black/20 flex flex-col p-8 gap-10 z-10">
          <section>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-6 flex items-center gap-3">
              <div className="w-1 h-3 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div> CRM Archive
            </h3>
            <div className="space-y-4">
              {historyNotes.map((note, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs leading-relaxed text-slate-400 italic hover:border-white/20 transition-colors cursor-default"
                >
                  {note}
                </motion.div>
              ))}
            </div>
          </section>

          <section className="mt-auto">
            <AnimatePresence mode="wait">
              {coachingTip && (
                <motion.div 
                  key={coachingTip}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative group h-full"
                >
                  <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 transition duration-1000 group-hover:opacity-40 animate-pulse`}></div>
                  <div className="relative p-5 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                      <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">AI Coach Intel</h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-bold">
                      {coachingTip}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </aside>

        {/* Main Simulation Viewport */}
        <main className="flex-1 flex flex-col relative">
          {/* Atmospheric Background Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className={`absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] transition-colors duration-1000 ${frustration > 85 ? 'bg-red-500/10' : 'bg-red-900/5'}`}></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-900/5 rounded-full blur-[120px]"></div>
          </div>

          {/* Chat Feed */}
          <div ref={scrollRef} className="flex-1 p-10 space-y-10 relative z-10 overflow-y-auto scroll-smooth">
            {messages.map((m, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] group`}>
                  <div className={`flex items-center gap-3 mb-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role !== 'user' && <span className="text-[10px] font-black text-red-400 uppercase tracking-widest pl-1">Diana Reyes</span>}
                    <span className="text-[10px] text-slate-600 font-bold">14:0{i + 2} PM</span>
                    {m.role === 'user' && <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pr-1">Agent (You)</span>}
                  </div>
                  <div className={`p-6 rounded-2xl shadow-2xl backdrop-blur-md transition-all border ${
                    m.role === 'user' 
                      ? 'bg-indigo-600/10 border-indigo-500/30 rounded-tr-none' 
                      : `bg-white/5 rounded-tl-none ${frustration > 85 ? 'border-red-500/30 shadow-red-500/5' : 'border-white/10'}`
                  }`}>
                    <p className="text-sm leading-relaxed text-slate-200 font-semibold">{m.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></motion.span>
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></motion.span>
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></motion.span>
                  </div>
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] animate-pulse">Inbound Response...</span>
                </div>
              </div>
            )}

            {isResolved && (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-emerald-500/10 border-2 border-emerald-500/30 p-10 rounded-3xl text-center shadow-2xl backdrop-blur-xl max-w-xl mx-auto"
              >
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                  <CheckCircle size={40} className="text-white" />
                </div>
                <h3 className="font-black text-3xl text-white mb-3 tracking-tight">CRISIS RESOLVED</h3>
                <p className="text-slate-300 leading-relaxed font-bold">
                  Target sentiment stabilized. Detailed de-escalation report available in archives. 
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-8 px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-550 transition-all hover:scale-105 shadow-xl"
                >
                  New Simulation
                </button>
              </motion.div>
            )}
            
            {!loading && !isResolved && suggestions.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-6 space-y-4"
              >
                <div className="flex items-center gap-3 text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em] pl-1">
                  <div className="w-6 h-px bg-indigo-500/30"></div> Strategy Suggestions
                </div>
                <div className="flex flex-wrap gap-3">
                  {suggestions.map((s, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleSend(s)} 
                      className="px-5 py-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all font-bold tracking-tight text-left max-w-full"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-10 pb-12 bg-gradient-to-t from-black via-black/80 to-transparent z-20">
            <div className={`max-w-4xl mx-auto relative group transition-all ${isResolved || loading ? 'opacity-30 pointer-events-none' : ''}`}>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Secure terminal communication link..."
                className="w-full bg-white/5 border border-white/15 rounded-2xl px-8 py-6 text-sm font-bold text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all pr-20 placeholder:text-slate-600 shadow-2xl backdrop-blur-md"
              />
              <button
                onClick={() => handleSend()}
                disabled={!userInput.trim()}
                className="absolute right-4 top-4 w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
              >
                <Send size={24} />
              </button>
            </div>
            <div className="flex justify-center gap-12 mt-6">
              <span className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em]">Encrypted Session</span>
              <span className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em]">Simulation Active</span>
              <span className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em]">Voice Feed: Enabled</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
