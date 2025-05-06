'use client';

import { useState, useEffect, useRef } from 'react';
import Image from "next/image";

type Foundry = {
  id: string;
  name: string;
  description: string;
  reactions?: {
    '🏆'?: number;
    '💫'?: number;
    '🎭'?: number;
    '🌐'?: number;
    '🧠'?: number;
    '🎛️'?: number;
    '🔄'?: number;
    '🎹'?: number;
    '🥁'?: number;
    '🌟'?: number;
  };
};

type Track = {
  id: string;
  name: string;
  prompt: string;
  lyrics: string;
  url: string;
  cover?: string;
  createdAt: string;
  foundryId: string;
  foundryName?: string;
  reactions?: {
    '⭐'?: number;
    '🎵'?: number;
    '🥁'?: number;
    '🔊'?: number;
    '📝'?: number;
    '❓'?: number;
    '💡'?: number;
    '🔁'?: number;
    '🌟'?: number;
    '📈'?: number;
    '❌'?: number;
  };
  totalReactions?: number;
};

export default function Home() {
  const [foundries, setFoundries] = useState<Foundry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [newFoundry, setNewFoundry] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  
  // Top tracks state
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [loadingTopTracks, setLoadingTopTracks] = useState(true);
  const [currentTopTrack, setCurrentTopTrack] = useState<Track | null>(null);
  const [isTopTrackPlaying, setIsTopTrackPlaying] = useState(false);
  const topAudioRef = useRef<HTMLAudioElement>(null);
  
  // Function to calculate the total reactions for a foundry
  const getTotalReactions = (foundry: Foundry): number => {
    if (!foundry.reactions) return 0;
    
    return Object.values(foundry.reactions).reduce((sum, count) => sum + count, 0);
  };
  
  // Define the reaction types and their descriptions
  const foundryReactionTypes = [
    { emoji: '🏆', description: 'Hit Maker (consistently creates popular tracks)' },
    { emoji: '💫', description: 'Innovator (pioneering new sounds/techniques)' },
    { emoji: '🎭', description: 'Mood Master (exceptional at emotional expression)' },
    { emoji: '🌐', description: 'Genre Blender (skillfully combines different styles)' },
    { emoji: '🧠', description: 'Complex Composer (creates sophisticated arrangements)' },
    { emoji: '🎛️', description: 'Production Ace (outstanding sound quality/mixing)' },
    { emoji: '🔄', description: 'Evolution Expert (shows remarkable artistic growth)' },
    { emoji: '🎹', description: 'Melody Maestro (creates memorable melodic lines)' },
    { emoji: '🥁', description: 'Rhythm King/Queen (exceptional beat programming)' },
    { emoji: '🌟', description: 'Rising Star (showing exceptional promise/potential)' }
  ];
  
  // Add state for reaction popup
  const [showReactionPopup, setShowReactionPopup] = useState<string | null>(null);

  useEffect(() => {
    fetchFoundries();
    fetchTopTracks();
  }, []);
  
  // Add click outside handler for reaction popup
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showReactionPopup && !(event.target as Element).closest('.reaction-popup')) {
        setShowReactionPopup(null);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showReactionPopup]);
  
  // Handle top track audio playback
  useEffect(() => {
    if (currentTopTrack && topAudioRef.current) {
      topAudioRef.current.src = currentTopTrack.url;
      if (isTopTrackPlaying) {
        topAudioRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
        });
      }
    }
  }, [currentTopTrack, isTopTrackPlaying]);
  
  // Handle audio events
  useEffect(() => {
    const audio = topAudioRef.current;
    if (!audio) return;
    
    const handleEnded = () => {
      // Play the next track in the top tracks list
      if (topTracks.length > 0 && currentTopTrack) {
        const currentIndex = topTracks.findIndex(track => track.id === currentTopTrack.id);
        const nextIndex = (currentIndex + 1) % topTracks.length;
        setCurrentTopTrack(topTracks[nextIndex]);
      }
    };
    
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [topTracks, currentTopTrack]);

  const fetchFoundries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/foundries');
      if (!response.ok) throw new Error('Failed to fetch foundries');
      const data = await response.json();
      setFoundries(data);
    } catch (err) {
      setError('Error loading foundries. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to fetch top tracks
  const fetchTopTracks = async () => {
    try {
      setLoadingTopTracks(true);
      // Fetch all foundries to get their tracks
      const response = await fetch('/api/foundries');
      if (!response.ok) throw new Error('Failed to fetch foundries');
      const foundries = await response.json();
      
      // Fetch tracks for each foundry
      const allTracksPromises = foundries.map(async (foundry) => {
        const tracksResponse = await fetch(`/api/foundries/${foundry.id}/tracks`);
        if (!tracksResponse.ok) return [];
        const tracks = await tracksResponse.json();
        // Add foundry name to each track
        return tracks.map(track => ({
          ...track,
          foundryName: foundry.name
        }));
      });
      
      const allTracksArrays = await Promise.all(allTracksPromises);
      // Flatten the array of arrays
      const allTracks = allTracksArrays.flat();
      
      // Calculate total reactions for each track
      const tracksWithReactionCounts = allTracks.map(track => {
        const totalReactions = track.reactions ? 
          Object.values(track.reactions).reduce((sum, count) => sum + (typeof count === 'number' ? count : 0), 0) : 0;
        return { ...track, totalReactions };
      });
      
      // Sort by total reactions and take top 5
      const sortedTracks = tracksWithReactionCounts
        .sort((a, b) => (b.totalReactions || 0) - (a.totalReactions || 0))
        .filter(track => (track.totalReactions || 0) > 0) // Only include tracks with reactions
        .slice(0, 5);
      
      setTopTracks(sortedTracks);
      
      // Set the first track as current if available
      if (sortedTracks.length > 0 && !currentTopTrack) {
        setCurrentTopTrack(sortedTracks[0]);
      }
    } catch (err) {
      console.error('Error loading top tracks:', err);
    } finally {
      setLoadingTopTracks(false);
    }
  };
  
  // Functions to control audio playback
  const playTopTrack = (track: Track) => {
    setCurrentTopTrack(track);
    setIsTopTrackPlaying(true);
  };

  const toggleTopTrackPlayPause = () => {
    if (topAudioRef.current) {
      if (isTopTrackPlaying) {
        topAudioRef.current.pause();
      } else {
        topAudioRef.current.play().catch(err => {
          console.error('Error playing audio:', err);
        });
      }
      setIsTopTrackPlaying(!isTopTrackPlaying);
    }
  };

  // Function to add a reaction
  const addFoundryReaction = async (foundryId: string, reaction: string) => {
    try {
      const response = await fetch(`/api/foundries/${foundryId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reaction }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add reaction');
      }
      
      const updatedReactions = await response.json();
      
      // Update the foundry in the local state
      setFoundries(prevFoundries => 
        prevFoundries.map(foundry => 
          foundry.id === foundryId 
            ? { ...foundry, reactions: updatedReactions } 
            : foundry
        )
      );
      
      // Close the reaction popup
      setShowReactionPopup(null);
    } catch (error) {
      console.error('Error adding foundry reaction:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    
    if (!newFoundry.name.trim() || !newFoundry.description.trim()) {
      setFormError('Name and description are required');
      return;
    }
    
    try {
      const response = await fetch('/api/foundries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFoundry)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 409) {
          setFormError(`A foundry named "${newFoundry.name}" already exists`);
        } else {
          setFormError(data.error || 'Failed to create foundry');
        }
        return;
      }
      
      setFormSuccess(`Successfully created ${data.name}!`);
      setNewFoundry({ name: '', description: '' });
      fetchFoundries(); // Refresh the list
      setShowForm(false);
    } catch (err) {
      setFormError('An error occurred. Please try again.');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <header className="mb-12 text-center">
        <div className="flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-3">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
          <h1 className="text-4xl font-bold">BeatFoundry</h1>
        </div>
        <p className="text-xl text-muted-foreground">The Evolution of AI Musicians</p>
      </header>

      <main>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold">AI Foundries</h2>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="rounded-full bg-primary text-primary-foreground px-4 py-2 font-medium hover:opacity-90 transition-opacity"
          >
            {showForm ? 'Cancel' : 'Add New Foundry'}
          </button>
        </div>
        
        {/* Top Songs Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Top Tracks</h2>
          
          {loadingTopTracks ? (
            <div className="flex justify-center py-8">
              <div className="relative w-10 h-10">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            </div>
          ) : topTracks.length === 0 ? (
            <div className="text-center py-8 bg-black/5 dark:bg-white/5 rounded-xl">
              <p className="text-muted-foreground">No tracks with reactions yet</p>
            </div>
          ) : (
            <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border overflow-hidden">
              {/* Current playing track */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center space-x-4">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-black/10 dark:bg-white/10 flex-shrink-0">
                    {currentTopTrack?.cover ? (
                      <Image 
                        src={currentTopTrack.cover} 
                        alt={currentTopTrack.name} 
                        width={64} 
                        height={64} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">🎵</span>
                      </div>
                    )}
                    {isTopTrackPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-lg line-clamp-1">
                      {currentTopTrack?.name || 'Select a track to play'}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {currentTopTrack?.foundryName || 'Top tracks from all foundries'}
                    </p>
                  </div>
                  
                  <button 
                    onClick={toggleTopTrackPlayPause}
                    disabled={!currentTopTrack}
                    className="p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isTopTrackPlaying ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Track list */}
              <div className="divide-y divide-border">
                {topTracks.map((track, index) => (
                  <div 
                    key={track.id}
                    onClick={() => playTopTrack(track)}
                    className={`flex items-center p-4 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors ${
                      currentTopTrack?.id === track.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center font-medium text-muted-foreground mr-3">
                      {index + 1}
                    </div>
                    
                    <div className="w-10 h-10 rounded-md overflow-hidden mr-3 flex-shrink-0">
                      {track.cover ? (
                        <Image 
                          src={track.cover} 
                          alt={track.name} 
                          width={40} 
                          height={40} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg">🎵</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-1">{track.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{track.foundryName}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-2">
                      {track.reactions && Object.entries(track.reactions).map(([emoji, count]) => (
                        <div 
                          key={emoji} 
                          className="flex items-center bg-black/5 dark:bg-white/5 px-2 py-1 rounded-full text-xs"
                        >
                          <span className="mr-1">{emoji}</span>
                          <span>{count}</span>
                        </div>
                      )).slice(0, 3)}
                      
                      {Object.keys(track.reactions || {}).length > 3 && (
                        <div className="text-xs text-muted-foreground">+{Object.keys(track.reactions || {}).length - 3}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Hidden audio element for top tracks */}
          <audio 
            ref={topAudioRef}
            onEnded={() => setIsTopTrackPlaying(false)}
            onPlay={() => setIsTopTrackPlaying(true)}
            onPause={() => setIsTopTrackPlaying(false)}
          />
        </div>

        {showForm && (
          <div className="bg-card text-card-foreground p-8 rounded-xl mb-8 shadow-sm border border-border">
            <h3 className="text-xl font-bold mb-6">Create New Foundry</h3>
            {formError && <div className="text-destructive mb-4 p-3 bg-destructive/10 rounded-lg">{formError}</div>}
            {formSuccess && <div className="text-success mb-4 p-3 bg-success/10 rounded-lg">{formSuccess}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label htmlFor="name" className="block mb-2 font-medium">Name</label>
                <input
                  type="text"
                  id="name"
                  value={newFoundry.name}
                  onChange={(e) => setNewFoundry({...newFoundry, name: e.target.value})}
                  className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  placeholder="Enter foundry name"
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="description" className="block mb-2 font-medium">Description</label>
                <textarea
                  id="description"
                  value={newFoundry.description}
                  onChange={(e) => setNewFoundry({...newFoundry, description: e.target.value})}
                  className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  rows={3}
                  placeholder="Describe this AI musician's style and focus"
                />
              </div>
              
              <button 
                type="submit"
                className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M12 5v14"></path>
                  <path d="M5 12h14"></path>
                </svg>
                Create Foundry
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Loading foundries...</div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">{error}</div>
        ) : foundries.length === 0 ? (
          <div className="text-center py-8">
            <p>No foundries found. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...foundries]
              .sort((a, b) => getTotalReactions(b) - getTotalReactions(a))
              .map((foundry) => (
              <div key={foundry.id} className="border border-border rounded-xl p-6 hover:shadow-md transition-shadow bg-card relative">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3 font-semibold">
                    {foundry.name.charAt(0)}
                  </div>
                  <h3 className="text-xl font-bold">{foundry.name}</h3>
                </div>
                <p className="text-muted-foreground mb-5">{foundry.description}</p>
                
                {/* Display reactions if any */}
                {foundry.reactions && Object.keys(foundry.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(foundry.reactions).map(([emoji, count]) => (
                      <div 
                        key={emoji} 
                        className="flex items-center bg-black/5 dark:bg-white/5 px-2 py-1 rounded-full text-xs"
                        title={foundryReactionTypes.find(r => r.emoji === emoji)?.description || ''}
                      >
                        <span className="mr-1">{emoji}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add total reactions count badge */}
                {foundry.reactions && Object.keys(foundry.reactions).length > 0 && (
                  <div className="absolute top-3 right-3 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                    {getTotalReactions(foundry)} reactions
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <a 
                    href={`/listen/${foundry.id}`} 
                    className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    Listen
                  </a>
                  
                  {/* Add reaction button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReactionPopup(showReactionPopup === foundry.id ? null : foundry.id);
                    }}
                    className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    aria-label="Add reaction"
                    title="Add reaction"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                      <line x1="9" y1="9" x2="9.01" y2="9"></line>
                      <line x1="15" y1="9" x2="15.01" y2="9"></line>
                    </svg>
                  </button>
                  
                  {/* Reaction popup */}
                  {showReactionPopup === foundry.id && (
                    <div className="absolute z-20 bg-background shadow-lg rounded-lg p-2 border border-border mt-2 animate-fadeIn reaction-popup">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">Add reaction:</div>
                      <div className="grid grid-cols-5 gap-2">
                        {foundryReactionTypes.map(({ emoji, description }) => (
                          <button
                            key={emoji}
                            onClick={() => addFoundryReaction(foundry.id, emoji)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
                            title={description}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>BeatFoundry - Where AI Musicians Evolve</p>
      </footer>
    </div>
  );
}
