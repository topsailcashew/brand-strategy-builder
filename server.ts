import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { jsPDF } from 'jspdf';
import { PDFParse } from 'pdf-parse';

// Load .env.local first (takes priority; dotenv won't override already-set
// vars), then .env. In AI Studio, GEMINI_API_KEY is injected as a real env var
// at runtime, so neither file is required there.
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// Health check for hosting platforms (Render/Cloud Run) and uptime monitoring.
app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    gemini: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
    liveSearch: !!process.env.TAVILY_API_KEY,
    accounts: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY,
    time: new Date().toISOString()
  });
});

// Cloud Run injects PORT (default 8080); fall back to 3000 for local dev.
const PORT = Number(process.env.PORT) || 3000;

// Initialize Gemini API Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Tavily live web search (independent of Google). Free tier at tavily.com.
const tavilyKey = process.env.TAVILY_API_KEY;

async function tavilySearch(query: string) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: tavilyKey,
      query,
      search_depth: 'advanced',
      include_answer: true,
      max_results: 8
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily search failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<{
    answer?: string;
    results?: { title: string; url: string; content: string }[];
  }>;
}

// 0. API: Stress Test Rough Idea
app.post('/api/stress-test-idea', async (req, res) => {
  try {
    const { roughIdea } = req.body;

    if (!roughIdea || roughIdea.trim().length === 0) {
      return res.status(400).json({ error: "Rough idea is required." });
    }

    if (!ai) {
      // Offline/fallback mock for stress test
      return res.json({
        isMock: true,
        stressTest: {
          viabilityScore: 78,
          marketRealities: [
            "Customer acquisition costs are rising, and physical distribution in high-traffic retail spaces is capital-intensive.",
            "Local consumers in emerging markets love premium styling but are highly price-sensitive when domestic premium brands launch.",
            "Visual identity must convey high prestige immediately to justify premium price tags over imported global giants."
          ],
          criticalFrictionPoints: [
            "Wanting premium positioning but launching without established influencer/prestige marketing loops.",
            "Modest or cultural motifs can sometimes skew 'traditional' or 'touristy' unless balanced with high-end modern streetwear cuts."
          ],
          strategicChallenges: [
            "How will you build initial brand desire so that customers feel proud wearing your symbol in public?",
            "What is your supply chain strategy to maintain high premium stitching quality while keeping production costs viable?"
          ]
        },
        extractedData: {
          businessName: "Nuru & Co",
          industry: "Fashion / Premium Streetwear",
          location: "Dar es Salaam, Tanzania",
          products: "Oversized cotton hoodies, bespoke tailored print jackets, and embroidered modest wear.",
          vision: "To position Afro-urban luxury as a globally revered apparel category.",
          mission: "Bridging cultural heritage with bold modern street silhouettes for conscious urbanites.",
          values: "Cultural authenticity, high-integrity tailoring, youth empowerment",
          targetSegments: "Young urban professionals (20-35), creative entrepreneurs, and modest styling advocates.",
          uvp: "Uncompromising premium materials carrying deep East African storytelling motifs.",
          pricingStrategy: "premium",
          pricingDescription: "High-value pricing backed by limited batch runs and elite packaging.",
          traits: "Authentic, Bold, Cultural, Premium",
          styles: ["streetwear", "bold", "minimal"]
        }
      });
    }

    const prompt = `
You are an elite, highly critical venture strategist, brand consultant, and business stress-tester.
The user has submitted a rough description of their business idea:
"""
${roughIdea}
"""

Please thoroughly analyze and stress-test this business concept as a professional strategist. Do not beat around the bush; challenge them on real business hurdles, market viability, supply-chain/distribution limits, and intrinsic contradictions (e.g., premium position but generic products, or niche target but high-volume pricing).

Produce two key outputs in valid JSON:
1. "stressTest": An uncompromising evaluation containing:
   - "viabilityScore" (an integer 1 to 100 based on your strategic assessment of their rough description)
   - "marketRealities" (3-4 tough, specific, localized market barriers, realities, and risks they will face)
   - "criticalFrictionPoints" (2-3 contradictions, operational traps, or blindspots in their current rough thinking)
   - "strategicChallenges" (2-3 deep, challenging, open-ended questions they must answer to build a sustainable company)

2. "extractedData": An extraction of key brand workbook attributes based on their rough idea. Make these outputs premium, sharp, and highly tailored (do not use generic boilerplate) so they can populate the workbook and build upon them:
   - "businessName" (suggested clean name if not provided, or formatted)
   - "industry" (suitable industry/niche)
   - "location" (location mentioned or inferred)
   - "products" (concrete high-value products or service descriptions)
   - "vision" (inspiring, bold 1-sentence brand vision)
   - "mission" (precise, action-focused brand mission)
   - "values" (3 core values separated by commas)
   - "targetSegments" (well-defined key customer segments)
   - "uvp" (a razor-sharp Unique Value Proposition)
   - "pricingStrategy" (strictly one of: "budget", "mid-range", "premium", "mixed")
   - "pricingDescription" (rationale for pricing and tier)
   - "traits" (3-4 brand personality traits, comma-separated)
   - "styles" (array of 1-3 lowercase style keys from: "minimal", "bold", "streetwear", "classic", "liturgical", "earthy")

Respond with valid JSON according to this structure:
{
  "stressTest": {
    "viabilityScore": Number,
    "marketRealities": ["String", "String", ...],
    "criticalFrictionPoints": ["String", "String", ...],
    "strategicChallenges": ["String", "String", ...]
  },
  "extractedData": {
    "businessName": "String",
    "industry": "String",
    "location": "String",
    "products": "String",
    "vision": "String",
    "mission": "String",
    "values": "String",
    "targetSegments": "String",
    "uvp": "String",
    "pricingStrategy": "String",
    "pricingDescription": "String",
    "traits": "String",
    "styles": ["String", "String", ...]
  }
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stressTest: {
              type: Type.OBJECT,
              properties: {
                viabilityScore: { type: Type.INTEGER },
                marketRealities: { type: Type.ARRAY, items: { type: Type.STRING } },
                criticalFrictionPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                strategicChallenges: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['viabilityScore', 'marketRealities', 'criticalFrictionPoints', 'strategicChallenges']
            },
            extractedData: {
              type: Type.OBJECT,
              properties: {
                businessName: { type: Type.STRING },
                industry: { type: Type.STRING },
                location: { type: Type.STRING },
                products: { type: Type.STRING },
                vision: { type: Type.STRING },
                mission: { type: Type.STRING },
                values: { type: Type.STRING },
                targetSegments: { type: Type.STRING },
                uvp: { type: Type.STRING },
                pricingStrategy: { type: Type.STRING },
                pricingDescription: { type: Type.STRING },
                traits: { type: Type.STRING },
                styles: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: [
                'businessName', 'industry', 'location', 'products', 'vision', 'mission',
                'values', 'targetSegments', 'uvp', 'pricingStrategy', 'pricingDescription',
                'traits', 'styles'
              ]
            }
          },
          required: ['stressTest', 'extractedData']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);

  } catch (error: any) {
    console.error("Error in idea stress test:", error);
    res.status(500).json({ error: error.message || 'Failed to stress test idea' });
  }
});

// 0.5. API: Live Online Market Research (Google Search grounded)
app.post('/api/market-research', async (req, res) => {
  try {
    const { roughIdea, business, market } = req.body;

    const ideaContext = [
      roughIdea ? `Rough idea pitch:\n"""${roughIdea}"""` : '',
      business?.name ? `Business name: ${business.name}` : '',
      business?.industry ? `Industry / niche: ${business.industry}` : '',
      business?.location ? `Location & primary market: ${business.location}` : '',
      business?.products ? `Products / services: ${business.products}` : '',
      market?.targetRegions ? `Target regions: ${market.targetRegions}` : '',
      market?.targetSegments ? `Target segments: ${market.targetSegments}` : '',
      market?.uvp ? `Claimed UVP: ${market.uvp}` : ''
    ].filter(Boolean).join('\n');

    if (!ideaContext.trim()) {
      return res.status(400).json({ error: "Provide a rough idea or business details before running market research." });
    }

    if (!ai || !tavilyKey) {
      // Offline/fallback mock so the UI remains explorable without keys
      return res.json({
        isMock: true,
        summary: "Offline preview: this is simulated research. Set GEMINI_API_KEY and TAVILY_API_KEY to run live web research.",
        competitors: [
          { name: "Kalu Streetwear", url: "https://example.com/kalu", positioning: "Hype-driven local streetwear with celebrity endorsements.", strengths: "Strong Instagram presence and drop culture.", weaknesses: "Inconsistent quality control and sizing complaints.", threatLevel: "high" },
          { name: "Heritage Co", url: "https://example.com/heritage", positioning: "Traditional fabrics for a conservative market.", strengths: "Established supplier relationships.", weaknesses: "Dated designs that miss the youth market.", threatLevel: "medium" }
        ],
        trends: [
          "African streetwear is seeing rising global visibility through diaspora-led fashion weeks.",
          "Consumers increasingly demand supply-chain transparency and ethical wage claims to be verifiable."
        ],
        challenges: [
          "Import competition on price remains brutal in emerging fashion markets.",
          "Premium local positioning requires sustained content marketing budgets most founders underestimate."
        ],
        opportunities: [
          "No dominant local player currently owns the 'verified ethical premium' narrative."
        ],
        sources: []
      });
    }

    // Step 1: live web search via Tavily (independent of Google grounding)
    const searchQuery = [
      business?.industry || '',
      'competitors, pricing, market trends and challenges',
      business?.location ? `in ${business.location}` : '',
      roughIdea ? `— concept: ${roughIdea.slice(0, 300)}` : (business?.products ? `— offering: ${business.products.slice(0, 200)}` : '')
    ].filter(Boolean).join(' ');

    const tav = await tavilySearch(searchQuery);
    const webResults = tav.results || [];
    const sources = webResults
      .map((r) => ({ title: r.title || r.url, url: r.url }))
      .filter((s) => s.url);
    const webContext = webResults
      .map((r, i) => `[${i + 1}] ${r.title} (${r.url})\n${(r.content || '').slice(0, 800)}`)
      .join('\n\n');

    // Step 2: structure the live web findings into JSON with Gemini (no grounding)
    const structured = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `
You are a market research analyst. Using ONLY the live web search results below, produce a structured analysis for this business concept. Do not invent competitors or facts that are not supported by the results; if the results are thin, say so honestly in the summary.

BUSINESS CONCEPT:
${ideaContext}

WEB SEARCH SUMMARY:
${tav.answer || '(none provided)'}

LIVE WEB SEARCH RESULTS (your only source of facts):
"""
${webContext || '(no results returned)'}
"""

Structure:
- "summary": 2-3 sentence executive summary of the market landscape.
- "competitors": array of competitors found (name, url or empty string, positioning, strengths, weaknesses, threatLevel strictly one of "low"|"medium"|"high").
- "trends": array of 3-5 current market trend strings.
- "challenges": array of 3-5 concrete challenge strings for a new entrant.
- "opportunities": array of 2-4 whitespace opportunity strings.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            competitors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  url: { type: Type.STRING },
                  positioning: { type: Type.STRING },
                  strengths: { type: Type.STRING },
                  weaknesses: { type: Type.STRING },
                  threatLevel: { type: Type.STRING }
                },
                required: ['name', 'url', 'positioning', 'strengths', 'weaknesses', 'threatLevel']
              }
            },
            trends: { type: Type.ARRAY, items: { type: Type.STRING } },
            challenges: { type: Type.ARRAY, items: { type: Type.STRING } },
            opportunities: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['summary', 'competitors', 'trends', 'challenges', 'opportunities']
        }
      }
    });

    const parsed = JSON.parse(structured.text || '{}');
    res.json({ ...parsed, sources, researchedAt: new Date().toISOString() });

  } catch (error: any) {
    console.error("Error in market research:", error);
    res.status(500).json({ error: error.message || 'Failed to run market research' });
  }
});

