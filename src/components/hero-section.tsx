"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Play } from "lucide-react";
import { AnimatedCounter } from "./animated-counter";
import { FloatingElement } from "./floating-element";
import { GlowingButton } from "./ui/glowing-button";

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div
          className={`transform transition-all duration-1000 ${
            isVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-10 opacity-0"
          }`}
        >
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 backdrop-blur-sm mb-8">
            <Sparkles className="h-4 w-4 text-blue-400 mr-2" />
            <span className="text-blue-300 text-sm font-medium">
              ✨ The Future of Document Management
            </span>
          </div>

          <h1 className="text-6xl sm:text-8xl font-extrabold mb-8">
            <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent leading-tight">
              Professional Document
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Management
            </span>
            <br />
            <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
              Reimagined
            </span>
          </h1>

          <p className="text-2xl text-blue-100/80 mb-12 max-w-4xl mx-auto leading-relaxed">
            Experience the next generation of document workflow.
            Lightning-fast processing, AI-powered insights, and collaboration
            tools that scale with your ambition.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <GlowingButton variant="primary" className="group">
              Start Free Trial
              <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </GlowingButton>
            <GlowingButton variant="ghost" className="group">
              <Play className="mr-2 h-6 w-6" />
              Watch Demo
            </GlowingButton>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {[
            { number: 50000, label: "Documents Processed", suffix: "+" },
            { number: 99.9, label: "Uptime Guarantee", suffix: "%" },
            { number: 150, label: "Countries Served", suffix: "+" },
            { number: 4.9, label: "Customer Rating", suffix: "/5" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                <AnimatedCounter end={stat.number} />
                {stat.suffix}
              </div>
              <div className="text-blue-200/60 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Elements */}
      <FloatingElement delay={0}>
        <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl backdrop-blur-sm border border-white/10" />
      </FloatingElement>
      <FloatingElement delay={1}>
        <div className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full backdrop-blur-sm border border-white/10" />
      </FloatingElement>
      <FloatingElement delay={2}>
        <div className="absolute bottom-40 left-20 w-12 h-12 bg-gradient-to-br from-pink-500/20 to-orange-500/20 rounded-xl backdrop-blur-sm border border-white/10" />
      </FloatingElement>
    </section>
  );
}