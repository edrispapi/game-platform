'use client';
import React, { useCallback } from "react";
import Particles from "react-particles";
import type { Engine } from "tsparticles-engine";
import { loadFull } from "tsparticles";
import { motion } from "framer-motion";
type AuthLayoutProps = {
  children: React.ReactNode;
};
export function AuthLayout({ children }: AuthLayoutProps): JSX.Element {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadFull(engine);
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-void-900 relative overflow-hidden p-4">
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          particles: {
            number: { value: 50 },
            color: { value: "#E02D2D" },
            shape: { type: "circle" },
            opacity: { value: 0.3, random: true },
            size: { value: 2, random: true },
            move: {
              enable: true,
              speed: 1,
              direction: "none",
              out_mode: "out",
            },
            links: {
              enable: true,
              distance: 150,
              color: "#E02D2D",
              opacity: 0.2,
              width: 1,
            },
          },
          interactivity: {
            events: {
              onhover: { enable: true, mode: "repulse" },
            },
            modes: {
              repulse: { distance: 100 },
            },
          },
          detectRetina: true,
          background: {
            color: "transparent",
          },
        }}
        className="absolute inset-0"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="z-10 w-full max-w-md"
      >
        {children}
      </motion.div>
    </div>
  );
}