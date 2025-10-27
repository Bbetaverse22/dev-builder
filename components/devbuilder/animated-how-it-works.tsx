"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Github, Brain, Target, Rocket, ArrowRight } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Connect GitHub",
    description: "Provide your GitHub username. Our AI agents will securely analyze your public repositories and contribution history.",
    icon: Github,
    color: "from-purple-500 to-pink-500"
  },
  {
    number: "02",
    title: "AI Analysis",
    description: "Multiple AI agents work in parallel to extract skills, analyze code quality, and research market trends.",
    icon: Brain,
    color: "from-blue-500 to-cyan-500"
  },
  {
    number: "03",
    title: "Career Focus",
    description: "Add optional career goals, target roles, and industry keywords so the agents tailor research and recommendations.",
    icon: Target,
    color: "from-orange-500 to-red-500"
  },
  {
    number: "04",
    title: "Get Your Roadmap",
    description: "Receive a personalized learning path with curated resources and actionable tasks to level up.",
    icon: Rocket,
    color: "from-green-500 to-emerald-500"
  }
];

export function AnimatedHowItWorks() {
  return (
    <div className="py-20" id="how-it-works">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          How It Works
        </h2>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          From analysis to action in four simple steps
        </p>
      </motion.div>

      <div className="max-w-5xl mx-auto relative">
        {/* Connection line */}
        <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/50 via-purple-500/50 to-pink-500/50 transform -translate-x-1/2" />

        <div className="space-y-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 0;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`flex items-center gap-8 ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}
              >
                {/* Content Card */}
                <div className="flex-1">
                  <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          className={`w-16 h-16 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 shadow-lg`}
                        >
                          <Icon className="w-8 h-8 text-white" />
                        </motion.div>

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-5xl font-bold bg-gradient-to-br ${step.color} bg-clip-text text-transparent opacity-50`}>
                              {step.number}
                            </span>
                            <h3 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors">
                              {step.title}
                            </h3>
                          </div>
                          <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Center dot indicator (desktop only) */}
                <div className="hidden lg:flex items-center justify-center flex-shrink-0">
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                    className={`w-4 h-4 rounded-full bg-gradient-to-br ${step.color} shadow-lg animate-pulse-glow`}
                  />
                </div>

                {/* Spacer for alignment */}
                <div className="flex-1 hidden lg:block" />
              </motion.div>
            );
          })}
        </div>

        {/* CTA Arrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="flex justify-center mt-16"
        >
          <Link href="/agentic" className="group inline-flex">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="inline-flex items-center gap-3 rounded-full border border-purple-400/40 bg-gradient-to-r from-purple-700/40 via-indigo-700/40 to-blue-700/40 px-6 py-3 text-white shadow-[0_0_25px_rgba(147,51,234,0.35)] backdrop-blur transition-all group-hover:border-purple-300/60 group-hover:shadow-[0_0_35px_rgba(147,51,234,0.45)]"
            >
              <span className="text-lg font-semibold tracking-wide">Ready to try it?</span>
              <ArrowRight className="w-5 h-5 text-purple-200 transition-transform group-hover:translate-x-1" />
            </motion.div>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
