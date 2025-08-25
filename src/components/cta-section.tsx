"use client";

import React from "react";
import { ArrowRight, Star } from "lucide-react";
import { GlowingButton } from "./ui/glowing-button";

export function CTASection() {
  return (
    <section className="relative py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl blur-3xl"></div>
          <div className="relative bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 rounded-3xl border border-white/10 backdrop-blur-xl p-16">
            <h2 className="text-5xl sm:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Ready to Transform Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Document Workflow?
              </span>
            </h2>
            <p className="text-xl text-blue-100/70 mb-12 max-w-3xl mx-auto">
              Join over 50,000 teams who&apos;ve revolutionized their document
              management with DocuForge. Start your transformation today.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <GlowingButton
                variant="primary"
                className="group text-xl px-12 py-5"
              >
                Start Your Free Trial
                <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </GlowingButton>
              <GlowingButton
                variant="secondary"
                className="text-xl px-12 py-5"
              >
                Schedule Demo
              </GlowingButton>
            </div>

            <div className="flex items-center justify-center mt-8 space-x-2">
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <span className="text-white/60 ml-2">
                4.9/5 from 10,000+ reviews
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}