// 0.6. API: AI pushback on founder's answers to strategic challenges
app.post('/api/challenge-feedback', async (req, res) => {
  try {
    const { challenge, answer, roughIdea, business } = req.body;

    if (!challenge || !answer || !answer.trim()) {
      return res.status(400).json({ error: "Both the challenge question and your answer are required." });
    }

    if (!ai) {
      return res.json({
        isMock: true,
        verdict: "partial",
        pushback: "Offline preview: your answer names an intention but not a mechanism. How exactly would the first 100 customers hear about you, and what does that cost?",
        gaps: ["No concrete acquisition channel named.", "No numbers attached to the claim."],
        followUpQuestion: "If your primary channel underperforms by half, what is plan B?"
      });
    }

    const contextBits = [
      roughIdea ? `Their rough idea: """${roughIdea}"""` : '',
      business?.name ? `Business: ${business.name} (${business.industry || 'industry unspecified'})` : ''
    ].filter(Boolean).join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `
You are a tough but fair venture strategist stress-testing a founder. You previously asked them this challenge question:
"${challenge}"

${contextBits}

Their answer:
"""
${answer}
"""

Evaluate the answer like a skeptical investor. Reward specificity, numbers, and named mechanisms; penalize vague intentions, buzzwords, and wishful thinking. Do not be cruel, but do not let weak reasoning pass.

Respond in JSON:
- "verdict": strictly one of "strong" | "partial" | "weak"
- "pushback": 2-3 sentences of direct, specific pushback or (if strong) what makes it credible plus the next risk to address
- "gaps": array of 1-3 concrete things missing from the answer
- "followUpQuestion": one harder follow-up question that digs into the weakest part of their answer`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdict: { type: Type.STRING },
            pushback: { type: Type.STRING },
            gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            followUpQuestion: { type: Type.STRING }
          },
          required: ['verdict', 'pushback', 'gaps', 'followUpQuestion']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);

  } catch (error: any) {
    console.error("Error in challenge feedback:", error);
    res.status(500).json({ error: error.message || 'Failed to evaluate answer' });
  }
});

