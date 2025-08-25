"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Home, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { cn } from "@/lib/utils";

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close mobile menu when screen size increases beyond mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="sm"
        className="p-1"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </Button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-x-0 top-16 z-50 p-6 bg-background border-b shadow-lg">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/"
                variant={pathname === "/" ? "button" : "buttonOutline"}
                size="default"
                className="w-full justify-start"
                onClick={() => setIsOpen(false)}
              >
                <span className="inline-flex items-center">
                  <span className="mr-3"><Home className="h-4 w-4" /></span>
                  <span className="text-base">Home</span>
                </span>
              </Link>
              <Link
                href="/dashboard"
                variant={pathname === "/dashboard" ? "button" : "buttonOutline"}
                size="default"
                className="w-full justify-start"
                onClick={() => setIsOpen(false)}
              >
                <span className="inline-flex items-center">
                  <span className="mr-3"><FileText className="h-4 w-4" /></span>
                  <span className="text-base">Dashboard</span>
                </span>
              </Link>
              <Link
                href="/tools"
                variant={pathname === "/tools" ? "button" : "buttonOutline"}
                size="default"
                className="w-full justify-start"
                onClick={() => setIsOpen(false)}
              >
                <span className="inline-flex items-center">
                  <span className="mr-3"><Users className="h-4 w-4" /></span>
                  <span className="text-base">Tools</span>
                </span>
              </Link>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}