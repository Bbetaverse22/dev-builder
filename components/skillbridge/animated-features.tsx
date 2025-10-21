"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  Brain,
  Github,
  Target,
  TrendingUp,
  Zap,
  Bot,
  FileCode,
  Sparkles,
  Search,
  BookOpen,
  CheckCircle2,
  Activity
} from "lucide-react";
import { ReactNode } from "react";

interface Feature {
  icon: ReactNode;
  title: string;
  description: string;
  gradient: string;
}

const features: Feature[] = [
  {
    icon: <Github className="w-8 h-8" />,
    title: "GitHub Analysis",
    description: "Deep dive into your repositories to extract skills, technologies, and contribution patterns.",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    icon: <Brain className="w-8 h-8" />,
    title: "AI-Powered Insights",
    description: "Advanced LLM agents analyze market trends and identify your skill gaps automatically.",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    icon: <Target className="w-8 h-8" />,
    title: "Gap Detection",
    description: "Identify missing skills by comparing your profile with industry requirements.",
    gradient: "from-orange-500 to-red-500"
  },
  {
    icon: <BookOpen className="w-8 h-8" />,
    title: "Learning Paths",
    description: "Get personalized roadmaps with curated resources to fill your skill gaps.",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    icon: <Bot className="w-8 h-8" />,
    title: "Autonomous Agents",
    description: "AI agents work independently to research, plan, and create actionable tasks.",
    gradient: "from-violet-500 to-purple-500"
  },
  {
    icon: <Activity className="w-8 h-8" />,
    title: "Real-Time Tracking",
    description: "Monitor agent progress and see skill improvements as they happen.",
    gradient: "from-pink-500 to-rose-500"
  },
  {
    icon: <FileCode className="w-8 h-8" />,
    title: "Portfolio Builder",
    description: "Automatically generate GitHub issues to improve your project quality.",
    gradient: "from-cyan-500 to-blue-500"
  },
  {
    icon: <Sparkles className="w-8 h-8" />,
    title: "Career Guidance",
    description: "Get AI-driven recommendations for career growth and job opportunities.",
    gradient: "from-yellow-500 to-orange-500"
  },
  {
    icon: <Zap className="w-8 h-8" />,
    title: "Instant Results",
    description: "Receive comprehensive analysis in minutes, not days.",
    gradient: "from-indigo-500 to-blue-500"
  }
];

export function AnimatedFeatures() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Powerful Features
        </h2>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Everything you need to accelerate your career growth with AI
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {features.map((feature, index) => (
          <motion.div key={index} variants={itemVariants}>
            <Card className="h-full bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group cursor-pointer">
              <CardContent className="p-6">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}
                >
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </motion.div>

                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