// 0.65. API: Re-evaluate the idea after the founder addresses evaluation items
app.post('/api/reevaluate-idea', async (req, res) => {
  try {
    const { roughIdea, marketResearchSummary, previousScore, items } = req.body;

    const addressed = (items || []).filter((it: any) => it.response && it.response.trim());

    if (!roughIdea || !roughIdea.trim()) {
      return res.status(400).json({ error: "The original idea is required to re-evaluate." });
    }

    if (!ai) {
      // Offline/fallback: nudge the score up for addressed items and mark them.
      const bump = Math.min(addressed.length * 4, 100 - (previousScore || 60));
      const newScore = Math.min((previousScore || 60) + bump, 96);
      return res.json({
        isMock: true,
        score: newScore,
        verdict: newScore >= 80 ? "Strengthening / Investable" : "Improving with Gaps",
        summary: "Offline preview: addressed items were credited heuristically. Configure GEMINI_API_KEY for a real re-evaluation that weighs the substance of your responses.",
        items: (items || []).map((it: any) => ({
          id: it.id,
          status: it.response && it.response.trim() ? 'partial' : 'open',
          assessment: it.response && it.response.trim()
            ? "Noted. In live mode the strategist will judge whether this response actually resolves the risk."
            : "Still unaddressed."
        })),
        newItems: []
      });
    }

    const itemsBlock = (items || []).map((it: any, i: number) =>
      `[${it.id}] (${it.category}) ISSUE: ${it.text}\n    FOUNDER'S RESPONSE: ${it.response && it.response.trim() ? it.response : '(no response yet)'}`
    ).join('\n\n');

    const prompt = `
You are an elite, skeptical venture strategist running a RE-EVALUATION of a business idea. The founder previously received a critical evaluation and has now written responses to some of the issues. Your job is to judge, honestly, whether each response genuinely resolves the issue — reward specificity, numbers, and concrete mechanisms; do not let vague intentions or buzzwords count as resolved.

ORIGINAL IDEA:
"""
${roughIdea}
"""
${marketResearchSummary ? `\nLIVE MARKET RESEARCH CONTEXT:\n"""${marketResearchSummary}"""\n` : ''}
PREVIOUS VIABILITY SCORE: ${previousScore ?? 'unknown'} / 100

EVALUATION ITEMS AND THE FOUNDER'S RESPONSES:
${itemsBlock}

Do the following:
1. Re-score overall viability (0-100). It should rise only insofar as responses genuinely reduce real risk; it can stay flat or fall if responses are weak or introduce new contradictions.
2. For EACH item id above, assign a status: "resolved" (response convincingly handles it), "partial" (helps but incomplete), or "open" (no/weak response), plus a one-sentence assessment explaining the judgment.
3. Surface up to 2 NEW issues that the founder's responses reveal or that still block viability (empty array if none).

Respond with valid JSON:
{
  "score": Number,
  "verdict": "short label for the score",
  "summary": "2-3 sentence narrative of what improved and what still needs work",
  "items": [ { "id": "String", "status": "resolved|partial|open", "assessment": "String" } ],
  "newItems": [ { "category": "friction|challenge|market", "text": "String" } ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            verdict: { type: Type.STRING },
            summary: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  status: { type: Type.STRING },
                  assessment: { type: Type.STRING }
                },
                required: ['id', 'status', 'assessment']
              }
            },
            newItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  text: { type: Type.STRING }
                },
                required: ['category', 'text']
              }
            }
          },
          required: ['score', 'verdict', 'summary', 'items', 'newItems']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);

  } catch (error: any) {
    console.error("Error re-evaluating idea:", error);
    res.status(500).json({ error: error.message || 'Failed to re-evaluate idea' });
  }
});

// 0.7. API: Runtime client config (Supabase). The anon key is safe to expose;
// Row-Level Security enforces access. Missing => app runs in local-only mode.
app.get('/api/config', (_req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  });
});

// PDF Pitch parsing & processing
app.post('/api/parse-pdf', async (req, res) => {
  try {
    const { fileBase64, fileName } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: "No PDF data provided" });
    }

    const base64Data = fileBase64.replace(/^data:application\/pdf;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    let extractedText = "";
    let parseError = null;

    try {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const parsedPdf = await parser.getText();
      extractedText = parsedPdf.text || "";
      await parser.destroy();
    } catch (e: any) {
      console.warn("pdf-parse library failed to parse PDF:", e);
      parseError = e.message || e;
    }

    // Clean up extracted text (remove multiple spaces/lines/null characters)
    extractedText = extractedText
      .replace(/\0/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // If text extraction is empty or very low, or fails, and Gemini client is available,
    // let's use Gemini to natively extract the content of the PDF.
    if ((!extractedText || extractedText.length < 100) && ai) {
      console.log("Extracted text was short or failed. Attempting Gemini multimodal extraction...");
      try {
        const prompt = `
You are an elite, highly detailed startup strategy coach and venture analyst.
The user has uploaded a business pitch deck or description document as a PDF.
Your goal is to read this PDF document and extract, synthesize, and compile a comprehensive, highly structured, and deep business idea description.

Please:
1. Thoroughly read all pages and sections of the PDF.
2. Compile a detailed, coherent, and highly professional description of their business idea, including:
   - What the business does, the products/services, and the vision.
   - The unique value proposition (UVP) and any cultural or premium styling accents.
   - Who the target audience or customer segments are.
   - Any mentioned locations, price points, costing strategy, or operational plans.

Make sure the output is written as a clear, detailed, and clean first-person or third-person pitch that can be put into our brand builder's rough idea box. Do not include any meta-commentary, markdown headers, or introductory/concluding remarks. Just output the clean, comprehensive business pitch.
`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: "application/pdf"
              }
            }
          ]
        });

        if (response.text) {
          extractedText = response.text.trim();
        }
      } catch (geminiErr: any) {
        console.error("Gemini PDF extraction failed:", geminiErr);
        if (!extractedText) {
          throw new Error(`Failed to parse PDF: ${parseError || geminiErr.message}`);
        }
      }
    }

    if (!extractedText || extractedText.length === 0) {
      throw new Error("We could not extract any readable text from this PDF file. It might be empty, corrupted, or password-protected.");
    }

    res.json({ text: extractedText });

  } catch (error: any) {
    console.error("Error parsing PDF pitch:", error);
    res.status(500).json({ error: error.message || 'Failed to process PDF file' });
  }
});

// 1. API: Analyze Section & Stress Test
app.post('/api/analyze-section', async (req, res) => {
  try {
    const { sectionId, currentData, fullDataSoFar } = req.body;

    if (!ai) {
      return res.json({
        summary: "Note: Gemini API Key is not configured. Running in offline/preview mode.",
        contradictions: ["API Key not configured in Secrets."],
        suggestions: ["Configure GEMINI_API_KEY in the AI Studio Secrets panel to enable real-time stress testing."]
      });
    }

    const prompt = `
You are a senior brand consultant and strategy coach. Analyze this section of a business's brand strategy workbook to provide a constructive "stress test" and review.

Section Name: ${sectionId}
Section Data: ${JSON.stringify(currentData, null, 2)}
Full brand profile collected so far: ${JSON.stringify(fullDataSoFar, null, 2)}

Please perform three tasks:
1. Provide a concise, encouraging, and sharp 2-3 sentence summary of what the entrepreneur has established in this section.
2. Identify any contradictions or blindspots. A contradiction might be targeting high-end luxury while having a cheap budget price strategy, or wanting a bold streetwear vibe but selecting a traditional liturgical style without context. List them clearly.
3. Suggest 2-3 precise, action-oriented feedback questions or recommendations that help the founder fill gaps or clarify their positioning.

Respond with valid JSON according to this structure:
{
  "summary": "String",
  "contradictions": ["String 1", "String 2"],
  "suggestions": ["String 1", "String 2"]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            contradictions: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['summary', 'contradictions', 'suggestions']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);

  } catch (error: any) {
    console.error("Error analyzing section:", error);
    res.status(500).json({ error: error.message || 'Failed to analyze section' });
  }
});

