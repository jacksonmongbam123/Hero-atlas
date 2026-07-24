import React, { useEffect, useRef } from "react";
import { Terminal, RefreshCw, Trash2, QrCode } from "lucide-react";
import { ConsoleLog } from "../types";

interface ConsolePanelProps {
  logs: ConsoleLog[];
  onClear: () => void;
  onReload: () => void;
}

export default function ConsolePanel({ logs, onClear, onReload }: ConsolePanelProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col md:flex-row h-[280px]">
      
      {/* Log Console Terminal */}
      <div className="flex-1 flex flex-col min-w-0 border-b md:border-b-0 md:border-r border-slate-800">
        {/* Terminal Header */}
        <div className="bg-slate-900 px-4 py-2 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metro Bundler Console</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={onReload}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded transition-colors"
              title="Trigger Hard Reload"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClear}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition-colors"
              title="Clear terminal logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Terminal Scroll Area */}
        <div className="flex-1 p-3 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-1 bg-[#05070C]">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-1.5">
              <span className="text-slate-600 shrink-0 select-none text-[10px] pt-0.5">{log.timestamp}</span>
              <span className={`font-semibold shrink-0 select-none ${
                log.type === "success" ? "text-emerald-500" :
                log.type === "warn" ? "text-amber-500" :
                log.type === "metro" ? "text-indigo-400" :
                "text-slate-500"
              }`}>
                [{log.type.toUpperCase()}]
              </span>
              <span className={`break-all ${
                log.type === "success" ? "text-emerald-300" :
                log.type === "warn" ? "text-amber-200" :
                log.type === "metro" ? "text-indigo-200" :
                "text-slate-300"
              }`}>
                {log.text}
              </span>
            </div>
          ))}
          <div ref={terminalEndRef}></div>
        </div>
      </div>

      {/* QR Code Scan Area */}
      <div className="w-full md:w-52 bg-slate-900/40 p-4 flex flex-col items-center justify-center select-none text-center shrink-0">
        {/* Pseudo-QR Code Design using high contrast CSS squares */}
        <div className="relative p-2 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center w-28 h-28 hover:scale-105 transition-all">
          <div 
            className="w-full h-full bg-slate-950 rounded relative"
            style={{
              backgroundImage: `
                linear-gradient(45deg, #000 25%, transparent 25%), 
                linear-gradient(-45deg, #000 25%, transparent 25%), 
                linear-gradient(45deg, transparent 75%, #000 75%), 
                linear-gradient(-45deg, transparent 75%, #000 75%)
              `,
              backgroundSize: "8px 8px",
              backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px"
            }}
          >
            {/* QR Position Finder Corners */}
            <div className="absolute top-0 left-0 w-8 h-8 bg-white p-1.5">
              <div className="w-full h-full border-4 border-slate-950 bg-white flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-slate-950 rounded-sm"></div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-8 h-8 bg-white p-1.5">
              <div className="w-full h-full border-4 border-slate-950 bg-white flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-slate-950 rounded-sm"></div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-8 h-8 bg-white p-1.5">
              <div className="w-full h-full border-4 border-slate-950 bg-white flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-slate-950 rounded-sm"></div>
              </div>
            </div>
            
            {/* Center Expo logo marker overlay */}
            <div className="absolute inset-0 m-auto w-6 h-6 bg-slate-950 rounded border border-white flex items-center justify-center shadow-md">
              <span className="text-[7px] text-indigo-400 font-bold font-mono">EXPO</span>
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <h4 className="text-[11px] font-bold text-slate-300 flex items-center justify-center gap-1">
            <QrCode className="w-3.5 h-3.5 text-indigo-400" />
            Scan to Open App
          </h4>
          <p className="text-[10px] text-slate-500 leading-normal max-w-[150px] mx-auto">
            Scan this code in **Expo Go** on Android or camera on iOS.
          </p>
        </div>
      </div>

    </div>
  );
}
