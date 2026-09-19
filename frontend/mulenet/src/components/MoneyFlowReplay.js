"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Clock,
  ArrowRight,
  ShieldAlert,
  Percent,
  Layers,
  Volume2
} from "lucide-react";

export default function MoneyFlowReplay({
  hops = [],
  currencySymbol = "₹",
  onActiveHopChange,
  ringId = null,
  compact = false
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x = 2000ms, 2x = 1000ms, 4x = 500ms
  const timerRef = useRef(null);

  const totalHops = hops.length;
  const currentHop = hops[currentIdx] || null;

  // Inform parent when active hop changes
  useEffect(() => {
    if (onActiveHopChange && currentHop) {
      onActiveHopChange(currentIdx, currentHop);
    }
  }, [currentIdx, currentHop, onActiveHopChange]);

  // Handle Playback Interval
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.round(2000 / speed);
    timerRef.current = setInterval(() => {
      setCurrentIdx((prev) => {
        if (prev >= totalHops - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, totalHops]);

  const handlePlayToggle = () => {
    if (currentIdx >= totalHops - 1 && !isPlaying) {
      setCurrentIdx(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (currentIdx < totalHops - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIdx(0);
  };

  if (!hops || hops.length === 0) {
    return (
      <div className="p-3 bg-white border border-[#E2E8F0] rounded-[4px] text-xs font-mono text-[#64748B] text-center">
        No sequential transfer hops available to replay.
      </div>
    );
  }

  // Calculate cumulative elapsed time
  const cumulativeHours = hops.slice(0, currentIdx + 1).reduce((sum, h) => {
    return sum + (Number(h.time_delta_hours) || 0);
  }, 0);

  const formatElapsed = (hrs) => {
    if (hrs <= 0) return "Initial Hop (0m)";
    const h = Math.floor(hrs);
    const m = Math.round((hrs - h) * 60);
    if (h === 0) return `${m}m elapsed`;
    return `${h}h ${m}m elapsed`;
  };

  // Retention percentage
  const fundsRetainedPct = currentHop?.retained_percent
    ? (100 - Math.abs(currentHop.retained_percent)).toFixed(1)
    : "99.1";

  return (
    <div
      className={`bg-white border border-[#E2E8F0] rounded-[4px] ${
        compact ? "p-3 space-y-2.5" : "p-4 space-y-3"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert size={compact ? 13 : 14} className="text-[#2563EB]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
            Money Flow Replay
          </span>
          {ringId && (
            <span className="text-[10px] font-mono bg-[#F1F5F9] text-[#0F172A] px-1.5 py-0.5 rounded-[3px] border border-[#E2E8F0]">
              {ringId}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#0F172A] bg-[#F1F5F9] px-2 py-0.5 rounded-[3px] border border-[#E2E8F0]">
            Hop {currentIdx + 1} of {totalHops}
          </span>
        </div>
      </div>

      {/* Live Forensic Status Card (Overlay Banner) */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] p-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#475569]">
            <Clock size={12} className="text-[#94A3B8]" />
            <span className="font-medium text-[#0F172A]">{formatElapsed(cumulativeHours)}</span>
          </div>
          <div className="flex items-center gap-2 text-[#475569]">
            <Percent size={12} className="text-[#94A3B8]" />
            <span className="text-[#0F172A] font-medium">{fundsRetainedPct}% funds forwarded</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#64748B]">
            <Layers size={11} />
            <span>Layer {currentIdx + 1} / {totalHops}</span>
          </div>
        </div>

        {/* Transfer Step Visualizer */}
        <div className="bg-white border border-[#E2E8F0] rounded-[4px] p-2.5 flex items-center justify-between">
          <div className="flex-1 truncate">
            <div className="text-[10px] text-[#64748B] uppercase font-mono">Origin</div>
            <div className="text-xs font-mono font-medium text-[#0F172A] truncate">
              {currentHop.from_account}
            </div>
          </div>

          <div className="px-3 flex flex-col items-center">
            <div className="text-xs font-mono font-medium text-[#0F172A] bg-[#F1F5F9] px-2 py-0.5 rounded-[3px] border border-[#E2E8F0]">
              {currencySymbol}{Number(currentHop.amount || 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-[#94A3B8] text-[10px] mt-0.5">
              <span>───────►</span>
            </div>
          </div>

          <div className="flex-1 text-right truncate">
            <div className="text-[10px] text-[#64748B] uppercase font-mono">Destination</div>
            <div className="text-xs font-mono font-medium text-[#0F172A] truncate">
              {currentHop.to_account}
            </div>
          </div>
        </div>

        {/* Hop Metadata subline */}
        <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B] pt-0.5">
          <span>{currentHop.timestamp || "2026-09-01T10:00:00Z"}</span>
          <span>
            Fee / Retained: {currencySymbol}{Number(currentHop.retained_amount || 0).toLocaleString()} ({currentHop.retained_percent || 0.5}%)
          </span>
        </div>
      </div>

      {/* Progress Scrub Bar */}
      <div className="space-y-1">
        <div className="h-1.5 w-full bg-[#F1F5F9] rounded-[2px] overflow-hidden flex border border-[#E2E8F0]">
          <div
            className="bg-[#2563EB] transition-all duration-300"
            style={{ width: `${Math.round(((currentIdx + 1) / totalHops) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
          <span>Origin Disburse</span>
          <span>Final Cashout Vault</span>
        </div>
      </div>

      {/* Simulator Control Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleReset}
            className="p-1.5 rounded-[3px] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] border border-[#E2E8F0] transition cursor-pointer"
            title="Reset to Start"
          >
            <RotateCcw size={12} />
          </button>

          <button
            onClick={handleStepBackward}
            disabled={currentIdx === 0}
            className="p-1.5 rounded-[3px] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] border border-[#E2E8F0] disabled:opacity-40 transition cursor-pointer"
            title="Previous Hop"
          >
            <SkipBack size={12} />
          </button>

          <button
            onClick={handlePlayToggle}
            className="flex items-center gap-1 px-3 py-1 rounded-[3px] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs font-medium transition cursor-pointer"
          >
            {isPlaying ? <Pause size={12} className="text-[#2563EB]" /> : <Play size={12} className="text-[#2563EB]" />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <button
            onClick={handleStepForward}
            disabled={currentIdx === totalHops - 1}
            className="p-1.5 rounded-[3px] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] border border-[#E2E8F0] disabled:opacity-40 transition cursor-pointer"
            title="Next Hop"
          >
            <SkipForward size={12} />
          </button>
        </div>

        {/* Speed Multiplier */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#64748B] mr-1">Speed:</span>
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] transition cursor-pointer border ${
                speed === s
                  ? "bg-[#F1F5F9] text-[#0F172A] border-[#CBD5E1]"
                  : "bg-white text-[#64748B] border-[#E2E8F0] hover:text-[#0F172A]"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
