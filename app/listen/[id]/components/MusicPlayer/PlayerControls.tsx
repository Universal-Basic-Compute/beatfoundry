import React from 'react';

type PlayerControlsProps = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  formatTime: (time: number) => string;
  handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  togglePlayPause: () => void;
  playPreviousTrack: () => void;
  playNextTrack: () => void;
  currentTrack: any | null;
  isAudioLoading: boolean;
};

export default function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  formatTime,
  handleSeek,
  togglePlayPause,
  playPreviousTrack,
  playNextTrack,
  currentTrack,
  isAudioLoading
}: PlayerControlsProps) {
  return (
    <div className="mt-6">
      {/* Progress bar */}
      <div className="flex items-center space-x-3 mb-6">
        <span className="text-xs font-medium">{formatTime(currentTime)}</span>
        <div className="relative flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="absolute w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-accent rounded-full"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          ></div>
        </div>
        <span className="text-xs font-medium">{formatTime(duration)}</span>
      </div>
      
      {/* Playback controls */}
      <div className="flex justify-center space-x-6 mb-8">
        <button 
          onClick={playPreviousTrack}
          className="p-4 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          disabled={!currentTrack}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="19 20 9 12 19 4 19 20"></polygon>
            <line x1="5" y1="19" x2="5" y2="5"></line>
          </svg>
        </button>
        <button 
          onClick={togglePlayPause}
          className="p-5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-colors shadow-md"
          disabled={!currentTrack}
        >
          {isAudioLoading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          )}
        </button>
        <button 
          onClick={playNextTrack}
          className="p-4 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          disabled={!currentTrack}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
            <line x1="19" y1="5" x2="19" y2="19"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}
