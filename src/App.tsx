import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

const MIN_INPUT_CHARS = 20;
const MAX_INPUT_CHARS = 5000;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL?.trim() || "gemini-2.5-flash";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim() || "";
const aiClient = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const SYSTEM_PROMPT = `You are the Mental Clarity Engine - a world-class cognitive organizer and life strategist. Your entire purpose is to take a raw, chaotic brain dump and transform it into crystalline clarity.

Analyze the user's brain dump and categorize their thoughts into 5 specific buckets: Do Today, Schedule It, Decide, Let Go, Capture.

Rules:
- Only include categories that have actual items (omit empty ones)
- Be SPECIFIC - never generic advice like "make a list"
- The insight must feel deeply personal, not templated
- clarity_score is 0-100 (100 = total clarity, 0 = total chaos)
- top_win should be ONE concrete action that creates momentum
- Items per category: 1-5 max, ruthlessly prioritized
- If someone shares worries/anxieties, honor them in "Let Go" with compassion
- time estimates: "5 min", "15 min", "1 hr", etc. (leave null if n/a)`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    insight: {
      type: Type.STRING,
      description:
        "A single powerful, empathetic sentence that truly sees the user's situation (not generic). Make it feel like you really understand them.",
    },
    categories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "One of: urgent, schedule, decide, release, ideas" },
          label: {
            type: Type.STRING,
            description: "Category label: Do Today, Schedule It, Decide, Let Go, or Capture",
          },
          emoji: { type: Type.STRING },
          color: { type: Type.STRING, description: "Hex color code for the category, e.g. #FF6B35, #4ECDC4" },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                task: { type: Type.STRING, description: "Specific actionable task or thought" },
                why: { type: Type.STRING, description: "Why this matters, what's at stake, or context" },
                time: { type: Type.STRING, description: "Time estimate, e.g., '5 min', '30 min', or null" },
              },
              required: ["task", "why"],
            },
          },
        },
        required: ["id", "label", "emoji", "color", "items"],
      },
    },
    clarity_score: { type: Type.INTEGER, description: "0-100 score. 100 = total clarity, 0 = total chaos" },
    clarity_label: { type: Type.STRING, description: "Short label for the score, e.g., 'Moderately Overwhelmed'" },
    top_win: {
      type: Type.STRING,
      description: "The single most important thing to do first and why it will unlock everything else",
    },
    breathe: {
      type: Type.STRING,
      description: "One short, grounding perspective shift - something true and calming about their situation",
    },
  },
  required: ["insight", "categories", "clarity_score", "clarity_label", "top_win", "breathe"],
};

