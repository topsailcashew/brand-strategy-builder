import React, { useState } from 'react';
import { BrandGuide } from '../types';
import { Sparkles, Palette, Type, LayoutGrid, Image as ImageIcon, Shirt, Monitor, FileText, Check, Copy } from 'lucide-react';

interface InteractiveShowcaseProps {
  brandGuide: BrandGuide;
  businessName: string;
  brandStyle: string[];
}

export default function InteractiveShowcase({ brandGuide, businessName, brandStyle }: InteractiveShowcaseProps) {
  const [activeTab, setActiveTab] = useState<'moodboard' | 'logos' | 'social' | 'merch'>('moodboard');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const colors = brandGuide.visualIdentity?.colors || [
    { name: "Slate", hex: "#1E293B", usage: "Primary" },
    { name: "Gold Accent", hex: "#D97706", usage: "Accent" },
    { name: "Sand", hex: "#F5F5F4", usage: "Background" }
  ];

  const primaryColor = colors[0]?.hex || '#1E293B';
  const secondaryColor = colors[1]?.hex || '#475569';
  const accentColor = colors[2]?.hex || '#D97706';

  const fonts = brandGuide.visualIdentity?.fonts || [
    { role: "Heading", name: "Space Grotesk", usage: "Titles", pairing: "Inter" },
    { role: "Body", name: "Inter", usage: "Body Copy", pairing: "Space Grotesk" }
  ];

  const headingFont = fonts.find(f => f.role === 'Heading' || f.role === 'Heading' as any)?.name || 'Space Grotesk';
  const bodyFont = fonts.find(f => f.role === 'Body' || f.role === 'Body' as any)?.name || 'Inter';

  const copyToClipboard = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const getInitials = (name: string) => {
    if (!name) return "B";
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const initials = getInitials(businessName || "Your Brand");

  // Dynamic curated atmosphere images depending on the industry / style chosen
  const isStreetwear = brandStyle.includes('streetwear') || brandGuide.overview?.summary.toLowerCase().includes('streetwear');
  const isFaith = brandGuide.overview?.tagline.toLowerCase().includes('faith') || brandGuide.overview?.tagline.toLowerCase().includes('guided');
  const isEarthy = brandStyle.includes('earthy') || brandStyle.includes('organic');

  const getAtmospherePhotos = () => {
    if (isStreetwear) {
      return [
        { url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80", tag: "Street Culture" },
        { url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80", tag: "Raw Texture" },
        { url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80", tag: "Urban Vibe" },
        { url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80", tag: "Bold Contrast" }
      ];
    } else if (isFaith) {
      return [
        { url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=600&auto=format&fit=crop&q=80", tag: "Sacred Light" },
        { url: "https://images.unsplash.com/photo-1490122417551-6ee9691429d0?w=600&auto=format&fit=crop&q=80", tag: "Golden Hour Hope" },
        { url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80", tag: "Unity & Purpose" },
        { url: "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=600&auto=format&fit=crop&q=80", tag: "Liturgical Bronze" }
      ];
    } else if (isEarthy) {
      return [
        { url: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=600&auto=format&fit=crop&q=80", tag: "Woven Textures" },
        { url: "https://images.unsplash.com/photo-1505236858219-8359eb29e3a5?w=600&auto=format&fit=crop&q=80", tag: "Natural Linen" },
        { url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80", tag: "Soft Terracotta" },
        { url: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600&auto=format&fit=crop&q=80", tag: "Handmade Studio" }
      ];
    } else {
      return [
        { url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80", tag: "Sleek Workspace" },
        { url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop&q=80", tag: "Minimalist Retail" },
        { url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=80", tag: "Graphic Layouts" },
        { url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80", tag: "Atmosphere & Air" }
      ];
    }
  };

  const photos = getAtmospherePhotos();

  return (
    <div className="bg-editorial-border-light border border-editorial-border rounded-none overflow-hidden shadow-none" id="interactive-visualizer">
      {/* Header bar */}
      <div className="px-6 py-4 border-b border-editorial-border bg-editorial-border flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-ink animate-pulse" />
          <h3 className="font-serif font-bold text-ink text-sm uppercase tracking-wider">Interactive Design Visualizer</h3>
        </div>
        <div className="flex bg-editorial-border-light p-1 rounded-none border border-editorial-border text-xs font-medium font-mono">
          <button
            onClick={() => setActiveTab('moodboard')}
            className={`px-3 py-1.5 rounded-none transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'moodboard' ? 'bg-ink text-paper font-semibold' : 'text-editorial-secondary hover:text-ink'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Mood Board
          </button>
          <button
            onClick={() => setActiveTab('logos')}
            className={`px-3 py-1.5 rounded-none transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'logos' ? 'bg-ink text-paper font-semibold' : 'text-editorial-secondary hover:text-ink'}`}
          >
            <Palette className="w-3.5 h-3.5" />
            Logo Concepts
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`px-3 py-1.5 rounded-none transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'social' ? 'bg-ink text-paper font-semibold' : 'text-editorial-secondary hover:text-ink'}`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Social Mockups
          </button>
          <button
            onClick={() => setActiveTab('merch')}
            className={`px-3 py-1.5 rounded-none transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'merch' ? 'bg-ink text-paper font-semibold' : 'text-editorial-secondary hover:text-ink'}`}
          >
            <Shirt className="w-3.5 h-3.5" />
            Merch Mockups
          </button>
        </div>
      </div>

      {/* Grid Canvas Content */}
      <div className="p-6">
        {/* TAB 1: MOOD BOARD */}
        {activeTab === 'moodboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Color Swatch card */}
            <div className="bg-white p-5 rounded-none border border-editorial-border flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3 flex items-center gap-1.5 font-mono">
                  <Palette className="w-3.5 h-3.5" />
                  Color Swatches
                </h4>
                <p className="text-xs text-editorial-secondary mb-4 font-sans">Click any swatch hex value to copy to clipboard.</p>
                <div className="space-y-3.5">
                  {colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 bg-editorial-border-light p-2.5 rounded-none border border-editorial-border">
                      <div 
                        className="w-10 h-10 rounded-none shadow-inner flex-shrink-0 border border-editorial-border"
                        style={{ backgroundColor: c.hex }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-ink truncate font-serif">{c.name}</p>
                        <p className="text-[10px] text-editorial-secondary truncate font-mono">{c.usage}</p>
                      </div>
                      <button 
                        onClick={() => copyToClipboard(c.hex)}
                        className="p-1.5 rounded-none bg-white text-editorial-secondary border border-editorial-border hover:text-ink hover:bg-editorial-border-light transition cursor-pointer"
                      >
                        {copiedColor === c.hex ? <Check className="w-3 h-3 text-green-700" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-editorial-border text-[11px] text-editorial-secondary italic font-serif">
                * Colors curated specifically for {businessName || 'your brand'} based on core personality inputs.
              </div>
            </div>

            {/* Typography pairings */}
            <div className="bg-white p-5 rounded-none border border-editorial-border flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3 flex items-center gap-1.5 font-mono">
                  <Type className="w-3.5 h-3.5" />
                  Typography pairings
                </h4>
                <div className="space-y-4">
                  <div className="p-3 bg-editorial-border-light rounded-none border border-editorial-border">
                    <p className="text-[10px] uppercase font-bold text-editorial-secondary mb-1 font-mono">Heading Role</p>
                    <p className="text-lg font-bold text-ink font-serif" style={{ fontFamily: 'serif' }}>
                      {headingFont}
                    </p>
                    <p className="text-[10px] text-editorial-secondary mt-1.5 leading-relaxed font-sans">{fonts[0]?.usage}</p>
                  </div>

                  <div className="p-3 bg-editorial-border-light rounded-none border border-editorial-border">
                    <p className="text-[10px] uppercase font-bold text-editorial-secondary mb-1 font-mono">Body / Content Role</p>
                    <p className="text-sm font-medium text-ink font-sans" style={{ fontFamily: 'sans-serif' }}>
                      {bodyFont}
                    </p>
                    <p className="text-[10px] text-editorial-secondary mt-1.5 leading-relaxed font-sans">{fonts[1]?.usage}</p>
                  </div>
                </div>
              </div>

              {/* Live Specimen preview */}
              <div className="mt-4 p-3.5 rounded-none border border-dashed border-editorial-border bg-editorial-border-light flex flex-col gap-1.5">
                <p className="text-[10px] font-bold text-editorial-secondary uppercase tracking-widest font-mono">Live Type Scale</p>
                <p className="text-sm text-ink font-serif font-bold italic" style={{ color: accentColor }}>
                  The art of design is simple.
                </p>
                <p className="text-[10px] text-editorial-secondary leading-normal font-sans">
                  Our voice is clear, refined, and authentic. Delivering local East African excellence with global visual aesthetics.
                </p>
              </div>
            </div>

            {/* Curated Atmosphere imagery */}
            <div className="bg-white p-5 rounded-none border border-editorial-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3 flex items-center gap-1.5 font-mono">
                <ImageIcon className="w-3.5 h-3.5" />
                Atmospheric Textures
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {photos.map((ph, idx) => (
                  <div key={idx} className="relative rounded-none overflow-hidden group aspect-square border border-editorial-border shadow-none bg-editorial-border-light">
                    <img 
                      src={ph.url} 
                      alt={ph.tag} 
                      className="w-full h-full object-cover grayscale brightness-95 hover:grayscale-0 hover:scale-105 transition duration-500 referrerpolicy"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                      <span className="text-[9px] font-bold text-paper uppercase tracking-wide bg-ink px-1.5 py-0.5 rounded-none font-mono">{ph.tag}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LOGO CONCEPTS */}
        {activeTab === 'logos' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logo 1: The Monogram Crest */}
            <div className="bg-white p-5 rounded-none border border-editorial-border flex flex-col items-center justify-between text-center min-h-[300px]">
              <div className="w-full">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-editorial-secondary mb-4 font-mono">01 / Minimalist Monogram</h4>
                <div className="w-24 h-24 mx-auto my-6 flex items-center justify-center rounded-none relative shadow-none bg-editorial-border-light border border-editorial-border">
                  {/* Decorative golden crest box */}
                  <div className="absolute inset-1.5 border border-dashed border-editorial-border" style={{ borderColor: accentColor }} />
                  <span className="text-3xl font-bold tracking-tight font-serif" style={{ color: primaryColor }}>
                    {initials}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-ink font-serif">{businessName || "Your Brand"}</p>
                <p className="text-[10px] text-editorial-secondary mt-1 leading-relaxed max-w-[180px] mx-auto font-sans">
                  A high-end, elegant monogram crest utilizing direct initials, designed for luxury or premium positioning.
                </p>
              </div>
            </div>

            {/* Logo 2: The Modern Street Seal */}
            <div className="bg-white p-5 rounded-none border border-editorial-border flex flex-col items-center justify-between text-center min-h-[300px]">
              <div className="w-full">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-editorial-secondary mb-4 font-mono">02 / Afro-Urban Badge</h4>
                <div className="w-24 h-24 mx-auto my-6 flex items-center justify-center rounded-none relative shadow-none bg-editorial-border-light border border-editorial-border">
                  <svg className="w-full h-full p-2" viewBox="0 0 100 100">
                    {/* Circle line */}
                    <circle cx="50" cy="50" r="45" fill="none" stroke={primaryColor} strokeWidth="1" />
                    <circle cx="50" cy="50" r="41" fill="none" stroke={accentColor} strokeWidth="1.5" strokeDasharray="3,3" />
                    {/* Inner star */}
                    <polygon points="50,22 58,38 76,41 63,53 66,71 50,62 34,71 37,53 24,41 42,38" fill={primaryColor} />
                    <text x="50" y="55" fill="#FFFFFF" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                      {initials}
                    </text>
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-ink font-serif">{businessName || "Your Brand"}</p>
                <p className="text-[10px] text-editorial-secondary mt-1 leading-relaxed max-w-[180px] mx-auto font-sans">
                  A modern streetwear badge/stamp featuring an iconic star cluster, perfect for labels, packaging, or screen printing.
                </p>
              </div>
            </div>

            {/* Logo 3: Custom Emblem Combination */}
            <div className="bg-white p-5 rounded-none border border-editorial-border flex flex-col items-center justify-between text-center min-h-[300px]">
              <div className="w-full">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-editorial-secondary mb-4 font-mono">03 / Classic Wordmark Combination</h4>
                <div className="w-full h-24 my-6 flex flex-col items-center justify-center rounded-none bg-editorial-border-light border border-editorial-border p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-none flex items-center justify-center shadow-none" style={{ backgroundColor: accentColor }}>
                      <span className="text-[10px] font-bold text-paper font-serif">{initials[0]}</span>
                    </div>
                    <span className="text-sm font-bold uppercase tracking-widest text-ink font-serif">
                      {businessName?.split(' ')[0] || "BRAND"}
                    </span>
                  </div>
                  <span className="text-[8px] tracking-widest uppercase text-editorial-secondary font-mono" style={{ color: primaryColor }}>
                    {brandGuide.overview?.tagline ? brandGuide.overview.tagline.slice(0, 28) + '...' : "Dar es Salaam, TZ"}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-ink font-serif">{businessName || "Your Brand"}</p>
                <p className="text-[10px] text-editorial-secondary mt-1 leading-relaxed max-w-[180px] mx-auto font-sans">
                  An elegant combination lockup pairing a micro-badge with spacious, widely tracked display letterforms.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SOCIAL MEDIA MOCKUPS */}
        {activeTab === 'social' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Mockup 1: Quote post */}
            <div className="bg-white p-4 rounded-none border border-editorial-border">
              <p className="text-[10px] font-bold text-editorial-secondary mb-3 uppercase tracking-wider font-mono">IG Feed: Brand Statement</p>
              <div className="aspect-square w-full rounded-none flex flex-col justify-between p-6 relative overflow-hidden border border-editorial-border bg-paper">
                <div className="flex justify-between items-center w-full">
                  <span className="text-[9px] font-bold tracking-widest uppercase text-editorial-secondary font-mono">{businessName || "YOUR BRAND"}</span>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: accentColor }} />
                </div>
                
                <p className="text-base font-bold tracking-tight text-ink leading-snug font-serif">
                  "{brandGuide.overview?.tagline || 'Purpose is what drives excellence.'}"
                </p>

                <div className="flex justify-between items-end border-t border-editorial-border pt-3">
                  <span className="text-[8px] uppercase tracking-wider text-editorial-secondary font-mono">EST. 2026 // DAR ES SALAAM</span>
                  <span className="text-[8px] uppercase tracking-widest font-bold text-ink font-serif">CULTURE FIRST</span>
                </div>
              </div>
            </div>

            {/* Mockup 2: Product Highlight */}
            <div className="bg-white p-4 rounded-none border border-editorial-border">
              <p className="text-[10px] font-bold text-editorial-secondary mb-3 uppercase tracking-wider font-mono">IG Feed: Editorial Collection</p>
              <div className="aspect-square w-full rounded-none flex flex-col justify-between p-6 relative overflow-hidden border border-editorial-border" style={{ backgroundColor: primaryColor }}>
                <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-20" style={{ backgroundColor: accentColor }} />
                
                <div className="flex justify-between items-center w-full relative z-10">
                  <span className="text-[8px] font-bold tracking-widest uppercase text-white/85 font-mono">NEW SEASON MOCKUP</span>
                  <span className="text-[8px] font-mono text-white/60">#001</span>
                </div>

                <div className="my-auto py-2">
                  <p className="text-xl font-bold text-white tracking-tight font-serif">
                    {businessName || "Nuru Apparel"}
                  </p>
                  <p className="text-[10px] text-white/80 mt-1 max-w-[160px] leading-relaxed font-sans">
                    Elevating everyday utility through premium East African materials and local tailors.
                  </p>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-white bg-ink border border-white px-2 py-0.5 rounded-none uppercase font-mono">Pre-Order</span>
                  <span className="text-[8px] tracking-wide text-white/70 font-mono">nuruapparel.com</span>
                </div>
              </div>
            </div>

            {/* Mockup 3: Brand Core values bento */}
            <div className="bg-white p-4 rounded-none border border-editorial-border">
              <p className="text-[10px] font-bold text-editorial-secondary mb-3 uppercase tracking-wider font-mono">IG Stories: Value Spotlight</p>
              <div className="aspect-square w-full rounded-none flex flex-col justify-between p-6 relative overflow-hidden border border-editorial-border" style={{ backgroundColor: '#111827' }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                  <span className="text-[8px] text-white/70 uppercase tracking-widest font-bold font-mono">CORE PRINCIPLE</span>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1 font-mono">OUR CALLING</h5>
                  <p className="text-sm font-bold text-white tracking-normal leading-snug font-serif">
                    "Crafting modern apparel that celebrates local heritage, keeping street style authentic and accessible."
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                  <span className="text-[8px] text-white/50 uppercase font-mono">01 / LOCAL INTEGRITY</span>
                  <span className="text-[8px] text-white/50 uppercase font-mono">02 / EXCELLENCE</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MERCHANDISE MOCKUPS */}
        {activeTab === 'merch' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Merch 1: Premium Street Tee */}
            <div className="bg-white p-5 rounded-none border border-editorial-border flex flex-col items-center">
              <p className="text-[10px] font-bold text-editorial-secondary mb-4 uppercase tracking-wider self-start font-mono">Premium Oversized Tee Mockup</p>
              
              <div className="w-full max-w-[260px] aspect-square relative bg-editorial-border-light rounded-none border border-editorial-border flex items-center justify-center p-4 overflow-hidden">
                {/* SVG silhouette of a folded t-shirt */}
                <svg className="w-36 h-36" viewBox="0 0 100 100" fill="none">
                  {/* T-Shirt Body Outline */}
                  <path d="M20,10 L30,5 L40,15 L60,15 L70,5 L80,10 L75,32 L68,30 L68,90 L32,90 L32,30 L25,32 Z" fill="#18181b" stroke={primaryColor} strokeWidth="1" />
                  {/* Sleeve stitches */}
                  <line x1="28" y1="20" x2="33" y2="30" stroke={accentColor} strokeWidth="0.8" strokeDasharray="1,1" />
                  <line x1="72" y1="20" x2="67" y2="30" stroke={accentColor} strokeWidth="0.8" strokeDasharray="1,1" />
                  {/* Collar stitch */}
                  <path d="M40,15 C45,22 55,22 60,15" stroke={accentColor} strokeWidth="1.2" fill="none" />
                  
                  {/* Chest Logo graphic */}
                  <circle cx="50" cy="38" r="7" fill={accentColor} />
                  <text x="50" y="40.5" fill="#FFFFFF" fontSize="6.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                    {initials[0]}
                  </text>
                  <text x="50" y="52" fill="#FFFFFF" fontSize="3.5" fontWeight="bold" textAnchor="middle" letterSpacing="0.8" fontFamily="sans-serif">
                    {businessName?.toUpperCase()}
                  </text>
                  <text x="50" y="57" fill="#6B7280" fontSize="2.5" textAnchor="middle" fontFamily="sans-serif">
                    EAST AFRICAN COTTON
                  </text>
                </svg>
              </div>

              <div className="mt-4 text-center">
                <span className="text-xs font-bold text-ink font-serif">Heavyweight Oversized Tee</span>
                <p className="text-[10px] text-editorial-secondary mt-1 max-w-[220px] leading-relaxed mx-auto font-sans">
                  Silk screen logo on front chest utilizing {accentColor} matching primary branding specifications.
                </p>
              </div>
            </div>

            {/* Merch 2: Embroidered Dad Cap */}
            <div className="bg-white p-5 rounded-none border border-editorial-border flex flex-col items-center">
              <p className="text-[10px] font-bold text-editorial-secondary mb-4 uppercase tracking-wider self-start font-mono">Dad Hat / Cap Mockup</p>
              
              <div className="w-full max-w-[260px] aspect-square relative bg-editorial-border-light rounded-none border border-editorial-border flex items-center justify-center p-4 overflow-hidden">
                {/* SVG Silhouette of a cap */}
                <svg className="w-36 h-36" viewBox="0 0 100 100" fill="none">
                  {/* Cap crown */}
                  <path d="M15,55 C12,35 35,20 50,20 C65,20 88,35 85,55 L82,60 C70,60 30,60 18,60 Z" fill="#27272a" stroke={primaryColor} strokeWidth="1" />
                  {/* Cap bill */}
                  <path d="M82,60 C88,61 95,65 98,72 C90,75 75,70 65,65 C68,61 80,60 82,60 Z" fill={primaryColor} />
                  {/* Embroidery emblem */}
                  <circle cx="50" cy="40" r="10" fill="none" stroke={accentColor} strokeWidth="1" />
                  <text x="50" y="43" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                    {initials}
                  </text>
                  {/* Stitch line details on bill */}
                  <path d="M68,66 C75,71 85,73 93,73" stroke={accentColor} strokeWidth="0.5" strokeDasharray="1,1" />
                </svg>
              </div>

              <div className="mt-4 text-center">
                <span className="text-xs font-bold text-ink font-serif">Embroidered Heritage Cap</span>
                <p className="text-[10px] text-editorial-secondary mt-1 max-w-[220px] leading-relaxed mx-auto font-sans">
                  High-density raised embroidery stitches of {initials} monogram emblem in primary golden colors.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
