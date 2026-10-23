import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  ChevronRight,
  Terminal,
  Activity
} from "lucide-react";
import DevraLogo from "./ui/DevraLogo";
import Button from "./ui/Button";

const SECTION_IDS = ["hero", "codebase-3d", "ai-review", "features"];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleSection) setActiveSection(visibleSection.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.15, 0.35, 0.6] }
    );

    SECTION_IDS.forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const navLinks = [
    { label: "Overview", href: "#hero" },
    { label: "Spatial 3D", href: "#codebase-3d" },
    { label: "AI AST Review", href: "#ai-review" },
    { label: "Architecture", href: "#features" },
    { label: "GitHub", href: "https://github.com/SiddharthOm2804/DEVRA", isExternal: true }
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
      className={`sticky top-0 z-50 px-3 sm:px-6 transition-all duration-300 select-none ${
        scrolled ? "py-2" : "py-3"
      }`}
    >
      <div
        className={`relative max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between rounded-2xl border backdrop-blur-2xl transition-all duration-300 ${
          scrolled
            ? "bg-abyssal-dark/90 border-abyssal-jade/20 shadow-[0_12px_40px_rgba(0,0,0,0.34)]"
            : "bg-abyssal-card/65 border-abyssal-border/70 shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
        }`}
      >
        <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-abyssal-jade/50 to-transparent pointer-events-none" />
        {/* Brand with custom visual mark */}
        <Link to="/" className="group flex items-center gap-2 rounded-lg focus-visible:outline-none" aria-label="Devra home">
          <DevraLogo
            size="md"
            showText={true}
            theme="dark"
            glow
            textClassName="transition-colors duration-200 group-hover:text-abyssal-jade"
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1 text-xs font-mono tracking-wide">
          {navLinks.map((link) =>
            link.isExternal ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-abyssal-secondary hover:text-abyssal-jade transition-colors"
              >
                <Github className="w-3.5 h-3.5 text-abyssal-jade/80" />
                <span>{link.label}</span>
              </a>
            ) : (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                aria-current={activeSection === link.href.slice(1) ? "location" : undefined}
                className={`relative rounded-lg px-3 py-2 transition-colors cursor-pointer after:absolute after:left-3 after:right-3 after:bottom-1 after:h-px after:bg-abyssal-jade after:transition-transform ${
                  activeSection === link.href.slice(1)
                    ? "text-abyssal-jade after:scale-x-100"
                    : "text-abyssal-secondary after:scale-x-0 hover:text-abyssal-ivory hover:after:scale-x-100"
                }`}
              >
                {link.label}
              </a>
            )
          )}
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghostDark" size="sm" className="!rounded-xl">
              Sign In
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="primary" size="sm" icon={ArrowRight} className="!rounded-xl shadow-jade-glow">
              Launch Console
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2.5 rounded-xl border border-abyssal-border/70 bg-abyssal-dark/50 text-abyssal-secondary hover:text-abyssal-jade hover:border-abyssal-jade/40 hover:bg-abyssal-surface transition-all"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="landing-mobile-navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Animated Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="landing-mobile-navigation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden max-w-7xl mx-auto mt-2 rounded-2xl border border-abyssal-border bg-abyssal-card/95 backdrop-blur-xl px-4 py-5 overflow-hidden shadow-2xl shadow-black/30"
          >
            <div className="space-y-4">
              <nav aria-label="Mobile navigation" className="grid grid-cols-2 gap-2">
                {navLinks.map((link) =>
                link.isExternal ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl border border-transparent bg-abyssal-dark/35 px-3 py-3 text-sm font-mono text-abyssal-secondary hover:text-abyssal-ivory hover:border-abyssal-border hover:bg-abyssal-surface/70 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="flex items-center gap-2">
                      <Github className="w-4 h-4 text-abyssal-muted" />
                      {link.label}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-abyssal-muted" />
                  </a>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => handleScrollTo(e, link.href)}
                    aria-current={activeSection === link.href.slice(1) ? "location" : undefined}
                    className={`rounded-xl border px-3 py-3 text-sm font-mono transition-colors ${
                      activeSection === link.href.slice(1)
                        ? "border-abyssal-jade/20 bg-abyssal-jade/10 text-abyssal-jade"
                        : "border-transparent bg-abyssal-dark/35 text-abyssal-secondary hover:border-abyssal-border hover:bg-abyssal-surface/70 hover:text-abyssal-ivory"
                    }`}
                  >
                    {link.label}
                  </a>
                )
                )}
              </nav>

              <div className="pt-4 border-t border-abyssal-border flex flex-col gap-2.5">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="dark" size="md" className="w-full justify-center">
                    Sign In
                  </Button>
                </Link>
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full justify-center" icon={ArrowRight}>
                    Launch Console
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
