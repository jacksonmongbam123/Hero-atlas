export interface Hero {
  name: string;
  alias: string;
  power: string;
  category: "Tech" | "Cosmic" | "Mystic" | "Mutant" | "Science" | "Vigilante";
  description: string;
  headquarters: string;
  coordinates: {
    x: number; // 0 to 100 scale on Atlas
    y: number; // 0 to 100 scale on Atlas
  };
  stats: {
    durability: number;
    strength: number;
    speed: number;
    energy: number;
    intelligence: number;
    combat: number;
  };
  backstory: string;
}

export interface ExpoFile {
  name: string;
  path: string;
  language: "typescript" | "json" | "markdown";
  content: string;
}

export interface ConsoleLog {
  id: string;
  timestamp: string;
  type: "info" | "warn" | "success" | "metro";
  text: string;
}
