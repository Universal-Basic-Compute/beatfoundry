import React from 'react';

type Thought = {
  step: string;
  content: any;
  timestamp?: string;
};

type ThinkingIndicatorProps = {
  foundry: {
    name: string;
  } | null;
  thoughts: Thought[];
};

export default function ThinkingIndicator({ foundry, thoughts }: ThinkingIndicatorProps) {
  return (
    <div className="bg-muted dark:bg-muted/40 p-4 rounded-xl mr-12 animate-fadeIn">
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-2">
          A
        </div>
        <div className="font-medium text-sm">
          {foundry?.name || 'AI Musician'} is thinking...
        </div>
      </div>
      <div className="flex space-x-2 items-center h-6 pl-2">
        <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0ms' }}></span>
        <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '150ms' }}></span>
        <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '300ms' }}></span>
      </div>
      
      {/* Show the most recent thought */}
      {thoughts.length > 0 && (
        <div className="mt-3 text-xs bg-black/5 dark:bg-white/5 p-3 rounded-lg animate-fadeIn">
          <div className="font-medium mb-1 text-primary/80">
            Latest thought: {thoughts[thoughts.length - 1].step === 'keywords' ? 'Keywords' : 
             thoughts[thoughts.length - 1].step === 'dream' ? 'Dream' : 
             thoughts[thoughts.length - 1].step === 'daydreaming' ? 'Daydreaming' : 
             thoughts[thoughts.length - 1].step === 'initiative' ? 'Initiative' : 
             ((step: string) => step.charAt(0).toUpperCase() + step.slice(1))(thoughts[thoughts.length - 1].step)}
          </div>
          {thoughts[thoughts.length - 1].step === 'keywords' ? (
            <div>
              {thoughts[thoughts.length - 1].content.relevant_keywords && (
                <div><span className="font-medium text-muted-foreground">Keywords:</span> {thoughts[thoughts.length - 1].content.relevant_keywords.join(', ')}</div>
              )}
            </div>
          ) : (
            <div className="text-foreground line-clamp-2">{typeof thoughts[thoughts.length - 1].content === 'string' 
              ? thoughts[thoughts.length - 1].content 
              : JSON.stringify(thoughts[thoughts.length - 1].content)}</div>
          )}
        </div>
      )}
    </div>
  );
}
