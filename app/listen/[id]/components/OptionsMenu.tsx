import React from 'react';

type OptionsMenuProps = {
  instrumental: boolean;
  setInstrumental: (value: boolean) => void;
  autonomousMode: boolean;
  setAutonomousMode: (value: boolean) => void;
};

export default function OptionsMenu({ 
  instrumental, 
  setInstrumental, 
  autonomousMode, 
  setAutonomousMode 
}: OptionsMenuProps) {
  return (
    <div className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg bg-background border border-border z-10 options-menu animate-fadeIn">
      <div className="py-2" role="menu" aria-orientation="vertical">
        <div className="px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Instrumental Only</span>
            <button 
              onClick={() => setInstrumental(!instrumental)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${instrumental ? 'bg-primary' : 'bg-muted'}`}
            >
              <span 
                className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-md transition-transform duration-200 ${instrumental ? 'translate-x-6' : 'translate-x-1'}`} 
              />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {instrumental 
              ? 'Generate instrumental music without lyrics' 
              : 'Generate music with lyrics - your prompt will be used as the exact lyrics to be sung'}
          </p>
        </div>
        
        <div className="px-4 py-3 text-sm border-t border-border">
          <div className="flex items-center justify-between">
            <span className="font-medium">Create Autonomously</span>
            <button 
              onClick={() => setAutonomousMode(!autonomousMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autonomousMode ? 'bg-primary' : 'bg-muted'}`}
            >
              <span 
                className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-md transition-transform duration-200 ${autonomousMode ? 'translate-x-6' : 'translate-x-1'}`} 
              />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {autonomousMode ? 'AI will generate thoughts and music autonomously' : 'AI will respond to your messages'}
          </p>
        </div>
      </div>
    </div>
  );
}
