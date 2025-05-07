import React, { useRef, useEffect, useState } from 'react';
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
  
  // Handle audio playback
  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.url;
      if (isPlaying) {
        audioRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
        });
      }
    }
  }, [currentTrack, isPlaying]);
  
  // Add event listeners for audio progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('loadedmetadata', updateDuration);
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, []);
  
  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  };
  
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const playNextTrack = () => {
    if (tracks.length === 0 || !currentTrack) return;
    
    const currentIndex = tracks.findIndex(track => track.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % tracks.length;
    setCurrentTrack(tracks[nextIndex]);
    setIsPlaying(true);
  };
  
  const playPreviousTrack = () => {
    if (tracks.length === 0 || !currentTrack) return;
    
    const currentIndex = tracks.findIndex(track => track.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    setCurrentTrack(tracks[prevIndex]);
    setIsPlaying(true);
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
              onEnded={playNextTrack}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
              onDurationChange={() => setDuration(audioRef.current?.duration || 0)}
              onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
