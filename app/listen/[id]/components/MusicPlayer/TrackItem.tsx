import React, { useState } from 'react';
import Image from 'next/image';
import ReactionPopup from '../ReactionPopup';

type Track = {
  id: string;
  name: string;
  prompt: string;
  lyrics: string;
  url: string;
  cover?: string;
  createdAt: string;
  foundryId: string;
  reactions?: Record<string, number>;
};

type TrackItemProps = {
  track: Track;
  isCurrentTrack: boolean;
  onPlay: (track: Track) => void;
  onReaction: (trackId: string, reaction: string) => void;
  reactionTypes: Array<{ emoji: string; description: string }>;
};

export default function TrackItem({ 
  track, 
  isCurrentTrack, 
  onPlay, 
  onReaction,
  reactionTypes
}: TrackItemProps) {
  const [showReactionPopup, setShowReactionPopup] = useState(false);
  const [trackMenuOpen, setTrackMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleDownloadTrack = () => {
    try {
      // Create a temporary anchor element
      const link = document.createElement('a');
      link.href = track.url;
      link.download = `${track.name}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading track:', error);
    }
  };
  
  return (
    <div 
      className={`p-4 rounded-xl transition-all ${
        isCurrentTrack 
          ? 'bg-primary/10 border-l-4 border-primary' 
          : 'hover:bg-black/5 dark:hover:bg-white/5 border-l-4 border-transparent'
      }`}
    >
      <div className="flex justify-between items-start">
        <div 
          className="flex-1 cursor-pointer flex items-center" 
          onClick={() => onPlay(track)}
        >
          <div className="w-10 h-10 rounded-md overflow-hidden mr-3 flex-shrink-0">
            {track.cover ? (
              <Image 
                src={track.cover} 
                alt={track.name} 
                width={40} 
                height={40} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error(`Error loading cover image: ${track.cover}`);
                  // Remove the fallback image and let it fall through to the emoji
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement.classList.add('bg-primary/10');
                  e.currentTarget.parentElement.innerHTML = '<span class="text-lg">🎵</span>';
                }}
              />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg">🎵</span>
              </div>
            )}
          </div>
          <div>
            <div className="font-medium flex items-center">
              {isCurrentTrack && (
                <span className="mr-2 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </span>
              )}
              {track.name}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {new Date(track.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Add reaction button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowReactionPopup(!showReactionPopup);
            }}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Add reaction"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
              <line x1="9" y1="9" x2="9.01" y2="9"></line>
              <line x1="15" y1="9" x2="15.01" y2="9"></line>
            </svg>
          </button>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label={isExpanded ? "Collapse track details" : "Expand track details"}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          
          {/* Track options menu */}
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setTrackMenuOpen(!trackMenuOpen);
              }}
              className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              aria-label="Track options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>
            
            {trackMenuOpen && (
              <div className="absolute right-0 mt-1 w-36 rounded-md shadow-lg bg-background border border-border z-10 track-menu">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadTrack();
                      setTrackMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                    role="menuitem"
                  >
                    Download
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Display reactions if any */}
      {track.reactions && Object.keys(track.reactions).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(track.reactions).map(([emoji, count]) => (
            <div 
              key={emoji} 
              className={`flex items-center px-2 py-1 rounded-full text-xs ${
                emoji === '❌' 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' 
                  : 'bg-black/5 dark:bg-white/5'
              }`}
              title={reactionTypes.find(r => r.emoji === emoji)?.description || ''}
            >
              <span className="mr-1">{emoji}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reaction popup */}
      {showReactionPopup && (
        <ReactionPopup 
          reactionTypes={reactionTypes} 
          onReactionSelect={(emoji) => {
            onReaction(track.id, emoji);
            setShowReactionPopup(false);
          }} 
        />
      )}

      {/* Expanded track details with animation */}
      {isExpanded && (
        <div 
          className="mt-3 text-sm bg-black/5 dark:bg-white/5 p-4 rounded-lg animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          {track.prompt && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2 text-primary">Prompt</h4>
              <p className="text-foreground whitespace-pre-wrap">{track.prompt}</p>
            </div>
          )}
          
          {track.lyrics && track.lyrics !== track.prompt && (
            <div>
              <h4 className="font-semibold mb-2 text-primary">Lyrics</h4>
              <p className="text-foreground whitespace-pre-wrap">{track.lyrics}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