const placeholders = [
  "Start typing... what's swirling in your head right now?",
  "Pour it all out - work stuff, personal stuff, random thoughts, worries...",
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const sanitizeResult = (value: unknown): ParsedResult => {
  if (!isRecord(value)) {
    throw new Error("The AI returned an invalid response.");
  }

  const categories = Array.isArray(value.categories)
    ? value.categories
        .map((category) => {
          if (!isRecord(category)) {
            return null;
          }

          const items = Array.isArray(category.items)
            ? category.items
                .map((item) => {
                  if (!isRecord(item)) {
                    return null;
                  }

                  const task = toText(item.task);
                  const why = toText(item.why);

                  if (!task || !why) {
                    return null;
                  }

                  const time = toText(item.time);

                  return {
                    task,
                    why,
                    time: time || null,
                  };
                })
                .filter((item): item is ResultItem => item !== null)
                .slice(0, 5)
            : [];

          const id = toText(category.id);
          const label = toText(category.label);
          const emoji = toText(category.emoji) || "•";
          const color = toText(category.color) || "#D1CDC4";

          if (!id || !label || items.length === 0) {
            return null;
          }

          return {
            id,
            label,
            emoji,
            color,
            items,
          };
        })
        .filter((category): category is Category => category !== null)
    : [];

  const insight = toText(value.insight);
  const clarityLabel = toText(value.clarity_label);
  const topWin = toText(value.top_win);
  const breathe = toText(value.breathe);
  const clarityScoreRaw = typeof value.clarity_score === "number" ? value.clarity_score : Number.NaN;
  const clarityScore = Number.isFinite(clarityScoreRaw)
    ? Math.max(0, Math.min(100, Math.round(clarityScoreRaw)))
    : Number.NaN;

  if (!insight || !clarityLabel || !topWin || !breathe || categories.length === 0 || Number.isNaN(clarityScore)) {
    throw new Error("The AI response was incomplete. Please try again.");
  }

  return {
    insight,
    categories,
    clarity_score: clarityScore,
    clarity_label: clarityLabel,
    top_win: topWin,
    breathe,
  };
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
    if (!result) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [result]);

  const canAnalyze = input.trim().length >= MIN_INPUT_CHARS && !loading && Boolean(aiClient);

  const analyze = async () => {
    const content = input.trim();

    if (!content) {
      setError("Add a quick brain dump so the engine has something to organize.");
      return;
    }

    if (content.length < MIN_INPUT_CHARS) {
      setError(`Write at least ${MIN_INPUT_CHARS} characters so the engine has enough context.`);
      return;
    }

    if (!aiClient) {
      setError("Missing Gemini API key. Set VITE_GEMINI_API_KEY in your environment before analyzing.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await aiClient.models.generateContent({
        model: GEMINI_MODEL,
        contents: content,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.7,
        },
      });

      if (!response.text) {
        throw new Error("No response came back from Gemini.");
      }

      const parsed = sanitizeResult(JSON.parse(response.text));
      setResult(parsed);
      setCheckedItems({});
    } catch (caughtError) {
      console.error(caughtError);
      const message =
        caughtError instanceof Error ? caughtError.message : "Something went wrong while organizing your brain dump.";
      setError(message);
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
    setError(null);
    setCheckedItems({});
    window.scrollTo({ top: 0, behavior: "smooth" });

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const totalItems = result?.categories.reduce((sum, category) => sum + category.items.length, 0) ?? 0;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#FAF9F6] text-[#2D2D2D] font-sans selection:bg-[#F0EEE9]">
      <div className="relative z-10 mx-auto max-w-[1024px] px-6 py-12 md:py-16">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 flex items-center justify-between md:mb-20"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#1A1A1A] bg-[#F0EEE9] pb-1 text-xl shadow-sm">
              🧠
            </div>
            <div>
              <h1 className="text-[12px] font-bold uppercase tracking-[2px] text-[#1A1A1A]">Mental Clarity Engine</h1>
            </div>
          </div>
          <div className="rounded-sm border border-[#E5E2DB] bg-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-[2px] text-[#8A867E] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
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
              className="mx-auto flex min-h-[50vh] max-w-[720px] flex-col justify-center"
            >
              <h2 className="mb-8 text-center font-serif text-4xl font-light italic leading-[1.2] tracking-tight text-[#1A1A1A] md:mb-12 md:text-5xl">
                What's on your mind?
              </h2>

              <div className="relative group">
                <div className="relative overflow-hidden rounded-sm border border-[#E5E2DB] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all duration-500 group-focus-within:border-black/20">
                  <label htmlFor="brain-dump" className="sr-only">
                    Brain dump input
                  </label>
                  <textarea
                    id="brain-dump"
                    ref={textareaRef}
                    placeholder={placeholder}
                    value={input}
                    maxLength={MAX_INPUT_CHARS}
                    onChange={(event) => {
                      setInput(event.target.value);
                      if (error) {
                        setError(null);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        void analyze();
                      }
                    }}
                    className="min-h-[320px] w-full resize-none bg-transparent p-8 font-serif text-[16px] italic leading-[1.8] text-[#5E5A54] placeholder:text-[#AAA] focus:outline-none focus:ring-0"
                    autoFocus
                    aria-describedby="brain-dump-help"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E5E2DB] bg-[#F0EEE9]/40 p-4 font-sans text-xs">
                    <div
                      id="brain-dump-help"
                      className="flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[1px] text-[#8A867E]"
                    >
                      <span>{input.length} / {MAX_INPUT_CHARS} chars</span>
                      <span className="hidden sm:inline-block">Ctrl/Cmd + Enter to analyze</span>
                    </div>

                    <button
                      onClick={() => void analyze()}
                      disabled={!canAnalyze}
                      className="group flex cursor-pointer items-center justify-center gap-2 rounded-sm border-none bg-[#1A1A1A] px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Organizing...</span>
                        </>
                      ) : (
                        <>
                          <span>Find Clarity</span>
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {!aiClient && (
                <div className="mx-auto mt-6 max-w-[620px] rounded-sm border border-[#E5E2DB] bg-white px-4 py-3 text-center text-sm text-[#5E5A54] shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                  Set <code className="rounded bg-[#F0EEE9] px-1 py-0.5 text-[13px] text-[#1A1A1A]">VITE_GEMINI_API_KEY</code> to
                  enable analysis in this environment.
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-auto mt-6 max-w-max rounded-sm border border-[#F0EEE9] bg-[#FDE68A] px-4 py-2 text-center font-sans text-sm text-[#1A1A1A]"
                  role="alert"
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
              <div className="mx-auto mb-8 max-w-[800px] rounded-sm border border-[#E5E2DB] border-l-4 border-l-[#D1CDC4] bg-white p-8 text-center shadow-[0_4px_12px_rgba(0,0,0,0.02)] md:p-12">
                <span className="mb-4 inline-block text-[10px] font-bold uppercase tracking-[2px] text-[#8A867E]">
                  Clarity Read
                </span>
                <p className="font-serif text-xl font-normal italic leading-relaxed text-[#1A1A1A] md:text-2xl">
                  "{result.insight}"
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                <div className="group flex flex-col items-center justify-center rounded-sm border border-[#E5E2DB] bg-white p-8 text-center shadow-[0_4px_12px_rgba(0,0,0,0.02)] md:col-span-4">
                  <span className="mb-4 text-[10px] font-bold uppercase tracking-[2px] text-[#8A867E]">Mental Load</span>
                  <div className="mb-2 font-serif text-6xl font-normal text-[#1A1A1A] md:text-7xl">
                    {result.clarity_score}
                  </div>
                  <div className="mb-6 flex items-center justify-center text-[11px] font-semibold uppercase tracking-[1px] text-[#8A867E]">
                    {result.clarity_label}
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-sm bg-[#F0EEE9]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.clarity_score}%` }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                      className="h-full bg-[#1A1A1A]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-6 md:col-span-8">
                  <div className="flex-1 rounded-sm border border-[#E5E2DB] bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                    <span className="mb-4 inline-block rounded-full bg-[#FDE68A] px-3 py-1 text-[10px] font-bold uppercase tracking-[2px] text-[#1A1A1A]">
                      Start Here
                    </span>
                    <p className="font-serif text-lg leading-relaxed text-[#1A1A1A] md:text-xl">{result.top_win}</p>
                  </div>

                  <div className="flex flex-col rounded-sm border border-[#E5E2DB] bg-[#F0EEE9] p-6 font-serif italic leading-[1.6] text-[#5E5A54]">
                    <p className="text-[15px]">"{result.breathe}"</p>
                  </div>
                </div>
              </div>

              <div className="mx-auto flex max-w-[400px] items-center gap-4 py-8">
                <div className="whitespace-nowrap text-[12px] font-medium text-[#8A867E]">
                  {checkedCount} / {totalItems} completed
                </div>
                <div className="h-px flex-1 bg-[#E5E2DB]" />
                {checkedCount === totalItems && totalItems > 0 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="rounded-2xl bg-[#FDE68A] px-2 py-1 text-[9px] font-bold uppercase tracking-[1px] text-[#1A1A1A]"
                  >
                    All clear!
                  </motion.div>
                )}
              </div>

              <div className="space-y-6">
                {result.categories.map((category, categoryIndex) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
                    className="rounded-sm border border-[#E5E2DB] bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.02)] md:p-8"
                  >
                    <div className="mb-6 flex items-center gap-3 border-b border-[#F0EEE9] pb-4">
                      <span className="text-[20px] leading-none">{category.emoji}</span>
                      <h3 className="font-serif text-xl italic text-[#1A1A1A] md:text-2xl">{category.label}</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {category.items.map((item, itemIndex) => {
                        const itemKey = `${category.id}-${itemIndex}`;
                        const isDone = checkedItems[itemKey];

                        return (
                          <button
                            key={itemKey}
                            type="button"
                            onClick={() => toggleCheck(category.id, itemIndex)}
                            className="group flex cursor-pointer items-start gap-3 text-left transition-opacity duration-300"
                            aria-pressed={isDone}
                          >
                            <div
                              className={`mt-[2px] flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                                isDone
                                  ? "border-[#1A1A1A] bg-[#1A1A1A]"
                                  : "border-[#D1CDC4] group-hover:border-[#1A1A1A]"
                              }`}
                              style={{ borderColor: isDone ? undefined : category.color }}
                            >
                              {isDone && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>

                            <div className={`flex flex-1 flex-col ${isDone ? "italic line-through text-[#AAA]" : "text-[#2D2D2D]"}`}>
                              <span className="text-[14px] leading-[1.5]">{item.task}</span>
                              <span className={`mt-1 text-[12px] leading-[1.6] ${isDone ? "text-[#AAA]" : "text-[#8A867E]"}`}>
                                {item.why}
                              </span>
                              {item.time && !isDone && (
                                <div className="mt-2 text-left">
                                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.5px] text-[#1A1A1A]" style={{ backgroundColor: category.color }}>
                                    {item.time}
                                  </span>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex justify-center pt-12 pb-8"
              >
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[1px] text-[#8A867E] transition-colors hover:text-[#1A1A1A]"
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