// 2. API: Generate Brand Guide
app.post('/api/generate-brand-guide', async (req, res) => {
  try {
    const { brandData, marketResearch } = req.body;

    if (!ai) {
      // Return beautiful fallback mock so the app remains fully functional without a key
      return res.json({
        isMock: true,
        brandGuide: getFallbackBrandGuide(brandData)
      });
    }

    const prompt = `
You are a elite Brand Strategist and Creative Director. Use the provided raw brand data to generate a cohesive, deeply professional, and inspiring "Brand Guide".

Raw Workbook Inputs:
${JSON.stringify(brandData, null, 2)}
${marketResearch ? `
Live Online Market Research Findings (real competitors, trends, and challenges found via web research — use these to sharpen positioning and differentiation against actual competitors):
${JSON.stringify({ summary: marketResearch.summary, competitors: marketResearch.competitors, trends: marketResearch.trends, challenges: marketResearch.challenges, opportunities: marketResearch.opportunities }, null, 2)}
` : ''}
Synthesize these inputs into a beautiful structured guide.
Rules:
1. Select 3 specific, elegant color swatches with name, hex value (e.g. #2C3E50), and precise usage notes. Ensure the hex colors form a stunning palette (e.g., earthy, streetwear dark slate, pastel, minimalist cream/gold) that fits the brand's style inputs.
2. Select 2 fonts: one for Headings (e.g., Space Grotesk, Playfair Display, Outfit) and one for Body text (e.g., Inter, JetBrains Mono, Source Sans) with role, usage rules, and pairing description.
3. Formulate precise launch steps and brand guidelines.
4. Synthesize personas into fully formed archetypes with taglines, summary of buying behavior, and a tailored key message for each.

Respond strictly in JSON matching this structure:
{
  "overview": {
    "title": "String",
    "summary": "String",
    "tagline": "String"
  },
  "personas": [
    {
      "name": "String",
      "tagline": "String",
      "summary": "String",
      "archetype": "String",
      "keyMessage": "String"
    }
  ],
  "positioning": {
    "statement": "String",
    "uvpExplained": "String",
    "pricingStrategyNotes": "String"
  },
  "voice": {
    "traits": ["String"],
    "styleGuide": "String",
    "dosAndDonts": [
      { "do": "String", "dont": "String" }
    ]
  },
  "visualIdentity": {
    "colors": [
      { "name": "String", "hex": "String", "usage": "String" }
    ],
    "fonts": [
      { "role": "String", "name": "String", "usage": "String", "pairing": "String" }
    ],
    "layouts": [
      { "title": "String", "guideline": "String" }
    ],
    "photographyDirection": ["String"],
    "logoDescription": "String"
  },
  "assets": {
    "logoGuidelines": "String",
    "socialMediaTemplates": "String",
    "printRecommendations": "String",
    "merchIdeas": "String"
  },
  "implementation": {
    "launchSteps": ["String"],
    "consistencyChecklist": ["String"]
  },
  "handoff": {
    "designerNotes": "String",
    "developerNotes": "String"
  }
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overview: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                tagline: { type: Type.STRING }
              },
              required: ['title', 'summary', 'tagline']
            },
            personas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  tagline: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  archetype: { type: Type.STRING },
                  keyMessage: { type: Type.STRING }
                },
                required: ['name', 'tagline', 'summary', 'archetype', 'keyMessage']
              }
            },
            positioning: {
              type: Type.OBJECT,
              properties: {
                statement: { type: Type.STRING },
                uvpExplained: { type: Type.STRING },
                pricingStrategyNotes: { type: Type.STRING }
              },
              required: ['statement', 'uvpExplained', 'pricingStrategyNotes']
            },
            voice: {
              type: Type.OBJECT,
              properties: {
                traits: { type: Type.ARRAY, items: { type: Type.STRING } },
                styleGuide: { type: Type.STRING },
                dosAndDonts: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      do: { type: Type.STRING },
                      dont: { type: Type.STRING }
                    },
                    required: ['do', 'dont']
                  }
                }
              },
              required: ['traits', 'styleGuide', 'dosAndDonts']
            },
            visualIdentity: {
              type: Type.OBJECT,
              properties: {
                colors: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      hex: { type: Type.STRING },
                      usage: { type: Type.STRING }
                    },
                    required: ['name', 'hex', 'usage']
                  }
                },
                fonts: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      role: { type: Type.STRING },
                      name: { type: Type.STRING },
                      usage: { type: Type.STRING },
                      pairing: { type: Type.STRING }
                    },
                    required: ['role', 'name', 'usage', 'pairing']
                  }
                },
                layouts: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      guideline: { type: Type.STRING }
                    },
                    required: ['title', 'guideline']
                  }
                },
                photographyDirection: { type: Type.ARRAY, items: { type: Type.STRING } },
                logoDescription: { type: Type.STRING }
              },
              required: ['colors', 'fonts', 'layouts', 'photographyDirection', 'logoDescription']
            },
            assets: {
              type: Type.OBJECT,
              properties: {
                logoGuidelines: { type: Type.STRING },
                socialMediaTemplates: { type: Type.STRING },
                printRecommendations: { type: Type.STRING },
                merchIdeas: { type: Type.STRING }
              },
              required: ['logoGuidelines', 'socialMediaTemplates', 'printRecommendations', 'merchIdeas']
            },
            implementation: {
              type: Type.OBJECT,
              properties: {
                launchSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                consistencyChecklist: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['launchSteps', 'consistencyChecklist']
            },
            handoff: {
              type: Type.OBJECT,
              properties: {
                designerNotes: { type: Type.STRING },
                developerNotes: { type: Type.STRING }
              },
              required: ['designerNotes', 'developerNotes']
            }
          },
          required: [
            'overview', 'personas', 'positioning', 'voice', 'visualIdentity',
            'assets', 'implementation', 'handoff'
          ]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);

  } catch (error: any) {
    console.error("Error generating brand guide:", error);
    res.status(500).json({ error: error.message || 'Failed to generate brand guide' });
  }
});

// 3. API: Generate Image via Gemini (with elegant mock support)
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio } = req.body;

    if (!ai) {
      return res.json({ isMock: true, reason: "No API Key configured" });
    }

    // Try calling the image generation model (requires paid key flow/permission)
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "1:1",
          imageSize: "512px"
        }
      }
    });

    let base64Image = "";
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (base64Image) {
      res.json({ imageUrl: base64Image });
    } else {
      res.json({ isMock: true, reason: "No image inline data returned" });
    }

  } catch (error: any) {
    console.warn("Image generation failed or not permitted, falling back to dynamic visual design elements:", error.message);
    res.json({ isMock: true, error: error.message });
  }
});

// 4. API: Programmatic Multi-Page PDF Exporter
app.post('/api/generate-pdf', (req, res) => {
  try {
    const { brandGuide, businessName } = req.body;

    if (!brandGuide) {
      return res.status(400).send("Brand guide data is required");
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = brandGuide.visualIdentity?.colors?.[0]?.hex || '#1E293B';
    const secondaryColor = brandGuide.visualIdentity?.colors?.[1]?.hex || '#475569';
    const accentColor = brandGuide.visualIdentity?.colors?.[2]?.hex || '#D97706';

    const hexToRgb = (hex: string) => {
      const match = hex.replace(/^#/, '').match(/.{1,2}/g);
      return match ? {
        r: parseInt(match[0], 16),
        g: parseInt(match[1], 16),
        b: parseInt(match[2], 16)
      } : { r: 30, g: 41, b: 59 };
    };

    const primaryRgb = hexToRgb(primaryColor);
    const accentRgb = hexToRgb(accentColor);

    // Helper to draw a modern Header
    const drawHeader = (pageTitle: string) => {
      doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.rect(10, 10, 190, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text(pageTitle.toUpperCase(), 15, 15);
      
      doc.setTextColor(100, 116, 139);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`${businessName || 'Brand Strategy Guide'}`, 190, 15, { align: 'right' });

      // Border line
      doc.setDrawColor(226, 232, 240);
      doc.line(10, 20, 200, 20);
    };

    // Helper to draw Footer
    const drawFooter = (pageNum: number) => {
      doc.setDrawColor(226, 232, 240);
      doc.line(10, 280, 200, 280);
      doc.setTextColor(148, 163, 184);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Generated by Brand Strategy Builder", 15, 285);
      doc.text(`Page ${pageNum}`, 190, 285, { align: 'right' });
    };

    // --- PAGE 1: COVER ---
    // Background Slate accents
    doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.rect(0, 0, 210, 95, 'F');

    // Colored accent band
    doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.rect(0, 95, 210, 8, 'F');

    // Text Content on Cover
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(28);
    doc.text(brandGuide.overview?.title || "BRAND BOOK", 20, 45);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(14);
    doc.text(brandGuide.overview?.tagline || "Brand Strategy & Visual Guidelines", 20, 58);

    doc.setFillColor(248, 250, 252);
    doc.rect(0, 103, 210, 197, 'F');

    doc.setTextColor(30, 41, 59);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.text("PREPARED FOR:", 20, 135);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.text(businessName || "Your Enterprise", 20, 145);

    doc.setTextColor(100, 116, 139);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text("DATE OF STRATEGY CREATION:", 20, 165);
    doc.setTextColor(30, 41, 59);
    doc.setFont("Helvetica", "bold");
    doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 20, 172);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text("AUTHOR:", 20, 192);
    doc.setTextColor(30, 41, 59);
    doc.text("Interactive Brand Strategy Consultant & Gemini AI", 20, 199);

    // Decorative geometric swatches on Cover
    doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.rect(140, 210, 50, 50, 'F');
    doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
    doc.rect(145, 215, 40, 40, 'F');

    // --- PAGE 2: TABLE OF CONTENTS & OVERVIEW ---
    doc.addPage();
    drawHeader("01 / Brand Overview & Positioning");
    
    doc.setTextColor(30, 41, 59);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Executive Summary", 15, 32);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(brandGuide.overview?.summary || "", 180);
    doc.text(summaryLines, 15, 40);

    // Positioning Section
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Market & Positioning Statement", 15, 95);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    const positionLines = doc.splitTextToSize(brandGuide.positioning?.statement || "", 180);
    doc.text(positionLines, 15, 103);

    // UVP Section
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Unique Value Proposition (UVP)", 15, 145);

    doc.setFont("Helvetica", "normal");
    const uvpLines = doc.splitTextToSize(brandGuide.positioning?.uvpExplained || "", 180);
    doc.text(uvpLines, 15, 152);

    // Pricing notes
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Pricing & Market Tier Notes", 15, 195);
    const priceLines = doc.splitTextToSize(brandGuide.positioning?.pricingStrategyNotes || "", 180);
    doc.text(priceLines, 15, 202);

    drawFooter(2);

    // --- PAGE 3: CUSTOMER PERSONAS ---
    doc.addPage();
    drawHeader("02 / Target Customer Personas");

    doc.setTextColor(30, 41, 59);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Target Customer Archetypes", 15, 32);

    let currentY = 42;
    brandGuide.personas?.forEach((p: any, i: number) => {
      if (currentY > 220) {
        drawFooter(3);
        doc.addPage();
        drawHeader("02 / Target Customer Personas (Continued)");
        currentY = 32;
      }

      doc.setFillColor(241, 245, 249);
      doc.rect(12, currentY, 186, 68, 'F');

      doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.setLineWidth(1);
      doc.line(12, currentY, 12, currentY + 68);

      doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`${i + 1}. ${p.name || 'Unnamed Persona'}`, 18, currentY + 7);

      doc.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(9);
      doc.text(`"${p.tagline || 'Target segment'}"`, 18, currentY + 12);

      doc.setTextColor(30, 41, 59);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(`Archetype Category: ${p.archetype || 'Loyal Patron'}`, 18, currentY + 18);

      doc.setFont("Helvetica", "bold");
      doc.text("Profile & Core Objections:", 18, currentY + 24);
      doc.setFont("Helvetica", "normal");
      const pSummary = doc.splitTextToSize(p.summary || "", 170);
      doc.text(pSummary, 18, currentY + 29);

      doc.setFont("Helvetica", "bold");
      doc.text("Tailored Key Messaging Approach:", 18, currentY + 48);
      doc.setFont("Helvetica", "italic");
      const pMessage = doc.splitTextToSize(p.keyMessage || "", 170);
      doc.text(pMessage, 18, currentY + 53);

      currentY += 76;
    });

    drawFooter(3);

    // --- PAGE 4: VOICE & PERSONALITY ---
    doc.addPage();
    drawHeader("03 / Brand Personality & Voice");

    doc.setTextColor(30, 41, 59);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Tone & Personality Profile", 15, 32);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Primary Brand Voice Traits:", 15, 42);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    const traits = brandGuide.voice?.traits || ["Authentic", "Professional", "Inspiring"];
    traits.forEach((t: string, i: number) => {
      doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
      doc.circle(20, 49 + (i * 6), 1, 'F');
      doc.text(t, 25, 51 + (i * 6));
    });

    let voiceY = 51 + (traits.length * 6) + 12;
    doc.setFont("Helvetica", "bold");
    doc.text("Core Brand Voice & Editorial Guidelines:", 15, voiceY);
    doc.setFont("Helvetica", "normal");
    const styleLines = doc.splitTextToSize(brandGuide.voice?.styleGuide || "", 180);
    doc.text(styleLines, 15, voiceY + 7);

    // Dos & Don'ts Table
    const tableY = voiceY + (styleLines.length * 5) + 15;
    doc.setFont("Helvetica", "bold");
    doc.text("Communication Dos & Don'ts:", 15, tableY);

    doc.setFillColor(241, 245, 249);
    doc.rect(15, tableY + 4, 88, 8, 'F');
    doc.rect(107, tableY + 4, 88, 8, 'F');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(22, 101, 52); // green do
    doc.text("WHAT WE DO (DO)", 20, tableY + 9);
    doc.setTextColor(153, 27, 27); // red don't
    doc.text("WHAT WE AVOID (DON'T)", 112, tableY + 9);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    let doY = tableY + 18;
    brandGuide.voice?.dosAndDonts?.forEach((item: any, i: number) => {
      if (doY > 260) return;
      const doLines = doc.splitTextToSize(item.do || "", 80);
      const dontLines = doc.splitTextToSize(item.dont || "", 80);
      doc.text(doLines, 18, doY);
      doc.text(dontLines, 110, doY);
      doY += Math.max(doLines.length, dontLines.length) * 5 + 4;
    });

    drawFooter(4);

    // --- PAGE 5: VISUAL IDENTITY ---
    doc.addPage();
    drawHeader("04 / Visual Identity Guidelines");

    doc.setTextColor(30, 41, 59);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Color Palette & Swatches", 15, 32);

    // Draw swatches
    let swatchX = 15;
    brandGuide.visualIdentity?.colors?.forEach((c: any, i: number) => {
      const colorRgb = hexToRgb(c.hex);
      // Box border
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.rect(swatchX - 1, 41, 52, 45);

      // Filled box
      doc.setFillColor(colorRgb.r, colorRgb.g, colorRgb.b);
      doc.rect(swatchX, 42, 50, 25, 'F');

      // Labels
      doc.setTextColor(30, 41, 59);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.text(c.name || `Color ${i + 1}`, swatchX + 2, 72);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(c.hex || '#000000', swatchX + 2, 76);

      const usageNotes = doc.splitTextToSize(c.usage || "Brand Accent", 46);
      doc.text(usageNotes, swatchX + 2, 81);

      swatchX += 60;
    });

    // Typography
    doc.setTextColor(30, 41, 59);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Typography Rules", 15, 105);

    let fontY = 113;
    brandGuide.visualIdentity?.fonts?.forEach((f: any) => {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, fontY, 180, 22, 'F');

      doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`${f.role}: ${f.name}`, 18, fontY + 6);

      doc.setTextColor(30, 41, 59);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Rule: ${f.usage}`, 18, fontY + 12);
      doc.text(`Pairing Guide: ${f.pairing}`, 18, fontY + 17);

      fontY += 26;
    });

    // Photography direction
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Creative Photography Direction", 15, fontY + 8);
    let photoY = fontY + 14;
    brandGuide.visualIdentity?.photographyDirection?.forEach((d: string, i: number) => {
      doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b);
      doc.circle(18, photoY + (i * 6) - 1, 0.8, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(d, 23, photoY + (i * 6));
    });

    drawFooter(5);

    // --- PAGE 6: ASSETS & DESIGN IMPLEMENTATION ---
    doc.addPage();
    drawHeader("05 / Asset Implementation Guidelines");

    doc.setTextColor(30, 41, 59);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Logo Usage Guidelines", 15, 32);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    const logoLines = doc.splitTextToSize(brandGuide.assets?.logoGuidelines || "", 180);
    doc.text(logoLines, 15, 40);

    const socY = 40 + (logoLines.length * 5) + 10;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Social Media & Digital Layout Templates", 15, socY);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    const socLines = doc.splitTextToSize(brandGuide.assets?.socialMediaTemplates || "", 180);
    doc.text(socLines, 15, socY + 7);

    const prY = socY + (socLines.length * 5) + 15;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Print Collateral & Merch Requirements", 15, prY);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    const prLines = doc.splitTextToSize(brandGuide.assets?.printRecommendations || "", 180);
    doc.text(prLines, 15, prY + 7);

    const mY = prY + (prLines.length * 5) + 15;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Custom Merch & Touchpoint Ideas", 15, mY);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    const mLines = doc.splitTextToSize(brandGuide.assets?.merchIdeas || "", 180);
    doc.text(mLines, 15, mY + 7);

    drawFooter(6);

    // --- PAGE 7: LAUNCH PLAN & DEVS HANDOFF ---
    doc.addPage();
    drawHeader("06 / Brand Execution & Designer Handoff");

    doc.setTextColor(30, 41, 59);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Brand Launch & Rollout Steps", 15, 32);

    let launchY = 42;
    brandGuide.implementation?.launchSteps?.forEach((step: string, i: number) => {
      doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      doc.rect(15, launchY, 5, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(`${i + 1}`, 16.8, launchY + 3.8);

      doc.setTextColor(30, 41, 59);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      const stepText = doc.splitTextToSize(step, 170);
      doc.text(stepText, 24, launchY + 4);
      launchY += stepText.length * 5 + 4;
    });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Professional Creative Handoff Notes", 15, launchY + 10);

    const blockY = launchY + 16;
    doc.setFillColor(248, 250, 252);
    doc.rect(15, blockY, 85, 55, 'F');
    doc.rect(107, blockY, 85, 55, 'F');

    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("FOR DESIGNERS / AGENCIES", 18, blockY + 6);
    doc.text("FOR DEVELOPERS / ENGINEERS", 110, blockY + 6);

    doc.setTextColor(30, 41, 59);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    const designerLines = doc.splitTextToSize(brandGuide.handoff?.designerNotes || "Ensure color profiles match HEX swatches on packaging designs.", 80);
    const developerLines = doc.splitTextToSize(brandGuide.handoff?.developerNotes || "Import fonts and set Tailwind config standard colors as defined.", 80);
    doc.text(designerLines, 18, blockY + 13);
    doc.text(developerLines, 110, blockY + 13);

    drawFooter(7);

    const pdfBuffer = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${businessName?.replace(/\s+/g, '_') || 'Brand'}_Strategy_Guide.pdf"`);
    res.send(Buffer.from(pdfBuffer));

  } catch (error: any) {
    console.error("PDF generation error:", error);
    res.status(500).send("Error generating PDF: " + error.message);
  }
});

