import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Layers,
  FolderGit2,
  GitBranch,
  Server,
  Database,
  Activity,
  ArrowRight,
  Maximize2,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import CodebaseVisualizer3D from "./CodebaseVisualizer3D";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { repositoryApi } from "../../services/api";
import { MOCK_REPOSITORIES } from "../../constants/mockData";

export default function Codebase3DShowcase() {
  const [repo, setRepo] = useState(MOCK_REPOSITORIES[0]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Attempt to load active repo and analysis from API safely
    let isMounted = true;
    (async () => {
      try {
        const res = await repositoryApi.getAll();
        if (isMounted && res.success && res.repositories?.length > 0) {
          setRepo(res.repositories[0]);
        }
      } catch (err) {
        // Graceful fallback to mock data
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section id="codebase-3d" className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 border-t border-slate-800/80">
      {/* Background glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-xs font-mono text-sky-300">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>3D WEBGL AST ENGINE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Spatial Codebase Intelligence
          </h2>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Navigate your entire software repository in high-performance WebGL.
            Inspect functional boundaries, track cross-module dependency cycles, and monitor
            architectural health across Frontend, Backend, Services, and Database layers.
          </p>
        </div>

        {/* Quick Launch CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/repositories">
            <Button variant="secondary" size="md" icon={FolderGit2}>
              Explore Repositories
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="primary" size="md" icon={ArrowRight}>
              Launch Console
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Tiles Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 font-mono text-xs">
        <div className="p-3.5 rounded-xl bg-[#0C101A] border border-slate-800/90 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Modules</span>
          </div>
          <p className="text-lg font-bold text-white">5 Clusters</p>
          <span className="text-[10px] text-slate-500">Domains segregated</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0C101A] border border-slate-800/90 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <FolderGit2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Files</span>
          </div>
          <p className="text-lg font-bold text-white">184 Files</p>
          <span className="text-[10px] text-slate-500">AST parsed</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0C101A] border border-slate-800/90 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dependencies</span>
          </div>
          <p className="text-lg font-bold text-white">342 Edges</p>
          <span className="text-[10px] text-emerald-400">0 Cycles detected</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0C101A] border border-slate-800/90 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Server className="w-3.5 h-3.5 text-purple-400" />
            <span>Services</span>
          </div>
          <p className="text-lg font-bold text-white">8 Microservices</p>
          <span className="text-[10px] text-slate-500">Event-driven</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0C101A] border border-slate-800/90 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>Database</span>
          </div>
          <p className="text-lg font-bold text-white">MongoDB + Vector</p>
          <span className="text-[10px] text-slate-500">128-d L2 cosine</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0C101A] border border-slate-800/90 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Activity className="w-3.5 h-3.5 text-rose-400" />
            <span>Health Score</span>
          </div>
          <p className="text-lg font-bold text-emerald-400">96.4%</p>
          <span className="text-[10px] text-emerald-400">Grade A+ Pristine</span>
        </div>
      </div>

      {/* 3D Codebase Visualizer Container */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden shadow-2xl bg-[#070A0F]">
        <CodebaseVisualizer3D
          analysis={analysis}
          repo={repo}
          initialViewMode="Architecture"
        />
      </div>

      {/* Bottom Features Strip */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-500 px-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            Frontend UI
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Backend API
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            Services
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Database
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Utilities
          </span>
        </div>

        <div>
          <span>Tip: Toggle between <strong>[Architecture]</strong>, <strong>[Dependencies]</strong>, and <strong>[Health]</strong> to inspect live metrics.</span>
        </div>
      </div>
    </section>
  );
}
