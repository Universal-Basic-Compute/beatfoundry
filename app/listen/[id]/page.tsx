'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

type Foundry = {
  id: string;
  name: string;
  description: string;
};

type Track = {
  id: string;
  name: string;
  prompt: string;
  lyrics: string;
  url: string;
  createdAt: string;
  foundryId: string;
};

export default function ListenPage() {
  const params = useParams();
  const foundryId = params.id as string;
  
  const [foundry, setFoundry] = useState<Foundry | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingTrack, setCreatingTrack] = useState(false);
  const [trackCreated, setTrackCreated] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [pollingTaskId, setPollingTaskId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [instrumental, setInstrumental] = useState(false);
  
  // Add state for tracks
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
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
  
  // Fetch foundry details
  useEffect(() => {
    const fetchFoundry = async () => {
      try {
        const response = await fetch(`/api/foundries/${foundryId}`);
        if (!response.ok) throw new Error('Failed to fetch foundry details');
        const data = await response.json();
        setFoundry(data);
      } catch (err) {
        console.error('Error fetching foundry:', err);
        setError('Could not load foundry details');
      }
    };
    
    fetchFoundry();
  }, [foundryId]);
  
  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/foundries/${foundryId}/messages`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();
        setMessages(data.messages || []);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Could not load messages');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages();
  }, [foundryId]);
  
  // Fetch tracks
  useEffect(() => {
    const fetchTracks = async () => {
      try {
        setLoadingTracks(true);
        const response = await fetch(`/api/foundries/${foundryId}/tracks`);
        if (!response.ok) throw new Error('Failed to fetch tracks');
        const data = await response.json();
        
        // If no tracks are found, add a test track for debugging
        if (data.length === 0) {
          console.log('[DEBUG] No tracks found, adding test track');
          data.push({
            id: 'test-track',
            name: 'Test Track',
            prompt: 'Test prompt',
            lyrics: 'Test lyrics',
            url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Test MP3 URL
            createdAt: new Date().toISOString(),
            foundryId: foundryId
          });
        }
        
        // Store the current track ID and playback state before updating
        const currentTrackId = currentTrack?.id;
        const wasPlaying = isPlaying;
        const currentPlaybackTime = audioRef.current?.currentTime || 0;
        
        // Update tracks list without changing the current track
        setTracks(data);
        
        // If we had a current track, find and restore it in the new tracks list
        if (currentTrackId) {
          const updatedCurrentTrack = data.find((track: Track) => track.id === currentTrackId);
          if (updatedCurrentTrack) {
            // Update the current track with the latest data, but don't reset playback
            setCurrentTrack(prev => {
              // Only update if the URL has changed
              if (prev?.url !== updatedCurrentTrack.url) {
                return updatedCurrentTrack;
              }
              return prev; // Keep the same object reference if URL hasn't changed
            });
            
            // If the audio element exists and the URL changed, we need to restore playback state
            if (audioRef.current && currentTrack?.url !== updatedCurrentTrack.url) {
              // Set the new source
              audioRef.current.src = updatedCurrentTrack.url;
              // Restore playback position
              audioRef.current.currentTime = currentPlaybackTime;
              // Restore play/pause state
              if (wasPlaying) {
                audioRef.current.play().catch(err => {
                  console.error('Error resuming playback after track update:', err);
                });
              }
            }
          }
        } else if (data.length > 0 && !currentTrack) {
          // Only set the first track as current if there's no current track
          setCurrentTrack(data[0]);
        }
      } catch (err) {
        console.error('Error fetching tracks:', err);
      } finally {
        setLoadingTracks(false);
      }
    };
    
    fetchTracks();
    
    // Set up polling to check for new tracks every 30 seconds
    const intervalId = setInterval(fetchTracks, 30000);
    
    return () => {
      console.log(`[UI] Cleaning up intervals in useEffect`);
      clearInterval(intervalId);
      // Also clear the polling interval for task status if it exists
      if (pollingInterval) {
        console.log(`[UI] Clearing polling interval in cleanup`);
        clearInterval(pollingInterval);
      }
    };
  }, [foundryId, pollingInterval]); // Keep currentTrack and isPlaying out of dependencies
  
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
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Add click outside handler for options menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showOptions && !(event.target as Element).closest('.options-menu')) {
        setShowOptions(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptions]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    // Optimistically add user message to the UI
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: newMessage,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setSending(true);
    
    try {
      const response = await fetch(`/api/foundries/${foundryId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: userMessage.content,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      
      const data = await response.json();
      
      // Add the assistant's response
      // Check if the response has the new format or the old format
      if (data.response) {
        // New format
        setMessages(prev => [...prev, {
          id: data.message_id || `response-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
        }]);
      } else {
        // Old format
        setMessages(prev => [...prev, {
          id: data.id || `response-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          timestamp: data.timestamp || new Date().toISOString(),
        }]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };
  
  // Add polling function for music generation status
  const pollMusicGenerationStatus = async (taskId: string) => {
    console.log(`[UI] pollMusicGenerationStatus called with taskId: ${taskId}`);
    console.log(`[UI] Starting to poll for task ID: ${taskId}`);
    setPollingTaskId(taskId);
    setGenerationStatus('PENDING');
    
    // Clear any existing interval
    if (pollingInterval) {
      console.log(`[UI] Clearing existing polling interval`);
      clearInterval(pollingInterval);
    }
    
    // Set up polling every 10 seconds
    console.log(`[UI] Setting up new polling interval for task ID: ${taskId}`);
    const intervalId = setInterval(async () => {
      try {
        console.log(`[UI] Polling interval fired for task status: ${taskId}`);
        console.log(`[UI] Sending request to: /api/foundries/${foundryId}/tracks/status?taskId=${taskId}`);
        const response = await fetch(`/api/foundries/${foundryId}/tracks/status?taskId=${taskId}`);
        
        if (!response.ok) {
          console.error(`[UI] Error checking task status: ${response.status}`);
          return;
        }
        
        const data = await response.json();
        console.log(`[UI] Task status response:`, data);
        
        // Check for status in the correct location
        // It could be in data.data.response.status or data.data.status
        const status = data.data?.response?.status || data.data?.status;
        
        if (status) {
          setGenerationStatus(status);
          
          // If the task is complete, stop polling and refresh tracks
          if (status === 'SUCCESS' || status === 'FIRST_SUCCESS') {
            console.log(`[UI] Music generation completed successfully!`);
              
            // Check if we have track data in the response
            const trackData = data.data?.response?.sunoData;
            if (trackData && trackData.length > 0) {
              console.log(`[UI] Found ${trackData.length} tracks in response:`, trackData);
                
              // Save these tracks to Airtable via our API
              try {
                console.log(`[UI] Saving tracks from status response to Airtable`);
                const saveResponse = await fetch(`/api/foundries/${foundryId}/tracks/save-from-status`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    taskId: taskId,
                    tracks: trackData
                  }),
                });
                  
                if (!saveResponse.ok) {
                  console.error(`[UI] Error saving tracks from status:`, await saveResponse.text());
                } else {
                  console.log(`[UI] Successfully saved tracks from status response`);
                }
              } catch (saveError) {
                console.error(`[UI] Error saving tracks from status:`, saveError);
              }
            }
              
            clearInterval(intervalId);
            setPollingInterval(null);
            setPollingTaskId(null);
              
            // Refresh the tracks list
            console.log(`[UI] Refreshing tracks list`);
            const tracksResponse = await fetch(`/api/foundries/${foundryId}/tracks`);
            const tracksData = await tracksResponse.json();
            console.log(`[UI] Received ${tracksData.length} tracks`);
            setTracks(tracksData);
              
            if (tracksData.length > 0) {
              // Find the newest tracks (should be the ones we just created)
              const sortedTracks = [...tracksData].sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
                
              // Set the first track as current
              console.log(`[UI] Setting current track to newest track: "${sortedTracks[0].name}"`);
              setCurrentTrack(sortedTracks[0]);
              setIsPlaying(true); // Auto-play the new track
                
              // Show a message about multiple tracks
              if (trackData && trackData.length > 1) {
                setTrackCreated(true);
              }
            }
          } else if (status === 'CREATE_TASK_FAILED' || status === 'GENERATE_AUDIO_FAILED' || 
                    status === 'CALLBACK_EXCEPTION' || status === 'SENSITIVE_WORD_ERROR') {
            // If the task failed, stop polling
            console.error(`[UI] Music generation failed with status: ${status}`);
            clearInterval(intervalId);
            setPollingInterval(null);
            setPollingTaskId(null);
            setTrackError(`Music generation failed: ${data.data.response?.errorMessage || status}`);
          }
        }
      } catch (error) {
        console.error('[UI] Error polling for task status:', error);
      }
    }, 10000); // Poll every 10 seconds
    
    setPollingInterval(intervalId);
  };

  const handleCreateTrack = async () => {
    if (!newMessage.trim()) return;
    
    console.log(`[UI] Creating track for foundry ID: ${foundryId}`);
    console.log(`[UI] Message content: ${newMessage}`);
    console.log(`[UI] Instrumental: ${instrumental}`);
    
    setCreatingTrack(true);
    setTrackError(null);
    setTrackCreated(false);
    setGenerationStatus(null);
    
    try {
      console.log(`[UI] Sending POST request to /api/foundries/${foundryId}/tracks`);
      const response = await fetch(`/api/foundries/${foundryId}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
          instrumental: instrumental,
        }),
      });
      
      console.log(`[UI] Track creation response status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[UI] Error response:`, errorData);
        throw new Error(errorData.error || 'Failed to create track');
      }
      
      const data = await response.json();
      console.log(`[UI] Track creation successful:`, data);
      console.log(`[UI] Response data:`, data);
      console.log(`[UI] music_task_id:`, data.music_task_id);
      console.log(`[UI] music_task_id:`, data.music_task_id);
      
      setTrackCreated(true);
      setNewMessage('');
      
      // If we have a task ID, start polling for status
      if (data.music_task_id) {
        console.log(`[UI] Starting to poll for task ID: ${data.music_task_id}`);
        pollMusicGenerationStatus(data.music_task_id);
      } else {
        console.warn(`[UI] No music_task_id found in response, polling will not start`);
      }
    } catch (err) {
      console.error('[UI] Error creating track:', err);
      setTrackError('Failed to create track. Please try again.');
    } finally {
      setCreatingTrack(false);
    }
  };
  
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
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-black/5 dark:bg-white/10 p-4 border-b">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">BeatFoundry</Link>
          {foundry && <h1 className="text-xl font-semibold">{foundry.name}</h1>}
        </div>
      </header>
      
      <main className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full">
        {/* Left side - Music Player */}
        <div className="w-full md:w-1/2 p-6 border-r">
          <div className="bg-black/5 dark:bg-white/10 rounded-lg p-6 h-full flex flex-col">
            <h2 className="text-2xl font-semibold mb-4">Music Player</h2>
            
            {loadingTracks ? (
              <div className="flex-1 flex items-center justify-center">
                <p>Loading tracks...</p>
              </div>
            ) : tracks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <div className="w-48 h-48 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <span className="text-4xl">🎵</span>
                  </div>
                  <p className="text-lg font-medium">No tracks yet</p>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Use the "Create Track" button to generate music
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto mb-4">
                  <div className="text-center mb-6">
                    <div className="w-48 h-48 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6 flex items-center justify-center">
                      <span className="text-4xl">🎵</span>
                    </div>
                    <p className="text-lg font-medium">Now Playing</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {currentTrack ? currentTrack.name : 'Select a track'}
                    </p>
                    <div className="mt-6">
                      {/* Progress bar */}
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-xs">{formatTime(currentTime)}</span>
                        <input
                          type="range"
                          min="0"
                          max={duration || 0}
                          value={currentTime}
                          onChange={handleSeek}
                          className="flex-1 h-2 bg-gray-300 dark:bg-gray-700 rounded-full appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #6366f1 ${(currentTime / (duration || 1)) * 100}%, #d1d5db ${(currentTime / (duration || 1)) * 100}%)`
                          }}
                          disabled={!currentTrack}
                        />
                        <span className="text-xs">{formatTime(duration)}</span>
                      </div>
                      
                      {/* Playback controls */}
                      <div className="flex justify-center space-x-4">
                        <button 
                          onClick={playPreviousTrack}
                          className="p-3 rounded-full bg-foreground text-background"
                          disabled={!currentTrack}
                        >
                          <span>⏮️</span>
                        </button>
                        <button 
                          onClick={togglePlayPause}
                          className="p-3 rounded-full bg-foreground text-background"
                          disabled={!currentTrack}
                        >
                          <span>{isPlaying ? '⏸️' : '▶️'}</span>
                        </button>
                        <button 
                          onClick={playNextTrack}
                          className="p-3 rounded-full bg-foreground text-background"
                          disabled={!currentTrack}
                        >
                          <span>⏭️</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="font-semibold mb-2">Track List</h3>
                  <div className="space-y-2">
                    {tracks.map((track, index) => (
                      <div 
                        key={track.id || `track-${index}`}
                        className={`p-3 rounded-lg cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 ${
                          currentTrack?.id === track.id ? 'bg-black/10 dark:bg-white/10' : ''
                        }`}
                        onClick={() => playTrack(track)}
                      >
                        <div className="font-medium">{track.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {new Date(track.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
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
        
        {/* Right side - Chat */}
        <div className="w-full md:w-1/2 p-6 flex flex-col h-[calc(100vh-80px)]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <h2 className="text-2xl font-semibold">Chat with {foundry?.name || 'AI Musician'}</h2>
              
              {/* Information icon with tooltip */}
              <div className="relative ml-2 group">
                <button 
                  className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-xs font-bold"
                  aria-label="Information"
                >
                  i
                </button>
                <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-white dark:bg-gray-800 rounded shadow-lg text-xs z-10 hidden group-hover:block">
                  <p className="mb-1"><strong>How to use:</strong></p>
                  <p className="mb-1">1. Use <strong>Send</strong> to chat with the AI and guide its artistic direction.</p>
                  <p>2. Use <strong>Create Track</strong> to generate music based on your prompt.</p>
                </div>
              </div>
            </div>
            
            {/* Options menu */}
            <div className="relative">
              <button 
                onClick={() => setShowOptions(!showOptions)}
                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                aria-label="Options"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="19" cy="12" r="1"></circle>
                  <circle cx="5" cy="12" r="1"></circle>
                </svg>
              </button>
              
              {showOptions && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10 options-menu">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                      <div className="flex items-center justify-between">
                        <span>Instrumental Only</span>
                        <button 
                          onClick={() => setInstrumental(!instrumental)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full ${instrumental ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <span 
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${instrumental ? 'translate-x-6' : 'translate-x-1'}`} 
                          />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {instrumental ? 'Generate music without lyrics' : 'Generate music with lyrics'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto mb-4 bg-black/5 dark:bg-white/10 rounded-lg p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p>Loading conversation...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <p className="mb-2">No messages yet</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Start a conversation with {foundry?.name || 'the AI musician'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div 
                    key={message.id || `message-${index}`} 
                    className={`p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-foreground text-background ml-8' 
                        : 'bg-black/10 dark:bg-white/20 mr-8'
                    }`}
                  >
                    <div className="font-medium mb-1 text-sm">
                      {message.role === 'user' ? 'You' : foundry?.name || 'AI Musician'}
                    </div>
                    <div className={message.role === 'user' ? 'text-sm' : 'prose dark:prose-invert prose-sm max-w-none text-sm'}>
                      {message.role === 'user' ? (
                        <div>{message.content}</div>
                      ) : (
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      )}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="bg-black/10 dark:bg-white/20 p-3 rounded-lg mr-8">
                    <div className="font-medium mb-1 text-sm">
                      {foundry?.name || 'AI Musician'}
                    </div>
                    <div className="flex space-x-1">
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          <form onSubmit={handleSendMessage} className="flex flex-col">
            <div className="flex mb-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-3 border rounded-l-lg dark:bg-gray-800 dark:border-gray-700"
                disabled={sending || creatingTrack}
              />
              <button
                type="submit"
                className="bg-foreground text-background px-4 py-2 rounded-none font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={sending || creatingTrack || !newMessage.trim()}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
              <button
                type="button"
                onClick={handleCreateTrack}
                className="bg-purple-600 text-white px-4 py-2 rounded-r-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={sending || creatingTrack || !newMessage.trim()}
              >
                {creatingTrack ? 'Creating...' : 'Create Track'}
              </button>
            </div>
            
            {trackError && (
              <div className="text-red-500 text-sm mt-1">{trackError}</div>
            )}
            
            {trackCreated && (
              <div className="text-green-500 text-sm mt-1">
                {pollingTaskId && generationStatus === 'SUCCESS' && tracks.length > 1
                  ? `Multiple tracks created successfully! Check the music player to listen to all versions.`
                  : 'Track created successfully! It will appear in the music player soon.'}
              </div>
            )}
            
            {/* Show generation status if polling */}
            {pollingTaskId && generationStatus && (
              <div className="mt-2 text-sm">
                <p>
                  {generationStatus === 'PENDING' && 'Music generation in progress... (this may take a few minutes)'}
                  {generationStatus === 'TEXT_SUCCESS' && 'Lyrics generated, creating music...'}
                  {generationStatus === 'FIRST_SUCCESS' && 'First track generated, creating variations...'}
                  {generationStatus === 'SUCCESS' && 'Music generation complete!'}
                  {['CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION', 'SENSITIVE_WORD_ERROR'].includes(generationStatus) && 
                    `Music generation failed: ${generationStatus}`}
                </p>
                {['PENDING', 'TEXT_SUCCESS', 'FIRST_SUCCESS'].includes(generationStatus) && (
                  <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full animate-pulse" 
                      style={{ width: '100%' }}
                    ></div>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
