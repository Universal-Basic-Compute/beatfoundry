import React from 'react';

type ReactionPopupProps = {
  trackId: string;
  addReaction: (trackId: string, reaction: string) => void;
  onClose: () => void;
};

export default function ReactionPopup({
  trackId,
  addReaction,
  onClose
}: ReactionPopupProps) {
  // Define the reaction types and their descriptions
  const trackReactionTypes = [
    { emoji: '⭐', description: 'Great track (overall excellence)' },
    { emoji: '🎵', description: 'Catchy melody (memorable tune)' },
    { emoji: '🥁', description: 'Solid rhythm (great beat/groove)' },
    { emoji: '🔊', description: 'Sound quality (production excellence)' },
    { emoji: '📝', description: 'Lyrics (well-written words)' },
    { emoji: '❓', description: 'Curious (interesting/unusual)' },
    { emoji: '💡', description: 'Innovative (creative approach)' },
    { emoji: '🔁', description: 'Replay value (want to hear again)' },
    { emoji: '🌟', description: 'Potential hit (commercial appeal)' },
    { emoji: '📈', description: 'Improvement (better than previous)' },
    { emoji: '❌', description: 'Not for me (dislike)' }
  ];
  
  const handleReaction = (reaction: string) => {
    addReaction(trackId, reaction);
    onClose();
  };
  
  return (
    <div className="absolute z-20 right-0 bottom-full mb-2 bg-background shadow-lg rounded-lg p-2 border border-border animate-fadeIn w-64">
      <div className="text-xs font-medium mb-2 text-muted-foreground">Add reaction:</div>
      <div className="grid grid-cols-4 gap-2">
        {trackReactionTypes.map(({ emoji, description }) => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
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
