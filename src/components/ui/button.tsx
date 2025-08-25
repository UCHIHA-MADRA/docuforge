import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-2xl",
  {
    variants: {
      variant: {
        default:
          // Primary gradient with stunning hover effects
          "bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 shadow-blue-500/25 hover:shadow-blue-500/40 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:via-white/40 before:to-white/20 before:opacity-0 before:transition-all before:duration-700 before:translate-x-[-200%] before:skew-x-12 hover:before:translate-x-[200%] hover:before:opacity-100",

        destructive:
          // Dramatic red gradient with pulsing danger effect
          "bg-gradient-to-r from-red-600 via-pink-600 to-red-700 text-white hover:from-red-700 hover:via-pink-700 hover:to-red-800 shadow-red-500/25 hover:shadow-red-500/40 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:via-white/30 before:to-white/20 before:opacity-0 before:transition-all before:duration-700 before:translate-x-[-200%] before:skew-x-12 hover:before:translate-x-[200%] hover:before:opacity-100 after:absolute after:inset-0 after:bg-red-500/20 after:opacity-0 after:transition-opacity after:duration-300 hover:after:opacity-100 hover:after:animate-pulse",

        outline:
          // Glass morphism outline with dynamic border
          "border-2 border-gradient-to-r from-blue-400/50 via-purple-400/50 to-indigo-400/50 bg-white/5 backdrop-blur-xl text-white hover:bg-white/10 hover:text-white shadow-none hover:shadow-xl hover:shadow-blue-500/20 hover:border-blue-400 before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/10 before:via-purple-500/10 before:to-indigo-500/10 before:opacity-0 before:transition-all before:duration-500 hover:before:opacity-100 after:absolute after:inset-0 after:border-2 after:border-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:opacity-0 after:transition-all after:duration-700 after:rotate-180 hover:after:opacity-100 hover:after:rotate-0",

        secondary:
          // Elegant emerald gradient
          "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 shadow-emerald-500/25 hover:shadow-emerald-500/40 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:via-white/40 before:to-white/20 before:opacity-0 before:transition-all before:duration-700 before:translate-x-[-200%] before:skew-x-12 hover:before:translate-x-[200%] hover:before:opacity-100",

        ghost:
          // Subtle glass effect with rainbow shimmer
          "bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/20 hover:border-white/40 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:opacity-0 before:transition-all before:duration-1000 before:translate-x-[-200%] hover:before:translate-x-[200%] hover:before:opacity-100 after:absolute after:inset-0 after:bg-gradient-to-45deg after:from-blue-500/10 after:via-purple-500/10 after:to-pink-500/10 after:opacity-0 after:transition-opacity after:duration-500 hover:after:opacity-100",

        link:
          // Animated underline with gradient text
          "text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 underline-offset-4 hover:underline relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-blue-400 after:via-purple-400 after:to-pink-400 after:transition-all after:duration-500 hover:after:w-full",

        // New premium variants
        premium:
          // Ultimate luxury button with gold accents
          "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black font-bold hover:from-yellow-500 hover:via-amber-600 hover:to-orange-600 shadow-amber-500/30 hover:shadow-amber-500/50 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/30 before:via-white/50 before:to-white/30 before:opacity-0 before:transition-all before:duration-700 before:translate-x-[-200%] before:skew-x-12 hover:before:translate-x-[200%] hover:before:opacity-100 after:absolute after:inset-0 after:bg-gradient-to-r after:from-yellow-300/20 after:via-transparent after:to-yellow-300/20 after:opacity-0 after:transition-opacity after:duration-300 hover:after:opacity-100 hover:after:animate-pulse",

        neon:
          // Cyberpunk neon glow effect
          "bg-black border-2 border-cyan-400 text-cyan-400 hover:text-black hover:bg-cyan-400 shadow-[0_0_10px_#22d3ee,0_0_20px_#22d3ee,0_0_40px_#22d3ee] hover:shadow-[0_0_20px_#22d3ee,0_0_40px_#22d3ee,0_0_80px_#22d3ee] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-cyan-400/20 before:to-transparent before:opacity-0 before:transition-all before:duration-500 before:translate-x-[-200%] hover:before:translate-x-[200%] hover:before:opacity-100 after:absolute after:inset-0 after:bg-cyan-400/10 after:opacity-0 after:transition-opacity after:duration-300 hover:after:opacity-100 hover:after:animate-pulse",

        glass:
          // Ultra-modern glass morphism
          "bg-white/10 backdrop-blur-2xl border border-white/20 text-white hover:bg-white/20 hover:border-white/30 shadow-2xl hover:shadow-3xl before:absolute before:inset-0 before:bg-gradient-to-135deg before:from-white/20 before:via-transparent before:to-white/20 before:opacity-0 before:transition-all before:duration-700 hover:before:opacity-100 after:absolute after:top-0 after:left-0 after:w-full after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent after:opacity-0 after:transition-opacity after:duration-500 hover:after:opacity-100",

        gradient:
          // Dynamic rainbow gradient
          "bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 shadow-purple-500/25 hover:shadow-purple-500/40 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:via-white/40 before:to-white/20 before:opacity-0 before:transition-all before:duration-700 before:translate-x-[-200%] before:skew-x-12 hover:before:translate-x-[200%] hover:before:opacity-100 after:absolute after:inset-0 after:bg-gradient-to-45deg after:from-pink-400/20 after:via-purple-400/20 after:to-blue-400/20 after:opacity-0 after:transition-opacity after:duration-500 hover:after:opacity-100 hover:after:animate-spin-slow",
      },
      size: {
        default: "h-12 px-6 py-3 text-base",
        sm: "h-10 px-4 py-2 text-sm rounded-lg",
        lg: "h-14 px-10 py-4 text-lg rounded-2xl",
        xl: "h-16 px-12 py-5 text-xl rounded-2xl",
        icon: "h-12 w-12 rounded-xl",
        "icon-sm": "h-10 w-10 rounded-lg",
        "icon-lg": "h-14 w-14 rounded-2xl",
      },
      glow: {
        none: "",
        soft: "hover:drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]",
        medium: "hover:drop-shadow-[0_0_25px_rgba(59,130,246,0.7)]",
        intense:
          "hover:drop-shadow-[0_0_35px_rgba(59,130,246,0.9)] hover:animate-pulse",
      },
      animation: {
        none: "",
        bounce: "hover:animate-bounce",
        pulse: "hover:animate-pulse",
        spin: "hover:animate-spin",
        wiggle: "hover:animate-wiggle",
        float: "hover:animate-float",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      glow: "none",
      animation: "none",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  ripple?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      glow,
      animation,
      asChild = false,
      loading = false,
      icon,
      iconPosition = "left",
      ripple = true,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = React.useState<
      Array<{ id: number; x: number; y: number }>
    >([]);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && !loading) {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const id = Date.now();

        setRipples((prev) => [...prev, { id, x, y }]);

        // Remove ripple after animation
        setTimeout(() => {
          setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
        }, 600);
      }

      if (onClick && !loading) {
        onClick(event);
      }
    };

    const Comp = asChild ? "span" : "button";

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, glow, animation, className }),
          loading && "pointer-events-none",
          "focus:ring-4 focus:ring-offset-2 focus:ring-blue-500/50"
        )}
        ref={ref}
        data-variant={variant}
        onClick={handleClick}
        disabled={loading || props.disabled}
        {...props}
      >
        {/* Ripple effects */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute bg-white/30 rounded-full animate-ping"
            style={{
              left: ripple.x - 10,
              top: ripple.y - 10,
              width: 20,
              height: 20,
              animationDuration: "0.6s",
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Content wrapper */}
        <span
          className={cn(
            "relative z-10 flex items-center gap-2 transition-all duration-300",
            loading && "opacity-0"
          )}
        >
          {icon && iconPosition === "left" && (
            <span className="flex items-center">{icon}</span>
          )}

          {children}

          {icon && iconPosition === "right" && (
            <span className="flex items-center">{icon}</span>
          )}
        </span>

        {/* Shine effect overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 skew-x-12" />
        </div>
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };

// Custom CSS animations (add to your global CSS)
/*
@keyframes wiggle {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-wiggle {
  animation: wiggle 0.5s ease-in-out;
}

.animate-float {
  animation: float 2s ease-in-out infinite;
}

.animate-spin-slow {
  animation: spin-slow 3s linear infinite;
}

.shadow-3xl {
  box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
}
*/
