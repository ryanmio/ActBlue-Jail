"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PageHeader() {
  return (
    <div className="absolute top-6 right-6 md:top-10 md:right-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100/50 focus:outline-none transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-white border border-slate-200 shadow-lg text-slate-900" align="end">
          <DropdownMenuLabel className="text-slate-600 font-semibold">AB Jail</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/about" className="cursor-pointer text-slate-900 hover:bg-slate-100">About</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/cases" className="cursor-pointer text-slate-900 hover:bg-slate-100">All Cases</Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-slate-400">
              Stats (coming soon)
            </DropdownMenuItem>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator className="bg-slate-200" />
          
          <DropdownMenuLabel className="text-slate-600 font-semibold">Help Improve</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/evaluation" className="cursor-pointer text-slate-900 hover:bg-slate-100">AI Training</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="https://github.com/ryanmio/ActBlue-Jail/issues/new" target="_blank" rel="noopener noreferrer" className="cursor-pointer text-slate-900 hover:bg-slate-100">
                Bug Report
                <svg className="w-3 h-3 ml-auto text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="https://github.com/ryanmio/ActBlue-Jail/issues/new" target="_blank" rel="noopener noreferrer" className="cursor-pointer text-slate-900 hover:bg-slate-100">
                Feature Request
                <svg className="w-3 h-3 ml-auto text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="https://github.com/ryanmio/ActBlue-Jail" target="_blank" rel="noopener noreferrer" className="cursor-pointer text-slate-900 hover:bg-slate-100">
                Edit Code
                <svg className="w-3 h-3 ml-auto text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator className="bg-slate-200" />
          
          <DropdownMenuLabel className="text-slate-600 font-semibold">Contact</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <a href="https://github.com/ryanmio/ActBlue-Jail/discussions" target="_blank" rel="noopener noreferrer" className="cursor-pointer text-slate-900 hover:bg-slate-100">
                GitHub
                <svg className="w-3 h-3 ml-auto text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

