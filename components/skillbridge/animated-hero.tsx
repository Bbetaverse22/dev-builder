"use client";

import { motion } from "framer-motion";
import { Brain, Sparkles, Zap, Target, TrendingUp, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";

interface AnimatedHeroProps {
  enableCtas?: boolean;
}

export function AnimatedHero({ enableCtas = true }: AnimatedHeroProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Floating orbs animation - use consistent seed-based positions
  const floatingOrbs = [
    { size: 300, duration: 20, delay: 0, color: "from-blue-500/20 to-purple-500/20", seed: 1 },
    { size: 200, duration: 15, delay: 2, color: "from-purple-500/20 to-pink-500/20", seed: 2 },
    { size: 250, duration: 18, delay: 4, color: "from-cyan-500/20 to-blue-500/20", seed: 3 },
  ];

  // Seeded random function for consistent SSR/client positions
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Icon float animation
  const iconVariants = {
    float: {
      y: [0, -20, 0],
      transition: {
        duration: 3,
        repeat: Infinity as number,
        ease: "easeInOut" as const
      }
    }
  };

  const icons = [
    { Icon: Brain, delay: 0, position: "top-1/4 left-1/4" },
    { Icon: Code, delay: 0.5, position: "top-1/3 right-1/4" },
    { Icon: Target, delay: 1, position: "bottom-1/3 left-1/3" },
    { Icon: TrendingUp, delay: 1.5, position: "bottom-1/4 right-1/3" },
    { Icon: Sparkles, delay: 2, position: "top-1/2 left-1/2" },
    { Icon: Zap, delay: 2.5, position: "top-2/3 right-1/2" },
  ];

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        {mounted && floatingOrbs.map((orb, i) => {
          // Use seeded random for consistent positions
          const initialX = seededRandom(orb.seed * 10) * 100 - 50;
          const initialY = seededRandom(orb.seed * 20) * 100 - 50;
          const x1 = seededRandom(orb.seed * 30) * 100 - 50;
          const y1 = seededRandom(orb.seed * 40) * 100 - 50;
          const x2 = seededRandom(orb.seed * 50) * 100 - 50;
          const y2 = seededRandom(orb.seed * 60) * 100 - 50;

          return (
            <motion.div
              key={i}
              className={`absolute rounded-full bg-gradient-to-br ${orb.color} blur-3xl`}
              style={{
                width: orb.size,
                height: orb.size,
              }}
              initial={{
                x: `${initialX}%`,
                y: `${initialY}%`,
                scale: 0
              }}
              animate={{
                x: [
                  `${initialX}%`,
                  `${x1}%`,
                  `${x2}%`,
                ],
                y: [
                  `${initialY}%`,
                  `${y1}%`,
                  `${y2}%`,
                ],
                scale: [0, 1, 1, 0.8, 1],
              }}
              transition={{
                duration: orb.duration,
                repeat: Infinity as number,
                delay: orb.delay,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>

      {/* Floating icons */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block">
        {mounted && icons.map(({ Icon, delay, position }, i) => (
          <motion.div
            key={i}
            className={`absolute ${position} opacity-10`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.1, scale: 1 }}
            transition={{ delay: delay + 0.5, duration: 0.5 }}
          >
            <motion.div variants={iconVariants} animate="float">
              <Icon className="w-12 h-12 text-blue-400" />
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Hero content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center space-x-2 bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-full px-4 py-2 mb-6"
        >
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-blue-300 font-medium">
            AI-Powered Career Intelligence
          </span>
        </motion.div>

        {/* Main heading with gradient */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl md:text-7xl font-bold mb-6"
        >
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
            Transform Your Career
          </span>
          <br />
          <span className="text-white">with AI Agents</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto"
        >
          Autonomous AI agents analyze your GitHub, identify skill gaps, and create
          personalized learning paths—all in real-time.
        </motion.p>

        {/* CTA Buttons */}
        {enableCtas && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-full shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
            >
              <Link href="/agentic">
                <Zap className="mr-2 h-5 w-5" />
                Try it Now
              </Link>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white px-8 py-6 text-lg rounded-full"
              onClick={() => {
                const howSection = document.getElementById('how-it-works');
                howSection?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Brain className="mr-2 h-5 w-5" />
              Learn How It Works
            </Button>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto"
        >
          {[
            { label: "AI Agents", value: "5+" },
            { label: "Skills Analyzed", value: "50+" },
            { label: "Learning Paths", value: "∞" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2"
        >
          <motion.div className="w-1.5 h-1.5 bg-white/50 rounded-full" />
        </motion.div>
      </motion.div>
    </div>
  );
}
