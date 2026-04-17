import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";
import { Loader2, Plus, Sparkles, CheckCircle2, Circle, ArrowRight } from "lucide-react";

// Fallback in case of missing env var, though AI Studio injects it.
const aiUrl = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const SYSTEM_PROMPT = `You are the Mental Clarity Engine — a world-class cognitive organizer and life strategist. Your entire purpose is to take a raw, chaotic brain dump and transform it into crystalline clarity.

Analyze the user's brain dump and categorize their thoughts into 5 specific buckets: Do Today, Schedule It, Decide, Let Go, Capture.

Rules:
- Only include categories that have actual items (omit empty ones)
- Be SPECIFIC — never generic advice like "make a list"
- The insight must feel deeply personal, not templated
- clarity_score is 0–100 (100 = total clarity, 0 = total chaos)
- top_win should be ONE concrete action that creates momentum
- Items per category: 1–5 max, ruthlessly prioritized
- If someone shares worries/anxieties, honor them in "Let Go" with compassion
- time estimates: "5 min", "15 min", "1 hr", etc. (leave null if n/a)`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    insight: {
      type: Type.STRING,
      description: "A single powerful, empathetic sentence that truly sees the user's situation (not generic). Make it feel like you really understand them."
    },
    categories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "One of: urgent, schedule, decide, release, ideas" },
          label: { type: Type.STRING, description: "Category label: Do Today, Schedule It, Decide, Let Go, or Capture" },
          emoji: { type: Type.STRING },
          color: { type: Type.STRING, description: "Hex color code for the category, e.g. #FF6B35, #4ECDC4" },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                task: { type: Type.STRING, description: "Specific actionable task or thought" },
                why: { type: Type.STRING, description: "Why this matters, what's at stake, or context" },
                time: { type: Type.STRING, description: "Time estimate, e.g., '5 min', '30 min', or null" }
              },
              required: ["task", "why"]
            }
          }
        },
        required: ["id", "label", "emoji", "color", "items"]
      }
    },
    clarity_score: { type: Type.INTEGER, description: "0-100 score. 100 = total clarity, 0 = total chaos" },
    clarity_label: { type: Type.STRING, description: "Short label for the score, e.g., 'Moderately Overwhelmed'" },
    top_win: { type: Type.STRING, description: "The single most important thing to do first and why it will unlock everything else" },
    breathe: { type: Type.STRING, description: "One short, grounding perspective shift — something true and calming about their situation" }
  },
  required: ["insight", "categories", "clarity_score", "clarity_label", "top_win", "breathe"]
};

const placeholders = [
  "Start typing… what's swirling in your head right now?",
  "Pour it all out — work stuff, personal stuff, random thoughts, worries…",
  "Nothing is too small or too big. Just dump it all here.",
  "What's been living rent-free in your mind?",
];

type ResultItem = { task: string; why: string; time?: string | null };
type Category = { id: string; label: string; emoji: string; color: string; items: ResultItem[] };
type ParsedResult = {
  insight: string;
  categories: Category[];
  clarity_score: number;
  clarity_label: string;
  top_win: string;
  breathe: string;
};

