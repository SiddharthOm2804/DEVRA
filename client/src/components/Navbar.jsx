import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ArrowRight,
  ExternalLink,
  Github,
  Sparkles,
  GitPullRequest,
  Box,
  Layers,
  ChevronRight
} from "lucide-react";
import DevraLogo from "./ui/DevraLogo";
import Button from "./ui/Button";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Product", href: "#hero" },
    { label: "Features", href: "#features" },
    { label: "Codebase", href: "#codebase-3d" },
    { label: "AI Review", href: "#ai-review" },
    { label: "GitHub", href: "https://github.com", isExternal: true }
  ];

  const handleScrollTo = (e, href) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
        setMobileMenuOpen(false);
      }
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 select-none ${
        scrolled
          ? "bg-[#090D15]/85 backdrop-blur-xl border-b border-slate-800/80 shadow-lg shadow-black/30 py-3"
          : "bg-[#080B11]/70 backdrop-blur-md border-b border-slate-800/40 py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Brand with custom visual mark */}
        <Link to="/" className="group flex items-center gap-2">
          <DevraLogo size="sm" showText={true} />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-mono tracking-wide text-slate-400">
          {navLinks.map((link) =>
            link.isExternal ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-white transition-colors"
              >
                <Github className="w-3.5 h-3.5 text-slate-400" />
                <span>{link.label}</span>
              </a>
            ) : (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="hover:text-white transition-colors cursor-pointer"
              >
                {link.label}
              </a>
            )
          )}
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Login
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="primary" size="sm" icon={ArrowRight}>
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Animated Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-b border-slate-800 bg-[#0A0E18]/95 backdrop-blur-xl px-4 py-6 overflow-hidden"
          >
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) =>
                link.isExternal ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-sm font-mono text-slate-300 hover:text-white py-1"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="flex items-center gap-2">
                      <Github className="w-4 h-4 text-slate-400" />
                      {link.label}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => handleScrollTo(e, link.href)}
                    className="text-sm font-mono text-slate-300 hover:text-white py-1"
                  >
                    {link.label}
                  </a>
                )
              )}

              <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-2.5">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="secondary" size="md" className="w-full justify-center">
                    Login
                  </Button>
                </Link>
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full justify-center" icon={ArrowRight}>
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
