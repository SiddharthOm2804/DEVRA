import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  User,
  Key,
  Cpu,
  Terminal,
  Bell,
  Check,
  Copy,
  Plus,
  Trash2,
  Save,
  ShieldCheck,
  LogOut
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  const [savedToast, setSavedToast] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Form states
  const [name, setName] = useState(user?.name || "Alex Vance");
  const [email, setEmail] = useState(user?.email || "alex@devra.ai");
  const [selectedModel, setSelectedModel] = useState("devra-reasoning-v1");
  const [strictness, setStrictness] = useState("standard");

  const [apiKeys, setApiKeys] = useState([
    { id: "key-1", name: "VS Code Extension Token", key: "dp_live_948f2038b7201948", created: "2 weeks ago" },
    { id: "key-2", name: "CI/CD Webhook Worker", key: "dp_live_1049b81920ac3991", created: "Yesterday" }
  ]);

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleCopyKey = (keyString, id) => {
    navigator.clipboard.writeText(keyString);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateKey = () => {
    const newKey = {
      id: `key-${Date.now()}`,
      name: "CLI Token",
      key: `dp_live_${Math.random().toString(36).substring(2, 14)}`,
      created: "Just now"
    };
    setApiKeys([...apiKeys, newKey]);
  };

  const handleDeleteKey = (id) => {
    setApiKeys(apiKeys.filter((k) => k.id !== id));
  };

  const tabs = [
    { id: "general", label: "General & Profile", icon: User },
    { id: "ai", label: "AI Engine Configuration", icon: Cpu },
    { id: "keys", label: "API Keys & Extension", icon: Key },
    { id: "notifications", label: "Webhooks & Alerts", icon: Bell }
  ];

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-sky-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Platform Settings
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Configure organization preferences, AI review models, and extension bridge tokens
          </p>
        </div>

        {savedToast && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-400 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-mono">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-slate-800 text-sky-400 border border-slate-700/80 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: General Profile */}
      {activeTab === "general" && (
        <Card className="space-y-6 bg-[#0C101A]">
          <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
            Developer Profile &amp; Organization
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#080B11] border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#080B11] border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button onClick={handleSave} variant="primary" size="sm" icon={Save}>
              Save Profile
            </Button>
          </div>

          <div className="border-t border-slate-800/80 pt-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Active Authentication Session</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Current token authentication status and session security
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-slate-200 font-semibold">{user?.email || "architect@devra.ai"}</span>
                  <Badge variant="emerald" size="sm">JWT Verified</Badge>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  Organization: {user?.organization || "Devra Engineering"} &bull; Role: {user?.role || "developer"}
                </p>
              </div>

              <Button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                variant="danger"
                size="sm"
                icon={LogOut}
              >
                Sign Out of Workspace
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 2: AI Engine Settings */}
      {activeTab === "ai" && (
        <Card className="space-y-6 bg-[#0C101A]">
          <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
            AI Review &amp; Code Intelligence Configuration
          </h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">
                Default Code Review Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "devra-reasoning-v1", name: "Devra Reasoning v1", desc: "Optimized for AST & code review (Fastest)" },
                  { id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet", desc: "Deep architectural synthesis" },
                  { id: "deepseek-r1", name: "DeepSeek R1", desc: "Heavy logic verification" }
                ].map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      selectedModel === m.id
                        ? "border-sky-500 bg-sky-500/10 text-white"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">{m.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-normal">{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-medium text-slate-300">
                Code Review Strictness
              </label>
              <div className="flex items-center gap-3">
                {["lenient", "standard", "pedantic"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setStrictness(mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${
                      strictness === mode
                        ? "bg-sky-500 text-white font-bold"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button onClick={handleSave} variant="primary" size="sm" icon={Save}>
              Save AI Settings
            </Button>
          </div>
        </Card>
      )}

      {/* Tab 3: API Keys */}
      {activeTab === "keys" && (
        <Card className="space-y-6 bg-[#0C101A]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">
                API Tokens &amp; VS Code Bridge
              </h2>
              <p className="text-xs text-slate-400">
                Use these tokens to connect the VS Code extension or CI/CD pipelines
              </p>
            </div>
            <Button onClick={handleCreateKey} variant="secondary" size="sm" icon={Plus}>
              Generate Key
            </Button>
          </div>

          <div className="divide-y divide-slate-800">
            {apiKeys.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-white">{item.name}</div>
                  <div className="text-xs font-mono text-slate-400">
                    {item.key.slice(0, 10)}••••••••••••
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">Created {item.created}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyKey(item.key, item.id)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Copy token"
                  >
                    {copiedKey === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteKey(item.id)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Revoke token"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 4: Notifications */}
      {activeTab === "notifications" && (
        <Card className="space-y-6 bg-[#0C101A]">
          <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
            Automation &amp; Notification Rules
          </h2>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div>
                <p className="font-semibold text-white">Automated PR Review Dispatch</p>
                <p className="text-slate-400 text-[11px]">Trigger review on pull request open or sync</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded bg-slate-800 text-sky-500 focus:ring-0" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div>
                <p className="font-semibold text-white">Security Vulnerability Alerts</p>
                <p className="text-slate-400 text-[11px]">Send immediate alert if high/critical CVE is detected</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded bg-slate-800 text-sky-500 focus:ring-0" />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
