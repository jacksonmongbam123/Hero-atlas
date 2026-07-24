import React, { useState, useEffect, useRef } from "react";
import { 
  Shield, 
  Map, 
  Search, 
  Sparkles, 
  MapPin, 
  Compass, 
  TrendingUp, 
  Sliders, 
  Fingerprint, 
  Cpu, 
  CheckCircle, 
  User, 
  Info, 
  AlertTriangle,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Hero } from "../types";

interface PhoneSimulatorProps {
  heroes: Hero[];
  onAddHero: (hero: Hero) => void;
  onLog: (text: string, type: "info" | "warn" | "success" | "metro") => void;
  userName: string;
  setUserName: (name: string) => void;
}

export default function PhoneSimulator({ 
  heroes, 
  onAddHero, 
  onLog, 
  userName, 
  setUserName 
}: PhoneSimulatorProps) {
  const [activeTab, setActiveTab] = useState<"home" | "atlas" | "registry" | "lab">("home");
  const [selectedHero, setSelectedHero] = useState<Hero | null>(heroes[0]);
  
  // Search & Filter state for Registry
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // AI Generator state
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Simulated Time for Status Bar
  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      let h = d.getHours();
      const m = d.getMinutes().toString().padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      setCurrentTime(`${h}:${m} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Quick prompt templates
  const PROMPT_SUGGESTIONS = [
    "A mutant speedster named Chronos Pulse who teleports through temporal rifts.",
    "A mystic sorcerer named Solara who bends solar flares and orbits.",
    "A deep-sea cybernetic commander named Leviathan Tech with titanium trident.",
    "A bio-engineered vigilante called Venom Weaver with arachnid bio-electric darts."
  ];

  // Map coordinate sizing
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleGenerateHero = async (promptText: string) => {
    if (!promptText.trim()) return;
    setIsGenerating(true);
    setGenerationError(null);
    onLog(`[Gemini] Requesting new Hero Profile from gemini-3.5-flash...`, "info");
    onLog(`[Metro] Triggering compile on AI schema mapping...`, "metro");

    try {
      const res = await fetch("/api/generate-hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate hero.");
      }

      const newHero: Hero = await res.json();
      onAddHero(newHero);
      setSelectedHero(newHero);
      setAiPrompt("");
      onLog(`[Gemini] Created new Hero Profile: ${newHero.alias}!`, "success");
      onLog(`[Metro] Hot reloading completed. Added coordinate marker at [X: ${newHero.coordinates.x}, Y: ${newHero.coordinates.y}]`, "metro");
      
      // Auto switch to Atlas tab to inspect the newly added hero!
      setActiveTab("atlas");
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "Something went wrong.");
      onLog(`[Error] Failed to generate hero via Gemini: ${err.message}`, "warn");
    } finally {
      setIsGenerating(false);
    }
  };

  // Filtered heroes
  const filteredHeroes = heroes.filter(hero => {
    const matchesSearch = hero.alias.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          hero.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          hero.power.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = activeCategory === "All" || hero.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="relative flex flex-col items-center justify-center p-2 w-full max-w-[390px] mx-auto">
      {/* Outer Phone shell */}
      <div className="relative w-full aspect-[9/19] bg-neutral-950 rounded-[48px] p-3 shadow-2xl border-4 border-neutral-800 ring-1 ring-neutral-700 overflow-hidden flex flex-col">
        
        {/* Notch container */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-neutral-950 rounded-b-2xl z-50 flex items-center justify-center">
          {/* Camera speaker cutouts */}
          <div className="w-12 h-1 bg-neutral-800 rounded-full mb-1"></div>
          <div className="w-2 h-2 bg-neutral-900 rounded-full absolute right-6 top-2"></div>
        </div>

        {/* Live Status Bar */}
        <div className="h-6 px-6 pt-1 flex justify-between items-center text-[11px] font-medium text-neutral-400 select-none z-40 bg-neutral-950">
          <span>{currentTime}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] bg-neutral-800 px-1.5 py-0.5 rounded text-indigo-400 font-mono">EXPO</span>
            {/* Battery / Wifi / Cellular Icons simulated with simple spans */}
            <div className="flex items-center gap-0.5 text-neutral-400 font-bold">
              <span>📶</span>
              <span>🔋</span>
            </div>
          </div>
        </div>

        {/* Expo Header / Development environment badge */}
        <div className="bg-neutral-900 border-b border-neutral-800 py-1.5 px-4 flex items-center justify-between text-xs z-30 select-none">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-neutral-300 font-semibold tracking-wide text-[11px]">Expo Go • SDK 51</span>
          </div>
          <span className="text-neutral-500 text-[10px] font-mono">192.168.1.51:19000</span>
        </div>

        {/* Core Mobile Simulator Screen */}
        <div className="flex-1 bg-[#0B0F19] overflow-hidden relative flex flex-col">
          
          <div className="flex-1 overflow-y-auto pb-4">
            <AnimatePresence mode="wait">
              {/* Tab 1: Home / Hello World */}
              {activeTab === "home" && (
                <motion.div 
                  key="home"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 space-y-4"
                >
                  {/* Hero Welcomer */}
                  <div className="bg-gradient-to-br from-indigo-950 to-slate-900 rounded-2xl p-5 border border-indigo-900/60 text-center shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl"></div>
                    <Shield className="mx-auto w-10 h-10 text-indigo-400 mb-3" />
                    <h2 className="text-xl font-bold text-white tracking-tight">Hello, World!</h2>
                    <p className="text-xs text-indigo-200/80 mt-1.5 leading-relaxed">
                      Welcome to your first React Native Expo application on Hero Atlas.
                    </p>
                  </div>

                  {/* Personalization state */}
                  <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Configure Greeting Card</span>
                    </div>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Enter your name..."
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                    
                    <AnimatePresence>
                      {userName ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-indigo-950/40 rounded-lg p-3 border border-indigo-900/30 text-xs leading-relaxed text-indigo-200 mt-2"
                        >
                          👋 <span className="text-indigo-400 font-bold">Hello World, {userName}!</span> Your Atlas is ready. We have plotted <span className="text-indigo-400 font-bold">{heroes.length} major defenders</span> on the coordinate grid.
                        </motion.div>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic mt-1 text-center">
                          Type your name above to update the Hello World greeting!
                        </p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* App instructions */}
                  <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-2.5">
                    <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-emerald-400" />
                      Applet Modules Guide
                    </h3>
                    <ul className="space-y-2 text-[11px] text-slate-400">
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-bold">🗺️</span>
                        <span>
                          <strong className="text-slate-300">Atlas Map:</strong> Click markers on the grid to inspect headquarters and power stats.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-bold">🦸</span>
                        <span>
                          <strong className="text-slate-300">Hero Registry:</strong> Search list of characters or jump directly to their locations.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-bold">🧠</span>
                        <span>
                          <strong className="text-slate-300">AI Lab:</strong> Write a concept and use Gemini to dynamically generate custom heroes!
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="text-center pt-2 select-none">
                    <p className="text-[10px] text-slate-600">Simulating Metro Bundler v0.74.1</p>
                  </div>
                </motion.div>
              )}

              {/* Tab 2: Atlas Map */}
              {activeTab === "atlas" && (
                <motion.div 
                  key="atlas"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3 flex flex-col h-full space-y-3"
                >
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: "12s" }} />
                      Atlas Coordinates Grid
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Canvas 100 x 100</span>
                  </div>

                  {/* SVG 2D Grid Canvas */}
                  <div 
                    ref={mapContainerRef}
                    className="aspect-square w-full bg-slate-950 border border-slate-800 rounded-2xl relative overflow-hidden shadow-inner select-none cursor-crosshair group"
                    style={{
                      backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.1) 1px, transparent 1px)",
                      backgroundSize: "20px 20px"
                    }}
                  >
                    {/* Glowing coordinate labels */}
                    <div className="absolute left-2 bottom-2 text-[9px] font-mono text-slate-600 bg-slate-900/60 px-1 py-0.5 rounded">
                      Origin [0,0]
                    </div>
                    
                    {/* Grid Crosshair overlays */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                      <div className="w-full h-[1px] bg-indigo-500"></div>
                      <div className="h-full w-[1px] bg-indigo-500 absolute"></div>
                    </div>

                    {/* Plot coordinates */}
                    {heroes.map((hero, index) => {
                      const isSelected = selectedHero?.alias === hero.alias;
                      return (
                        <button
                          key={index}
                          className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 focus:outline-none z-10 hover:scale-125"
                          style={{
                            left: `${hero.coordinates.x}%`,
                            top: `${hero.coordinates.y}%`
                          }}
                          onClick={() => {
                            setSelectedHero(hero);
                            onLog(`[Simulator] Selected pin: ${hero.alias} [x: ${hero.coordinates.x}, y: ${hero.coordinates.y}]`, "info");
                          }}
                        >
                          {/* Radial glowing pulse for selected hero */}
                          {isSelected && (
                            <span className="absolute -inset-4 rounded-full bg-rose-500/20 animate-ping z-0"></span>
                          )}
                          <div className={`relative z-10 flex flex-col items-center`}>
                            <MapPin className={`w-6 h-6 filter drop-shadow-md transition-colors duration-200 ${
                              isSelected ? "text-rose-500" : "text-indigo-400 group-hover:text-indigo-300"
                            }`} />
                            <span className="absolute top-6 whitespace-nowrap text-[9px] bg-slate-900/90 text-slate-200 px-1 py-0.5 rounded border border-slate-800/80 scale-75 md:scale-90 font-semibold max-w-[90px] truncate">
                              {hero.alias}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Hero Details Card */}
                  <AnimatePresence mode="wait">
                    {selectedHero ? (
                      <motion.div
                        key={selectedHero.alias}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl text-xs space-y-2.5 relative"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                              {selectedHero.alias}
                              <span className="text-[10px] font-normal text-slate-500">({selectedHero.name})</span>
                            </h4>
                            <p className="text-[10px] text-slate-400 italic">HQ: {selectedHero.headquarters}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            selectedHero.category === "Cosmic" ? "bg-purple-950 text-purple-400 border border-purple-900/40" :
                            selectedHero.category === "Tech" ? "bg-cyan-950 text-cyan-400 border border-cyan-900/40" :
                            selectedHero.category === "Mystic" ? "bg-amber-950 text-amber-400 border border-amber-900/40" :
                            selectedHero.category === "Mutant" ? "bg-emerald-950 text-emerald-400 border border-emerald-900/40" :
                            selectedHero.category === "Science" ? "bg-blue-950 text-blue-400 border border-blue-900/40" :
                            "bg-slate-950 text-slate-400 border border-slate-900/40"
                          }`}>
                            {selectedHero.category}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-800/30">
                          {selectedHero.description}
                        </p>

                        {/* Power Grid Stats */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                            <span>Power Grid Stats</span>
                            <span className="text-indigo-400">Coord X:{selectedHero.coordinates.x}, Y:{selectedHero.coordinates.y}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                            {Object.entries(selectedHero.stats).map(([statName, val]) => {
                              const valNum = val as number;
                              return (
                                <div key={statName} className="flex flex-col">
                                  <div className="flex justify-between items-center text-slate-400 text-[10px] mb-0.5">
                                    <span className="capitalize">{statName}</span>
                                    <span className="font-mono text-slate-200">{valNum}</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        valNum > 85 ? "bg-rose-500" :
                                        valNum > 70 ? "bg-indigo-500" :
                                        "bg-emerald-500"
                                      }`}
                                      style={{ width: `${valNum}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Backstory */}
                        <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-800/50 pt-2 italic">
                          {selectedHero.backstory}
                        </p>
                      </motion.div>
                    ) : (
                      <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-xl p-6 text-center text-slate-500 text-[11px]">
                        Select a marker on the Atlas map to read hero coordinates and power profiles.
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Tab 3: Registry */}
              {activeTab === "registry" && (
                <motion.div 
                  key="registry"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-indigo-400" />
                      Hero registry database
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono">Found: {filteredHeroes.length}</span>
                  </div>

                  {/* Search bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Search heroes, real names, or powers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Category filters */}
                  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                    {["All", "Tech", "Cosmic", "Mystic", "Mutant", "Science", "Vigilante"].map((cat) => (
                      <button
                        key={cat}
                        className={`px-2.5 py-1 rounded-full font-semibold transition-colors shrink-0 ${
                          activeCategory === cat 
                            ? "bg-indigo-600 text-white" 
                            : "bg-slate-900 hover:bg-slate-800 text-slate-400"
                        }`}
                        onClick={() => setActiveCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Hero rows list */}
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {filteredHeroes.length > 0 ? (
                      filteredHeroes.map((hero, index) => {
                        const isSelected = selectedHero?.alias === hero.alias;
                        return (
                          <div
                            key={index}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                              isSelected 
                                ? "bg-slate-900 border-indigo-500/80 shadow-md" 
                                : "bg-slate-900/50 border-slate-800/80 hover:bg-slate-900/80"
                            }`}
                            onClick={() => {
                              setSelectedHero(hero);
                              onLog(`[Simulator] Selected: ${hero.alias}. Navigating to map plot...`, "info");
                              // Switch to Map tab
                              setActiveTab("atlas");
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-xs text-slate-100">{hero.alias}</h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">{hero.power}</p>
                              </div>
                              <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded text-indigo-400 font-bold uppercase border border-slate-800">
                                {hero.category}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800/50 text-[9px] text-slate-500">
                              <span>HQ: {hero.headquarters}</span>
                              <span className="font-mono text-indigo-400/80 font-semibold">Grid X:{hero.coordinates.x}, Y:{hero.coordinates.y}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-xl py-8 text-center text-slate-600 text-xs">
                        No heroes found matching current criteria.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Tab 4: AI Generator Lab */}
              {activeTab === "lab" && (
                <motion.div 
                  key="lab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 space-y-4"
                >
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      Gemini AI Hero Generator
                    </h3>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Supply a basic concept, name, or power, and Gemini will model a complete, balanced superhero file and plot their coordinate on the 2D Atlas!
                    </p>
                  </div>

                  {/* Textarea prompt */}
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      placeholder="e.g. A cybernetic deep-sea speedster who patrols the Marianas Trench..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      disabled={isGenerating}
                    />

                    {/* Suggestions */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Need Inspiration?</p>
                      <div className="grid grid-cols-1 gap-1">
                        {PROMPT_SUGGESTIONS.map((sug, i) => (
                          <button
                            key={i}
                            className="text-[9px] text-left text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/20 bg-slate-950/50 p-1.5 px-2 rounded-lg border border-slate-900 transition-colors truncate"
                            onClick={() => setAiPrompt(sug)}
                            disabled={isGenerating}
                          >
                            💡 {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Error display */}
                  {generationError && (
                    <div className="bg-rose-950/40 border border-rose-900/30 rounded-xl p-3 text-rose-300 text-[10px] flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <p className="leading-relaxed">{generationError}</p>
                    </div>
                  )}

                  {/* Generate Button */}
                  <button
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/15 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => handleGenerateHero(aiPrompt)}
                    disabled={isGenerating || !aiPrompt.trim()}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Gemini is Drafting Lore...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate & Plot Coordinate</span>
                      </>
                    )}
                  </button>

                  <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/60 text-[9px] text-slate-500 leading-relaxed">
                    ⚙️ <strong className="text-slate-400">Server proxy route:</strong> Runs via secure server-side Express call proxying the Gemini SDK, ensuring API keys are 100% secure.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Simulated Tab Navigation Bar */}
          <div className="h-14 bg-[#0F172A] border-t border-slate-800/80 px-2 flex justify-around items-center z-40 select-none">
            <button 
              className={`flex flex-col items-center justify-center w-12 h-10 rounded-lg transition-colors ${
                activeTab === "home" ? "text-indigo-400" : "text-slate-400 hover:text-slate-300"
              }`}
              onClick={() => setActiveTab("home")}
            >
              <Shield className="w-4 h-4" />
              <span className="text-[9px] mt-1 font-medium">Home</span>
            </button>

            <button 
              className={`flex flex-col items-center justify-center w-12 h-10 rounded-lg transition-colors ${
                activeTab === "atlas" ? "text-indigo-400" : "text-slate-400 hover:text-slate-300"
              }`}
              onClick={() => setActiveTab("atlas")}
            >
              <Map className="w-4 h-4" />
              <span className="text-[9px] mt-1 font-medium">Atlas</span>
            </button>

            <button 
              className={`flex flex-col items-center justify-center w-12 h-10 rounded-lg transition-colors ${
                activeTab === "registry" ? "text-indigo-400" : "text-slate-400 hover:text-slate-300"
              }`}
              onClick={() => setActiveTab("registry")}
            >
              <Search className="w-4 h-4" />
              <span className="text-[9px] mt-1 font-medium">Registry</span>
            </button>

            <button 
              className={`flex flex-col items-center justify-center w-12 h-10 rounded-lg transition-colors ${
                activeTab === "lab" ? "text-indigo-400" : "text-slate-400 hover:text-slate-300"
              }`}
              onClick={() => setActiveTab("lab")}
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-[9px] mt-1 font-medium">AI Lab</span>
            </button>
          </div>

          {/* Home indicator bar (simulated iOS bar) */}
          <div className="h-1 bg-neutral-950 w-full flex justify-center pb-2">
            <div className="w-28 h-1 bg-neutral-700 rounded-full"></div>
          </div>

        </div>
      </div>
    </div>
  );
}
