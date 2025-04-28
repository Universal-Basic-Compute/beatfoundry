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
  
  // Add state for tracks
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
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
        
        setTracks(data);
        
        // Set the first track as current if available
        if (data.length > 0 && !currentTrack) {
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
    
    return () => clearInterval(intervalId);
  }, [foundryId, currentTrack]);
  
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
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
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
  
  const handleCreateTrack = async () => {
    if (!newMessage.trim()) return;
    
    console.log(`[UI] Creating track for foundry ID: ${foundryId}`);
    console.log(`[UI] Message content: ${newMessage}`);
    
    setCreatingTrack(true);
    setTrackError(null);
    setTrackCreated(false);
    
    try {
      console.log(`[UI] Sending POST request to /api/foundries/${foundryId}/tracks`);
      const response = await fetch(`/api/foundries/${foundryId}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
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
      
      setTrackCreated(true);
      setNewMessage('');
      
      // Refresh tracks after a short delay to give time for processing
      console.log(`[UI] Setting timeout to refresh tracks in 5 seconds`);
      setTimeout(() => {
        console.log(`[UI] Refreshing tracks list`);
        fetch(`/api/foundries/${foundryId}/tracks`)
          .then(res => {
            console.log(`[UI] Tracks refresh response status: ${res.status}`);
            return res.json();
          })
          .then(data => {
            console.log(`[UI] Received ${data.length} tracks`);
            setTracks(data);
            if (data.length > 0) {
              console.log(`[UI] Setting current track to first track: "${data[0].name}"`);
              setCurrentTrack(data[0]);
            }
          })
          .catch(err => console.error('[UI] Error fetching updated tracks:', err));
      }, 5000);
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
          <Link href="/" className="text-xl font-bold">BeatsFoundry</Link>
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
                    <div className="mt-6 flex justify-center space-x-4">
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
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Right side - Chat */}
        <div className="w-full md:w-1/2 p-6 flex flex-col h-[calc(100vh-80px)]">
          <h2 className="text-2xl font-semibold mb-4">Chat with {foundry?.name || 'AI Musician'}</h2>
          
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
                    <div className="font-medium mb-1">
                      {message.role === 'user' ? 'You' : foundry?.name || 'AI Musician'}
                    </div>
                    <div className={message.role === 'user' ? '' : 'prose dark:prose-invert prose-sm max-w-none'}>
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
                    <div className="font-medium mb-1">
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
                Track created successfully! It will appear in the music player soon.
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
