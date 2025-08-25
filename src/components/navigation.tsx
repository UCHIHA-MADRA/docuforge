"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Link } from "@/components/ui/link";
import { FileText, Users, Home, Code, GitBranch, Settings } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  description?: string;
}

const useNavItems = (type: "main" | "demo"): NavItem[] => {
  const mainItems: NavItem[] = [
    {
      name: "Home",
      href: "/",
      icon: <Home className="h-4 w-4" />,
      description: "Welcome page",
    },
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <FileText className="h-4 w-4" />,
      description: "Manage your documents",
    },
    {
      name: "Tools",
      href: "/tools",
      icon: <Settings className="h-4 w-4" />,
      description: "Document processing tools",
    },
  ];

  const demoItems: NavItem[] = [
    {
      name: "Home",
      href: "/",
      icon: <Home className="h-4 w-4" />,
      description: "Welcome page",
    },
    {
      name: "Editor Demo",
      href: "/editor-demo",
      icon: <Code className="h-4 w-4" />,
      badge: "New",
      description: "Try our document editor",
    },
    {
      name: "Collaborative Demo",
      href: "/collaborative-demo",
      icon: <GitBranch className="h-4 w-4" />,
      badge: "Beta",
      description: "Real-time collaboration",
    },
  ];

  return type === "main" ? mainItems : demoItems;
};

interface BaseNavigationProps {
  items: NavItem[];
  pathname: string;
  className?: string;
}

function BaseNavigation({ items, pathname, className }: BaseNavigationProps) {
  return (
    <nav className={cn("flex items-center", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          variant={pathname === item.href ? "button" : "buttonOutline"}
          size="sm"
          className={cn(
            "relative group transition-all duration-200 hover:scale-105 hover:shadow-md",
            "focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
            pathname === item.href && "shadow-lg"
          )}
          aria-current={pathname === item.href ? "page" : undefined}
          title={item.description}
        >
          <span className="inline-flex items-center relative">
            <span className="mr-2 transition-transform duration-200 group-hover:scale-110">
              {item.icon}
            </span>
            <span className="font-medium">{item.name}</span>
            {item.badge && (
              <span
                className={cn(
                  "absolute -top-2 -right-2 px-1.5 py-0.5 text-xs font-bold rounded-full",
                  "bg-gradient-to-r from-blue-500 to-purple-600 text-white",
                  "animate-pulse shadow-sm"
                )}
              >
                {item.badge}
              </span>
            )}
          </span>

          {/* Hover tooltip */}
          <div
            className={cn(
              "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2",
              "px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
              "pointer-events-none whitespace-nowrap z-50"
            )}
          >
            {item.description}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        </Link>
      ))}
    </nav>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const navItems = useNavItems("main");

  return (
    <BaseNavigation
      items={navItems}
      pathname={pathname}
      className="space-x-4 lg:space-x-6 mx-6"
    />
  );
}

export function NavigationButtons() {
  const pathname = usePathname();
  const navItems = useNavItems("demo");

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          variant={pathname === item.href ? "button" : "buttonOutline"}
          size="sm"
          className={cn(
            "relative group w-full justify-start transition-all duration-300",
            "hover:scale-[1.02] hover:shadow-lg focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
            "bg-gradient-to-r hover:from-blue-50 hover:to-purple-50",
            "dark:hover:from-blue-950/20 dark:hover:to-purple-950/20",
            pathname === item.href && "shadow-lg ring-2 ring-blue-500/20"
          )}
          aria-current={pathname === item.href ? "page" : undefined}
        >
          <span className="inline-flex items-center relative w-full">
            <span className="mr-3 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
              {item.icon}
            </span>
            <div className="flex flex-col items-start flex-1">
              <span className="font-semibold text-sm">{item.name}</span>
              <span className="text-xs opacity-70 mt-0.5 group-hover:opacity-100 transition-opacity">
                {item.description}
              </span>
            </div>
            {item.badge && (
              <span
                className={cn(
                  "ml-2 px-2 py-0.5 text-xs font-bold rounded-full",
                  "bg-gradient-to-r shadow-sm transition-all duration-200",
                  item.badge === "New" &&
                    "from-green-500 to-emerald-600 text-white animate-pulse",
                  item.badge === "Beta" &&
                    "from-orange-500 to-amber-600 text-white",
                  "group-hover:scale-110"
                )}
              >
                {item.badge}
              </span>
            )}
          </span>

          {/* Active indicator */}
          {pathname === item.href && (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-md pointer-events-none animate-pulse" />
          )}

          {/* Shimmer effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
        </Link>
      ))}
    </div>
  );
}

// Enhanced Navigation with dropdown support (bonus component)
export function NavigationWithDropdown() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);

  const navigationSections = [
    {
      title: "Main",
      items: useNavItems("main"),
    },
    {
      title: "Demos",
      items: useNavItems("demo"),
    },
  ];

  return (
    <nav className="flex items-center space-x-2">
      {navigationSections.map((section) => (
        <div key={section.title} className="relative">
          <button
            onClick={() =>
              setOpenDropdown(
                openDropdown === section.title ? null : section.title
              )
            }
            className={cn(
              "px-4 py-2 rounded-md font-medium text-sm transition-all duration-200",
              "hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-2 focus:ring-blue-500",
              openDropdown === section.title &&
                "bg-blue-100 dark:bg-blue-900/30"
            )}
          >
            {section.title}
            <span className="ml-1 text-xs">▾</span>
          </button>

          {openDropdown === section.title && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-2">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start mb-1 transition-all duration-200",
                      "hover:bg-blue-50 dark:hover:bg-blue-950/20",
                      pathname === item.href &&
                        "bg-blue-100 dark:bg-blue-900/30"
                    )}
                    onClick={() => setOpenDropdown(null)}
                  >
                    <span className="inline-flex items-center w-full">
                      <span className="mr-3">{item.icon}</span>
                      <div className="flex flex-col items-start flex-1">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs opacity-70">
                          {item.description}
                        </span>
                      </div>
                      {item.badge && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