export default function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeholder] = useState(() => placeholders[Math.floor(Math.random() * placeholders.length)]);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [result]);

  const analyze = async () => {
    if (!input.trim() || input.trim().length < 20 || !aiUrl) return;
    setLoading(true);
    setError(null);

    try {
      const response = await aiUrl.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: input,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.7,
        }
      });
      
      if (!response.text) throw new Error("No response from AI");
      
      const parsed = JSON.parse(response.text) as ParsedResult;
      setResult(parsed);
      setCheckedItems({});
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (catId: string, idx: number) => {
    const key = `${catId}-${idx}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReset = () => {
    setResult(null);
    setInput("");
    setCheckedItems({});
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const totalItems = result?.categories?.reduce((s, c) => s + c.items.length, 0) || 0;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  const scoreColor = (s: number) => {
    if (s >= 75) return "#4ECDC4"; // Teal
    if (s >= 50) return "#FFE66D"; // Yellow
    if (s >= 25) return "#FF9F43"; // Orange
    return "#FF6B35"; // Deep Orange
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D2D2D] font-sans selection:bg-[#F0EEE9] relative overflow-x-hidden">
      <div className="relative z-10 max-w-[1024px] mx-auto px-6 py-12 md:py-16">
        
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-16 md:mb-20"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border border-[#1A1A1A] flex items-center justify-center bg-[#F0EEE9] shadow-sm text-xl pb-1">
               🧠
            </div>
            <div>
              <h1 className="text-[12px] tracking-[2px] uppercase font-bold text-[#1A1A1A]">Mental Clarity Engine</h1>
            </div>
          </div>
          <div className="text-[9px] uppercase font-bold tracking-[2px] text-[#8A867E] border border-[#E5E2DB] px-3 py-1.5 rounded-sm bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            AI Powered
          </div>
        </motion.header>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div 
              key="input-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col min-h-[50vh] justify-center max-w-[720px] mx-auto"
            >
              <h2 className="font-serif text-4xl md:text-5xl font-light tracking-tight mb-8 md:mb-12 text-center text-[#1A1A1A] leading-[1.2] italic">
                What's on your mind?
              </h2>
              
              <div className="relative group">
                <div className="relative bg-white border border-[#E5E2DB] rounded-sm shadow-[0_4px_12px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-500 group-focus-within:border-black/20">
                  <textarea
                    ref={textareaRef}
                    placeholder={placeholder}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) analyze();
                    }}
                    className="w-full min-h-[320px] bg-transparent resize-none p-8 font-serif text-[16px] italic leading-[1.8] text-[#5E5A54] placeholder:text-[#AAA] focus:outline-none focus:ring-0"
                    autoFocus
                  />
                  
                  <div className="flex flex-wrap items-center justify-between p-4 bg-[#F0EEE9]/40 border-t border-[#E5E2DB] font-sans text-xs gap-4">
                    <div className="flex items-center gap-4 text-[#8A867E] uppercase tracking-[1px] text-[10px] font-semibold">
                      <span>{input.length} chars</span>
                      <span className="hidden sm:inline-block">— type ⌘+Enter</span>
                    </div>
                    
                    <button
                      onClick={analyze}
                      disabled={loading || input.trim().length < 20}
                      className="group flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white font-sans text-[11px] uppercase tracking-[1px] font-bold border-none disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black transition-colors cursor-pointer rounded-sm"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Organizing...</span>
                        </>
                      ) : (
                        <>
                          <span>Find Clarity</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 text-[#1A1A1A] text-sm font-sans text-center bg-[#FDE68A] max-w-max mx-auto px-4 py-2 rounded-sm border border-[#F0EEE9]"
                >
                  {error}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="results-view"
              ref={resultsRef}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-12"
            >
              {/* Insight Bar */}
              <div className="bg-white border border-[#E5E2DB] rounded-sm p-8 md:p-12 mb-8 text-center max-w-[800px] mx-auto shadow-[0_4px_12px_rgba(0,0,0,0.02)] border-l-4 border-l-[#D1CDC4]">
                <span className="inline-block text-[10px] tracking-[2px] font-bold text-[#8A867E] uppercase mb-4">
                  Clarity Read
                </span>
                <p className="font-serif text-xl md:text-2xl text-[#1A1A1A] italic font-normal leading-relaxed">
                  "{result.insight}"
                </p>
              </div>

              {/* Status Header */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Score */}
                <div className="md:col-span-4 bg-white border border-[#E5E2DB] shadow-[0_4px_12px_rgba(0,0,0,0.02)] rounded-sm p-8 flex flex-col justify-center items-center text-center group">
                  <span className="text-[10px] tracking-[2px] font-bold text-[#8A867E] uppercase mb-4">Mental Load</span>
                  <div 
                    className="font-serif text-6xl md:text-7xl font-normal mb-2 text-[#1A1A1A]"
                  >
                    {result.clarity_score}
                  </div>
                  <div className="text-[11px] items-center justify-center tracking-[1px] font-semibold text-[#8A867E] uppercase mb-6">{result.clarity_label}</div>
                  <div className="w-full h-1 bg-[#F0EEE9] rounded-sm overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.clarity_score}%` }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                      className="h-full bg-[#1A1A1A]"
                    />
                  </div>
                </div>

                {/* Top Win & Breathe */}
                <div className="md:col-span-8 flex flex-col gap-6">
                  <div className="flex-1 bg-white border border-[#E5E2DB] rounded-sm p-8 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                    <span className="text-[10px] tracking-[2px] font-bold text-[#1A1A1A] bg-[#FDE68A] py-1 px-3 rounded-full uppercase mb-4 inline-block">⚡ Start Here</span>
                    <p className="text-lg md:text-xl font-serif text-[#1A1A1A] leading-relaxed">
                      {result.top_win}
                    </p>
                  </div>
                  
                  {result.breathe && (
                     <div className="bg-[#F0EEE9] border border-[#E5E2DB] rounded-sm p-6 flex flex-col font-serif italic text-[#5E5A54] leading-[1.6]">
                       <p className="text-[15px]">
                         "{result.breathe}"
                       </p>
                     </div>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-4 py-8 max-w-[400px] mx-auto">
                 <div className="text-[12px] font-medium text-[#8A867E] whitespace-nowrap">
                   {checkedCount} / {totalItems} completed
                 </div>
                 <div className="flex-1 h-px bg-[#E5E2DB]" />
                 {checkedCount === totalItems && totalItems > 0 && (
                   <motion.div 
                     initial={{ scale: 0, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     className="text-[9px] uppercase bg-[#FDE68A] text-[#1A1A1A] px-2 py-1 rounded-2xl font-bold tracking-[1px]"
                   >
                     All clear!
                   </motion.div>
                 )}
              </div>

              {/* Data Grid / Categories */}
              <div className="space-y-6">
                {result.categories.map((cat, catIdx) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: catIdx * 0.1 }}
                    className="bg-white rounded-sm border border-[#E5E2DB] shadow-[0_4px_12px_rgba(0,0,0,0.02)] p-6 md:p-8"
                  >
                     <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#F0EEE9]">
                       <span className="text-[20px] leading-none">{cat.emoji}</span>
                       <h3 className="font-serif italic text-xl md:text-2xl text-[#1A1A1A]">
                         {cat.label}
                       </h3>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {cat.items.map((item, itemIdx) => {
                         const key = `${cat.id}-${itemIdx}`;
                         const isDone = checkedItems[key];
                         return (
                           <motion.div
                             key={itemIdx}
                             onClick={() => toggleCheck(cat.id, itemIdx)}
                             className={`cursor-pointer group flex items-start gap-3 transition-opacity duration-300`}
                           >
                             <div className={`w-4 h-4 rounded-[3px] border mt-[2px] flex-shrink-0 flex items-center justify-center transition-colors ${isDone ? 'bg-[#1A1A1A] border-[#1A1A1A]' : 'border-[#D1CDC4] group-hover:border-[#1A1A1A]'}`}>
                                {isDone && <CheckCircle2 className="w-3 h-3 text-white" />}
                             </div>
                             
                             <div className={`flex-1 flex flex-col ${isDone ? 'text-[#AAA] line-through italic' : 'text-[#2D2D2D]'}`}>
                               <span className="text-[14px] leading-[1.5]">{item.task}</span>
                               <span className={`text-[12px] leading-[1.6] mt-1 ${isDone ? 'text-[#AAA]' : 'text-[#8A867E]'}`}>{item.why}</span>
                               {item.time && !isDone && (
                                 <div className="mt-2 text-left">
                                   <span className="text-[9px] bg-[#FDE68A] text-[#1A1A1A] px-2 py-0.5 rounded-full uppercase font-bold tracking-[0.5px]">
                                     {item.time}
                                   </span>
                                 </div>
                               )}
                             </div>
                           </motion.div>
                         );
                       })}
                     </div>
                  </motion.div>
                ))}
              </div>

              {/* Reset Footer */}
              <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 1 }}
                 className="pt-12 pb-8 flex justify-center"
              >
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 text-[12px] font-medium text-[#8A867E] hover:text-[#1A1A1A] transition-colors uppercase tracking-[1px]"
                >
                  New Brain Dump
                </button>
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
