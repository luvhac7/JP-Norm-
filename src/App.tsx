/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Terminal, 
  Cpu, 
  Activity, 
  Languages, 
  Zap, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Trash2,
  Sparkles,
  BarChart3,
  MessageSquareText,
  History,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  Library as LibraryIcon,
  LogOut,
  LogIn,
  Save,
  User as UserIcon,
  PieChart as PieChartIcon,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { NLPResponse, processNLP, batchProcessNLP } from './services/nlpService';
import { generateAdvancedNoise } from './lib/advancedNoiseGenerator';
import { cn } from './lib/utils';
import { 
  ResponsiveContainer, 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout, 
  LibraryItem, 
  handleFirestoreError, 
  OperationType 
} from './lib/firebase';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  orderBy 
} from 'firebase/firestore';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<NLPResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<NLPResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'about' | 'normalize' | 'batch' | 'url' | 'history' | 'library'>('about');
  const [urlInput, setUrlInput] = useState('');
  
  // Auth & Library State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [library, setLibrary] = useState<LibraryItem[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setLibrary([]);
      return;
    }

    const q = query(
      collection(db, 'library'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LibraryItem[];
      setLibrary(items);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'library');
    });

    return () => unsubscribe();
  }, [user]);

  const EXAMPLES = {
    casual: ["すっごーい！", "今日わマジ暑い〜", "行こーぜ"],
    social: [
      {
        label: "FE Heroes JP",
        text: "【再掲】\nゲーム内のイラストやキャラクター設定への要望、不満、指示などを、SNSを通して直接イラストレーター様に伝えられる例が散見されています。\nゲームに対するご意見・ご要望は、ゲーム内の「ご意見」へお寄せいただくようお願い致します。\n#FEヒーローズ",
        url: "https://x.com/FE_Heroes_JP/status/1639190317055479811"
      },
      {
        label: "Reddit: Mobile Login",
        text: "モバイルログイン\n認証情報を入力した後、アプリにログインできないのはなぜでしょうか。「ページが存在しません」という画面が表示され、ログイン画面に戻るしか選択肢がありません。アプリの再インストールなど、既に全て試しました。デスクトップ版とウェブ版では動作しますが、アプリでは動作しません。",
        url: "https://www.reddit.com/r/Twitter/comments/1qjo5i8/mobile_login/?tl=ja"
      }
    ]
  };

  const posData = useMemo(() => {
    if (!result) return [];
    const analysis = result.explanation.posAnalysis;
    const posMap: Record<string, { name: string; keep: number; change: number; remove: number; tokens: string[] }> = {};
    
    analysis.forEach(item => {
      if (!posMap[item.pos]) {
        posMap[item.pos] = { name: item.pos, keep: 0, change: 0, remove: 0, tokens: [] };
      }
      
      const action = item.action.toLowerCase();
      if (action.includes('keep')) posMap[item.pos].keep++;
      else if (action.includes('remove') || action.includes('delete')) posMap[item.pos].remove++;
      else posMap[item.pos].change++;
      
      if (posMap[item.pos].tokens.length < 5) {
        posMap[item.pos].tokens.push(item.token);
      }
    });
    
    return Object.values(posMap).sort((a, b) => (b.keep + b.change + b.remove) - (a.keep + a.change + a.remove));
  }, [result]);

  const radarData = useMemo(() => {
    if (!result) return [];
    return [
      { subject: 'BLEU', A: result.metrics.bleu * 100, fullMark: 100 },
      { subject: 'ROUGE', A: result.metrics.rouge * 100, fullMark: 100 },
      { subject: 'Confidence', A: result.metrics.confidence * 100, fullMark: 100 },
      { subject: 'Stability', A: Math.max(0, 100 - result.metrics.editDistance * 5), fullMark: 100 },
      { subject: 'Formalism', A: 90, fullMark: 100 }, // Heuristic for now
    ];
  }, [result]);

  const historyTrendData = useMemo(() => {
    // Combine local session history and persistent library data for the graph
    const sessionData = history.map(item => ({
      length: item.normalized.length,
      bleu: item.metrics.bleu * 100,
      rouge: item.metrics.rouge * 100,
      source: 'session'
    }));

    const libraryData = library
      .filter(item => item.metrics && item.normalizedText)
      .map(item => ({
        length: item.normalizedText!.length,
        bleu: item.metrics!.bleu * 100,
        rouge: item.metrics!.rouge * 100,
        source: 'library'
      }));

    // Merge and sort by length
    return [...sessionData, ...libraryData]
      .sort((a, b) => a.length - b.length);
  }, [history, library]);

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await processNLP(inputText);
      setResult(data);
      setHistory(prev => [data, ...prev].slice(0, 20));
    } catch (err: any) {
      setError(err.message || 'NLP Pipeline Failure. Check API configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchProcess = async () => {
    const lines = inputText.split('\n').filter(l => l.trim());
    if (lines.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const results = await batchProcessNLP(lines);
      setHistory(prev => [...results, ...prev].slice(0, 20));
      setActiveTab('history');
    } catch (err: any) {
      setError(err.message || 'Batch Processing Failure.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNoise = () => {
    const noisy = generateAdvancedNoise(inputText || "今日は本当に天気がいいですね。");
    setInputText(noisy);
  };

  const handleUrlProcess = async () => {
    if (!urlInput.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      // 1. Extract text from URL via backend
      const extractResponse = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput })
      });
      
      if (!extractResponse.ok) {
        const errData = await extractResponse.json();
        throw new Error(errData.error || 'Failed to extract text from URL');
      }
      
      const { extracted_text } = await extractResponse.json();
      
      if (!extracted_text || extracted_text.length < 2) {
        throw new Error('Could not extract meaningful text from URL');
      }

      // 2. Normalize extracted text via frontend Gemini call
      const data = await processNLP(extracted_text);
      setResult(data);
      setHistory(prev => [data, ...prev].slice(0, 20));
      setActiveTab('normalize');
    } catch (err: any) {
      setError(err.message || 'URL Processing Failure.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToLibrary = async (label: string = "Saved Result") => {
    if (!user || !result) {
      setError("You must be logged in to save to library.");
      return;
    }
    
    setIsLoading(true);
    try {
      await addDoc(collection(db, 'library'), {
        uid: user.uid,
        label,
        originalText: inputText,
        normalizedText: result.normalized,
        inputTranslation: result.inputTranslation,
        outputTranslation: result.outputTranslation,
        url: urlInput || "",
        createdAt: serverTimestamp(),
        metrics: result.metrics
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'library');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFromLibrary = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'library', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `library/${id}`);
    }
  };

  const MetricCard = ({ label, value, sub }: { label: string, value: string | number, sub?: string }) => (
    <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
      <p className="text-[10px] font-mono uppercase text-gray-400 tracking-wider mb-1">{label}</p>
      <p className="text-xl font-mono font-bold text-gray-800">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );

  const PipelineStep = ({ stage, title, items, isLast = false }: { stage?: string, title: string, items: string[], isLast?: boolean }) => (
    <div className="relative flex flex-col items-center w-full max-w-2xl mx-auto">
      <div className="w-full bg-white border-2 border-black p-5 rounded-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_0px_rgba(37,99,235,1)] transition-all duration-200">
        <div className="flex items-center gap-3 mb-3 border-b border-gray-100 pb-2">
          {stage && (
            <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
              {stage}
            </span>
          )}
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">{title}</h3>
        </div>
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-gray-600 font-medium">
              <span className="text-blue-500 mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      {!isLast && (
        <div className="h-10 w-0.5 bg-black my-1 relative">
          <div className="absolute -bottom-1 -left-[3px] w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-black"></div>
        </div>
      )}
    </div>
  );

  const AboutView = () => (
    <div className="space-y-12 py-8">
      <div className="max-w-4xl mx-auto text-center space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-blue-100">
          <Cpu className="w-3 h-3" />
          Technical Specification
        </div>
        <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter sm:text-5xl">
          JP-Norm++ <span className="text-blue-600">Pipeline</span>
        </h2>
        <p className="text-gray-500 font-medium max-w-2xl mx-auto text-sm leading-relaxed">
          A high-precision hybrid NLP architecture for Japanese text normalization. 
          Combining rule-based heuristics with transformer-based sequence-to-sequence modeling.
        </p>
      </div>

      <div className="space-y-0 flex flex-col items-center">
        <PipelineStep 
          title="Input Layer" 
          items={["Japanese Text Stream", "URL Extraction", "Batch CSV/JSON Upload"]} 
        />
        <PipelineStep 
          stage="Stage 1"
          title="Noise Detection" 
          items={["Rule-based classifier (casual vs. formal)", "Confidence threshold routing", "Skip normalization if already formal"]} 
        />
        <PipelineStep 
          stage="Stage 2"
          title="Input Preprocessing" 
          items={["Full-width ↔ half-width conversion", "Special character sanitization", "Unicode normalization (NFC)"]} 
        />
        <PipelineStep 
          stage="Stage 3"
          title="Morphological Analysis" 
          items={["Tokenization (MeCab/fugashi integration)", "POS tagging (IPA dictionary)", "Dependency parsing", "Feature extraction (verb type, formality markers)"]} 
        />
        <PipelineStep 
          stage="Stage 4"
          title="Transformer Normalization" 
          items={["Gemini 3 Flash seq2seq conversion", "Prompt engineering with POS context", "Temperature-controlled generation (0.3 for formal)", "mT5-inspired fine-tuning architecture"]} 
        />
        <PipelineStep 
          stage="Stage 5"
          title="Explainable AI (XAI)" 
          items={["Token alignment (input vs. output)", "POS-based reasoning generation", "Action classification (Keep/Change/Remove)", "Linguistic justification strings"]} 
        />
        <PipelineStep 
          stage="Stage 6"
          title="Multi-Metric Evaluation" 
          items={["BLEU-4 calculation (character-level)", "ROUGE-L (longest common subsequence)", "Levenshtein edit distance", "Quality radar visualization"]} 
          isLast
        />
      </div>

      <div className="max-w-2xl mx-auto mt-16 p-6 bg-gray-50 border border-gray-200 rounded-2xl border-dashed">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 text-center">System Requirements</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Core Engine</p>
            <p className="text-xs font-bold text-gray-700">BERT / Hybrid Transformer</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Latency Target</p>
            <p className="text-xs font-bold text-gray-700">&lt; 200ms (P95)</p>
          </div>
        </div>
      </div>
    </div>
  );

  const NormalizeView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Input & Controls */}
      <div className="lg:col-span-7 space-y-6">
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-gray-400" />
              <span className="text-[11px] font-mono uppercase font-bold text-gray-400 tracking-widest">Input Stream</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleNoise}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                title="Inject Noise"
              >
                <Zap className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setInputText('')}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter noisy Japanese text for normalization pipeline..."
              className="w-full h-64 p-4 text-lg font-medium bg-transparent border-none focus:ring-0 resize-none placeholder:text-gray-300"
            />
            
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest">Quick Load:</span>
                <div className="flex gap-2">
                  {EXAMPLES.casual.map(ex => (
                    <button 
                      key={ex}
                      onClick={() => setInputText(ex)}
                      className="text-[10px] font-bold uppercase tracking-tighter bg-gray-100 text-gray-500 px-2 py-1 rounded hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest">Social:</span>
                <div className="flex gap-2">
                  {EXAMPLES.social.map(ex => (
                    <button 
                      key={ex.label}
                      onClick={() => {
                        setInputText(ex.text);
                        setUrlInput(ex.url);
                      }}
                      className="text-[10px] font-bold uppercase tracking-tighter bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleProcess}
                disabled={isLoading || !inputText.trim()}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                {isLoading ? "Processing..." : "Execute Pipeline"}
              </button>
            </div>
          </div>
        </section>

        {/* Translation Layer */}
        <AnimatePresence>
          {result && (
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-[10px] font-mono uppercase text-gray-400 mb-2">Input Translation (EN)</p>
                <p className="text-sm text-gray-600 italic leading-relaxed">"{result.inputTranslation}"</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-[10px] font-mono uppercase text-gray-400 mb-2">Output Translation (EN)</p>
                <p className="text-sm text-gray-600 italic leading-relaxed">"{result.outputTranslation}"</p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Style Transfer */}
        <AnimatePresence>
          {result?.styleTransfer && (
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Style Transfer Matrix</h3>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {Object.entries(result.styleTransfer as Record<string, { text: string; translation: string }>).map(([style, data]) => (
                  <div key={style} className="space-y-2">
                    <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{style}</span>
                    <p className="text-sm font-medium text-gray-800">{data.text}</p>
                    <p className="text-[11px] text-gray-400 italic leading-tight">{data.translation}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Visual Analytics (Moved to Left Column) */}
        <AnimatePresence>
          {result && (
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Visual Analytics</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-8">
                {history.length > 1 && (
                  <div className="h-48 w-full border-b border-gray-100 pb-8">
                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-4 text-center">Performance Trend (BLEU vs Length)</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="length" hide />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ fontSize: '10px', borderRadius: '8px' }}
                          labelFormatter={(value) => `Length: ${value}`}
                        />
                        <Line type="monotone" dataKey="bleu" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="rouge" stroke="#ec4899" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-8">
                  <div className="h-64 w-full">
                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-4 text-center">Quality Radar (Normalized %)</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name="Pipeline Metrics"
                          dataKey="A"
                          stroke="#2563eb"
                          fill="#3b82f6"
                          fillOpacity={0.2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-64 w-full">
                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-4 text-center">Linguistic Action Matrix (POS vs Action)</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={posData} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          tick={{ fontSize: 10, fontWeight: 600, fill: '#6b7280' }}
                          width={80}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f9fafb' }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-[11px]">
                                  <p className="font-bold text-gray-900 mb-2 uppercase tracking-wider border-b pb-1">{label}</p>
                                  <div className="space-y-1 mb-2">
                                    <p className="flex justify-between gap-4">
                                      <span className="text-green-600 font-bold">Keep:</span>
                                      <span className="font-mono">{data.keep}</span>
                                    </p>
                                    <p className="flex justify-between gap-4">
                                      <span className="text-blue-600 font-bold">Change:</span>
                                      <span className="font-mono">{data.change}</span>
                                    </p>
                                    <p className="flex justify-between gap-4">
                                      <span className="text-red-600 font-bold">Remove:</span>
                                      <span className="font-mono">{data.remove}</span>
                                    </p>
                                  </div>
                                  <div className="pt-2 border-t border-gray-50">
                                    <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Sample Tokens:</p>
                                    <p className="text-gray-600 font-medium">{data.tokens.join(', ')}</p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          align="right" 
                          iconType="circle"
                          wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', paddingBottom: '10px' }}
                        />
                        <Bar dataKey="keep" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} barSize={20} name="Keep" />
                        <Bar dataKey="change" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={20} name="Change" />
                        <Bar dataKey="remove" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} name="Remove" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Right Column: Results & Metrics */}
      <div className="lg:col-span-5 space-y-6">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Main Output */}
              <section className="bg-white rounded-xl border border-blue-200 shadow-lg shadow-blue-500/5 overflow-hidden">
                <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span className="text-[11px] font-mono uppercase font-bold text-blue-600 tracking-widest">Normalized Output</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {user && (
                      <button
                        onClick={() => {
                          const label = prompt("Enter a label for this library item:", "FE Heroes JP") || "Saved Result";
                          handleSaveToLibrary(label);
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-white border border-blue-200 px-2 py-1 rounded hover:bg-blue-600 hover:text-white transition-all"
                      >
                        <Save className="w-3 h-3" /> Save to Library
                      </button>
                    )}
                    <span className="text-[10px] font-mono font-bold text-blue-400">Pipeline Success</span>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-2xl font-bold text-gray-900 leading-tight">
                    {result.normalized}
                  </p>
                  <p className="mt-2 text-sm text-gray-500 italic border-t border-gray-50 pt-2">
                    {result.outputTranslation}
                  </p>
                </div>
              </section>

              {/* Metrics Grid */}
              <section className="grid grid-cols-2 gap-3">
                <MetricCard label="BLEU Score" value={result.metrics.bleu.toFixed(3)} sub="Precision vs Reference" />
                <MetricCard label="ROUGE-L" value={result.metrics.rouge.toFixed(3)} sub="Recall Consistency" />
                <MetricCard label="Edit Dist" value={result.metrics.editDistance} sub="Levenshtein Steps" />
                <MetricCard label="Confidence" value={`${(result.metrics.confidence * 100).toFixed(0)}%`} sub="Model Certainty" />
              </section>

              {/* Explainable AI Panel */}
              <section className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Explainable AI (XAI)</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 leading-relaxed italic">
                      "{result.explanation.reasoning}"
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {result.explanation.posAnalysis.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] border-b border-gray-50 pb-2 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{item.token}</span>
                          <span className="text-gray-400">({item.pos})</span>
                        </div>
                        <span className="text-blue-600 font-bold uppercase tracking-tighter">{item.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4 bg-white rounded-xl border border-gray-200 border-dashed">
              <div className="bg-gray-50 p-4 rounded-full">
                <BarChart3 className="w-8 h-8 text-gray-200" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Awaiting Execution</p>
                <p className="text-xs text-gray-300 mt-1">Metrics and XAI analysis will appear here.</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const BatchView = () => (
    <div className="space-y-6">
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-400" />
            <span className="text-[11px] font-mono uppercase font-bold text-gray-400 tracking-widest">Batch Processor</span>
          </div>
        </div>
        <div className="p-6">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter multiple sentences (one per line)..."
            className="w-full h-64 p-4 text-lg font-medium bg-transparent border-none focus:ring-0 resize-none placeholder:text-gray-300"
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleBatchProcess}
              disabled={isLoading || !inputText.trim()}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {isLoading ? "Processing Batch..." : "Run Batch Pipeline"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );

  const UrlView = () => (
    <div className="space-y-6">
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-gray-400" />
            <span className="text-[11px] font-mono uppercase font-bold text-gray-400 tracking-widest">Social Media Extractor</span>
          </div>
        </div>
        <div className="p-8 space-y-8">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Post URL (Twitter/X or Reddit)</label>
              <span className="text-[10px] font-mono text-blue-500 bg-blue-50 px-2 py-0.5 rounded">Auto-Detect Platform</span>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Info className="h-4 w-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://twitter.com/user/status/..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white border-transparent outline-none transition-all shadow-inner"
                />
              </div>
              <button
                onClick={handleUrlProcess}
                disabled={isLoading || !urlInput.trim()}
                className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Fetch & Normalize
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest">Try Example:</span>
              <div className="flex gap-2">
                {EXAMPLES.social.map(ex => (
                  <button 
                    key={ex.label}
                    onClick={() => setUrlInput(ex.url)}
                    className="text-[10px] font-bold uppercase tracking-tighter bg-gray-100 text-gray-500 px-2 py-1 rounded hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-4">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <Zap className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Twitter/X</p>
                <p className="text-xs text-gray-600">Extract tweets & threads</p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-4">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <MessageSquareText className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Reddit</p>
                <p className="text-xs text-gray-600">Titles & self-text posts</p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-4">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <ArrowRight className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Generic</p>
                <p className="text-xs text-gray-600">Web articles & blogs</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  const HistoryView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          Pipeline History & Analytics
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setHistory([])}
            className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-md transition-all"
          >
            Clear History
          </button>
        </div>
      </div>

      <section className="bg-white p-10 rounded-xl border-2 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between mb-10 border-b-2 border-black pb-6">
          <div>
            <h3 className="text-xl font-black text-black uppercase tracking-tighter">Performance vs. Complexity Matrix</h3>
            <p className="text-xs font-bold text-gray-500 mt-1">Correlation: BLEU Score (%) / Sentence Length (Chars)</p>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-blue-600" />
              <span className="text-[10px] font-black text-black uppercase">BLEU Score</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-pink-500" />
              <span className="text-[10px] font-black text-black uppercase">ROUGE-L Score</span>
            </div>
          </div>
        </div>
        
        <div className="h-96 w-full">
          {historyTrendData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center border-4 border-double border-gray-200 rounded-lg bg-gray-50">
              <BarChart3 className="w-12 h-12 text-gray-200 mb-4" />
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Awaiting Data Points</p>
              <p className="text-[10px] text-gray-300 mt-2">Normalize text or load from library to populate matrix</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyTrendData} margin={{ top: 20, right: 40, bottom: 40, left: 20 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#000" strokeOpacity={0.2} />
                <XAxis 
                  dataKey="length" 
                  stroke="#000"
                  strokeWidth={3}
                  label={{ value: 'Sentence Length (Characters)', position: 'bottom', offset: 20, fontSize: 14, fontWeight: 900, fill: '#000', fontFamily: 'monospace' }}
                  tick={{ fontSize: 12, fontWeight: 800, fill: '#000', fontFamily: 'monospace' }}
                  padding={{ left: 20, right: 20 }}
                />
                <YAxis 
                  stroke="#000"
                  strokeWidth={3}
                  label={{ value: 'Performance Score (%)', angle: -90, position: 'left', offset: 0, fontSize: 14, fontWeight: 900, fill: '#000', fontFamily: 'monospace' }}
                  tick={{ fontSize: 12, fontWeight: 800, fill: '#000', fontFamily: 'monospace' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '4px solid #000', borderRadius: '0px', boxShadow: '8px 8px 0px #000' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}
                  labelStyle={{ fontWeight: 900, borderBottom: '2px solid #000', marginBottom: '8px', paddingBottom: '4px' }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`]}
                  labelFormatter={(label) => `Length: ${label} chars`}
                />
                <Line 
                  type="monotone" 
                  dataKey="bleu" 
                  stroke="#2563eb" 
                  strokeWidth={5} 
                  dot={{ r: 4, fill: '#2563eb', stroke: '#000', strokeWidth: 2 }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                  name="BLEU Score"
                  animationDuration={1000}
                />
                <Line 
                  type="monotone" 
                  dataKey="rouge" 
                  stroke="#db2777" 
                  strokeWidth={5} 
                  dot={{ r: 4, fill: '#db2777', stroke: '#000', strokeWidth: 2 }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                  name="ROUGE-L Score"
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="grid gap-4">
        {history.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">No processing history found.</p>
          </div>
        ) : (
          history.map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-blue-200 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-gray-400">Normalized</span>
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">{item.normalized}</p>
                  <p className="text-xs text-gray-500 italic">{item.outputTranslation}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    BLEU: {item.metrics.bleu.toFixed(3)}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="text-[10px]">
                    <span className="text-gray-400 uppercase block mb-0.5">Edit Dist</span>
                    <span className="font-mono font-bold">{item.metrics.editDistance}</span>
                  </div>
                  <div className="text-[10px]">
                    <span className="text-gray-400 uppercase block mb-0.5">Confidence</span>
                    <span className="font-mono font-bold">{(item.metrics.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setResult(item);
                    setActiveTab('normalize');
                  }}
                  className="text-xs font-bold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all"
                >
                  View Details <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  const LibraryView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <LibraryIcon className="w-5 h-5 text-blue-600" />
          Personal Library
        </h2>
        {!user && (
          <button 
            onClick={loginWithGoogle}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs"
          >
            <LogIn className="w-4 h-4" /> Sign in to access Library
          </button>
        )}
      </div>
      
      {!user ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-400 font-medium">Please sign in to view your saved items.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {library.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
              <p className="text-gray-400 font-medium">Your library is empty. Save results from the Normalize tab!</p>
            </div>
          ) : (
            library.map((item) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-blue-200 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{item.label}</span>
                      {item.url && <span className="text-[9px] text-gray-400 truncate max-w-[200px]">{item.url}</span>}
                    </div>
                    <p className="text-lg font-bold text-gray-900">{item.normalizedText}</p>
                    <p className="text-xs text-gray-500 italic">{item.outputTranslation}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteFromLibrary(item.id!)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                  <p className="text-[10px] text-gray-400">Original: {item.originalText.substring(0, 100)}...</p>
                  <button 
                    onClick={() => {
                      setInputText(item.originalText);
                      setUrlInput(item.url || "");
                      setActiveTab('normalize');
                    }}
                    className="text-xs font-bold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    Load into Editor <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-blue-100">
      {/* Top Navigation Rail */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-md shadow-lg shadow-blue-500/20">
              <Cpu className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">JP-Norm++</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">System Online v2.0.4</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {(['about', 'normalize', 'batch', 'url', 'history', 'library'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all",
                  activeTab === tab ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-gray-900 leading-tight">{user.displayName}</p>
                  <p className="text-[9px] text-gray-400">{user.email}</p>
                </div>
                <img src={user.photoURL || ""} alt="User" className="w-8 h-8 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
                <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={loginWithGoogle}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
              >
                <LogIn className="w-4 h-4" /> Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6 py-8 pb-24">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-600 text-sm font-medium shadow-sm"
          >
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold uppercase text-[10px] tracking-widest mb-1">System Error</p>
              <p className="leading-relaxed">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)} 
              className="p-1 hover:bg-red-100 rounded-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </motion.div>
        )}
        {activeTab === 'about' && <AboutView />}
        {activeTab === 'normalize' && <NormalizeView />}
        {activeTab === 'batch' && <BatchView />}
        {activeTab === 'url' && <UrlView />}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'library' && <LibraryView />}
      </main>

      {/* Footer Status Bar */}
      <footer className="bg-white border-t border-gray-200 py-3 px-6 fixed bottom-0 w-full z-50">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Latency:</span>
              <span className="text-[10px] font-mono font-bold text-blue-600">124ms</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Model:</span>
              <span className="text-[10px] font-mono font-bold text-blue-600">BERT</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gray-400 uppercase">Status:</span>
            <span className="text-[10px] font-mono font-bold text-green-500">Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
