import React, { useState } from "react";
import { 
  Folder, 
  FileCode, 
  Terminal, 
  Copy, 
  Check, 
  Cpu, 
  Layers, 
  ExternalLink,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { EXPO_CODEBASE_FILES } from "../data";

interface CodeSandboxProps {
  onLog: (text: string, type: "info" | "warn" | "success" | "metro") => void;
}

export default function CodeSandbox({ onLog }: CodeSandboxProps) {
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"code" | "instructions">("code");

  const currentFile = EXPO_CODEBASE_FILES[activeFileIdx];

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    onLog(`[Console] Copied file content: ${currentFile.name} to clipboard!`, "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden h-full">
      {/* Code Sandbox Header */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-5 py-3 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Expo React Native Project Source</span>
        </div>
        <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-[10px]">
          <button
            onClick={() => setViewMode("code")}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              viewMode === "code" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            File Explorer
          </button>
          <button
            onClick={() => setViewMode("instructions")}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              viewMode === "instructions" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Setup Guide
          </button>
        </div>
      </div>

      {viewMode === "code" ? (
        <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden h-[450px]">
          {/* Files Sidebar */}
          <div className="w-full md:w-56 bg-slate-950/25 p-3 flex flex-col space-y-1 overflow-y-auto select-none shrink-0">
            <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <Folder className="w-3 h-3 text-slate-600" />
              <span>Project root</span>
            </div>
            
            {EXPO_CODEBASE_FILES.map((file, idx) => {
              const isSelected = activeFileIdx === idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveFileIdx(idx);
                    onLog(`[Console] Viewing file: ${file.path}`, "info");
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-left transition-colors ${
                    isSelected 
                      ? "bg-indigo-950/50 text-indigo-300 font-semibold border border-indigo-900/40" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent"
                  }`}
                >
                  <FileCode className={`w-3.5 h-3.5 ${isSelected ? "text-indigo-400" : "text-slate-600"}`} />
                  <span className="truncate">{file.name}</span>
                </button>
              );
            })}
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col bg-slate-950/50 overflow-hidden relative">
            {/* File Path Bar */}
            <div className="bg-slate-950/60 border-b border-slate-800/80 px-4 py-2 flex justify-between items-center text-[11px] font-mono select-none">
              <span className="text-slate-400 flex items-center gap-1">
                root <ChevronRight className="w-3 h-3 text-slate-600" /> {currentFile.path}
              </span>
              
              <button
                onClick={() => handleCopyCode(currentFile.content)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded px-2.5 py-1 text-slate-300 hover:text-white flex items-center gap-1.5 font-sans font-bold transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Syntax Display (Styled Custom Text Area) */}
            <div className="flex-1 overflow-auto p-4 font-mono text-[11px] text-slate-300 leading-relaxed bg-[#05070C]">
              <pre className="whitespace-pre">{currentFile.content}</pre>
            </div>
          </div>
        </div>
      ) : (
        /* Setup Guide Panel */
        <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed bg-slate-950/15 h-[450px]">
          <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900 rounded-xl p-4 border border-indigo-950 text-indigo-300 flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-200 text-sm mb-1">Local Device Deployment</h4>
              <p className="text-slate-400 text-xs">
                These Expo React Native files are fully compatible with any phone running **Expo Go**. Follow these easy instructions to boot the app locally.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/80 space-y-3">
              <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-indigo-400 font-bold uppercase border border-slate-800">
                Step 1: Install Dependencies
              </span>
              <p className="text-slate-400">
                Install the global Expo command-line utility on your computer. Run this command inside your workspace terminal:
              </p>
              <div className="bg-black/40 p-2.5 rounded-lg border border-slate-900 font-mono text-[11px] text-indigo-400">
                npm install -g expo-cli
              </div>
            </div>

            <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/80 space-y-3">
              <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-indigo-400 font-bold uppercase border border-slate-800">
                Step 2: Assemble Files
              </span>
              <p className="text-slate-400">
                Copy the file codes from the <strong className="text-slate-300">File Explorer</strong> tab into a folder on your local machine. Ensure your folder contains a <code className="text-indigo-400">screens/</code> subdirectory with the three screen files.
              </p>
            </div>

            <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/80 space-y-3">
              <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-indigo-400 font-bold uppercase border border-slate-800">
                Step 3: Run the Bundler
              </span>
              <p className="text-slate-400">
                Run the local Metro Bundler. This creates a Node-based compilation server:
              </p>
              <div className="bg-black/40 p-2.5 rounded-lg border border-slate-900 font-mono text-[11px] text-indigo-400">
                npx expo start
              </div>
            </div>

            <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/80 space-y-3">
              <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-indigo-400 font-bold uppercase border border-slate-800">
                Step 4: Connect Mobile Device
              </span>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400">
                <li>Download <strong className="text-indigo-400">Expo Go</strong> from the App Store (iOS) or Google Play (Android).</li>
                <li>Make sure your computer and mobile phone are connected to the same local Wi-Fi router.</li>
                <li>Scan the generated QR Code using your phone's camera (iOS) or inside the Expo Go app (Android).</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
