import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import NextLink from "next/link";

const linkVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "text-primary hover:text-primary/90 hover:before:opacity-100 before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/10 before:via-blue-400/5 before:to-indigo-700/10 before:opacity-0 before:transition-opacity before:duration-500 before:blur-sm",
        destructive: "text-destructive hover:text-destructive/90 hover:before:opacity-100 before:absolute before:inset-0 before:bg-gradient-to-r before:from-black/10 before:via-red-800/10 before:to-black/10 before:opacity-0 before:transition-opacity before:duration-500 before:blur-sm",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:before:opacity-100 before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/20 before:via-blue-400/10 before:to-indigo-700/20 before:opacity-0 before:transition-opacity before:duration-500 before:blur-sm",
        secondary: "text-secondary-foreground hover:text-secondary/80 hover:before:opacity-100 before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-600/10 before:via-blue-400/5 before:to-indigo-800/10 before:opacity-0 before:transition-opacity before:duration-500 before:blur-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:before:opacity-100 before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/20 before:via-blue-400/5 before:to-indigo-700/20 before:opacity-0 before:transition-opacity before:duration-500 before:blur-sm",
        button: "bg-primary text-primary-foreground hover:bg-primary/90 hover:before:opacity-100 before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/30 before:via-blue-400/10 before:to-indigo-700/30 before:opacity-0 before:transition-opacity before:duration-500 before:blur-sm",
        buttonOutline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:before:opacity-100 before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/20 before:via-blue-400/10 before:to-indigo-700/20 before:opacity-0 before:transition-opacity before:duration-500 before:blur-sm",
        buttonSecondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:before:opacity-100 before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-600/20 before:via-blue-400/10 before:to-indigo-800/20 before:opacity-0 before:transition-opacity before:duration-500 before:blur-sm",
        buttonGhost: "hover:bg-accent hover:text-accent-foreground hover:before:opacity-100 before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/20 before:via-blue-400/5 before:to-indigo-700/20 before:opacity-0 before:transition-opacity before:duration-500 before:blur-sm",
        buttonDestructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:before:opacity-100 before:absolute before:inset-0 before:bg-gradient-to-r before:from-black/20 before:via-red-800/20 before:to-black/20 before:opacity-0 before:transition-opacity before:duration-500 before:blur-sm",
        link: "text-primary underline-offset-4 hover:underline hover:before:opacity-100 before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/10 before:via-blue-400/5 before:to-indigo-700/10 before:opacity-0 before:transition-opacity before:duration-500 before:blur-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        none: "", // No size styling
      },
    },
    defaultVariants: {
      variant: "default",
      size: "none",
    },
  }
);

export interface LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkVariants> {
  href: string;
  asChild?: boolean;
  nextLinkProps?: Record<string, unknown>;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({
    className,
    variant,
    size,
    href,
    asChild = false,
    nextLinkProps,
    children,
    ...props
  }, ref) => {
    const isExternal = href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:");
    
    if (isExternal) {
      return (
        <a
          className={cn(linkVariants({ variant, size, className }))}
          href={href}
          ref={ref}
          data-variant={variant}
          {...props}
        >
          <span className="relative z-10">{children}</span>
        </a>
      );
    }

    return (
      <NextLink
        href={href}
        className={cn(linkVariants({ variant, size, className }))}
        ref={ref}
        data-variant={variant}
        {...nextLinkProps}
        {...props}
      >
        <span className="relative z-10">{children}</span>
      </NextLink>
    );
  }
);

Link.displayName = "Link";

export { Link, linkVariants };