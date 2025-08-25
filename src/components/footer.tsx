import React from "react";
import {
  FileText,
  Twitter,
  Github,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  ArrowUp,
  Sparkles,
  Heart,
  Shield,
  Zap,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}

const FooterLink: React.FC<FooterLinkProps> = ({
  href,
  children,
  external = false,
}) => (
  <a
    href={href}
    target={external ? "_blank" : undefined}
    rel={external ? "noopener noreferrer" : undefined}
    className="group relative inline-flex items-center text-blue-200/70 hover:text-white transition-all duration-300 hover:translate-x-1"
  >
    <span className="relative">
      {children}
      <span className="absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </span>
  </a>
);

interface SocialIconProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}

const SocialIcon: React.FC<SocialIconProps> = ({
  href,
  icon: Icon,
  label,
  color,
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className={cn(
      "group relative w-12 h-12 rounded-full border border-white/20 flex items-center justify-center",
      "transition-all duration-500 hover:scale-110 hover:rotate-12",
      "bg-white/5 backdrop-blur-sm hover:bg-white/10",
      `hover:border-${color} hover:shadow-lg hover:shadow-${color}/25`
    )}
  >
    <Icon className="h-5 w-5 text-blue-200/70 group-hover:text-white transition-colors duration-300" />
    <div
      className={cn(
        "absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        `bg-gradient-to-br from-${color}/20 to-${color}/5`
      )}
    />
  </a>
);

const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900">
        {/* Floating particles */}
        {Array.from({ length: 30 }).map((_, i) => {
          // Use deterministic values based on index instead of Math.random()
          const index = i + 1;
          const leftPos = ((index * 8123) % 100).toFixed(6); // Using different prime numbers than homepage
          const topPos = ((index * 5381) % 100).toFixed(6);
          const delay = ((index * 4093) % 3).toFixed(6);
          const duration = (2 + (index * 3307) % 4).toFixed(6);
          
          return (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/10 rounded-full animate-pulse"
              style={{
                left: `${leftPos}%`,
                top: `${topPos}%`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
              }}
            />
          );
        })}

        {/* Gradient orbs */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Main Footer Content */}
      <div className="relative z-10 py-8 sm:py-12 md:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Top Section with CTA */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 backdrop-blur-sm mb-6">
              <Sparkles className="h-4 w-4 text-blue-400 mr-2" />
              <span className="text-blue-300 text-sm font-medium">
                Ready to get started?
              </span>
            </div>

            <h3 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Transform Your Workflow Today
              </span>
            </h3>

            <p className="text-xl text-blue-200/70 mb-8 max-w-2xl mx-auto">
              Join thousands of teams already using DocuForge to streamline
              their document management.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl hover:shadow-blue-500/25">
                <span className="relative z-10">Start Free Trial</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 rounded-full"></div>
              </button>

              <button className="px-8 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 rounded-full font-semibold transition-all duration-300 hover:scale-105">
                Contact Sales
              </button>
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-10 lg:gap-12 mb-16">
            {/* Brand Column */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="relative">
                  <FileText className="h-8 w-8 text-blue-400" />
                  <div className="absolute inset-0 animate-ping">
                    <FileText className="h-8 w-8 text-blue-400/20" />
                  </div>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  DocuForge
                </span>
              </div>

              <p className="text-blue-200/70 mb-6 leading-relaxed">
                The most advanced document management platform built for modern
                teams. Secure, fast, and incredibly powerful.
              </p>

              {/* Key Features */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center text-blue-200/70">
                  <Shield className="h-4 w-4 text-emerald-400 mr-3" />
                  <span className="text-sm">Enterprise-grade security</span>
                </div>
                <div className="flex items-center text-blue-200/70">
                  <Zap className="h-4 w-4 text-yellow-400 mr-3" />
                  <span className="text-sm">Lightning-fast processing</span>
                </div>
                <div className="flex items-center text-blue-200/70">
                  <Globe className="h-4 w-4 text-blue-400 mr-3" />
                  <span className="text-sm">Global accessibility</span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 text-sm text-blue-200/60">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>San Francisco, CA</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>hello@docuforge.com</span>
                </div>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-lg font-semibold mb-6 text-white flex items-center">
                Product
                <span className="ml-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              </h4>
              <ul className="space-y-4">
                <li>
                  <FooterLink href="/features">Features</FooterLink>
                </li>
                <li>
                  <FooterLink href="/pricing">Pricing</FooterLink>
                </li>
                <li>
                  <FooterLink href="/security">Security</FooterLink>
                </li>
                <li>
                  <FooterLink href="/integrations">Integrations</FooterLink>
                </li>
                <li>
                  <FooterLink href="/api">API Docs</FooterLink>
                </li>
                <li>
                  <FooterLink href="/changelog">
                    What&apos;s New
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-300">
                      Updated
                    </span>
                  </FooterLink>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-lg font-semibold mb-6 text-white flex items-center">
                Company
                <span className="ml-2 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
              </h4>
              <ul className="space-y-4">
                <li>
                  <FooterLink href="/about">About Us</FooterLink>
                </li>
                <li>
                  <FooterLink href="/blog">Blog</FooterLink>
                </li>
                <li>
                  <FooterLink href="/careers">Careers</FooterLink>
                </li>
                <li>
                  <FooterLink href="/press">Press Kit</FooterLink>
                </li>
                <li>
                  <FooterLink href="/partners">Partners</FooterLink>
                </li>
                <li>
                  <FooterLink href="/investors">Investors</FooterLink>
                </li>
              </ul>
            </div>

            {/* Support Links */}
            <div>
              <h4 className="text-lg font-semibold mb-6 text-white flex items-center">
                Support
                <span className="ml-2 w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              </h4>
              <ul className="space-y-4">
                <li>
                  <FooterLink href="/help">Help Center</FooterLink>
                </li>
                <li>
                  <FooterLink href="/contact">Contact Support</FooterLink>
                </li>
                <li>
                  <FooterLink href="/status">System Status</FooterLink>
                </li>
                <li>
                  <FooterLink href="/community">Community</FooterLink>
                </li>
                <li>
                  <FooterLink href="/training">Training</FooterLink>
                </li>
                <li>
                  <FooterLink href="/resources">Resources</FooterLink>
                </li>
              </ul>
            </div>
          </div>

          {/* Social Media & Newsletter */}
          <div className="border-t border-white/10 pt-8 sm:pt-12 mb-8 sm:mb-12">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6 sm:gap-8">
              {/* Social Media */}
              <div className="flex flex-col items-center lg:items-start">
                <h4 className="text-lg font-semibold mb-4 text-white">
                  Connect With Us
                </h4>
                <div className="flex space-x-3 sm:space-x-4">
                  <SocialIcon
                    href="https://twitter.com/docuforge"
                    icon={Twitter}
                    label="Twitter"
                    color="blue-400"
                  />
                  <SocialIcon
                    href="https://github.com/docuforge"
                    icon={Github}
                    label="GitHub"
                    color="gray-400"
                  />
                  <SocialIcon
                    href="https://linkedin.com/company/docuforge"
                    icon={Linkedin}
                    label="LinkedIn"
                    color="blue-500"
                  />
                  <SocialIcon
                    href="mailto:hello@docuforge.com"
                    icon={Mail}
                    label="Email"
                    color="emerald-400"
                  />
                </div>
              </div>

              {/* Newsletter Signup */}
              <div className="flex flex-col items-center lg:items-end w-full max-w-md">
                <h4 className="text-lg font-semibold mb-4 text-white text-center lg:text-right">
                  Stay Updated
                </h4>
                <div className="flex w-full max-w-xs sm:max-w-sm">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-l-full text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400"
                  />
                  <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-r-full font-semibold transition-all duration-300 hover:scale-105">
                    Subscribe
                  </button>
                </div>
                <p className="text-xs text-blue-200/60 mt-2 text-center lg:text-right">
                  Get the latest updates and insights delivered to your inbox.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 sm:gap-6 text-xs sm:text-sm text-blue-200/60">
              <span className="flex items-center">
                © {new Date().getFullYear()} DocuForge
                <Heart className="h-3 w-3 text-red-400 mx-1" />
                All rights reserved
              </span>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/terms">Terms of Service</FooterLink>
              <FooterLink href="/cookies">Cookie Policy</FooterLink>
              <FooterLink href="/dmca">DMCA</FooterLink>
            </div>

            {/* Back to Top Button */}
            <button
              onClick={scrollToTop}
              className="group flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 rounded-full font-semibold transition-all duration-300 hover:scale-105 hover:-translate-y-1"
            >
              <span className="text-sm">Back to top</span>
              <ArrowUp className="h-4 w-4 group-hover:-translate-y-1 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Scroll indicator line */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 opacity-50" />
    </footer>
  );
};

export default Footer;
