"use client";

export function ShareButton() {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[#aaa]">Share this report</span>
      <button
        onClick={() => navigator.clipboard.writeText(window.location.href)}
        className="px-4 py-2 bg-[#111] text-white text-xs rounded-lg hover:bg-[#333] transition-colors"
      >
        Copy link
      </button>
    </div>
  );
}
