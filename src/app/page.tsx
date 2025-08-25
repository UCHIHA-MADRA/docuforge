"use client";

import React from "react";
import { BackgroundEffect } from "@/components/background-effect";
import { HeroSection } from "@/components/hero-section";
import { FeaturesSection } from "@/components/features-section";
import { SocialProof } from "@/components/social-proof";
import { CTASection } from "@/components/cta-section";
import {
  ArrowRight,
  Scissors,
  FileOutput,
  FileSearch,
  Table,
  Zap,
  Shield,
  Star,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen transition-all duration-500">
      {/* Animated Background */}
      <BackgroundEffect />

      {/* Hero Section */}
      <HeroSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* Social Proof */}
      <SocialProof />

      {/* CTA Section */}
      <CTASection />

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-10px) rotate(1deg);
          }
          66% {
            transform: translateY(-5px) rotate(-1deg);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        @keyframes gradient-shift {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .bg-gradient-animate {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
