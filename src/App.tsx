import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass, Briefcase, Target, Users, MessageSquare, Eye, Layers,
  Activity, ArrowRight, ArrowLeft, Plus, Trash, Download, Loader2,
  Sparkles, PlusCircle, Lightbulb, CheckCircle, AlertCircle, Info,
  FileText, HelpCircle, EyeOff, Sun, Moon, Upload, Globe, TrendingUp,
  ExternalLink, LogOut, Send, Cloud, CloudOff, RefreshCw, Circle,
  ShieldCheck
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { BrandData, BrandGuide, CustomerPersona, Competitor, ReferenceBrand, MarketResearch, IdeaEvaluation, EvaluationItem } from './types';
import { initCloud, signInWithGoogle, signOutUser, loadWorkspace, saveWorkspace } from './lib/cloudSync';
import { INITIAL_BRAND_DATA, STYLE_OPTIONS, LOGO_TYPES, PRINT_MATERIALS, DIGITAL_ASSETS, MERCH_ASSETS, FAITH_ASSETS, SAMPLE_BRAND_SUGGESTIONS } from './data';
import InteractiveShowcase from './components/InteractiveShowcase';

export default function App() {
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const [brandData, setBrandData] = useState<BrandData>(INITIAL_BRAND_DATA);
  
  // Rough business idea and stress testing
  const [roughIdea, setRoughIdea] = useState<string>(() => {
    return localStorage.getItem('brand_strategy_rough_idea') || '';
  });
  const [isStressTesting, setIsStressTesting] = useState<boolean>(false);
  const [stressTestError, setStressTestError] = useState<string | null>(null);
  const [stressTestResult, setStressTestResult] = useState<any>(() => {
    const saved = localStorage.getItem('brand_strategy_stress_test_result');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showAppliedSuccess, setShowAppliedSuccess] = useState<boolean>(false);

  // Live online market research
  const [marketResearch, setMarketResearch] = useState<MarketResearch | null>(() => {
    const saved = localStorage.getItem('brand_strategy_market_research');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isResearching, setIsResearching] = useState<boolean>(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchApplied, setResearchApplied] = useState<boolean>(false);

  // Living evaluation — persistent, addressable, re-evaluated in rounds
  const [evaluation, setEvaluation] = useState<IdeaEvaluation | null>(() => {
    const saved = localStorage.getItem('brand_strategy_evaluation');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isReevaluating, setIsReevaluating] = useState<boolean>(false);
  const [reevalError, setReevalError] = useState<string | null>(null);

  // Cloud account & sync
  const [cloudAvailable, setCloudAvailable] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [cloudReady, setCloudReady] = useState<boolean>(false);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'loading' | 'syncing' | 'synced' | 'error'>('idle');
  const [authError, setAuthError] = useState<string | null>(null);
  const cloudSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState<boolean>(false);
  const [pdfProcessError, setPdfProcessError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [brandGuide, setBrandGuide] = useState<BrandGuide | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState<Record<string, boolean>>({});
  const [pdfDownloading, setPdfDownloading] = useState<boolean>(false);
  
  // Dark mode & Autosave status
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('brand_strategy_theme');
    return savedTheme === 'dark';
  });
  const [saveStatus, setSaveStatus] = useState<'Saving...' | 'Changes saved' | 'Sync error'>('Changes saved');

  // Sync theme with system and DOM
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('brand_strategy_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('brand_strategy_theme', 'light');
    }
  }, [darkMode]);

  // Smooth scroll to top when workbook section changes
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  // Local state for adding arrays
  const [newCompetitor, setNewCompetitor] = useState<Competitor>({ name: '', url: '', strengths: '', weaknesses: '' });
  const [newPersona, setNewPersona] = useState<Partial<CustomerPersona>>({
    name: '', age: '25', gender: 'Female', location: 'Dar es Salaam', occupation: '', income: '', 
    familyStatus: 'Single', faithInvolvement: '', dailyRoutine: '', painPoints: '', needs: '', 
    buyingBehavior: 'online', mediaHabits: '', influences: '', objections: '', beforeState: '', afterState: ''
  });
  const [newRefBrand, setNewRefBrand] = useState<ReferenceBrand>({ name: '', url: '', why: '' });
  const [colorLikeInput, setColorLikeInput] = useState<string>('');
  const [colorDislikeInput, setColorDislikeInput] = useState<string>('');

  // Auto-save to localStorage to preserve inputs
  useEffect(() => {
    const saved = localStorage.getItem('brand_strategy_builder_data');
    if (saved) {
      try {
        setBrandData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
  }, []);

  const saveToLocalStorage = (data: BrandData) => {
    setSaveStatus('Saving...');
    try {
      localStorage.setItem('brand_strategy_builder_data', JSON.stringify(data));
      setTimeout(() => {
        setSaveStatus('Changes saved');
      }, 600);
    } catch (e) {
      console.error("Failed to save state", e);
      setSaveStatus('Sync error');
    }
  };

  // Initialize cloud sync (degrades to local-only when Firebase isn't configured)
  useEffect(() => {
    initCloud((u) => {
      setUser(u);
      setCloudReady(false);
      setCloudStatus(u ? 'loading' : 'idle');
    }).then(setCloudAvailable);
  }, []);

  // On sign-in: pull the saved workspace from the user's account.
  // Remote data wins if it exists; otherwise the local draft is pushed up.
  useEffect(() => {
    if (!user || cloudReady) return;
    let cancelled = false;
    loadWorkspace(user.uid)
      .then((remote) => {
        if (cancelled) return;
        if (remote) {
          if (remote.brandData) {
            setBrandData(remote.brandData);
            localStorage.setItem('brand_strategy_builder_data', JSON.stringify(remote.brandData));
          }
          if (typeof remote.roughIdea === 'string') {
            setRoughIdea(remote.roughIdea);
            localStorage.setItem('brand_strategy_rough_idea', remote.roughIdea);
          }
          if (remote.stressTestResult) {
            setStressTestResult(remote.stressTestResult);
            localStorage.setItem('brand_strategy_stress_test_result', JSON.stringify(remote.stressTestResult));
          }
          if (remote.marketResearch) {
            setMarketResearch(remote.marketResearch);
            localStorage.setItem('brand_strategy_market_research', JSON.stringify(remote.marketResearch));
          }
          if (remote.evaluation) {
            setEvaluation(remote.evaluation);
            localStorage.setItem('brand_strategy_evaluation', JSON.stringify(remote.evaluation));
          }
          if (remote.brandGuide) {
            setBrandGuide(remote.brandGuide);
          }
        }
        setCloudReady(true);
        setCloudStatus('synced');
      })
      .catch((e) => {
        console.error("Failed to load cloud workspace", e);
        if (!cancelled) {
          setCloudReady(true);
          setCloudStatus('error');
        }
      });
    return () => { cancelled = true; };
  }, [user, cloudReady]);

  // Debounced autosave of everything gathered to the user's account
  useEffect(() => {
    if (!user || !cloudReady) return;
    setCloudStatus('syncing');
    if (cloudSaveTimer.current) clearTimeout(cloudSaveTimer.current);
    cloudSaveTimer.current = setTimeout(() => {
      saveWorkspace(user.uid, {
        brandData,
        roughIdea,
        stressTestResult,
        marketResearch,
        evaluation,
        brandGuide
      })
        .then(() => setCloudStatus('synced'))
        .catch((e) => {
          console.error("Cloud save failed", e);
          setCloudStatus('error');
        });
    }, 1500);
    return () => {
      if (cloudSaveTimer.current) clearTimeout(cloudSaveTimer.current);
    };
  }, [user, cloudReady, brandData, roughIdea, stressTestResult, marketResearch, evaluation, brandGuide]);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      console.error("Sign-in failed", e);
      setAuthError(e.message || "Sign-in failed. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (e) {
      console.error("Sign-out failed", e);
    }
  };


  // Trigger Gemini stress-test review for a specific section
  const analyzeSection = async (sectionId: string) => {
    setAnalysisLoading(prev => ({ ...prev, [sectionId]: true }));
    try {
      const response = await fetch('/api/analyze-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId,
          currentData: brandData[sectionId as keyof BrandData],
          fullDataSoFar: brandData
        })
      });
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 100)}`);
      }
      const data = await response.json();
      
      const updatedData = {
        ...brandData,
        analysis: {
          ...brandData.analysis,
          [sectionId]: data
        }
      };
      setBrandData(updatedData);
      saveToLocalStorage(updatedData);
    } catch (e) {
      console.error("Failed to analyze section", e);
    } finally {
      setAnalysisLoading(prev => ({ ...prev, [sectionId]: false }));
    }
  };

  // Generate full Brand Guide
  const generateBrandGuide = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-brand-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandData, marketResearch })
      });
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 100)}`);
      }
      const data = await response.json();
      if (data.brandGuide) {
        setBrandGuide(data.brandGuide);
      } else {
        setBrandGuide(data);
      }
    } catch (e) {
      console.error("Failed to generate brand guide", e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger multi-page PDF generation and download
  const downloadPdf = async () => {
    if (!brandGuide) return;
    setPdfDownloading(true);
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandGuide,
          businessName: brandData.business?.name || "Your Brand"
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(brandData.business?.name || 'Brand_Strategy').replace(/\s+/g, '_')}_Strategy_Guide.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const contentType = response.headers.get('content-type');
        let errorMsg = `Server returned status ${response.status}`;
        if (contentType && contentType.includes('application/json')) {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } else {
          const text = await response.text();
          errorMsg = text.slice(0, 100) || errorMsg;
        }
        throw new Error(errorMsg);
      }
    } catch (e: any) {
      console.error("PDF download failed", e);
    } finally {
      setPdfDownloading(false);
    }
  };

  // Process uploaded or dropped text and PDF files
  const processFile = async (file: File) => {
    if (!file) return;
    setPdfProcessError(null);
    
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      setIsProcessingPdf(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = event.target?.result;
          if (typeof base64 !== 'string') {
            throw new Error("Could not read PDF file content");
          }
          
          const response = await fetch('/api/parse-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64: base64,
              fileName: file.name
            })
          });
          
          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `Server returned status ${response.status}`);
          }
          
          const data = await response.json();
          if (data.text) {
            setRoughIdea(prev => {
              const cleanedText = data.text;
              const newIdea = prev.trim() ? `${prev}\n\n[Extracted from ${file.name}]:\n${cleanedText}` : cleanedText;
              localStorage.setItem('brand_strategy_rough_idea', newIdea);
              return newIdea;
            });
          } else {
            throw new Error("No text content could be extracted from this PDF.");
          }
        } catch (err: any) {
          console.error("PDF Parsing Error:", err);
          setPdfProcessError(err.message || "Failed to process PDF file.");
        } finally {
          setIsProcessingPdf(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      // Standard text file (TXT, MD, JSON)
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          setRoughIdea(prev => {
            const newIdea = prev.trim() ? `${prev}\n\n[Extracted from ${file.name}]:\n${text}` : text;
            localStorage.setItem('brand_strategy_rough_idea', newIdea);
            return newIdea;
          });
        }
      };
      reader.readAsText(file);
    }
  };

  // File Upload handler for rough business idea
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Drag and drop handlers for rough business idea
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRoughIdeaChange = (value: string) => {
    setRoughIdea(value);
    localStorage.setItem('brand_strategy_rough_idea', value);
  };

  const persistEvaluation = (ev: IdeaEvaluation | null) => {
    setEvaluation(ev);
    if (ev) {
      localStorage.setItem('brand_strategy_evaluation', JSON.stringify(ev));
    } else {
      localStorage.removeItem('brand_strategy_evaluation');
    }
  };

  // Turn the raw stress-test output into a living, addressable evaluation
  const buildEvaluationFromStressTest = (data: any): IdeaEvaluation => {
    const score = data.stressTest?.viabilityScore ?? 70;
    const items: EvaluationItem[] = [];
    (data.stressTest?.criticalFrictionPoints || []).forEach((text: string, i: number) => {
      items.push({ id: `friction-${i}`, category: 'friction', text, response: '', status: 'open' });
    });
    (data.stressTest?.strategicChallenges || []).forEach((text: string, i: number) => {
      items.push({ id: `challenge-${i}`, category: 'challenge', text, response: '', status: 'open' });
    });
    return {
      round: 1,
      score,
      scoreHistory: [score],
      verdict: score >= 80 ? 'Highly Viable / Well Targeted' : 'Viable with Friction / Gaps',
      items,
      isMock: !!data.isMock
    };
  };

  // Share the idea → run stress-test AND live market research concurrently
  const analyzeIdea = async () => {
    if (!roughIdea.trim()) return;

    // Kick off market research in the background (does not block the stress-test).
    runMarketResearch();

    setIsStressTesting(true);
    setStressTestError(null);
    try {
      const res = await fetch('/api/stress-test-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roughIdea })
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        let errorMsg = "Failed to communicate with AI stress-test server";
        if (contentType && contentType.includes('application/json')) {
          const errData = await res.json();
          errorMsg = errData.error || errorMsg;
        } else {
          const text = await res.text();
          errorMsg = text.slice(0, 100) || errorMsg;
        }
        throw new Error(errorMsg);
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 100)}`);
      }
      const data = await res.json();
      setStressTestResult(data);
      localStorage.setItem('brand_strategy_stress_test_result', JSON.stringify(data));
      persistEvaluation(buildEvaluationFromStressTest(data));
    } catch (err: any) {
      console.error(err);
      setStressTestError(err.message || "An unexpected error occurred during stress testing.");
    } finally {
      setIsStressTesting(false);
    }
  };

  // Record the founder's response to an evaluation item (marks it "addressed")
  const updateEvaluationItem = (id: string, response: string) => {
    setEvaluation(prev => {
      if (!prev) return prev;
      const items = prev.items.map(it =>
        it.id === id
          ? { ...it, response, status: (response.trim() ? 'addressed' : 'open') as EvaluationItem['status'] }
          : it
      );
      const next = { ...prev, items };
      localStorage.setItem('brand_strategy_evaluation', JSON.stringify(next));
      return next;
    });
  };

  // Re-evaluate the idea given the founder's responses; update scores + statuses
  const reevaluateIdea = async () => {
    if (!evaluation) return;
    setIsReevaluating(true);
    setReevalError(null);
    try {
      const res = await fetch('/api/reevaluate-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roughIdea,
          marketResearchSummary: marketResearch?.summary || '',
          previousScore: evaluation.score,
          items: evaluation.items.map(it => ({ id: it.id, category: it.category, text: it.text, response: it.response }))
        })
      });
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 100)}`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server returned status ${res.status}`);

      const statusById: Record<string, { status: EvaluationItem['status']; assessment: string }> = {};
      (data.items || []).forEach((r: any) => { statusById[r.id] = { status: r.status, assessment: r.assessment }; });

      const round = evaluation.round + 1;
      const mergedItems: EvaluationItem[] = evaluation.items.map(it => ({
        ...it,
        status: statusById[it.id]?.status || it.status,
        assessment: statusById[it.id]?.assessment ?? it.assessment
      }));
      (data.newItems || []).forEach((n: any, i: number) => {
        mergedItems.push({ id: `r${round}-new-${i}`, category: n.category, text: n.text, response: '', status: 'open' });
      });

      persistEvaluation({
        round,
        score: data.score ?? evaluation.score,
        scoreHistory: [...evaluation.scoreHistory, data.score ?? evaluation.score],
        verdict: data.verdict || evaluation.verdict,
        summary: data.summary,
        items: mergedItems,
        isMock: !!data.isMock
      });
    } catch (err: any) {
      console.error("Re-evaluation failed", err);
      setReevalError(err.message || "An unexpected error occurred during re-evaluation.");
    } finally {
      setIsReevaluating(false);
    }
  };

  // Apply extracted values from stress test to workbook and auto-advance
  const applyExtractedData = () => {
    if (!stressTestResult || !stressTestResult.extractedData) return;
    const { extractedData } = stressTestResult;
    
    const updated: BrandData = {
      ...brandData,
      business: {
        ...brandData.business,
        name: extractedData.businessName || brandData.business.name,
        industry: extractedData.industry || brandData.business.industry,
        location: extractedData.location || brandData.business.location,
        products: extractedData.products || brandData.business.products,
        vision: extractedData.vision || brandData.business.vision,
        mission: extractedData.mission || brandData.business.mission,
        values: extractedData.values || brandData.business.values,
      },
      market: {
        ...brandData.market,
        targetSegments: extractedData.targetSegments || brandData.market.targetSegments,
        uvp: extractedData.uvp || brandData.market.uvp,
        pricingStrategy: (extractedData.pricingStrategy && ['budget', 'mid-range', 'premium', 'mixed'].includes(extractedData.pricingStrategy))
          ? extractedData.pricingStrategy as any
          : brandData.market.pricingStrategy,
        pricingDescription: extractedData.pricingDescription || brandData.market.pricingDescription,
      },
      personality: {
        ...brandData.personality,
        traits: extractedData.traits || brandData.personality.traits,
      },
      visualIdentity: {
        ...brandData.visualIdentity,
        style: Array.isArray(extractedData.styles) ? extractedData.styles : brandData.visualIdentity.style,
      }
    };
    
    setBrandData(updated);
    saveToLocalStorage(updated);
    setShowAppliedSuccess(true);
    setTimeout(() => {
      setShowAppliedSuccess(false);
      setCurrentStep(1); // Auto-advance to Step 1: Business Foundations
    }, 2000);
  };

  const clearStressTest = () => {
    setRoughIdea('');
    setStressTestResult(null);
    persistEvaluation(null);
    setMarketResearch(null);
    setReevalError(null);
    localStorage.removeItem('brand_strategy_rough_idea');
    localStorage.removeItem('brand_strategy_stress_test_result');
    localStorage.removeItem('brand_strategy_market_research');
  };

  // Run live Google-grounded market research on the current idea
  const runMarketResearch = async () => {
    setIsResearching(true);
    setResearchError(null);
    setResearchApplied(false);
    try {
      const res = await fetch('/api/market-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roughIdea,
          business: brandData.business,
          market: brandData.market
        })
      });
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 100)}`);
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server returned status ${res.status}`);
      }
      setMarketResearch(data);
      localStorage.setItem('brand_strategy_market_research', JSON.stringify(data));
    } catch (err: any) {
      console.error("Market research failed", err);
      setResearchError(err.message || "An unexpected error occurred during market research.");
    } finally {
      setIsResearching(false);
    }
  };

  // Merge researched competitors into the workbook (deduped by name)
  const applyResearchToWorkbook = () => {
    if (!marketResearch?.competitors?.length) return;
    const existingNames = new Set(brandData.market.competitors.map(c => c.name.trim().toLowerCase()));
    const newOnes: Competitor[] = marketResearch.competitors
      .filter(c => !existingNames.has(c.name.trim().toLowerCase()))
      .map(c => ({
        name: c.name,
        url: c.url || undefined,
        strengths: c.strengths,
        weaknesses: c.weaknesses
      }));
    if (newOnes.length > 0) {
      handleTextChange('market', 'competitors', [...brandData.market.competitors, ...newOnes]);
    }
    setResearchApplied(true);
  };

  // When live research lands, fold its top risks into the living evaluation as
  // addressable "market" items (once), so research and evaluation stay unified.
  useEffect(() => {
    if (!evaluation || !marketResearch?.challenges?.length) return;
    if (evaluation.items.some(it => it.category === 'market')) return;
    const marketItems: EvaluationItem[] = marketResearch.challenges.slice(0, 3).map((text, i) => ({
      id: `market-${i}`, category: 'market', text, response: '', status: 'open'
    }));
    if (!marketItems.length) return;
    setEvaluation(prev => {
      if (!prev || prev.items.some(it => it.category === 'market')) return prev;
      const next = { ...prev, items: [...prev.items, ...marketItems] };
      localStorage.setItem('brand_strategy_evaluation', JSON.stringify(next));
      return next;
    });
  }, [marketResearch, evaluation]);

  const handleTextChange = (section: keyof BrandData, field: any, value: any) => {
    const updated = {
      ...brandData,
      [section]: {
        ...(brandData[section] as any),
        [field]: value
      }
    };
    setBrandData(updated);
    saveToLocalStorage(updated);
  };

  const handleNestedArrayChange = (section: keyof BrandData, index: number, value: any) => {
    const array = [...(brandData[section] as any)];
    array[index] = value;
    const updated = { ...brandData, [section]: array };
    setBrandData(updated);
    saveToLocalStorage(updated);
  };

  // Handle Multi-Select Style tags
  const toggleStyle = (style: string) => {
    const currentStyles = [...brandData.visualIdentity.style];
    const idx = currentStyles.indexOf(style);
    if (idx > -1) {
      currentStyles.splice(idx, 1);
    } else {
      currentStyles.push(style);
    }
    handleTextChange('visualIdentity', 'style', currentStyles);
  };

  // Checkbox lists for Touchpoints
  const toggleAssetItem = (category: keyof typeof brandData.assetsNeeded, item: string) => {
    const currentList = [...(brandData.assetsNeeded[category] as string[])];
    const idx = currentList.indexOf(item);
    if (idx > -1) {
      currentList.splice(idx, 1);
    } else {
      currentList.push(item);
    }
    handleTextChange('assetsNeeded', category, currentList);
  };

  // Nav sections list
  const steps = [
    { id: 0, title: 'Idea Pitch & AI Stress-Test', icon: Compass },
    { id: 1, title: 'Business Foundations', icon: Briefcase },
    { id: 2, title: 'Market & Positioning', icon: Target },
    { id: 3, title: 'Customer Personas', icon: Users },
    { id: 4, title: 'Personality & Story', icon: MessageSquare },
    { id: 5, title: 'Visual Identity', icon: Eye },
    { id: 6, title: 'Touchpoints & Assets', icon: Layers },
    { id: 7, title: 'Review & Stress-Test', icon: Activity },
    { id: 8, title: 'Final Brand Guide', icon: FileText }
  ];

  // Completion status of each workbook step
  const getStepCompletionStatus = () => {
    return {
      0: true, // Welcome is always complete
      1: !!(brandData.business?.name?.trim() && brandData.business?.industry?.trim() && brandData.business?.products?.trim()),
      2: !!(brandData.market?.targetRegions?.trim() && brandData.market?.uvp?.trim()),
      3: (brandData.personas?.length || 0) > 0,
      4: !!(brandData.personality?.traits?.trim() && brandData.personality?.originStory?.trim()),
      5: (brandData.visualIdentity?.colorsLiked?.length || 0) > 0 && (brandData.visualIdentity?.style?.length || 0) > 0,
      6: (brandData.assetsNeeded?.logoTypes?.length || 0) > 0 || (brandData.assetsNeeded?.printMaterials?.length || 0) > 0 || (brandData.assetsNeeded?.digitalAssets?.length || 0) > 0 || (brandData.assetsNeeded?.merch?.length || 0) > 0,
      7: Object.keys(brandData.analysis || {}).length > 0,
      8: brandGuide !== null
    };
  };

  const completionStatus = getStepCompletionStatus();
  const totalSteps = steps.length;
  const completedStepsCount = Object.values(completionStatus).filter(Boolean).length;
  const completionPercentage = Math.round((completedStepsCount / totalSteps) * 100);

  // Quick helper to append list elements
  const addCompetitor = () => {
    if (!newCompetitor.name) return;
    const updatedList = [...brandData.market.competitors, newCompetitor];
    handleTextChange('market', 'competitors', updatedList);
    setNewCompetitor({ name: '', url: '', strengths: '', weaknesses: '' });
  };

  const removeCompetitor = (idx: number) => {
    const updatedList = brandData.market.competitors.filter((_, i) => i !== idx);
    handleTextChange('market', 'competitors', updatedList);
  };

  const addPersona = () => {
    if (!newPersona.name) return;
    const item: CustomerPersona = {
      id: Math.random().toString(36).substring(2),
      ...(newPersona as any)
    };
    const updatedList = [...brandData.personas, item];
    handleTextChange('personas', '', updatedList);
    setNewPersona({
      name: '', age: '25', gender: 'Female', location: 'Dar es Salaam', occupation: '', income: '', 
      familyStatus: 'Single', faithInvolvement: '', dailyRoutine: '', painPoints: '', needs: '', 
      buyingBehavior: 'online', mediaHabits: '', influences: '', objections: '', beforeState: '', afterState: ''
    });
  };

  const removePersona = (id: string) => {
    const updatedList = brandData.personas.filter(p => p.id !== id);
    handleTextChange('personas', '', updatedList);
  };

  const addRefBrand = () => {
    if (!newRefBrand.name) return;
    const updatedList = [...brandData.visualIdentity.referenceBrands, newRefBrand];
    handleTextChange('visualIdentity', 'referenceBrands', updatedList);
    setNewRefBrand({ name: '', url: '', why: '' });
  };

  const removeRefBrand = (idx: number) => {
    const updatedList = brandData.visualIdentity.referenceBrands.filter((_, i) => i !== idx);
    handleTextChange('visualIdentity', 'referenceBrands', updatedList);
  };

  const addColorLike = () => {
    if (!colorLikeInput || brandData.visualIdentity.colorsLiked.includes(colorLikeInput)) return;
    const updatedList = [...brandData.visualIdentity.colorsLiked, colorLikeInput];
    handleTextChange('visualIdentity', 'colorsLiked', updatedList);
    setColorLikeInput('');
  };

  const removeColorLike = (color: string) => {
    const updatedList = brandData.visualIdentity.colorsLiked.filter(c => c !== color);
    handleTextChange('visualIdentity', 'colorsLiked', updatedList);
  };

  const addColorDislike = () => {
    if (!colorDislikeInput || brandData.visualIdentity.colorsDisliked.includes(colorDislikeInput)) return;
    const updatedList = [...brandData.visualIdentity.colorsDisliked, colorDislikeInput];
    handleTextChange('visualIdentity', 'colorsDisliked', updatedList);
    setColorDislikeInput('');
  };

  const removeColorDislike = (color: string) => {
    const updatedList = brandData.visualIdentity.colorsDisliked.filter(c => c !== color);
    handleTextChange('visualIdentity', 'colorsDisliked', updatedList);
  };

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-paper text-ink flex flex-col md:flex-row font-sans selection:bg-ink selection:text-paper">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-80 md:h-screen md:overflow-y-auto bg-editorial-border-light border-b md:border-b-0 md:border-r border-editorial-border flex-shrink-0 flex flex-col justify-between">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-full bg-ink flex items-center justify-center font-serif font-bold text-paper">
              B
            </div>
            <div>
              <span className="block font-serif font-bold text-ink tracking-tight text-base leading-tight">Brand Strategy Coach</span>
              <span className="inline-block mt-1 text-[9px] text-editorial-secondary uppercase tracking-widest font-bold font-mono bg-white dark:bg-zinc-900 border border-editorial-border px-1.5 py-0.5 rounded">Gemini Elite</span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-bold text-editorial-secondary uppercase tracking-widest font-mono">Workbook</span>
            <span className="text-[10px] font-bold text-ink font-mono">Step {currentStep + 1} of {totalSteps}</span>
          </div>

          <nav className="space-y-1">
            {steps.map((st) => {
              const StepIcon = st.icon;
              const isActive = currentStep === st.id;
              const isPast = currentStep > st.id;
              const isComplete = completionStatus[st.id as keyof typeof completionStatus];
              return (
                <button
                  key={st.id}
                  onClick={() => setCurrentStep(st.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-left transition text-xs font-medium ${isActive ? 'bg-white dark:bg-zinc-900 text-ink border-l-2 border-l-ink font-semibold shadow-sm' : 'text-editorial-secondary hover:text-ink hover:bg-white/50 dark:hover:bg-zinc-900/50 border-l-2 border-l-transparent'}`}
                >
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold font-mono flex-shrink-0 ${
                    isActive ? 'bg-ink text-paper'
                    : isComplete ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                    : 'bg-editorial-border text-editorial-secondary'
                  }`}>
                    {isComplete && !isActive ? <CheckCircle className="w-3 h-3" /> : st.id + 1}
                  </span>
                  <StepIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-ink' : 'text-editorial-secondary'}`} />
                  <span className="flex-1 truncate font-serif font-medium">{st.title}</span>
                  {isPast && !isActive && !isComplete && <span className="w-1.5 h-1.5 rounded-full bg-ink/40 flex-shrink-0" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer: account / cloud sync + privacy */}
        <div className="p-6 border-t border-editorial-border space-y-3">
          {cloudAvailable ? (
            user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Cloud className={`w-3.5 h-3.5 flex-shrink-0 ${
                    cloudStatus === 'error' ? 'text-red-500' :
                    cloudStatus === 'syncing' || cloudStatus === 'loading' ? 'text-amber-500 animate-pulse' : 'text-emerald-600'
                  }`} />
                  <span className="text-[10px] font-mono text-ink truncate flex-1" title={user.email || ''}>{user.email || user.displayName || 'Signed in'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-widest font-mono text-editorial-secondary">
                    {cloudStatus === 'loading' ? 'Loading account…' :
                     cloudStatus === 'syncing' ? 'Saving to account…' :
                     cloudStatus === 'error' ? 'Sync error' : 'Saved to your account'}
                  </span>
                  <button onClick={handleSignOut} className="text-[9px] font-bold uppercase tracking-widest font-mono text-editorial-secondary hover:text-ink flex items-center gap-1 cursor-pointer">
                    <LogOut className="w-3 h-3" /> Sign out
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleSignIn}
                  className="w-full px-3 py-2 bg-ink text-paper hover:bg-[#333333] transition flex items-center justify-center gap-2 text-[10px] font-bold font-mono uppercase tracking-wider cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5" /> Sign in to save
                </button>
                <p className="text-[10px] text-editorial-secondary/80 font-mono leading-normal">
                  Without signing in, your work is saved in this browser only and may be lost if you clear data.
                </p>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2" title="Cloud saving isn't configured; your work is saved in this browser only.">
              <CloudOff className="w-3.5 h-3.5 text-editorial-secondary flex-shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-widest font-mono text-editorial-secondary">Local-only mode</span>
            </div>
          )}

          <div className="flex items-start gap-2 text-[11px] text-editorial-secondary font-serif leading-normal pt-3 border-t border-editorial-border">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Your work autosaves as you go, and your ideas stay private — used only to build your strategy.</span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main ref={mainScrollRef} className="flex-1 flex flex-col min-w-0 min-h-screen md:h-screen bg-paper relative overflow-y-auto">
        
        {/* Progress Bar at the top of the main container */}
        <div className="bg-white dark:bg-zinc-900 border-b border-editorial-border px-8 py-3 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-editorial-secondary" />
            <span className="text-xs font-serif font-bold text-ink">Your progress toward the Final Brand Guide</span>
          </div>
          <div className="flex-1 max-w-md flex items-center gap-3">
            <div className="w-full bg-editorial-border h-2 rounded-full overflow-hidden relative">
              <div
                className="bg-ink h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-editorial-secondary font-mono min-w-[110px] text-right whitespace-nowrap">{completedStepsCount} of {totalSteps} · {completionPercentage}%</span>
          </div>
        </div>

        {/* Step Header */}
        <header className="px-8 py-6 border-b border-editorial-border flex justify-between items-center bg-paper/90 backdrop-blur sticky top-0 z-30">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold text-editorial-secondary uppercase tracking-widest font-mono">Step {currentStep + 1} of {totalSteps}</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-editorial-border-light border border-editorial-border">
                {saveStatus === 'Saving...' ? (
                  <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                ) : saveStatus === 'Sync error' ? (
                  <AlertCircle className="w-3 h-3 text-red-500" />
                ) : (
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                )}
                <span className="text-[9px] font-bold text-editorial-secondary uppercase tracking-widest font-mono">
                  {saveStatus === 'Saving...' ? 'Autosaving…' : saveStatus === 'Sync error' ? 'Save error' : 'All changes saved'}
                </span>
              </div>
            </div>
            <h2 className="text-2xl font-serif font-bold text-ink tracking-tight">Current section: {steps[currentStep].title}</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(prev => !prev)}
              className="p-1.5 border border-editorial-border bg-white text-ink hover:bg-editorial-border-light transition flex items-center justify-center rounded-none cursor-pointer"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            </button>

            {currentStep > 0 && (
              <button 
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-3 py-1.5 border border-editorial-border bg-white text-ink hover:bg-editorial-border-light transition flex items-center gap-1.5 text-xs font-semibold font-serif"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            {currentStep < steps.length - 1 && (
              <button 
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-4 py-1.5 bg-ink text-paper hover:bg-[#333333] transition flex items-center gap-1.5 text-xs font-bold font-serif"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 p-8 max-w-4xl w-full mx-auto space-y-8">

          {authError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-xs flex items-start justify-between gap-2 border border-red-100 dark:border-red-900/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>Sign-in failed: {authError}</span>
              </div>
              <button onClick={() => setAuthError(null)} className="text-[10px] uppercase font-bold tracking-wider hover:underline text-red-600 dark:text-red-400 cursor-pointer">Dismiss</button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              
              {/* SECTION 0: IDEA PITCH & AI STRESS-TEST */}
              {currentStep === 0 && (
                <div className="space-y-8">
                  {/* Elegant Welcome Banner */}
                  <div className="bg-editorial-border-light border border-editorial-border p-8 rounded-none">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest font-mono text-editorial-secondary bg-white dark:bg-zinc-900 border border-editorial-border px-2 py-1 rounded mb-4">
                      <Sparkles className="w-3 h-3" /> Venture Stress-Test Engine
                    </span>
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-ink tracking-tight leading-tight">
                      Stress-test your business idea.
                    </h1>
                    <p className="text-base text-editorial-secondary leading-relaxed max-w-2xl mt-3 font-serif">
                      Then build a brand that actually survives the market.
                    </p>
                  </div>

                  {/* Business idea entry */}
                  <div className="space-y-6">
                      <div className="border border-editorial-border p-6 bg-white dark:bg-zinc-900 rounded-none space-y-4">
                        <div className="flex justify-between items-center border-b border-editorial-border pb-3">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-ink font-mono flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-editorial-secondary" />
                            Step 1 · Your business idea
                          </h3>
                          {roughIdea && (
                            <button
                              onClick={clearStressTest}
                              className="text-xs text-red-500 hover:underline cursor-pointer font-mono"
                            >
                              Clear Draft
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-editorial-secondary leading-relaxed font-serif">
                          Describe your business or ministry idea in detail: target clients, uniqueness, pricing, and local barriers.
                        </p>

                        {/* Textarea */}
                        <div className="space-y-1.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <label htmlFor="rough-idea" className="text-[11px] font-bold text-ink font-mono uppercase tracking-wider">Your business idea</label>
                            <span className="text-[10px] text-editorial-secondary font-serif italic">Replace the example or paste your own pitch</span>
                          </div>
                          <textarea
                            id="rough-idea"
                            value={roughIdea}
                            onChange={(e) => handleRoughIdeaChange(e.target.value)}
                            placeholder="e.g., I want to launch a modest premium clothing line based in Dar es Salaam called Nuru & Co. We want to use heavyweight Tanzanian organic cotton (320gsm) embroidered with traditional Swahili geometric poetry patterns. Hoodies will be priced around Tsh 120,000 to ensure ethical local tailor wages. We target creative directors and conscious urban youth who are tired of imported fast fashion and want authentic East African heritage..."
                            rows={8}
                            className="w-full p-4 bg-paper dark:bg-zinc-950 border border-editorial-border rounded-none text-sm text-ink focus:border-ink focus:outline-none font-sans resize-none leading-relaxed"
                          />
                          <p className="text-[11px] text-editorial-secondary font-serif italic flex items-start gap-1.5">
                            <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            Tip: aim for 3–8 short paragraphs covering your customers, offer, pricing, and local context.
                          </p>
                        </div>

                        {/* Dedicated drag & drop upload zone */}
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`relative border-2 border-dashed rounded-none p-4 flex items-center justify-center gap-3 transition ${
                            isDragging ? 'border-ink bg-editorial-border-light' : 'border-editorial-border-dark bg-paper dark:bg-zinc-950'
                          }`}
                        >
                          <input
                            type="file"
                            accept=".txt,.md,.json,.pdf"
                            onChange={handleFileUpload}
                            id="idea-file-upload"
                            className="hidden"
                          />
                          <Upload className="w-4 h-4 text-editorial-secondary flex-shrink-0" />
                          <span className="text-xs text-editorial-secondary font-serif">
                            Drag &amp; drop or{' '}
                            <label htmlFor="idea-file-upload" className="font-bold text-ink underline cursor-pointer">upload a pitch file</label>
                            {' '}(.txt, .md, .pdf)
                          </span>
                        </div>

                        {/* PDF & File processing state indicators */}
                        {isProcessingPdf && (
                          <div className="flex items-center gap-2 p-3 bg-editorial-border-light text-ink border border-editorial-border text-xs font-mono">
                            <Loader2 className="w-4 h-4 animate-spin text-editorial-secondary" />
                            <span>Processing and extracting pitch from PDF deck... (analyzing document content)</span>
                          </div>
                        )}

                        {pdfProcessError && (
                          <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-xs flex items-start justify-between gap-2 border border-red-100 dark:border-red-900/30">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold font-mono uppercase tracking-wider block text-[10px]">PDF Processing Failed</span>
                                <span className="font-serif italic text-xs block mt-1">{pdfProcessError}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => setPdfProcessError(null)} 
                              className="text-[10px] uppercase font-bold tracking-wider hover:underline text-red-600 dark:text-red-400 cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}

                        {/* Primary CTA */}
                        <div className="pt-2 space-y-2">
                          <button
                            onClick={analyzeIdea}
                            disabled={isStressTesting || isResearching || !roughIdea.trim()}
                            className={`w-full px-6 py-3.5 font-bold font-serif text-sm rounded-none transition flex items-center justify-center gap-2 ${
                              roughIdea.trim() && !isStressTesting && !isResearching
                                ? 'bg-ink text-paper hover:bg-[#333333] cursor-pointer'
                                : 'bg-editorial-border text-editorial-secondary cursor-not-allowed'
                            }`}
                          >
                            {isStressTesting || isResearching ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Analyzing your idea…
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                Analyze My Idea
                              </>
                            )}
                          </button>
                          <p className="text-[11px] text-editorial-secondary text-center font-serif italic">
                            We'll break your idea down into market risks, brand angles, and next steps.
                          </p>
                          <p className="flex items-center justify-center gap-1.5 text-[10px] text-editorial-secondary font-mono">
                            <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                            Your idea stays private — used only to generate your strategy and research.
                          </p>
                        </div>
                        {stressTestError && (
                          <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-xs flex items-start gap-2 border border-red-100 dark:border-red-900/30">
                            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <span>{stressTestError}</span>
                          </div>
                        )}
                      </div>
                  </div>

                  {/* Stage-by-stage analysis progress */}
                  {(isStressTesting || isResearching || stressTestResult || marketResearch) && (
                    <div className="border border-editorial-border bg-editorial-border-light rounded-none p-6">
                      <span className="text-[10px] font-bold text-editorial-secondary uppercase tracking-widest font-mono block mb-4">Analysis Pipeline</span>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: 'Reading your idea', active: false, done: true },
                          { label: 'Stress-testing viability', active: isStressTesting, done: !!stressTestResult },
                          { label: 'Live market research', active: isResearching, done: !!marketResearch, error: !!researchError },
                          { label: 'Building evaluation', active: (isStressTesting || isResearching) && !evaluation, done: !!evaluation }
                        ].map((stage, i) => (
                          <div key={i} className={`flex items-start gap-2 p-3 border rounded-none ${
                            stage.done ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/10'
                            : stage.error ? 'border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/10'
                            : stage.active ? 'border-ink bg-white dark:bg-zinc-900'
                            : 'border-editorial-border bg-paper dark:bg-zinc-950'
                          }`}>
                            <div className="mt-0.5 flex-shrink-0">
                              {stage.done ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                : stage.error ? <AlertCircle className="w-4 h-4 text-red-600" />
                                : stage.active ? <Loader2 className="w-4 h-4 text-ink animate-spin" />
                                : <Circle className="w-4 h-4 text-editorial-border-dark" />}
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-editorial-secondary uppercase font-mono tracking-wider block">Stage {i + 1}</span>
                              <span className="text-xs font-serif font-medium text-ink leading-tight block">{stage.label}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stress-Test Result Dashboard */}
                  {stressTestResult && (
                    <div className="border border-editorial-border p-8 bg-white dark:bg-zinc-900 rounded-none space-y-8 animate-fadeIn">
                      
                      {/* Header with score */}
                      {(() => {
                        const currentScore = evaluation?.score ?? stressTestResult.stressTest?.viabilityScore ?? 70;
                        const verdict = evaluation?.verdict ?? (currentScore >= 80 ? "Highly Viable / Well Targeted" : "Viable with Friction / Gaps");
                        const history = evaluation?.scoreHistory ?? [currentScore];
                        const prevScore = history.length > 1 ? history[history.length - 2] : null;
                        const delta = prevScore !== null ? currentScore - prevScore : null;
                        return (
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-editorial-border pb-6">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-editorial-secondary uppercase tracking-widest font-mono bg-editorial-border-light px-2 py-0.5 border border-editorial-border">LIVING EVALUATION</span>
                                <span className="text-[10px] font-bold text-ink uppercase tracking-widest font-mono bg-paper dark:bg-zinc-950 px-2 py-0.5 border border-editorial-border">Round {evaluation?.round ?? 1}</span>
                              </div>
                              <h4 className="text-2xl font-serif font-bold text-ink tracking-tight pt-1">Critical Strategic Evaluation</h4>
                              {(evaluation?.isMock ?? stressTestResult.isMock) && (
                                <span className="text-[10px] font-mono text-amber-600 block italic mt-1">Note: Running in offline preview mode with simulated strategist feedback</span>
                              )}
                              {history.length > 1 && (
                                <div className="flex items-center gap-2 pt-2 font-mono text-[10px] text-editorial-secondary">
                                  <span className="uppercase tracking-wider">Progress:</span>
                                  {history.map((s, i) => (
                                    <React.Fragment key={i}>
                                      {i > 0 && <ArrowRight className="w-3 h-3" />}
                                      <span className={i === history.length - 1 ? 'text-ink font-bold' : ''}>{s}%</span>
                                    </React.Fragment>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Viability Gauge */}
                            <div className="flex items-center gap-4 border border-editorial-border p-4 bg-paper dark:bg-zinc-950 rounded-none">
                              <div className="relative w-16 h-16 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle cx="32" cy="32" r="28" fill="transparent" stroke="var(--editorial-border)" strokeWidth="4" />
                                  <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="4"
                                    className="text-ink transition-all duration-1000"
                                    strokeDasharray={175}
                                    strokeDashoffset={175 - (175 * currentScore) / 100}
                                  />
                                </svg>
                                <span className="absolute text-base font-bold font-mono text-ink">{currentScore}%</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-editorial-secondary font-mono block">Venture Score</span>
                                <span className="text-xs font-serif italic text-ink font-bold block">{verdict}</span>
                                {delta !== null && (
                                  <span className={`text-[10px] font-mono font-bold block mt-0.5 ${delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-red-600' : 'text-editorial-secondary'}`}>
                                    {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : '— no change'} since last round
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Hard Market Realities (read-only context) */}
                      <div className="space-y-4">
                        <h5 className="text-xs font-bold uppercase tracking-widest text-ink font-mono border-b border-editorial-border pb-2">
                          Hard Market Realities
                        </h5>
                        <p className="text-xs text-editorial-secondary italic font-serif">
                          The harsh commercial and operational barriers your business must navigate in your selected category:
                        </p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                          {stressTestResult.stressTest?.marketRealities?.map((reality: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-3 text-xs leading-relaxed text-ink font-serif">
                              <span className="font-mono font-bold text-editorial-secondary text-[11px] mt-0.5">{idx + 1}.</span>
                              <span>{reality}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Living Evaluation — persistent, addressable action items */}
                      {evaluation && (
                        <div className="border border-ink bg-editorial-border-light rounded-none p-6 space-y-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-editorial-border pb-4">
                            <div>
                              <h5 className="text-sm font-bold uppercase tracking-widest text-ink font-mono flex items-center gap-2">
                                <Activity className="w-4 h-4 text-editorial-secondary" />
                                Address & Re-evaluate
                              </h5>
                              <p className="text-xs text-editorial-secondary font-serif italic mt-1">
                                Respond to each item below, then re-evaluate. The strategist re-scores your idea based on how convincingly you resolve each risk.
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-editorial-secondary font-mono block">Resolved</span>
                              <span className="text-lg font-serif font-bold text-ink">
                                {evaluation.items.filter(it => it.status === 'resolved').length}
                                <span className="text-editorial-secondary text-sm"> / {evaluation.items.length}</span>
                              </span>
                            </div>
                          </div>

                          {evaluation.summary && (
                            <div className="p-3 bg-white dark:bg-zinc-900 border border-editorial-border text-xs text-ink font-serif leading-relaxed">
                              <span className="text-[9px] font-bold uppercase font-mono tracking-widest text-editorial-secondary block mb-1">Strategist's latest read</span>
                              {evaluation.summary}
                            </div>
                          )}

                          <div className="space-y-4">
                            {evaluation.items.map((item) => {
                              const catMeta: Record<string, { label: string; cls: string }> = {
                                friction: { label: 'Blindspot / Friction', cls: 'text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/10' },
                                challenge: { label: 'Founder Challenge', cls: 'text-ink border-editorial-border bg-paper dark:bg-zinc-950' },
                                market: { label: 'Live Market Risk', cls: 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10' }
                              };
                              const statusMeta: Record<string, { label: string; cls: string }> = {
                                open: { label: 'Open', cls: 'text-editorial-secondary border-editorial-border bg-white dark:bg-zinc-900' },
                                addressed: { label: 'Addressed — awaiting re-eval', cls: 'text-ink border-ink bg-white dark:bg-zinc-900' },
                                partial: { label: 'Partially resolved', cls: 'text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20' },
                                resolved: { label: 'Resolved', cls: 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20' }
                              };
                              const cat = catMeta[item.category] || catMeta.challenge;
                              const st = statusMeta[item.status] || statusMeta.open;
                              return (
                                <div key={item.id} className="border border-editorial-border bg-white dark:bg-zinc-900 p-4 space-y-3">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className={`text-[9px] font-bold uppercase font-mono tracking-wider px-2 py-0.5 border ${cat.cls}`}>{cat.label}</span>
                                    <span className={`text-[9px] font-bold uppercase font-mono tracking-wider px-2 py-0.5 border ${st.cls}`}>{st.label}</span>
                                  </div>
                                  <p className="text-xs text-ink font-bold font-serif italic leading-relaxed">"{item.text}"</p>
                                  <textarea
                                    value={item.response}
                                    onChange={(e) => updateEvaluationItem(item.id, e.target.value)}
                                    placeholder="How do you address this? Be specific — name mechanisms, numbers, and evidence..."
                                    rows={2}
                                    className="w-full bg-paper dark:bg-zinc-950 border border-editorial-border rounded-none p-3 text-xs text-ink focus:border-ink focus:outline-none font-sans leading-relaxed resize-none"
                                  />
                                  {item.assessment && (
                                    <div className={`border p-3 text-xs font-serif leading-relaxed ${st.cls}`}>
                                      <span className="text-[9px] font-bold uppercase font-mono tracking-widest block mb-1">Strategist's assessment</span>
                                      {item.assessment}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {reevalError && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-xs flex items-start gap-2 border border-red-100 dark:border-red-900/30">
                              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                              <span>{reevalError}</span>
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-editorial-border">
                            <span className="text-[10px] text-editorial-secondary font-mono">
                              {evaluation.items.filter(it => it.response.trim()).length} of {evaluation.items.length} items addressed
                            </span>
                            <button
                              onClick={reevaluateIdea}
                              disabled={isReevaluating || !evaluation.items.some(it => it.response.trim())}
                              className={`px-5 py-2.5 font-bold font-serif text-xs rounded-none transition flex items-center gap-2 ${
                                evaluation.items.some(it => it.response.trim()) && !isReevaluating
                                  ? 'bg-ink text-paper hover:bg-[#333333] cursor-pointer'
                                  : 'bg-editorial-border text-editorial-secondary cursor-not-allowed'
                              }`}
                            >
                              {isReevaluating ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Re-evaluating...</>
                              ) : (
                                <><RefreshCw className="w-4 h-4" /> Re-evaluate My Idea (Round {evaluation.round + 1})</>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Extracted Brand Previews */}
                      {stressTestResult.extractedData && (
                        <div className="space-y-4">
                          <h5 className="text-xs font-bold uppercase tracking-widest text-ink font-mono border-b border-editorial-border pb-2">
                            Extracted Brand Workbook Attributes
                          </h5>
                          <p className="text-xs text-editorial-secondary italic font-serif">
                            We have extracted and crafted these detailed attributes from your raw concept. They will pre-populate your workbook so you can build and refine on top of them:
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="border border-editorial-border p-4 space-y-1 bg-paper dark:bg-zinc-950">
                              <span className="text-[9px] font-bold text-editorial-secondary uppercase font-mono tracking-wider block">Suggested Name</span>
                              <span className="font-bold text-ink font-serif text-sm">{stressTestResult.extractedData.businessName}</span>
                            </div>
                            <div className="border border-editorial-border p-4 space-y-1 bg-paper dark:bg-zinc-950">
                              <span className="text-[9px] font-bold text-editorial-secondary uppercase font-mono tracking-wider block">Industry</span>
                              <span className="font-bold text-ink font-serif text-sm">{stressTestResult.extractedData.industry}</span>
                            </div>
                            <div className="border border-editorial-border p-4 space-y-1 bg-paper dark:bg-zinc-950">
                              <span className="text-[9px] font-bold text-editorial-secondary uppercase font-mono tracking-wider block">Target Regions</span>
                              <span className="font-bold text-ink font-serif text-sm">{stressTestResult.extractedData.location}</span>
                            </div>
                            <div className="border border-editorial-border p-4 space-y-1 bg-paper dark:bg-zinc-950 md:col-span-3">
                              <span className="text-[9px] font-bold text-editorial-secondary uppercase font-mono tracking-wider block">Unique Value Proposition (UVP)</span>
                              <p className="font-serif italic text-ink mt-0.5 leading-relaxed">{stressTestResult.extractedData.uvp}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action buttons to apply data */}
                      <div className="flex justify-end pt-4 border-t border-editorial-border">
                        <button
                          onClick={applyExtractedData}
                          disabled={showAppliedSuccess}
                          className={`px-8 py-3.5 bg-ink text-paper hover:bg-[#333333] font-serif font-bold rounded-none transition flex items-center gap-2 text-sm cursor-pointer ${
                            showAppliedSuccess ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : ''
                          }`}
                        >
                          {showAppliedSuccess ? (
                            <>
                              <CheckCircle className="w-5 h-5 animate-scaleIn" />
                              Workbook Pre-filled! Advancing...
                            </>
                          ) : (
                            <>
                              Apply AI Suggestions & Pre-fill Workbook <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  )}

                  {/* Live market research — runs automatically in the background with the analysis */}
                  {(isResearching || marketResearch || researchError) && (
                    <div className="border border-editorial-border bg-white dark:bg-zinc-900 rounded-none p-8 space-y-6">
                    <div className="flex items-center justify-between gap-3 border-b border-editorial-border pb-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-editorial-secondary flex-shrink-0" />
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-wider text-ink font-mono">Live Market Research</h3>
                          <p className="text-[11px] text-editorial-secondary font-serif italic">Gathered automatically from the web while we analyzed your idea.</p>
                        </div>
                      </div>
                      {marketResearch && !isResearching && (
                        <button
                          onClick={runMarketResearch}
                          className="text-[10px] font-bold font-mono uppercase tracking-wider text-editorial-secondary hover:text-ink flex items-center gap-1 cursor-pointer flex-shrink-0"
                        >
                          <RefreshCw className="w-3 h-3" /> Refresh
                        </button>
                      )}
                    </div>

                    {isResearching && (
                      <div className="flex items-center gap-2 text-xs text-editorial-secondary font-mono">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Scanning the live market in the background…
                      </div>
                    )}

                    {researchError && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-xs flex items-start gap-2 border border-red-100 dark:border-red-900/30">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>{researchError}</span>
                      </div>
                    )}

                    {marketResearch && !isResearching && (
                      <div className="space-y-8 animate-fadeIn">
                        {/* Summary */}
                        <div className="space-y-2">
                          {marketResearch.isMock && (
                            <span className="text-[10px] font-mono text-amber-600 block italic">Note: Running in offline preview mode with simulated research findings</span>
                          )}
                          {marketResearch.researchedAt && (
                            <span className="text-[10px] font-mono text-editorial-secondary block">
                              Researched {new Date(marketResearch.researchedAt).toLocaleString()}
                            </span>
                          )}
                          <p className="text-sm text-ink font-serif leading-relaxed">{marketResearch.summary}</p>
                        </div>

                        {/* Competitors found online */}
                        {marketResearch.competitors?.length > 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-editorial-border pb-2">
                              <h5 className="text-xs font-bold uppercase tracking-widest text-ink font-mono">
                                Competitors Found ({marketResearch.competitors.length})
                              </h5>
                              <button
                                onClick={applyResearchToWorkbook}
                                disabled={researchApplied}
                                className={`px-3 py-1.5 text-[10px] font-bold font-mono uppercase tracking-wider rounded-none transition flex items-center gap-1.5 cursor-pointer ${
                                  researchApplied
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-ink text-paper hover:bg-[#333333]'
                                }`}
                              >
                                {researchApplied ? (
                                  <>
                                    <CheckCircle className="w-3 h-3" /> Added to Workbook
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3" /> Add All to Workbook
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {marketResearch.competitors.map((comp, idx) => (
                                <div key={idx} className="border border-editorial-border p-4 bg-paper dark:bg-zinc-950 space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <span className="font-bold text-ink font-serif text-sm block">{comp.name}</span>
                                      {comp.url && (
                                        <a
                                          href={comp.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[10px] text-editorial-secondary font-mono hover:text-ink hover:underline flex items-center gap-1"
                                        >
                                          <ExternalLink className="w-2.5 h-2.5" />
                                          {comp.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                                        </a>
                                      )}
                                    </div>
                                    <span className={`text-[9px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 border flex-shrink-0 ${
                                      comp.threatLevel === 'high'
                                        ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/40'
                                        : comp.threatLevel === 'medium'
                                        ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/40'
                                        : 'bg-editorial-border-light text-editorial-secondary border-editorial-border'
                                    }`}>
                                      {comp.threatLevel} threat
                                    </span>
                                  </div>
                                  <p className="text-xs text-ink font-serif italic leading-relaxed">{comp.positioning}</p>
                                  <div className="text-xs space-y-1 pt-1 border-t border-editorial-border">
                                    <p className="text-editorial-secondary font-serif leading-relaxed"><span className="font-bold text-ink">Strengths:</span> {comp.strengths}</p>
                                    <p className="text-editorial-secondary font-serif leading-relaxed"><span className="font-bold text-ink">Weaknesses:</span> {comp.weaknesses}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Trends / Challenges / Opportunities */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-3">
                            <h5 className="text-xs font-bold uppercase tracking-widest text-ink font-mono border-b border-editorial-border pb-2 flex items-center gap-1.5">
                              <TrendingUp className="w-3.5 h-3.5 text-editorial-secondary" /> Current Trends
                            </h5>
                            <ul className="space-y-2">
                              {marketResearch.trends?.map((trend, idx) => (
                                <li key={idx} className="text-xs text-ink font-serif leading-relaxed flex items-start gap-2">
                                  <span className="font-mono font-bold text-editorial-secondary text-[10px] mt-0.5">{idx + 1}.</span>
                                  <span>{trend}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-3">
                            <h5 className="text-xs font-bold uppercase tracking-widest text-red-700 dark:text-red-400 font-mono border-b border-editorial-border pb-2 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" /> Entry Challenges
                            </h5>
                            <ul className="space-y-2">
                              {marketResearch.challenges?.map((ch, idx) => (
                                <li key={idx} className="text-xs text-ink font-serif leading-relaxed flex items-start gap-2">
                                  <span className="font-mono font-bold text-editorial-secondary text-[10px] mt-0.5">{idx + 1}.</span>
                                  <span>{ch}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-3">
                            <h5 className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-mono border-b border-editorial-border pb-2 flex items-center gap-1.5">
                              <Lightbulb className="w-3.5 h-3.5" /> Whitespace
                            </h5>
                            <ul className="space-y-2">
                              {marketResearch.opportunities?.map((opp, idx) => (
                                <li key={idx} className="text-xs text-ink font-serif leading-relaxed flex items-start gap-2">
                                  <span className="font-mono font-bold text-editorial-secondary text-[10px] mt-0.5">{idx + 1}.</span>
                                  <span>{opp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Cited sources */}
                        {marketResearch.sources?.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-editorial-border">
                            <h5 className="text-[10px] font-bold uppercase tracking-widest text-editorial-secondary font-mono">Sources</h5>
                            <div className="flex flex-wrap gap-2">
                              {marketResearch.sources.map((src, idx) => (
                                <a
                                  key={idx}
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-mono text-editorial-secondary bg-editorial-border-light border border-editorial-border px-2 py-1 hover:text-ink hover:border-ink transition flex items-center gap-1 max-w-[220px]"
                                >
                                  <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                                  <span className="truncate">{src.title}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  )}

                  {/* Standard Start Button when no stress-test ran */}
                  {!stressTestResult && (
                    <div className="flex justify-end pt-4 border-t border-editorial-border">
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="px-6 py-3 bg-ink text-paper hover:bg-[#333333] font-serif font-bold rounded-none transition flex items-center gap-2 text-sm cursor-pointer"
                      >
                        Start Blank Workbook <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                </div>
              )}

              {/* SECTION 1: BUSINESS FOUNDATIONS */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-ink flex items-center gap-1.5 font-mono">
                        Business Name <HelpCircle className="text-editorial-secondary w-3.5 h-3.5" title="The official or draft name of your business." />
                      </label>
                      <input 
                        type="text" 
                        value={brandData.business.name}
                        onChange={(e) => handleTextChange('business', 'name', e.target.value)}
                        placeholder="e.g., Nuru Apparel"
                        className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-ink font-mono">Location & Primary Market</label>
                      <input 
                        type="text" 
                        value={brandData.business.location}
                        onChange={(e) => handleTextChange('business', 'location', e.target.value)}
                        placeholder="e.g., Dar es Salaam, Tanzania"
                        className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-ink font-mono">Industry / Niche</label>
                    <input 
                      type="text" 
                      value={brandData.business.industry}
                      onChange={(e) => handleTextChange('business', 'industry', e.target.value)}
                      placeholder="e.g., Premium Streetwear Fashion"
                      className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-ink flex items-center justify-between font-mono">
                      <span>Main Products or Services</span>
                      <span className="text-[10px] text-editorial-secondary italic font-serif">Be highly detailed</span>
                    </label>
                    <textarea 
                      rows={3}
                      value={brandData.business.products}
                      onChange={(e) => handleTextChange('business', 'products', e.target.value)}
                      placeholder="Describe what you actually create or deliver..."
                      className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-ink font-mono">Vision Statement</label>
                      <textarea 
                        rows={3}
                        value={brandData.business.vision}
                        onChange={(e) => handleTextChange('business', 'vision', e.target.value)}
                        placeholder="Where is the brand going in 10 years? What is the ideal future state?"
                        className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans text-xs leading-relaxed"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-ink font-mono">Mission Statement</label>
                      <textarea 
                        rows={3}
                        value={brandData.business.mission}
                        onChange={(e) => handleTextChange('business', 'mission', e.target.value)}
                        placeholder="What do you build? Who is it for? How do you create value daily?"
                        className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans text-xs leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2 md:col-span-1">
                      <label className="text-xs font-bold uppercase text-ink font-mono">3-5 Core Brand Values</label>
                      <input 
                        type="text" 
                        value={brandData.business.values}
                        onChange={(e) => handleTextChange('business', 'values', e.target.value)}
                        placeholder="Local pride, quality, etc."
                        className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-1">
                      <label className="text-xs font-bold uppercase text-ink font-mono">3-Year Strategic Goal</label>
                      <input 
                        type="text" 
                        value={brandData.business.longTermGoals3Yr}
                        onChange={(e) => handleTextChange('business', 'longTermGoals3Yr', e.target.value)}
                        placeholder="e.g. Open design hub, export to Kenya"
                        className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-1">
                      <label className="text-xs font-bold uppercase text-ink font-mono">10-Year Bold Target</label>
                      <input 
                        type="text" 
                        value={brandData.business.longTermGoals10Yr}
                        onChange={(e) => handleTextChange('business', 'longTermGoals10Yr', e.target.value)}
                        placeholder="Become Africa's leading label"
                        className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans"
                      />
                    </div>
                  </div>

                  {/* Faith-based brands toggle */}
                  <div className="bg-editorial-border-light p-6 rounded-none border border-editorial-border space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-ink font-serif">Faith-Based Brand Identity</h4>
                        <p className="text-xs text-editorial-secondary mt-1">Does this brand have an explicit Christian or faith-based identity?</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTextChange('business', 'isFaithBased', !brandData.business.isFaithBased)}
                        className={`w-12 h-6 rounded-full p-1 transition-all cursor-pointer ${brandData.business.isFaithBased ? 'bg-ink' : 'bg-editorial-border-dark'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-all ${brandData.business.isFaithBased ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {brandData.business.isFaithBased && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-2 pt-2 border-t border-[#EAE6E1]"
                      >
                        <label className="text-xs font-bold uppercase text-ink font-mono">How is faith embedded in your brand story & product design?</label>
                        <textarea
                          rows={2}
                          value={brandData.business.faithDescription}
                          onChange={(e) => handleTextChange('business', 'faithDescription', e.target.value)}
                          placeholder="e.g., We design modest streetwear with Kiswahili worship taglines; our visual elements reference scriptures on radiant beauty."
                          className="w-full bg-white border border-editorial-border rounded-none p-3 text-xs text-ink focus:border-ink focus:outline-none font-sans leading-relaxed"
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Run AI Stress-Test Coach Section */}
                  {renderCoachPanel('business')}
                </div>
              )}

              {/* SECTION 2: MARKET & POSITIONING */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-ink font-mono">Target Cities / Regions</label>
                      <input 
                        type="text" 
                        value={brandData.market.targetRegions}
                        onChange={(e) => handleTextChange('market', 'targetRegions', e.target.value)}
                        placeholder="e.g., Dar es Salaam (Oysterbay, Masaki, Mwenge), Nairobi"
                        className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-ink font-mono">Target Customer Segments</label>
                      <input 
                        type="text" 
                        value={brandData.market.targetSegments}
                        onChange={(e) => handleTextChange('market', 'targetSegments', e.target.value)}
                        placeholder="e.g., Creative leaders, urban church youth, high-end design collectors"
                        className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-ink font-mono">Unique Value Proposition (UVP)</label>
                    <textarea 
                      rows={2}
                      value={brandData.market.uvp}
                      onChange={(e) => handleTextChange('market', 'uvp', e.target.value)}
                      placeholder="What makes you completely unique from competitors? (e.g. Only heavy 320gsm East African combed cotton tailored ethically in Oysterbay)"
                      className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-ink font-mono">Pricing Strategy Tier</label>
                      <select 
                        value={brandData.market.pricingStrategy}
                        onChange={(e) => handleTextChange('market', 'pricingStrategy', e.target.value)}
                        className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans"
                      >
                        <option value="budget">Budget (Focus on affordability)</option>
                        <option value="mid-range">Mid-range (Balance of cost & quality)</option>
                        <option value="premium">Premium (Prestige & unmatched crafting)</option>
                        <option value="mixed">Mixed Tier (Dynamic pricing models)</option>
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold uppercase text-ink font-mono">Pricing Details & Price Points</label>
                      <input 
                        type="text" 
                        value={brandData.market.pricingDescription}
                        onChange={(e) => handleTextChange('market', 'pricingDescription', e.target.value)}
                        placeholder="e.g. Oversized hoodie at Tsh 120,000, tees at Tsh 45,000"
                        className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-ink font-mono">Desired Brand Perception (Keywords)</label>
                    <input 
                      type="text" 
                      value={brandData.market.desiredPerception}
                      onChange={(e) => handleTextChange('market', 'desiredPerception', e.target.value)}
                      placeholder="e.g. Streetwear, high-end, cultural, authentic, bold, reverent"
                      className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans"
                    />
                  </div>

                  {/* Competitor Analysis Repeatable Table */}
                  <div className="bg-editorial-border-light p-6 rounded-none border border-editorial-border space-y-4">
                    <div className="flex justify-between items-center border-b border-editorial-border pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-ink font-mono">Competitor Blueprint</h4>
                      <span className="text-[10px] text-ink font-mono">{brandData.market.competitors.length} added</span>
                    </div>

                    {brandData.market.competitors.length > 0 && (
                      <div className="space-y-3">
                        {brandData.market.competitors.map((comp, idx) => (
                          <div key={idx} className="flex items-start justify-between bg-white p-4 rounded-none border border-editorial-border">
                            <div className="space-y-1.5 text-xs">
                              <span className="font-serif font-bold text-ink text-sm">{comp.name}</span>
                              {comp.url && <a href={comp.url} className="text-[10px] text-ink block underline truncate max-w-[150px]">{comp.url}</a>}
                              <p className="text-editorial-secondary mt-1"><strong className="text-ink text-[10px] font-mono">STRENGTHS:</strong> {comp.strengths}</p>
                              <p className="text-editorial-secondary"><strong className="text-ink text-[10px] font-mono">WEAKNESSES:</strong> {comp.weaknesses}</p>
                            </div>
                            <button 
                              onClick={() => removeCompetitor(idx)}
                              className="text-editorial-secondary hover:text-red-600 p-1 transition cursor-pointer"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <input 
                        type="text" 
                        placeholder="Competitor Name"
                        value={newCompetitor.name}
                        onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                        className="bg-white border border-editorial-border rounded-none p-3 text-xs text-ink focus:border-ink focus:outline-none font-sans"
                      />
                      <input 
                        type="text" 
                        placeholder="Reference Link / Website (Optional)"
                        value={newCompetitor.url}
                        onChange={(e) => setNewCompetitor({ ...newCompetitor, url: e.target.value })}
                        className="bg-white border border-editorial-border rounded-none p-3 text-xs text-ink focus:border-ink focus:outline-none font-sans"
                      />
                      <input 
                        type="text" 
                        placeholder="What they do well (Strengths)"
                        value={newCompetitor.strengths}
                        onChange={(e) => setNewCompetitor({ ...newCompetitor, strengths: e.target.value })}
                        className="bg-white border border-editorial-border rounded-none p-3 text-xs text-ink focus:border-ink focus:outline-none font-sans md:col-span-2"
                      />
                      <input 
                        type="text" 
                        placeholder="Where they are weak (Blindspots/Gaps)"
                        value={newCompetitor.weaknesses}
                        onChange={(e) => setNewCompetitor({ ...newCompetitor, weaknesses: e.target.value })}
                        className="bg-white border border-editorial-border rounded-none p-3 text-xs text-ink focus:border-ink focus:outline-none font-sans md:col-span-2"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addCompetitor}
                      className="w-full py-2.5 bg-ink hover:bg-[#333333] text-paper rounded-none text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer font-serif"
                    >
                      <PlusCircle className="w-4 h-4" /> Add Competitor to Blueprint
                    </button>
                  </div>

                  {renderCoachPanel('market')}
                </div>
              )}

              {/* SECTION 3: CUSTOMER PERSONAS */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  
                  {/* Persona gallery list */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-editorial-border pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-ink font-mono">Customer Personas (at least 2-3 recommended)</h4>
                      <span className="text-xs text-ink font-mono">{brandData.personas.length} established</span>
                    </div>

                    {brandData.personas.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {brandData.personas.map((pers) => (
                          <div key={pers.id} className="bg-white border border-editorial-border p-6 rounded-none relative overflow-hidden flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <span className="text-base font-serif font-bold text-ink block">{pers.name}</span>
                                  <span className="text-[10px] text-editorial-secondary uppercase tracking-widest block font-semibold font-mono mt-0.5">
                                    Age {pers.age} // {pers.location}
                                  </span>
                                </div>
                                <button 
                                  onClick={() => removePersona(pers.id)}
                                  className="text-editorial-secondary hover:text-red-600 p-1 transition cursor-pointer"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-xs text-editorial-secondary leading-relaxed line-clamp-3 mb-4 font-serif italic">
                                <strong>Daily routine:</strong> {pers.dailyRoutine}
                              </p>
                              <div className="space-y-1.5 text-[10px] text-ink bg-editorial-border-light p-3 rounded-none border border-editorial-border font-sans">
                                <p><strong>Frustrations:</strong> {pers.painPoints}</p>
                                <p><strong>Buying Habits:</strong> {pers.buyingBehavior}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Complex repeatable persona form card */}
                  <div className="bg-editorial-border-light p-6 rounded-none border border-editorial-border space-y-4">
                    <div className="flex items-center gap-1.5 text-ink mb-2">
                      <Plus className="w-4 h-4" />
                      <span className="text-xs font-extrabold uppercase tracking-widest font-mono">Construct New Customer Persona</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-ink uppercase font-mono">Persona Label/Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g., Kibo (The Creative Director)" 
                          value={newPersona.name}
                          onChange={(e) => setNewPersona({ ...newPersona, name: e.target.value })}
                          className="w-full bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink uppercase font-mono">Age Range</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 18-25" 
                          value={newPersona.age}
                          onChange={(e) => setNewPersona({ ...newPersona, age: e.target.value })}
                          className="w-full bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink uppercase font-mono">Gender / Pronouns</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Female" 
                          value={newPersona.gender}
                          onChange={(e) => setNewPersona({ ...newPersona, gender: e.target.value })}
                          className="w-full bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink font-sans"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink uppercase font-mono">Occupation</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Fashion Designer" 
                          value={newPersona.occupation}
                          onChange={(e) => setNewPersona({ ...newPersona, occupation: e.target.value })}
                          className="w-full bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink uppercase font-mono">Income Level</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Tsh 900k / month" 
                          value={newPersona.income}
                          onChange={(e) => setNewPersona({ ...newPersona, income: e.target.value })}
                          className="w-full bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink uppercase font-mono">Location City / Ward</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Mwenge, Dar" 
                          value={newPersona.location}
                          onChange={(e) => setNewPersona({ ...newPersona, location: e.target.value })}
                          className="w-full bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink font-sans"
                        />
                      </div>
                    </div>

                    {brandData.business.isFaithBased && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink uppercase font-mono">Faith / Church Involvement Details (Faith-Based Specific)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Leads graphics team on Wednesday, attends weekly rehearsal" 
                          value={newPersona.faithInvolvement}
                          onChange={(e) => setNewPersona({ ...newPersona, faithInvolvement: e.target.value })}
                          className="w-full bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink font-sans"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-ink uppercase font-mono">Daily Routine Narrative</label>
                      <textarea 
                        rows={2}
                        placeholder="Briefly describe their typical day. (e.g. Works remotely at Oysterbay cafés, scrolls Pinterest in afternoon, active on TikTok...)" 
                        value={newPersona.dailyRoutine}
                        onChange={(e) => setNewPersona({ ...newPersona, dailyRoutine: e.target.value })}
                        className="w-full bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink font-sans leading-normal"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink uppercase font-mono">Category Pain Points & Objections</label>
                        <textarea 
                          rows={2}
                          placeholder="What frustrates them in this market? What is their main objection?" 
                          value={newPersona.painPoints}
                          onChange={(e) => setNewPersona({ ...newPersona, painPoints: e.target.value })}
                          className="w-full bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink font-sans leading-relaxed"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink uppercase font-mono">Wants, Desires & Aspirations</label>
                        <textarea 
                          rows={2}
                          placeholder="What are they searching for? What does success look like for them?" 
                          value={newPersona.needs}
                          onChange={(e) => setNewPersona({ ...newPersona, needs: e.target.value })}
                          className="w-full bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink font-sans leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink uppercase font-mono">Objections to Buying From Us</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Worried clothing size runs too small" 
                          value={newPersona.objections}
                          onChange={(e) => setNewPersona({ ...newPersona, objections: e.target.value })}
                          className="w-full bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink uppercase font-mono">Media Habits</label>
                        <input 
                          type="text" 
                          placeholder="e.g. IG Grid, Reels, podcasts" 
                          value={newPersona.mediaHabits}
                          onChange={(e) => setNewPersona({ ...newPersona, mediaHabits: e.target.value })}
                          className="w-full bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink uppercase font-mono">Favorite Brands & Influences</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Daily Paper, local pastors" 
                          value={newPersona.influences}
                          onChange={(e) => setNewPersona({ ...newPersona, influences: e.target.value })}
                          className="w-full bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink font-sans"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink uppercase font-mono">"BEFORE" State (Without us)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Wearing generic fast fashion that lacks local cultural meaning." 
                          value={newPersona.beforeState}
                          onChange={(e) => setNewPersona({ ...newPersona, beforeState: e.target.value })}
                          className="w-full bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-ink uppercase font-mono">"AFTER" State (Ideally with us)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Looking bold, confident, and culturally aligned with clean cuts." 
                          value={newPersona.afterState}
                          onChange={(e) => setNewPersona({ ...newPersona, afterState: e.target.value })}
                          className="w-full bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink font-sans"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={addPersona}
                      className="w-full py-3 bg-ink hover:bg-[#333333] text-paper rounded-none text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer font-serif"
                    >
                      <PlusCircle className="w-4 h-4" /> Save Customer Persona Card
                    </button>
                  </div>

                  {renderCoachPanel('personas')}
                </div>
              )}

              {/* SECTION 4: BRAND PERSONALITY & STORY */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-ink font-mono">Brand Personality (3-5 traits)</label>
                    <input 
                      type="text" 
                      value={brandData.personality.traits}
                      onChange={(e) => handleTextChange('personality', 'traits', e.target.value)}
                      placeholder="e.g., Bold, Reverent, Cultural, Authentic, Uncompromising"
                      className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans"
                    />
                  </div>

                  {/* Slider voice scales */}
                  <div className="bg-editorial-border-light p-6 rounded-none border border-editorial-border space-y-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink border-b border-editorial-border pb-2 font-mono">Brand Editorial Voice Scale</h4>
                    
                    <div className="space-y-3.5">
                      <div className="flex justify-between text-[11px] text-editorial-secondary font-mono">
                        <span>FORMAL</span>
                        <span>CASUAL</span>
                      </div>
                      <input 
                        type="range" min="1" max="5" 
                        value={brandData.personality.voiceScaleFormal}
                        onChange={(e) => handleTextChange('personality', 'voiceScaleFormal', parseInt(e.target.value))}
                        className="w-full accent-ink"
                      />
                    </div>

                    <div className="space-y-3.5">
                      <div className="flex justify-between text-[11px] text-editorial-secondary font-mono">
                        <span>SERIOUS</span>
                        <span>PLAYFUL</span>
                      </div>
                      <input 
                        type="range" min="1" max="5" 
                        value={brandData.personality.voiceScaleSerious}
                        onChange={(e) => handleTextChange('personality', 'voiceScaleSerious', parseInt(e.target.value))}
                        className="w-full accent-ink"
                      />
                    </div>

                    <div className="space-y-3.5">
                      <div className="flex justify-between text-[11px] text-editorial-secondary font-mono">
                        <span>TRADITIONAL</span>
                        <span>MODERN</span>
                      </div>
                      <input 
                        type="range" min="1" max="5" 
                        value={brandData.personality.voiceScaleTraditional}
                        onChange={(e) => handleTextChange('personality', 'voiceScaleTraditional', parseInt(e.target.value))}
                        className="w-full accent-ink"
                      />
                    </div>

                    <div className="space-y-3.5">
                      <div className="flex justify-between text-[11px] text-editorial-secondary font-mono">
                        <span>REVERENT / SOULFUL</span>
                        <span>BOLD / EDGY</span>
                      </div>
                      <input 
                        type="range" min="1" max="5" 
                        value={brandData.personality.voiceScaleReverent}
                        onChange={(e) => handleTextChange('personality', 'voiceScaleReverent', parseInt(e.target.value))}
                        className="w-full accent-ink"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-ink font-mono">Brand Origin Story</label>
                    <textarea 
                      rows={3}
                      value={brandData.personality.originStory}
                      onChange={(e) => handleTextChange('personality', 'originStory', e.target.value)}
                      placeholder="Why does this brand exist? What gap, problem, or divine calling does it respond to? Be passionate..."
                      className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-ink font-mono">Core Narrative Themes</label>
                      <textarea 
                        rows={2}
                        value={brandData.personality.narrativeThemes}
                        onChange={(e) => handleTextChange('personality', 'narrativeThemes', e.target.value)}
                        placeholder="e.g. Cultural restoration, excellence as worship, coastal integrity"
                        className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans text-xs leading-relaxed"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-ink font-mono">Draft Taglines & Key Messages</label>
                      <textarea 
                        rows={2}
                        value={brandData.personality.taglineDrafts}
                        onChange={(e) => handleTextChange('personality', 'taglineDrafts', e.target.value)}
                        placeholder="e.g. Kuvaa Nuru, Kuvaa Urithi // Excellence in worship"
                        className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans text-xs leading-relaxed"
                      />
                    </div>
                  </div>

                  {renderCoachPanel('personality')}
                </div>
              )}

              {/* SECTION 5: VISUAL IDENTITY INPUTS */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  
                  {/* Style Select checkboxes */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-ink font-mono">Aesthetic Vibe & Style (Multi-select)</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {STYLE_OPTIONS.map((st) => {
                        const isSelected = brandData.visualIdentity.style.includes(st.value);
                        return (
                          <button
                            key={st.value}
                            type="button"
                            onClick={() => toggleStyle(st.value)}
                            className={`p-4 rounded-none border text-left transition cursor-pointer ${isSelected ? 'bg-ink border-ink text-paper' : 'bg-white border-editorial-border text-ink hover:bg-editorial-border-light'}`}
                          >
                            <span className="text-xs font-bold block font-mono">{st.label}</span>
                            <span className={`text-[10px] mt-1.5 block leading-normal font-sans ${isSelected ? 'text-[#E5E2DD]' : 'text-editorial-secondary'}`}>{st.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Colors Likes & Dislikes lists */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-editorial-border-light p-5 rounded-none border border-editorial-border space-y-3">
                      <label className="text-xs font-bold uppercase text-ink block font-mono">Colors Liked / Swatches desired</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="e.g. #1E3A8A or Dar Indigo"
                          value={colorLikeInput}
                          onChange={(e) => setColorLikeInput(e.target.value)}
                          className="bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink flex-1 font-sans"
                        />
                        <button onClick={addColorLike} className="px-4 bg-ink hover:bg-[#333333] text-paper text-xs font-bold font-mono cursor-pointer">+</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {brandData.visualIdentity.colorsLiked.map((c, i) => (
                          <span key={i} className="px-3 py-1 bg-white rounded-none border border-editorial-border text-[10px] flex items-center gap-1.5 text-ink font-mono">
                            {c}
                            <button onClick={() => removeColorLike(c)} className="text-editorial-secondary hover:text-red-600 font-bold cursor-pointer">×</button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-editorial-border-light p-5 rounded-none border border-editorial-border space-y-3">
                      <label className="text-xs font-bold uppercase text-ink block font-mono">Colors Disliked</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="e.g. Neon Pink"
                          value={colorDislikeInput}
                          onChange={(e) => setColorDislikeInput(e.target.value)}
                          className="bg-white border border-editorial-border rounded-none p-2.5 text-xs text-ink focus:outline-none focus:border-ink flex-1 font-sans"
                        />
                        <button onClick={addColorDislike} className="px-4 bg-ink hover:bg-[#333333] text-paper text-xs font-bold font-mono cursor-pointer">+</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {brandData.visualIdentity.colorsDisliked.map((c, i) => (
                          <span key={i} className="px-3 py-1 bg-white rounded-none border border-editorial-border text-[10px] flex items-center gap-1.5 text-ink font-mono">
                            {c}
                            <button onClick={() => removeColorDislike(c)} className="text-editorial-secondary hover:text-red-600 font-bold cursor-pointer">×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-ink font-mono">Cultural & Historical Symbolism desired</label>
                    <textarea 
                      rows={2}
                      value={brandData.visualIdentity.symbolism}
                      onChange={(e) => handleTextChange('visualIdentity', 'symbolism', e.target.value)}
                      placeholder="e.g. Kiswahili scripts, Zanzibar sunset golden glow, tribal star crests representing guidance and unity."
                      className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans leading-relaxed"
                    />
                  </div>

                  {/* Reference Brands repeatable */}
                  <div className="bg-editorial-border-light p-6 rounded-none border border-editorial-border space-y-4">
                    <div className="flex justify-between items-center border-b border-editorial-border pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-ink font-mono">Reference Brands visually admired</h4>
                      <span className="text-[10px] text-ink font-mono">{brandData.visualIdentity.referenceBrands.length} added</span>
                    </div>

                    {brandData.visualIdentity.referenceBrands.length > 0 && (
                      <div className="space-y-3">
                        {brandData.visualIdentity.referenceBrands.map((b, i) => (
                          <div key={i} className="flex items-start justify-between bg-white p-4 rounded-none border border-editorial-border">
                            <div className="text-xs space-y-1">
                              <span className="font-serif font-bold text-ink text-sm">{b.name}</span>
                              {b.url && <a href={b.url} className="text-[10px] text-ink underline block truncate max-w-[150px] font-mono">{b.url}</a>}
                              <p className="text-editorial-secondary mt-1"><strong>Why we admire:</strong> {b.why}</p>
                            </div>
                            <button onClick={() => removeRefBrand(i)} className="text-editorial-secondary hover:text-red-600 p-1 cursor-pointer">
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <input 
                        type="text" placeholder="Brand Name" value={newRefBrand.name}
                        onChange={(e) => setNewRefBrand({ ...newRefBrand, name: e.target.value })}
                        className="bg-white border border-editorial-border rounded-none p-3 text-xs text-ink focus:outline-none focus:border-ink font-sans"
                      />
                      <input 
                        type="text" placeholder="Website URL (Optional)" value={newRefBrand.url}
                        onChange={(e) => setNewRefBrand({ ...newRefBrand, url: e.target.value })}
                        className="bg-white border border-editorial-border rounded-none p-3 text-xs text-ink focus:outline-none focus:border-ink font-sans"
                      />
                      <input 
                        type="text" placeholder="Why do you admire their design? (e.g. Meticulous clean geometry)" value={newRefBrand.why}
                        onChange={(e) => setNewRefBrand({ ...newRefBrand, why: e.target.value })}
                        className="bg-white border border-editorial-border rounded-none p-3 text-xs text-ink focus:outline-none focus:border-ink font-sans md:col-span-2"
                      />
                    </div>
                    <button
                      type="button" onClick={addRefBrand}
                      className="w-full py-2.5 bg-ink hover:bg-[#333333] text-paper rounded-none text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer font-serif"
                    >
                      <PlusCircle className="w-4 h-4" /> Add Reference Brand
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-ink font-mono">Sourcing / Printing Limitations or Constraints</label>
                    <input 
                      type="text" 
                      value={brandData.visualIdentity.constraints}
                      onChange={(e) => handleTextChange('visualIdentity', 'constraints', e.target.value)}
                      placeholder="e.g. Sourcing heavy fleece is tough locally; screen printers can't handle intricate gradients"
                      className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans"
                    />
                  </div>

                  {renderCoachPanel('visualIdentity')}
                </div>
              )}

              {/* SECTION 6: BRAND TOUCHPOINTS & ASSETS */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  
                  {/* Logo Types Multi */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase text-ink block font-mono">Logo Formats Required</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {LOGO_TYPES.map((lt) => {
                        const isChecked = brandData.assetsNeeded.logoTypes.includes(lt.value);
                        return (
                          <button
                            key={lt.value}
                            type="button"
                            onClick={() => toggleAssetItem('logoTypes', lt.value)}
                            className={`p-4 rounded-none border text-left transition cursor-pointer ${isChecked ? 'bg-ink border-ink text-paper font-semibold' : 'bg-white border-editorial-border text-ink hover:bg-editorial-border-light'}`}
                          >
                            <span className="text-xs block font-mono">{lt.label}</span>
                            <span className={`text-[10px] mt-1.5 block leading-normal font-sans ${isChecked ? 'text-[#E5E2DD]' : 'text-editorial-secondary'}`}>{lt.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Print Materials checklist */}
                  <div className="bg-editorial-border-light p-5 rounded-none border border-editorial-border space-y-3">
                    <label className="text-xs font-bold uppercase text-ink block font-mono">Print Collateral Assets Needed</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                      {PRINT_MATERIALS.map((p) => {
                        const isChecked = brandData.assetsNeeded.printMaterials.includes(p);
                        return (
                          <label key={p} className={`flex items-center gap-2.5 p-2.5 rounded-none border text-xs cursor-pointer transition ${isChecked ? 'bg-ink border-ink text-paper font-semibold' : 'bg-white border-editorial-border text-ink'}`}>
                            <input 
                              type="checkbox" checked={isChecked} onChange={() => toggleAssetItem('printMaterials', p)}
                              className="accent-ink"
                            />
                            <span className="font-sans">{p}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Digital materials checklist */}
                  <div className="bg-editorial-border-light p-5 rounded-none border border-editorial-border space-y-3">
                    <label className="text-xs font-bold uppercase text-ink block font-mono">Digital & Social Media Assets</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                      {DIGITAL_ASSETS.map((d) => {
                        const isChecked = brandData.assetsNeeded.digitalAssets.includes(d);
                        return (
                          <label key={d} className={`flex items-center gap-2.5 p-2.5 rounded-none border text-xs cursor-pointer transition ${isChecked ? 'bg-ink border-ink text-paper font-semibold' : 'bg-white border-editorial-border text-ink'}`}>
                            <input 
                              type="checkbox" checked={isChecked} onChange={() => toggleAssetItem('digitalAssets', d)}
                              className="accent-ink"
                            />
                            <span className="font-sans">{d}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Merchandise checklist */}
                  <div className="bg-editorial-border-light p-5 rounded-none border border-editorial-border space-y-3">
                    <label className="text-xs font-bold uppercase text-ink block font-mono">Custom Merch assets</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                      {MERCH_ASSETS.map((m) => {
                        const isChecked = brandData.assetsNeeded.merch.includes(m);
                        return (
                          <label key={m} className={`flex items-center gap-2.5 p-2.5 rounded-none border text-xs cursor-pointer transition ${isChecked ? 'bg-ink border-ink text-paper font-semibold' : 'bg-white border-editorial-border text-ink'}`}>
                            <input 
                              type="checkbox" checked={isChecked} onChange={() => toggleAssetItem('merch', m)}
                              className="accent-ink"
                            />
                            <span className="font-sans">{m}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Faith Assets (visible if faith brand selected) */}
                  {brandData.business.isFaithBased && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white p-5 rounded-none border border-ink space-y-3"
                    >
                      <label className="text-xs font-bold uppercase text-ink block font-mono">Worship & Ministry Visual Assets (Faith-Based Specific)</label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {FAITH_ASSETS.map((f) => {
                          const isChecked = brandData.assetsNeeded.ministryAssets.includes(f);
                          return (
                            <label key={f} className={`flex items-center gap-2.5 p-2.5 rounded-none border text-xs cursor-pointer transition ${isChecked ? 'bg-ink border-ink text-paper font-semibold' : 'bg-white border-editorial-border text-ink'}`}>
                              <input 
                                type="checkbox" checked={isChecked} onChange={() => toggleAssetItem('ministryAssets', f)}
                                className="accent-ink"
                              />
                              <span className="font-sans">{f}</span>
                            </label>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-ink font-mono">Other Custom Assets or Touchpoints</label>
                    <input 
                      type="text" 
                      value={brandData.assetsNeeded.customTouchpoints}
                      onChange={(e) => handleTextChange('assetsNeeded', 'customTouchpoints', e.target.value)}
                      placeholder="e.g. Embossed silver hangtags, woven labels with bible coordinates"
                      className="w-full bg-white border border-editorial-border rounded-none p-3 text-sm text-ink focus:border-ink focus:outline-none font-sans"
                    />
                  </div>

                  {renderCoachPanel('assetsNeeded')}
                </div>
              )}

              {/* SECTION 7: REVIEW & COMPLETE STRESS-TESTS */}
              {currentStep === 7 && (
                <div className="space-y-6">
                  <div className="bg-editorial-border-light border border-editorial-border p-6 rounded-none relative">
                    <div className="flex items-center gap-2 text-ink mb-3">
                      <Activity className="w-5 h-5 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-widest font-mono">Integrity Consistency Engine</span>
                    </div>
                    <h3 className="text-lg font-serif font-bold text-ink">Let's audit your workbook data before generating the Brand Guide</h3>
                    <p className="text-xs text-editorial-secondary mt-1 leading-relaxed font-sans">
                      We have compiled your workbook data into a structured layout below. Click the section coach reviews on previous tabs or look over your details to make sure they align perfectly. Inconsistencies like premium positioning but budget pricing are flagged automatically.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-none border border-editorial-border bg-white text-xs space-y-2">
                      <span className="font-bold text-ink block font-mono uppercase tracking-wider pb-1 border-b border-editorial-border">Business Core</span>
                      <p className="text-editorial-secondary"><strong>Name:</strong> <span className="text-ink font-serif font-bold">{brandData.business.name || "N/A"}</span></p>
                      <p className="text-editorial-secondary"><strong>Market Location:</strong> <span className="text-ink">{brandData.business.location}</span></p>
                      <p className="text-editorial-secondary"><strong>Mission:</strong> <span className="text-ink">{brandData.business.mission || "N/A"}</span></p>
                    </div>

                    <div className="p-5 rounded-none border border-editorial-border bg-white text-xs space-y-2">
                      <span className="font-bold text-ink block font-mono uppercase tracking-wider pb-1 border-b border-editorial-border">Positioning details</span>
                      <p className="text-editorial-secondary"><strong>Desired Vibe:</strong> <span className="text-ink font-serif">{brandData.market.desiredPerception || "N/A"}</span></p>
                      <p className="text-editorial-secondary"><strong>Pricing Strategy:</strong> <span className="text-ink font-mono uppercase font-bold">{brandData.market.pricingStrategy.toUpperCase()}</span></p>
                      <p className="text-editorial-secondary"><strong>UVP:</strong> <span className="text-ink">{brandData.market.uvp || "N/A"}</span></p>
                    </div>
                  </div>

                  {/* Stress-test overview panel */}
                  <div className="bg-editorial-border-light border border-editorial-border p-6 rounded-none space-y-4">
                    <div className="flex items-center gap-2 text-ink">
                      <Sparkles className="w-5 h-5" />
                      <h4 className="text-sm font-serif font-bold uppercase tracking-wide">Ready to generate your visual & strategic blueprint?</h4>
                    </div>
                    <p className="text-xs text-editorial-secondary leading-relaxed font-sans">
                      We will pass all business details, target personas, pricing scales, core symbolism values, and touchpoint preferences to Gemini to render a detailed 7-page cohesive Brand Book.
                    </p>

                    <button
                      onClick={() => {
                        setCurrentStep(8);
                        generateBrandGuide();
                      }}
                      className="w-full py-4 bg-ink hover:bg-[#333333] text-paper font-bold text-xs uppercase rounded-none transition shadow-none flex items-center justify-center gap-2 cursor-pointer font-serif tracking-widest"
                    >
                      <Sparkles className="w-5 h-5 animate-pulse" /> Generate Brand Strategy Book
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION 8: FINAL OUTPUT (BRAND BOOK & VISUAL IDENTITIES) */}
              {currentStep === 8 && (
                <div className="space-y-8">
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                      <Loader2 className="w-12 h-12 text-ink animate-spin" />
                      <div>
                        <h4 className="font-serif font-bold text-ink text-base">Generating Brand Bible...</h4>
                        <p className="text-xs text-editorial-secondary mt-1 max-w-sm font-sans">
                          Synthesizing your color guidelines, typography rules, tailored customer taglines, and handoff notes. Please stand by...
                        </p>
                      </div>
                    </div>
                  ) : brandGuide ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-8"
                    >
                      {/* Generated success bar */}
                      <div className="p-6 bg-[#E5F5E0] border border-green-300 rounded-none flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-green-800 block font-mono">Audit successful</span>
                            <h4 className="text-base font-serif font-bold text-ink">{brandData.business.name || 'Your Enterprise'} Strategy Bible is complete.</h4>
                            <p className="text-xs text-editorial-secondary mt-1">Generated matching colors, visual guidelines, launch plans, and designer handoffs.</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={downloadPdf}
                            disabled={pdfDownloading}
                            className="px-5 py-3 bg-ink hover:bg-[#333333] text-paper font-bold rounded-none text-xs transition flex items-center gap-1.5 cursor-pointer font-serif tracking-wide"
                          >
                            {pdfDownloading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting...
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" /> Download Brand Guide PDF
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Interactive Visualizer showcase */}
                      <InteractiveShowcase 
                        brandGuide={brandGuide} 
                        businessName={brandData.business?.name || "Your Brand"}
                        brandStyle={brandData.visualIdentity?.style || []}
                      />

                      {/* Layout structure tabs of the Brand Guide */}
                      <div className="space-y-6">
                        <div className="border-b border-editorial-border pb-2">
                          <h3 className="text-xl font-serif font-bold text-ink tracking-tight">Full Strategy Documentation</h3>
                          <p className="text-xs text-editorial-secondary mt-1">Direct editorial transcript generated by our AI core.</p>
                        </div>

                        {/* 01: Overview & Tagline */}
                        <div className="bg-editorial-border-light p-6 rounded-none border border-editorial-border space-y-3">
                          <span className="text-[10px] font-bold text-ink uppercase tracking-widest font-mono">Section 01 // Executive Profile</span>
                          <h4 className="text-lg font-serif font-bold text-ink">{brandGuide.overview?.title}</h4>
                          <p className="text-sm text-ink italic font-medium font-serif">"{brandGuide.overview?.tagline}"</p>
                          <p className="text-xs text-editorial-secondary leading-relaxed font-sans">{brandGuide.overview?.summary}</p>
                        </div>

                        {/* 02: Positioning Statement */}
                        <div className="bg-editorial-border-light p-6 rounded-none border border-editorial-border space-y-3">
                          <span className="text-[10px] font-bold text-ink uppercase tracking-widest font-mono">Section 02 // Positioning & Value Prop</span>
                          <p className="text-xs text-editorial-secondary leading-relaxed font-sans"><strong>Core Statement:</strong> <span className="text-ink font-serif">{brandGuide.positioning?.statement}</span></p>
                          <p className="text-xs text-editorial-secondary leading-relaxed font-sans"><strong>Value Proposition Explained:</strong> <span className="text-ink">{brandGuide.positioning?.uvpExplained}</span></p>
                          <p className="text-xs text-editorial-secondary leading-relaxed font-sans"><strong>Pricing Matrix Notes:</strong> <span className="text-ink font-mono">{brandGuide.positioning?.pricingStrategyNotes}</span></p>
                        </div>

                        {/* 03: Customer Personas */}
                        <div className="space-y-4">
                          <span className="text-[10px] font-bold text-ink uppercase tracking-widest block font-mono">Section 03 // Customer Archetype Alignments</span>
                          <div className="grid grid-cols-1 gap-4">
                            {brandGuide.personas?.map((p, i) => (
                              <div key={i} className="bg-editorial-border-light p-6 rounded-none border border-editorial-border space-y-2.5">
                                <h5 className="text-base font-serif font-bold text-ink">{p.name}</h5>
                                <p className="text-[11px] text-ink italic font-serif">Archetype: {p.archetype} // "{p.tagline}"</p>
                                <p className="text-xs text-editorial-secondary leading-relaxed font-sans"><strong>Buying Objections:</strong> {p.summary}</p>
                                <div className="text-xs text-ink bg-white p-4 rounded-none border border-editorial-border italic font-serif">
                                  <strong>Custom Communication Message:</strong> {p.keyMessage}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 04: Brand Voice */}
                        <div className="bg-editorial-border-light p-6 rounded-none border border-editorial-border space-y-4">
                          <span className="text-[10px] font-bold text-ink uppercase tracking-widest block font-mono">Section 04 // Tone of Voice Guidelines</span>
                          <div className="flex flex-wrap gap-2">
                            {brandGuide.voice?.traits?.map((t, idx) => (
                              <span key={idx} className="px-3 py-1 bg-white text-ink border border-editorial-border text-[10px] font-bold font-mono">
                                {t.toUpperCase()}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-editorial-secondary leading-relaxed font-sans">{brandGuide.voice?.styleGuide}</p>
                        </div>

                        {/* 05: Assets & Digital recommendations */}
                        <div className="bg-editorial-border-light p-6 rounded-none border border-editorial-border space-y-3">
                          <span className="text-[10px] font-bold text-ink uppercase tracking-widest block font-mono">Section 05 // Asset Library Usage</span>
                          <p className="text-xs text-editorial-secondary leading-relaxed font-sans"><strong>Logo Guidelines:</strong> <span className="text-ink">{brandGuide.assets?.logoGuidelines}</span></p>
                          <p className="text-xs text-editorial-secondary leading-relaxed font-sans"><strong>Social Channels Layout:</strong> <span className="text-ink">{brandGuide.assets?.socialMediaTemplates}</span></p>
                          <p className="text-xs text-editorial-secondary leading-relaxed font-sans"><strong>Collateral & Print:</strong> <span className="text-ink">{brandGuide.assets?.printRecommendations}</span></p>
                          <p className="text-xs text-editorial-secondary leading-relaxed font-sans"><strong>Merchandise Blueprint:</strong> <span className="text-ink">{brandGuide.assets?.merchIdeas}</span></p>
                        </div>

                        {/* 06: Launch checklist */}
                        <div className="bg-editorial-border-light p-6 rounded-none border border-editorial-border space-y-3">
                          <span className="text-[10px] font-bold text-ink uppercase tracking-widest block font-mono">Section 06 // Launch & rollout</span>
                          <div className="space-y-3">
                            {brandGuide.implementation?.launchSteps?.map((step, idx) => (
                              <div key={idx} className="flex gap-2.5 items-start text-xs text-editorial-secondary font-sans">
                                <span className="font-bold text-ink font-mono">{idx + 1}.</span>
                                <p className="leading-relaxed">{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 07: Professional handoff notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-5 rounded-none border border-editorial-border bg-editorial-border-light space-y-2">
                            <span className="text-[10px] font-bold text-ink uppercase tracking-widest block font-mono">Design Agency Handoff</span>
                            <p className="text-xs text-editorial-secondary leading-relaxed font-sans">{brandGuide.handoff?.designerNotes}</p>
                          </div>
                          <div className="p-5 rounded-none border border-editorial-border bg-editorial-border-light space-y-2">
                            <span className="text-[10px] font-bold text-ink uppercase tracking-widest block font-mono">Development Team Notes</span>
                            <p className="text-xs text-editorial-secondary leading-relaxed font-sans">{brandGuide.handoff?.developerNotes}</p>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center py-12 bg-editorial-border-light border border-editorial-border rounded-none">
                      <p className="text-sm text-editorial-secondary">Review all sections before running generation.</p>
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Navigation Bottom bar */}
          {currentStep > 0 && currentStep < 8 && (
            <div className="border-t border-editorial-border pt-6 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-5 py-3 bg-white border border-editorial-border text-ink rounded-none hover:bg-editorial-border-light transition flex items-center gap-1.5 text-xs font-bold cursor-pointer font-serif"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Step 0{currentStep - 1}
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-6 py-3 bg-ink text-paper font-bold rounded-none hover:bg-[#333333] transition flex items-center gap-1.5 text-xs cursor-pointer font-serif tracking-wide"
              >
                Continue to Step 0{currentStep + 1} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );

  // Helper renderer to output Coach panel directly inside forms
  function renderCoachPanel(sectionId: string) {
    const analysis = brandData.analysis[sectionId];
    const isLoading = analysisLoading[sectionId];

    return (
      <div className="border border-editorial-border rounded-none bg-editorial-border-light overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-editorial-border bg-editorial-border flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-ink" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink font-mono">AI Strategy Coach Stress-Test</h4>
          </div>
          <button
            type="button"
            onClick={() => analyzeSection(sectionId)}
            disabled={isLoading}
            className="px-3 py-1.5 bg-white hover:bg-editorial-border-light text-ink border border-editorial-border text-[10px] font-bold rounded-none transition flex items-center gap-1 cursor-pointer font-mono"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" /> Stress-testing...
              </>
            ) : (
              <>
                <Activity className="w-3 h-3" /> Stress-Test Now
              </>
            )}
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isLoading ? (
            <div className="py-4 text-center">
              <Loader2 className="w-6 h-6 text-ink animate-spin mx-auto" />
              <p className="text-[11px] text-editorial-secondary mt-2 font-sans">Checking pricing alignment, customer demographics, and cultural positioning...</p>
            </div>
          ) : analysis ? (
            <div className="space-y-4 text-xs leading-normal">
              <div>
                <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest block mb-1 font-mono">Coach Summary</span>
                <p className="text-ink font-sans leading-relaxed">{analysis.summary}</p>
              </div>

              {analysis.contradictions?.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest block mb-1 font-mono">Detected Contradictions & Blindspots</span>
                  <ul className="space-y-1.5">
                    {analysis.contradictions.map((c, i) => (
                      <li key={i} className="text-editorial-secondary flex items-start gap-1.5 font-sans">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.suggestions?.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-ink uppercase tracking-widest block mb-1 font-mono">Coach Recommendations</span>
                  <ul className="space-y-1.5">
                    {analysis.suggestions.map((s, i) => (
                      <li key={i} className="text-editorial-secondary flex items-start gap-1.5 font-sans">
                        <Lightbulb className="w-3.5 h-3.5 text-ink flex-shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-[11px] text-editorial-secondary font-sans">
                Click "Stress-Test Now" to run real-time consistency checks and audit your answers for blindspots.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
}
