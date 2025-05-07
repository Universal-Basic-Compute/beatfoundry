import React from 'react';

type ReactionType = {
  emoji: string;
  description: string;
};

type ReactionPopupProps = {
  reactionTypes: ReactionType[];
  onReactionSelect: (emoji: string) => void;
};

export default function ReactionPopup({ reactionTypes, onReactionSelect }: ReactionPopupProps) {
  return (
    <div className="absolute z-20 bg-background shadow-lg rounded-lg p-2 border border-border mt-2 animate-fadeIn reaction-popup">
      <div className="text-xs font-medium mb-2 text-muted-foreground">Add reaction:</div>
      <div className="grid grid-cols-5 gap-2">
        {reactionTypes.map(({ emoji, description }) => (
          <button
            key={emoji}
            onClick={() => onReactionSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
            title={description}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
