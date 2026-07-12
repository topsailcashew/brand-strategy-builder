export interface BusinessFoundations {
  name: string;
  location: string;
  industry: string;
  products: string;
  vision: string;
  mission: string;
  values: string; // Comma-separated or list
  longTermGoals3Yr: string;
  longTermGoals10Yr: string;
  isFaithBased: boolean;
  faithDescription?: string;
}

export interface Competitor {
  name: string;
  url?: string;
  strengths: string;
  weaknesses: string;
}

export interface MarketAndPositioning {
  targetRegions: string;
  targetSegments: string;
  competitors: Competitor[];
  uvp: string;
  pricingStrategy: 'budget' | 'mid-range' | 'premium' | 'mixed';
  pricingDescription: string;
  desiredPerception: string; // comma separated or text, e.g., "luxury, streetwear, reverent"
}

export interface CustomerPersona {
  id: string;
  name: string;
  age: string;
  gender: string;
  location: string;
  occupation: string;
  income: string;
  familyStatus: string;
  faithInvolvement?: string;
  dailyRoutine: string;
  painPoints: string;
  needs: string;
  buyingBehavior: string;
  mediaHabits: string;
  influences: string;
  objections: string;
  beforeState: string;
  afterState: string;
}

export interface BrandPersonality {
  traits: string; // comma-separated or list
  voiceScaleFormal: number; // 1 to 5
  voiceScaleSerious: number; // 1 to 5
  voiceScaleTraditional: number; // 1 to 5
  voiceScaleReverent: number; // 1 to 5
  originStory: string;
  narrativeThemes: string;
  taglineDrafts: string;
}

export interface ReferenceBrand {
  name: string;
  url?: string;
  why: string;
}

export interface VisualIdentityInputs {
  colorsLiked: string[];
  colorsDisliked: string[];
  symbolism: string;
  style: string[]; // e.g. minimal, bold, streetwear, Afro-urban, liturgical
  referenceBrands: ReferenceBrand[];
  constraints: string;
}

export interface AssetsNeeded {
  logoTypes: string[]; // wordmark, icon, emblem, combination
  printMaterials: string[]; // business cards, lookbooks, lookbook etc
  digitalAssets: string[]; // instagram, reels, profile picture etc
  merch: string[]; // t-shirts, hoodies, caps, tote bags etc
  ministryAssets: string[]; // sermon slides, lyric videos etc
  customTouchpoints: string;
}

export interface SectionAnalysis {
  summary: string;
  contradictions: string[];
  suggestions: string[];
}

export interface BrandData {
  business: BusinessFoundations;
  market: MarketAndPositioning;
  personas: CustomerPersona[];
  personality: BrandPersonality;
  visualIdentity: VisualIdentityInputs;
  assetsNeeded: AssetsNeeded;
  analysis: Record<string, SectionAnalysis>;
}

// Live Market Research (Google-grounded)

export interface ResearchCompetitor {
  name: string;
  url: string;
  positioning: string;
  strengths: string;
  weaknesses: string;
  threatLevel: 'low' | 'medium' | 'high' | string;
}

export interface ResearchSource {
  title: string;
  url: string;
}

export interface MarketResearch {
  isMock?: boolean;
  summary: string;
  competitors: ResearchCompetitor[];
  trends: string[];
  challenges: string[];
  opportunities: string[];
  sources: ResearchSource[];
  researchedAt?: string;
}

// Living evaluation — persistent, addressable, re-evaluated in rounds

export type EvaluationCategory = 'friction' | 'challenge' | 'market';
export type EvaluationStatus = 'open' | 'addressed' | 'resolved' | 'partial';

export interface EvaluationItem {
  id: string;
  category: EvaluationCategory;
  text: string;
  response: string;        // what the founder wrote to address it
  status: EvaluationStatus;
  assessment?: string;     // AI's note after a re-evaluation round
}

export interface IdeaEvaluation {
  round: number;           // 1 = initial analysis, 2+ = re-evaluations
  score: number;           // current viability score (0-100)
  scoreHistory: number[];  // score at the end of each round, oldest first
  verdict: string;         // short label for the current score
  summary?: string;        // AI narrative after the latest re-evaluation
  items: EvaluationItem[];
  isMock?: boolean;
}

// Response shape from /api/reevaluate-idea
export interface ReevaluationResult {
  isMock?: boolean;
  score: number;
  verdict: string;
  summary: string;
  items: { id: string; status: EvaluationStatus; assessment: string }[];
  newItems: { category: EvaluationCategory; text: string }[];
}

// Brand Guide Outputs

export interface ColorGuide {
  name: string;
  hex: string;
  usage: string;
}

export interface FontGuide {
  role: 'Heading' | 'Body' | 'Accent';
  name: string;
  usage: string;
  pairing: string;
}

export interface LayoutRule {
  title: string;
  guideline: string;
}

export interface BrandGuide {
  overview: {
    title: string;
    summary: string;
    tagline: string;
  };
  personas: {
    name: string;
    tagline: string;
    summary: string;
    archetype: string;
    keyMessage: string;
  }[];
  positioning: {
    statement: string;
    uvpExplained: string;
    pricingStrategyNotes: string;
  };
  voice: {
    traits: string[];
    styleGuide: string;
    dosAndDonts: { do: string; dont: string }[];
  };
  visualIdentity: {
    colors: ColorGuide[];
    fonts: FontGuide[];
    layouts: LayoutRule[];
    photographyDirection: string[];
    logoDescription: string;
  };
  assets: {
    logoGuidelines: string;
    socialMediaTemplates: string;
    printRecommendations: string;
    merchIdeas: string;
  };
  implementation: {
    launchSteps: string[];
    consistencyChecklist: string[];
  };
  handoff: {
    designerNotes: string;
    developerNotes: string;
  };
}
