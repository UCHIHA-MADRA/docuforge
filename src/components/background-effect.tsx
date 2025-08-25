"use client";

import React, { useState, useEffect, useRef } from "react";

interface Ripple {
  id: number;
  x: number;
  y: number;
  scale: number;
}

interface Star {
  x: number;
  y: number;
  z: number;
  speed: number;
  size: number;
  opacity: number;
  twinkle: number;
}

export function BackgroundEffect() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const glowAnimationRef = useRef<number>();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleClick = (e: MouseEvent) => {
      const newRipple: Ripple = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY,
        scale: 0,
      };
      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) =>
          prev.filter((ripple) => ripple.id !== newRipple.id)
        );
      }, 2000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  // Client-side only animations for glow effects
  useEffect(() => {
    const animateGlowEffects = () => {
      // Subtle pulsing scale effect
      setScale(1 + Math.sin(Date.now() * 0.001) * 0.1);
      
      // Continuous rotation effect
      setRotation(prev => (prev + 0.1) % 360);
      
      glowAnimationRef.current = requestAnimationFrame(animateGlowEffects);
    };
    
    glowAnimationRef.current = requestAnimationFrame(animateGlowEffects);
    
    return () => {
      if (glowAnimationRef.current) {
        cancelAnimationFrame(glowAnimationRef.current);
      }
    };
  }, []);

  // Animated starfield
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars: Star[] = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * 1000,
      speed: 0.5 + Math.random() * 2,
      size: Math.random() * 2,
      opacity: Math.random(),
      twinkle: Math.random() * 0.02,
    }));

    const animate = () => {
      if (ctx) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.1)";
      }
      if (ctx) {
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      stars.forEach((star) => {
        star.z -= star.speed;
        if (star.z <= 0) {
          star.z = 1000;
          star.x = Math.random() * canvas.width;
          star.y = Math.random() * canvas.height;
        }

        const x =
          (star.x - canvas.width / 2) * (1000 / star.z) + canvas.width / 2;
        const y =
          (star.y - canvas.height / 2) * (1000 / star.z) + canvas.height / 2;
        const size = (1 - star.z / 1000) * star.size * 3;

        star.opacity += (Math.random() - 0.5) * star.twinkle;
        star.opacity = Math.max(0.1, Math.min(1, star.opacity));

        if (ctx) ctx.fillStyle = `rgba(255, 255, 255, ${
          star.opacity * (1 - star.z / 1000)
        })`;
        if (ctx) ctx.beginPath();
        if (ctx) ctx.arc(x, y, size, 0, Math.PI * 2);
        if (ctx) ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Multi-layer gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/80 to-slate-900"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-indigo-900/50 via-transparent to-cyan-900/30"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent"></div>

      {/* Animated starfield canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 opacity-60"
        style={{ mixBlendMode: "screen" }}
      />

      {/* Floating orbs with complex animations */}
      {Array.from({ length: 30 }).map((_, i) => {
        const index = i + 1;
        const leftPos = (index * 7919) % 100;
        const topPos = (index * 6271) % 100;
        const size = 0.5 + ((index * 1531) % 3);
        const hue = (index * 137.5) % 360;
        const duration = 8 + ((index * 2311) % 12);

        return (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              left: `${leftPos}%`,
              top: `${topPos}%`,
              width: `${size}px`,
              height: `${size}px`,
              background: `radial-gradient(circle, hsla(${hue}, 70%, 60%, 0.8) 0%, transparent 70%)`,
              boxShadow: `0 0 ${size * 10}px hsla(${hue}, 70%, 60%, 0.3)`,
              animation: `float-${i} ${duration}s ease-in-out infinite, pulse-glow-${i} ${
                duration / 2
              }s ease-in-out infinite alternate`,
            }}
          />
        );
      })}

      {/* Geometric grid overlay */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" className="animate-pulse">
          <defs>
            <pattern
              id="grid"
              width="100"
              height="100"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 100 0 L 0 0 0 100"
                fill="none"
                stroke="rgba(99, 102, 241, 0.3)"
                strokeWidth="1"
              />
            </pattern>
            <pattern
              id="dots"
              width="50"
              height="50"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="25" cy="25" r="2" fill="rgba(139, 92, 246, 0.4)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      {/* Enhanced mouse-following glow with color transitions */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full blur-3xl transition-all duration-500 ease-out"
        style={{
          left: mousePosition.x - 400,
          top: mousePosition.y - 400,
          backgroundImage: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 30%, rgba(59, 130, 246, 0.08) 60%, transparent 100%)",
          transform: `scale(${scale})`,
        }}
      />

      {/* Secondary mouse glow */}
      <div
        className="absolute w-96 h-96 rounded-full blur-2xl transition-all duration-300"
        style={{
          left: mousePosition.x - 192,
          top: mousePosition.y - 192,
          backgroundImage: "conic-gradient(from 0deg, rgba(236, 72, 153, 0.2), rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.2), rgba(236, 72, 153, 0.2))",
          transform: `rotate(${rotation}deg)`,
        }}
      />

      {/* Click ripple effects */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute rounded-full border-2 border-white/30 animate-ping"
          style={{
            left: ripple.x - 25,
            top: ripple.y - 25,
            width: "50px",
            height: "50px",
            animation: "ripple 2s cubic-bezier(0, 0, 0.2, 1) forwards",
          }}
        />
      ))}

      {/* Floating particles with trails */}
      {Array.from({ length: 100 }).map((_, i) => {
        const index = i + 1;
        const leftPos = (index * 9973) % 100;
        const topPos = (index * 8287) % 100;
        const delay = (index * 3461) % 8;
        const duration = 15 + ((index * 2311) % 10);
        const hue = (index * 51.43) % 360;

        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${leftPos}%`,
              top: `${topPos}%`,
              width: "2px",
              height: "2px",
              background: `hsla(${hue}, 70%, 80%, 0.8)`,
              boxShadow: `0 0 10px hsla(${hue}, 70%, 80%, 0.5), 0 0 20px hsla(${hue}, 70%, 80%, 0.3)`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              animation: `particle-float-${i % 4} ${duration}s linear infinite`,
            }}
          />
        );
      })}

      {/* Dynamic CSS animations */}
      <style jsx>{`
        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }

        @keyframes particle-float-0 {
          0%,
          100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-100px) translateX(50px) rotate(90deg);
          }
          50% {
            transform: translateY(-50px) translateX(100px) rotate(180deg);
          }
          75% {
            transform: translateY(-150px) translateX(-25px) rotate(270deg);
          }
        }

        @keyframes particle-float-1 {
          0%,
          100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-80px) translateX(-60px) rotate(120deg);
          }
          66% {
            transform: translateY(-20px) translateX(-120px) rotate(240deg);
          }
        }

        @keyframes particle-float-2 {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-200px) translateX(0px);
          }
        }

        @keyframes particle-float-3 {
          0%,
          100% {
            transform: translateX(0px) translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateX(75px) translateY(-25px) rotate(45deg);
          }
          50% {
            transform: translateX(0px) translateY(-100px) rotate(90deg);
          }
          75% {
            transform: translateX(-75px) translateY(-25px) rotate(135deg);
          }
        }

        ${Array.from(
          { length: 30 },
          (_, i) => `
          @keyframes float-${i} {
            0%, 100% { 
              transform: translateY(0px) translateX(0px) rotate(0deg); 
            }
            33% { 
              transform: translateY(-${20 + (i % 3) * 10}px) translateX(${
            (i % 2 ? 1 : -1) * (15 + (i % 4) * 5)
          }px) rotate(${(i % 2 ? 1 : -1) * 5}deg); 
            }
            66% { 
              transform: translateY(-${10 + (i % 4) * 5}px) translateX(${
            (i % 2 ? -1 : 1) * (10 + (i % 3) * 8)
          }px) rotate(${(i % 2 ? -1 : 1) * 3}deg); 
            }
          }

          @keyframes pulse-glow-${i} {
            0% { 
              filter: brightness(1) saturate(1); 
              transform: scale(1);
            }
            100% { 
              filter: brightness(1.5) saturate(1.3); 
              transform: scale(1.2);
            }
          }
        `
        ).join("")}
      `}</style>
    </div>
  );
}
