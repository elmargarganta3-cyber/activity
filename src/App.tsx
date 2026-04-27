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
  ShieldAlert,
  Mic,
  MicOff,
  Headset
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getCustomerResponseAndAudio,
  getCoachingAnalysis, 
  playPCM 
} from './lib/gemini';
import { Message, CoachingData, Scenario } from './types';
import { SCENARIOS } from './scenarios';

export default function App() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const currentScenario = SCENARIOS.find(s => s.id === selectedScenarioId) || SCENARIOS[0];

  const getTimestamp = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [frustration, setFrustration] = useState(currentScenario.initialFrustration);
  const [isResolved, setIsResolved] = useState(false);
  const [coachingTip, setCoachingTip] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Set initial message when scenario is first loaded or changed
  useEffect(() => {
    if (!selectedScenarioId) {
      setMessages([{ 
        role: 'assistant', 
        content: currentScenario.initialMessage,
        timestamp: getTimestamp()
      }]);
    }
  }, []);

  // Update initial state when scenario changes
  const selectScenario = (scenario: Scenario) => {
    setSelectedScenarioId(scenario.id);
    setMessages([{ 
      role: 'assistant', 
      content: scenario.initialMessage,
      timestamp: getTimestamp()
    }]);
    setFrustration(scenario.initialFrustration);
    setIsResolved(false);
    setCoachingTip('');
    setSuggestions([]);
    setHasInteracted(true);
  };

  const recognitionRef = useRef<any>(null);

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

  // Initial greeting audio - only after interaction
  useEffect(() => {
    if (hasInteracted && !isMuted && messages.length === 1) {
      getCustomerResponseAndAudio(messages, frustration, currentScenario).then(({ audio }) => {
        if (audio) playPCM(audio);
      });
    }
  }, [hasInteracted, selectedScenarioId]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
        setIsRecording(false); // Stop UI recording state after finding a result
      };

      recognitionRef.current.onspeechend = () => {
        recognitionRef.current.stop();
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleSend = async (customInput?: string) => {
    const input = customInput || userInput;
    if (!input.trim() || loading || isResolved) return;
    
    if (!hasInteracted) setHasInteracted(true);

    const userMessage: Message = { role: 'user', content: input, timestamp: getTimestamp() };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setUserInput('');
    setSuggestions([]);
    setLoading(true);

    try {
      // 1. Get customer response
      const { text, audio } = await getCustomerResponseAndAudio(updatedMessages, frustration, currentScenario);
      
      const assistantMessage: Message = { role: 'assistant', content: text, timestamp: getTimestamp() };
      const finalMessages = [...updatedMessages, assistantMessage];
      
      setMessages(finalMessages);
      setLoading(false);

      // 2. Immediate Audio playback
      if (!isMuted && audio) {
        playPCM(audio);
      }

      // 3. Background: Coaching Analysis
      getCoachingAnalysis(finalMessages, currentScenario).then((analysis: CoachingData | null) => {
        if (analysis) {
          setFrustration(analysis.frustrationScore);
          setCoachingTip(analysis.coachingTip);
          setSuggestions(analysis.suggestions);

          // Resolution check: If frustration is low and Diana is thanking/appreciating
          const lowerText = text.toLowerCase();
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
                {currentScenario.id === 'marcus-chen' ? <ShieldAlert className={frustration > 85 ? 'text-white' : 'text-slate-400'} size={24} /> : <User className={frustration > 85 ? 'text-white' : 'text-slate-400'} size={24} />}
              </div>
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full border-2 border-black transition-colors ${frustration > 85 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">{currentScenario.customerName}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-[10px] border px-2 py-0.5 rounded font-black uppercase tracking-tighter transition-colors ${frustration > 85 || currentScenario.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-white/5 text-slate-500 border-white/10'}`}>
                Priority: {currentScenario.priority}
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1">
                <Clock size={10} /> {currentScenario.title}
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
              {currentScenario.crmHistory.map((note, i) => (
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

          <section>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-6 flex items-center gap-3">
              <div className="w-1 h-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Active Session
            </h3>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <Headset size={20} className="text-indigo-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-white font-black uppercase tracking-tight">Agent 402 (You)</span>
                <span className="text-[9px] text-emerald-500 font-bold uppercase">Online & Operational</span>
              </div>
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
          {/* Autoplay & Scenario Selection Overlay */}
          <AnimatePresence>
            {!hasInteracted && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl px-6"
              >
                <div className="max-w-4xl w-full bg-[#111] border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl">
                  <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/30">
                    <ShieldAlert size={48} className="text-red-500 animate-pulse" />
                  </div>
                  <h2 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">Crisis Command Center</h2>
                  <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
                    Select a high-priority customer scenario to begin your de-escalation training. All sessions are recorded for analysis.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-12">
                    {SCENARIOS.map((scenario) => (
                      <motion.button
                        key={scenario.id}
                        whileHover={{ y: -5, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => selectScenario(scenario)}
                        className="group relative p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 hover:border-indigo-500/50 transition-all overflow-hidden flex flex-col h-full"
                      >
                        <div className={`absolute top-0 right-0 w-32 h-32 blur-[40px] opacity-20 -mr-16 -mt-16 transition-colors ${scenario.priority === 'CRITICAL' ? 'bg-red-500' : scenario.priority === 'High' ? 'bg-orange-500' : 'bg-indigo-500'}`}></div>
                        
                        <div className="flex justify-between items-start mb-4">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${scenario.priority === 'CRITICAL' ? 'border-red-500/40 text-red-400 bg-red-500/10' : scenario.priority === 'High' ? 'border-orange-500/40 text-orange-400 bg-orange-500/10' : 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10'}`}>
                            {scenario.priority}
                          </span>
                          <User size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                        
                        <h3 className="text-white font-black text-xl mb-2 tracking-tight">{scenario.customerName}</h3>
                        <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-4">{scenario.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-6 group-hover:text-slate-300 transition-colors">
                          {scenario.description}
                        </p>
                        
                        <div className="mt-auto flex items-center gap-2 group-hover:gap-3 transition-all pt-4 border-t border-white/5">
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Connect Call</span>
                          <Send size={12} className="text-indigo-500" />
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em]">System Ready. Voice Feed Active. Monitoring Initialized.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                <div className={`max-w-[80%] group flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 mt-8`}>
                    <div className={`w-10 h-10 rounded-2xl border transition-all shadow-lg flex items-center justify-center ${
                      m.role === 'user' 
                        ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400' 
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}>
                      {m.role === 'user' ? <Headset size={18} /> : <User size={18} />}
                    </div>
                  </div>
                  <div className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-3 mb-2 px-1`}>
                      {m.role !== 'user' && <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">{currentScenario.customerName}</span>}
                      {m.role === 'user' && <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Agent (You)</span>}
                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{m.timestamp}</span>
                    </div>
                    <div className={`p-6 rounded-3xl shadow-2xl backdrop-blur-md transition-all border group-hover:scale-[1.01] ${
                      m.role === 'user' 
                        ? 'bg-indigo-600/10 border-indigo-500/30 rounded-tr-none' 
                        : `bg-white/5 rounded-tl-none ${frustration > 85 ? 'border-red-500/40 shadow-red-500/10' : 'border-white/10'}`
                    }`}>
                      <p className="text-sm leading-relaxed text-slate-200 font-semibold selection:bg-indigo-500/30">{m.content}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-4 bg-white/5 px-6 py-4 rounded-full border border-white/10 backdrop-blur-md shadow-xl">
                  <div className="flex gap-2">
                    {[0, 1, 2].map((dot) => (
                      <motion.div
                        key={dot}
                        animate={{ 
                          scale: [1, 1.4, 1],
                          opacity: [0.4, 1, 0.4],
                          backgroundColor: frustration > 85 ? ['#ef4444', '#f87171', '#ef4444'] : ['#6366f1', '#818cf8', '#6366f1']
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 1, 
                          delay: dot * 0.2,
                          ease: "easeInOut"
                        }}
                        className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]"
                        style={{ color: frustration > 85 ? '#ef4444' : '#6366f1' }}
                      />
                    ))}
                  </div>
                  <motion.span 
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={`text-[10px] font-black uppercase tracking-[0.25em] ${frustration > 85 ? 'text-red-500' : 'text-indigo-400'}`}
                  >
                    {currentScenario.customerName} is typing...
                  </motion.span>
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
                className="w-full bg-white/5 border border-white/15 rounded-2xl px-8 py-6 text-sm font-bold text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all pr-36 placeholder:text-slate-600 shadow-2xl backdrop-blur-md"
              />
              <div className="absolute right-20 top-4 flex gap-2">
                <div className="relative">
                  <AnimatePresence>
                    {isRecording && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: 1.8, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                        className="absolute inset-0 bg-red-500 rounded-xl z-0"
                      />
                    )}
                  </AnimatePresence>
                  <button
                    onClick={toggleRecording}
                    className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center transition-all border ${isRecording ? 'bg-red-500/30 border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] ring-2 ring-red-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
                    title={isRecording ? 'Stop Recording' : 'Start Voice Input'}
                  >
                    {isRecording ? <MicOff size={20} className="animate-pulse" /> : <Mic size={20} />}
                  </button>
                </div>
              </div>
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
