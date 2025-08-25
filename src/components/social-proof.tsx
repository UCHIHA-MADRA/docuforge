"use client";

import React from "react";

export function SocialProof() {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto text-center">
        <h3 className="text-2xl font-semibold text-white/80 mb-12">
          Trusted by industry leaders worldwide
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center opacity-60">
          {["Microsoft", "Google", "Apple", "Amazon", "Meta"].map(
            (company, index) => (
              <div
                key={index}
                className="text-2xl font-bold text-white/40 hover:text-white/80 transition-colors cursor-pointer"
              >
                {company}
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}