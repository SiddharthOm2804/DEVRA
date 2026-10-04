import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CodeSnippet({
  code,
  language = "javascript",
  title = "",
  showLineNumbers = true
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split("\n");

  return (
    <div className="rounded-lg overflow-hidden border border-slate-800 bg-[#0A0D14] text-xs font-mono">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 text-slate-400">
        <span className="text-[11px] text-slate-300 font-medium">
          {title || language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-slate-800"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-3 overflow-x-auto text-slate-200 leading-relaxed font-mono">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const isAdded = line.startsWith("+");
              const isRemoved = line.startsWith("-");
              const isComment = line.trim().startsWith("//");

              let rowClass = "hover:bg-slate-800/30";
              let textClass = "text-slate-200";

              if (isAdded) {
                rowClass = "bg-emerald-500/10 hover:bg-emerald-500/20";
                textClass = "text-emerald-300 font-semibold";
              } else if (isRemoved) {
                rowClass = "bg-rose-500/10 hover:bg-rose-500/20";
                textClass = "text-rose-300 font-semibold";
              } else if (isComment) {
                textClass = "text-slate-500 italic";
              }

              return (
                <tr key={idx} className={rowClass}>
                  {showLineNumbers && (
                    <td className="pr-4 py-0.5 text-right text-slate-600 select-none text-[11px] w-8">
                      {idx + 1}
                    </td>
                  )}
                  <td className={`py-0.5 whitespace-pre ${textClass}`}>
                    <span>{line}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