// Mock/Fallback generator when Gemini is not connected
function getFallbackBrandGuide(brandData: any) {
  const bName = brandData.business?.name || "Your Brand";
  const location = brandData.business?.location || "Dar es Salaam, Tanzania";
  const isFaith = brandData.business?.isFaithBased;

  return {
    overview: {
      title: `${bName} Brand Bible`,
      summary: `A comprehensive brand framework designed for ${bName} located in ${location}, synthesizing core goals, unique niche, and values of authenticity and local excellence.`,
      tagline: isFaith ? "Guided by Faith, Defined by Purpose" : "The Rhythm of Excellence & Local Pride"
    },
    personas: (brandData.personas && brandData.personas.length > 0) ? brandData.personas.map((p: any) => ({
      name: p.name || "Nuru, The Trendseeker",
      tagline: `Age ${p.age || '24'}, based in ${p.location || 'Dar es Salaam'}`,
      summary: p.dailyRoutine || "Driven, research-heavy customer seeking products that reflect cultural integrity and style.",
      archetype: "The Cultural Innovator",
      keyMessage: `We honor your calling for authentic, high-quality, modest streetwear that elevates your routine.`
    })) : [
      {
        name: "Nuru, The Trendsetter",
        tagline: "Age 26, Dar es Salaam, Urban professional",
        summary: "Always online (Instagram, TikTok) looking for modest, expressive fashion that carries a message of local identity.",
        archetype: "The Cultural Innovator",
        keyMessage: "We bring you Afro-urban apparel that matches your values and makes no compromises on modern aesthetic."
      },
      {
        name: "Pastor Baraka",
        tagline: "Age 38, Ministry Leader and Father",
        summary: "Highly reverent and church-focused. Needs visual excellence and media tools to reach youth during church gatherings.",
        archetype: "The Faithful Guardian",
        keyMessage: "Professional worship visual series tailored for local ministries to empower worship events gracefully."
      }
    ],
    positioning: {
      statement: `For ambitious consumers in ${location} who want premium alignment, ${bName} delivers outstanding craftsmanship, leveraging a strong sense of purpose.`,
      uvpExplained: brandData.market?.uvp || `Unparalleled cultural storytelling combined with high-quality printing design made locally.`,
      pricingStrategyNotes: `Using a ${brandData.market?.pricingStrategy || 'Premium'} strategy. This positions the brand as highly reliable and prestigious in ${location}.`
    },
    voice: {
      traits: ["Authentic", "Bold", isFaith ? "Reverent" : "Inspiring", "Professional"],
      styleGuide: `Our tone is inspiring yet completely grounded. We use direct language, avoiding fluff. When referencing community, we speak with honor and local pride.`,
      dosAndDonts: [
        { "do": "Use empowering active voice that motivates action and highlights quality.", "dont": "Never use hyper-salesy or cheesy marketing jargon." },
        { "do": "Integrate local Swahili cultural expressions if suitable.", "dont": "Avoid generic translations that feel disconnected." }
      ]
    },
    visualIdentity: {
      colors: [
        { "name": "Dar Indigo", "hex": "#1E3A8A", "usage": "Primary backgrounds, headers, and formal brand presence" },
        { "name": "Zanzibar Spice", "hex": "#D97706", "usage": "Call to action accents, highlights, and secondary logos" },
        { "name": "Ngorongoro Sand", "hex": "#F5F5F4", "usage": "Clean neutral slate backgrounds and elegant canvas backdrops" }
      ],
      fonts: [
        { "role": "Heading", "name": "Space Grotesk", "usage": "Used for hero H1, section cards, and bold taglines", "pairing": "With Inter body font" },
        { "role": "Body", "name": "Inter", "usage": "Used for standard copy, descriptions, and list details", "pairing": "Under Space Grotesk" }
      ],
      layouts: [
        { "title": "Generous Negative Space", "guideline": "Ensure cards have at least 24px of internal padding with deep margins." },
        { "title": "Bento Grid Structure", "guideline": "Align information in clean, solid rounded panels with subtle thin borders." }
      ],
      photographyDirection: [
        "Warm, natural sunlight reflecting outdoor, rich environments.",
        "Close-up product photography emphasizing stitching quality and natural fabric textures.",
        "Expressive community leaders posing gracefully within urban markets."
      ],
      logoDescription: "A minimalist, solid emblem depicting structured lines with clean modern typeface underneath."
    },
    assets: {
      logoGuidelines: `The Wordmark should always sit on a solid background. The secondary Emblem (icon) should only be isolated on profile banners.`,
      socialMediaTemplates: `Use 1080x1080 solid Sand background posts with a single large statement set in Space Grotesk and a thin Zanzibar Spice border.`,
      printRecommendations: `Specify thick textured linen stock for business cards (350gsm) to convey a highly premium touch.`,
      merchIdeas: `Embossed t-shirt prints with subtle neck tag embroidery. Clean minimalist tote bags matching the sand primary background.`
    },
    implementation: {
      launchSteps: [
        "Finalize the 3 key primary and secondary swatches in vector files.",
        "Establish social media visual grid layouts with high-contrast statements.",
        "Order first local sample print run of labels and packaging cards.",
        "Launch with a storytelling focus, outlining why this brand exists."
      ],
      consistencyChecklist: [
        "Are all Instagram post fonts limited strictly to Space Grotesk?",
        "Does the website checkout avoid dark background exceptions?",
        "Is the modest styling guidelines aligned across streetwear and liturgical merchandise?"
      ]
    },
    handoff: {
      designerNotes: "Keep line weights consistent at 1.5pt in logo icons. Rely on our sand/indigo palette.",
      developerNotes: "Initialize Tailwind CSS config with customized primary (#1E3A8A) and secondary (#D97706) values."
    }
  };
}

// Start Server and handle Vite Dev vs Production bundling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Lazily load Vite only in dev so the production container doesn't need it.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
