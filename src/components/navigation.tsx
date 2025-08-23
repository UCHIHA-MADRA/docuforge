"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileText, Users, Home } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Home",
      href: "/",
      icon: <Home className="h-4 w-4 mr-2" />,
    },
    {
      name: "Editor Demo",
      href: "/editor-demo",
      icon: <FileText className="h-4 w-4 mr-2" />,
    },
    {
      name: "Collaborative Demo",
      href: "/collaborative-demo",
      icon: <Users className="h-4 w-4 mr-2" />,
    },
  ];

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center text-sm font-medium transition-colors hover:text-primary",
            pathname === item.href
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          {item.icon}
          {item.name}
        </Link>
      ))}
    </nav>
  );
}

export function NavigationButtons() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Home",
      href: "/",
      icon: <Home className="h-4 w-4 mr-2" />,
    },
    {
      name: "Editor Demo",
      href: "/editor-demo",
      icon: <FileText className="h-4 w-4 mr-2" />,
    },
    {
      name: "Collaborative Demo",
      href: "/collaborative-demo",
      icon: <Users className="h-4 w-4 mr-2" />,
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <Button
            variant={pathname === item.href ? "default" : "outline"}
            className="w-full justify-start"
          >
            {item.icon}
            {item.name}
          </Button>
        </Link>
      ))}
    </div>
  );
}