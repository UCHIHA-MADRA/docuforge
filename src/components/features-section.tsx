"use client";

import React from "react";
import { Rocket, ArrowRight, Scissors, FileOutput, FileSearch, Table, Zap, Shield } from "lucide-react";

export function FeaturesSection() {
  return (
    <section className="relative py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 backdrop-blur-sm mb-8">
            <Rocket className="h-4 w-4 text-emerald-400 mr-2" />
            <span className="text-emerald-300 text-sm font-medium">
              🚀 Powerful Features
            </span>
          </div>

          <h2 className="text-5xl sm:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Everything You Need for
            </span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Document Excellence
            </span>
          </h2>
          <p className="text-xl text-blue-100/70 max-w-3xl mx-auto">
            Revolutionary tools designed for teams who demand perfection,
            security, and seamless collaboration in every document workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Scissors,
              title: "AI-Powered PDF Splitter",
              description:
                "Intelligent document splitting with preview, batch processing, and smart page detection. Lightning-fast and incredibly precise.",
              color: "from-blue-500 to-cyan-500",
              bgColor: "from-blue-500/20 to-cyan-500/20",
              link: "/tools/pdf-splitter",
            },
            {
              icon: FileOutput,
              title: "Universal Converter",
              description:
                "Convert any document format with 99.9% accuracy. Support for 50+ formats with cloud-native processing power.",
              color: "from-emerald-500 to-teal-500",
              bgColor: "from-emerald-500/20 to-teal-500/20",
              link: "/tools/pdf-converter",
            },
            {
              icon: FileSearch,
              title: "Advanced OCR Engine",
              description:
                "Extract text from any image or scanned document with industry-leading accuracy and multi-language support.",
              color: "from-purple-500 to-pink-500",
              bgColor: "from-purple-500/20 to-pink-500/20",
              link: "/tools",
            },
            {
              icon: Table,
              title: "Smart Spreadsheet Engine",
              description:
                "Create, analyze, and visualize data with our AI-enhanced spreadsheet engine featuring 200+ functions.",
              color: "from-orange-500 to-red-500",
              bgColor: "from-orange-500/20 to-red-500/20",
              link: "/tools",
            },
            {
              icon: Zap,
              title: "Instant Compression",
              description:
                "Reduce file sizes by up to 90% while maintaining perfect quality using our proprietary compression algorithms.",
              color: "from-yellow-500 to-orange-500",
              bgColor: "from-yellow-500/20 to-orange-500/20",
              link: "/tools",
            },
            {
              icon: Shield,
              title: "Enterprise Security",
              description:
                "Military-grade encryption, GDPR compliance, and zero-trust architecture protecting your most sensitive documents.",
              color: "from-indigo-500 to-purple-500",
              bgColor: "from-indigo-500/20 to-purple-500/20",
              link: "/dashboard",
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="group relative p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={`w-16 h-16 bg-gradient-to-br ${feature.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon
                  className={`h-8 w-8 bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}
                />
              </div>

              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-blue-300 transition-colors">
                {feature.title}
              </h3>
              <p className="text-blue-100/70 mb-6 leading-relaxed">
                {feature.description}
              </p>

              <button className="inline-flex items-center text-blue-400 hover:text-blue-300 font-semibold group-hover:translate-x-2 transition-all duration-300">
                Try Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>

              {/* Hover effect */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.bgColor} rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10`}
              ></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}