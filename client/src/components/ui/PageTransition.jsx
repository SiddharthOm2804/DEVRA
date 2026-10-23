import React, { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";

export default function PageTransition({ children }) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const routeScroll = document.querySelector("[data-route-scroll]");
    if (routeScroll) routeScroll.scrollTo({ top: 0, behavior: "auto" });
    else window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
      <motion.div
        key={location.pathname}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.12, ease: "easeOut" }}
        className="min-h-full"
      >
        {children}
      </motion.div>
  );
}
