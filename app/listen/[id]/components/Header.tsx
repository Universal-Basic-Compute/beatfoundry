import React from 'react';
import Link from 'next/link';

type HeaderProps = {
  foundry: {
    name: string;
  } | null;
};

export default function Header({ foundry }: HeaderProps) {
  return (
    <header className="bg-background border-b border-border p-4 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-foreground flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
          BeatFoundry
        </Link>
        {foundry && (
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-2">
              {foundry.name.charAt(0)}
            </div>
            <h1 className="text-xl font-semibold text-foreground">{foundry.name}</h1>
          </div>
        )}
      </div>
    </header>
  );
}
