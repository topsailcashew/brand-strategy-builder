import { BrandData } from './types';

export const INITIAL_BRAND_DATA: BrandData = {
  business: {
    name: '',
    location: 'Dar es Salaam, Tanzania',
    industry: '',
    products: '',
    vision: '',
    mission: '',
    values: '',
    longTermGoals3Yr: '',
    longTermGoals10Yr: '',
    isFaithBased: false,
    faithDescription: ''
  },
  market: {
    targetRegions: '',
    targetSegments: '',
    competitors: [],
    uvp: '',
    pricingStrategy: 'mid-range',
    pricingDescription: '',
    desiredPerception: ''
  },
  personas: [],
  personality: {
    traits: '',
    voiceScaleFormal: 3,
    voiceScaleSerious: 3,
    voiceScaleTraditional: 3,
    voiceScaleReverent: 3,
    originStory: '',
    narrativeThemes: '',
    taglineDrafts: ''
  },
  visualIdentity: {
    colorsLiked: [],
    colorsDisliked: [],
    symbolism: '',
    style: [],
    referenceBrands: [],
    constraints: ''
  },
  assetsNeeded: {
    logoTypes: [],
    printMaterials: [],
    digitalAssets: [],
    merch: [],
    ministryAssets: [],
    customTouchpoints: ''
  },
  analysis: {}
};

export const STYLE_OPTIONS = [
  { value: 'minimal', label: 'Minimalist & Clean', desc: 'Sleek, high negative space, simple lines' },
  { value: 'bold', label: 'Bold & Punchy', desc: 'Heavy typography, high contrast, strong colors' },
  { value: 'streetwear', label: 'Streetwear & Afro-urban', desc: 'Edgy, vibrant, culture-forward style' },
  { value: 'classic', label: 'Classic & Heritage', desc: 'Timeless, serif-driven, trustworthy' },
  { value: 'liturgical', label: 'Liturgical & Traditional', desc: 'Reverent, gold accents, elegant symbols' },
  { value: 'earthy', label: 'Earthy & Organic', desc: 'Warm tones, soft hand-drawn shapes' }
];

export const LOGO_TYPES = [
  { value: 'wordmark', label: 'Wordmark (Text only)', desc: 'Focuses entirely on typography (e.g. Zara, Google)' },
  { value: 'icon', label: 'Brandmark / Icon', desc: 'A clean symbol or logo mark (e.g. Nike Swoosh, Apple)' },
  { value: 'emblem', label: 'Emblem / Badge', desc: 'Text inside a symbol or crest (e.g. Starbucks, Harley)' },
  { value: 'combination', label: 'Combination Mark', desc: 'Text and icon paired together (e.g. Adidas)' }
];

export const PRINT_MATERIALS = [
  'Business Cards', 'Flyers & Posters', 'Product Packaging', 'Hangtags & Labels', 'Brand Lookbooks', 'Letterheads'
];

export const DIGITAL_ASSETS = [
  'Website Landing Page', 'Instagram Grid Templates', 'Reels Covers & Banners', 'Profile Avatars', 'Email Newsletter templates'
];

export const MERCH_ASSETS = [
  'T-shirts & Hoodies', 'Embroidered Caps', 'Tote Bags', 'Reusable Bottles', 'Woven patches'
];

export const FAITH_ASSETS = [
  'Sermon Series Slide Templates', 'Lyric Video Graphic templates', 'Church Bulletin templates', 'Ministry Event banners'
];

export const SAMPLE_BRAND_SUGGESTIONS = {
  business: {
    name: "Nuru Apparel",
    industry: "Fashion / Afro-Streetwear",
    location: "Dar es Salaam, Tanzania",
    products: "Premium oversized cotton hoodies, tees, and caps with traditional Kiswahili motifs.",
    vision: "To make Afro-urban streetwear a globally recognized symbol of quality and cultural pride.",
    mission: "Crafting modern apparel that celebrates East African heritage, keeping street style authentic and accessible.",
    values: "Local Craftsmanship, Cultural Pride, Uncompromising Quality",
    longTermGoals3Yr: "Establish a flagship studio in Dar and expand shipping to Nairobi and Kigali.",
    longTermGoals10Yr: "Become Africa's leading high-end streetwear label with showcases in Paris."
  },
  persona: {
    name: "Baraka (The Church Creative)",
    age: "24",
    gender: "Male",
    location: "Kijitonyama, Dar",
    occupation: "Graphic Designer & Musician",
    income: "Tsh 800,000 / month",
    familyStatus: "Single",
    faithInvolvement: "Worship team lead at his local church",
    dailyRoutine: "Works remotely, meets friends at local cafés, attends church rehearsal mid-week, spends Sunday leading service graphics.",
    painPoints: "Hard to find apparel that looks modern and cool but remains modest and reverent for church-related settings.",
    needs: "Durable, high-quality streetwear that transitions from creative workspace to leading sunday worship seamlessly.",
    buyingBehavior: "Discovers brands on Instagram, buys local, values a personal connection with the founder.",
    mediaHabits: "Instagram, YouTube, TikTok, Spotify podcasts.",
    influences: "Kanye West, local pastors, Afro-pop artists, streetwear bloggers.",
    objections: "Pricing too high for standard fabrics, sizing inconsistent.",
    beforeState: "Feels like he has to choose between looking boring/conservative or wearing aggressive, non-faith-aligned brand statements.",
    afterState: "Stands out as a modern, cultured trendsetter who feels perfectly at home in both urban studios and reverent ministry spaces."
  }
};
