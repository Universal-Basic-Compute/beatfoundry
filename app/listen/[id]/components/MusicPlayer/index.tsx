import React, { useRef, useEffect, useState, useCallback } from 'react';
import TrackList from './TrackList';
import PlayerControls from './PlayerControls';
import PendingGenerations from './PendingGenerations';
import Image from 'next/image';

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

type PendingGeneration = {
  id: string;
  taskId: string;
  title: string;
  status: string;
  createdAt: string;
};

type MusicPlayerProps = {
  tracks: Track[];
  currentTrack: Track | null;
  setCurrentTrack: (track: Track) => void;
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  pendingGenerations: PendingGeneration[];
  addReaction: (trackId: string, reaction: string) => void;
  loading: boolean;
};

export default function MusicPlayer({ 
  tracks, 
  currentTrack, 
  setCurrentTrack, 
  isPlaying, 
  setIsPlaying, 
  pendingGenerations,
  addReaction,
  loading 
}: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Simplify track source management
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    // Only update the source if it's different
    if (audio.src !== currentTrack.url) {
      // Always pause before changing source
      audio.pause();
      audio.src = currentTrack.url;
      
      // If isPlaying is true, attempt to play after source change
      if (isPlaying) {
        // Use a timeout to avoid race conditions
        const playTimer = setTimeout(() => {
          audio.play().catch(err => {
            console.error('Error playing audio:', err);
            setIsPlaying(false);
          });
        }, 50);
        
        return () => clearTimeout(playTimer);
      }
    }
  }, [currentTrack, isPlaying]);

  // Define playNextTrack and playPreviousTrack functions first
  const playNextTrack = useCallback(() => {
    if (tracks.length === 0 || !currentTrack) return;
    
    const currentIndex = tracks.findIndex(track => track.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % tracks.length;
    setCurrentTrack(tracks[nextIndex]);
    setIsPlaying(true);
  }, [tracks, currentTrack, setCurrentTrack, setIsPlaying]);

  const playPreviousTrack = useCallback(() => {
    if (tracks.length === 0 || !currentTrack) return;
    
    const currentIndex = tracks.findIndex(track => track.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    setCurrentTrack(tracks[prevIndex]);
    setIsPlaying(true);
  }, [tracks, currentTrack, setCurrentTrack, setIsPlaying]);

  // Simplify event listeners for audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Simple event listeners for basic state tracking
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      playNextTrack();
    };
    const handleError = () => {
      setIsPlaying(false);
      setIsLoading(false);
    };

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    // Add event listeners
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('loadedmetadata', updateDuration);

    // Clean up event listeners
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [playNextTrack]);
  
  // Simplify the playTrack function
  const playTrack = (track: Track) => {
    // If we're already playing this track, just toggle play/pause
    if (currentTrack && currentTrack.id === track.id) {
      togglePlayPause();
      return;
    }
    
    // Otherwise, change to the new track
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  // Simplify the togglePlayPause function
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else if (currentTrack) {
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        setIsPlaying(false);
      });
    }
  };
  
  // Format time in MM:SS format
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Handle seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = parseFloat(e.target.value);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };
  
  return (
    <div className="w-full md:w-1/2 p-6 border-r">
      <div className="bg-gradient-to-br from-card to-card/80 text-card-foreground rounded-xl p-8 h-full flex flex-col shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-foreground">Music Player</h2>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="relative w-12 h-12">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
              <p className="mt-4 text-muted-foreground">Loading tracks...</p>
            </div>
          </div>
        ) : tracks.length === 0 && pendingGenerations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <div className="w-48 h-48 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                <span className="text-5xl">🎵</span>
              </div>
              <p className="text-lg font-medium">No tracks yet</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Use the "Create Track" button to generate music
              </p>
            </div>
          </div>
        ) : pendingGenerations.length > 0 && !currentTrack ? (
          <PendingGenerations pendingGenerations={pendingGenerations} />
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto mb-4">
              {/* Show pending generations at the top if any exist */}
              {pendingGenerations.length > 0 && (
                <PendingGenerations pendingGenerations={pendingGenerations} />
              )}
              
              <div className="text-center mb-6">
                {/* Album art and now playing section */}
                <div className="relative w-48 h-48 mx-auto mb-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full"></div>
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                    {currentTrack?.cover ? (
                      <Image 
                        src={currentTrack.cover} 
                        alt={currentTrack.name} 
                        width={192} 
                        height={192} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error(`Error loading cover image: ${currentTrack.cover}`);
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement.classList.add('flex', 'items-center', 'justify-center');
                          e.currentTarget.parentElement.innerHTML = '<span class="text-5xl">🎵</span>';
                        }}
                      />
                    ) : (
                      <span className="text-5xl">🎵</span>
                    )}
                  </div>
                  {/* Add a spinning animation when playing */}
                  {isPlaying && (
                    <div className="absolute inset-0 border-4 border-primary/30 border-t-primary rounded-full animate-spin" style={{ animationDuration: '4s' }}></div>
                  )}
                </div>
                
                {/* Now Playing section */}
                <div className="text-center mb-8">
                  <p className="text-sm uppercase tracking-wider text-muted-foreground mb-1">Now Playing</p>
                  <p className="text-xl font-bold text-foreground mb-1">{currentTrack?.name || 'Select a track'}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentTrack ? new Date(currentTrack.createdAt).toLocaleDateString() : ''}
                  </p>
                </div>
                
                {/* Player controls */}
                <PlayerControls 
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={duration}
                  formatTime={formatTime}
                  handleSeek={handleSeek}
                  togglePlayPause={togglePlayPause}
                  playPreviousTrack={playPreviousTrack}
                  playNextTrack={playNextTrack}
                  currentTrack={currentTrack}
                />
              </div>
              
              {/* Track list */}
              <TrackList 
                tracks={tracks} 
                currentTrack={currentTrack}
                playTrack={playTrack}
                addReaction={addReaction}
              />
            </div>
            
            {/* Hidden audio element */}
            <audio 
              ref={audioRef}
            />
          </div>
        )}
      </div>
    </div>
  );
}
