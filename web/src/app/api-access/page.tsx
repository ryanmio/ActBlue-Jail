"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useRef } from "react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, ArrowRight } from "lucide-react";

export default function ApiAccessPage() {
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="flex flex-col min-h-screen" data-theme="v2">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-6 md:px-12 max-w-6xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.webp"
                alt="AB Jail logo"
                width={32}
                height={32}
                className="w-8 h-8 rounded-md"
              />
              <span className="font-semibold tracking-tight text-lg text-foreground">AB Jail</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                Beta
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>Cases</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-48 p-2 space-y-1">
                        <Link
                          href="/cases"
                          className="block px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors"
                        >
                          All Messages
                        </Link>
                        <Link
                          href="/cases?violations=true"
                          className="block px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors"
                        >
                          Detected Violations
                        </Link>
                        <Link
                          href="/reports"
                          className="block px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors"
                        >
                          Reports to ActBlue
                        </Link>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link href="/stats" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-secondary transition-colors">
                        Leaderboard
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuTrigger>About</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-48 p-2 space-y-1">
                        <Link
                          href="/welcome"
                          className="block px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors"
                        >
                          How it Works
                        </Link>
                        <Link
                          href="/stats"
                          className="block px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors"
                        >
                          Stats and Data
                        </Link>
                        <Link
                          href="/evaluation"
                          className="block px-3 py-2 rounded-md text-sm hover:bg-secondary transition-colors"
                        >
                          AI Training
                        </Link>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </nav>

            {/* Mobile Navigation */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <button className="p-2 hover:bg-secondary rounded-md transition-colors">
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-2">
                  <Link href="/cases" className="block px-4 py-2 rounded-md text-sm hover:bg-secondary transition-colors">
                    Cases
                  </Link>
                  <Link href="/cases?violations=true" className="block px-4 py-2 rounded-md text-sm hover:bg-secondary transition-colors">
                    Detected Violations
                  </Link>
                  <Link href="/reports" className="block px-4 py-2 rounded-md text-sm hover:bg-secondary transition-colors">
                    Reports to ActBlue
                  </Link>
                  <Link href="/stats" className="block px-4 py-2 rounded-md text-sm hover:bg-secondary transition-colors">
                    Leaderboard
                  </Link>
                  <Link href="/welcome" className="block px-4 py-2 rounded-md text-sm hover:bg-secondary transition-colors">
                    How it Works
                  </Link>
                  <Link href="/evaluation" className="block px-4 py-2 rounded-md text-sm hover:bg-secondary transition-colors">
                    AI Training
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <section className="py-20 md:py-28 border-b border-border/40 bg-secondary/20">
          <div className="container mx-auto px-6 md:px-12 max-w-6xl">
            <div className="text-center space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]" style={{ fontFamily: 'var(--font-playfair), ui-serif, Georgia, serif' }}>
                API Access
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Coming soon...
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 md:py-16 bg-background">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-12">
            <div className="space-y-4 max-w-sm">
              <div className="flex items-center gap-2">
                <Image
                  src="/logo.webp"
                  alt="AB Jail logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-md"
                />
                <div className="flex items-center gap-2">
                  <span className="font-semibold tracking-tight text-foreground">AB Jail</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                    Beta
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                An open-source initiative for political transparency. Not affiliated with ActBlue, official campaigns,
                or any PACs.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 md:gap-14">
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-foreground">Platform</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <button onClick={scrollToTop} className="hover:text-foreground transition-colors text-left">
                      Submit Evidence
                    </button>
                  </li>
                  <li>
                    <Link href="/cases" className="hover:text-foreground transition-colors">
                      Browse Cases
                    </Link>
                  </li>
                  <li>
                    <Link href="/stats" className="hover:text-foreground transition-colors">
                      Leaderboard
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-foreground">Resources</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link href="/welcome" className="hover:text-foreground transition-colors">
                      How it Works
                    </Link>
                  </li>
                  <li>
                    <Link href="/about#terms" className="hover:text-foreground transition-colors">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="/about" className="hover:text-foreground transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-foreground">Connect</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <a href="https://github.com/ryanmio/ActBlue-Jail" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                      GitHub
                    </a>
                  </li>
                  <li>
                    <Link href="/api-access" className="hover:text-foreground transition-colors">
                      API Access
                    </Link>
                  </li>
                  <li>
                    <Link href="/about" className="hover:text-foreground transition-colors">
                      Contact Us
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground gap-4">
            <p>© 2025 AB Jail Initiative. Open Source (MIT).</p>
            <p>Built for transparency.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
