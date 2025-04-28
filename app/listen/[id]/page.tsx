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
  // Track multiple pending generations instead of a single one
  const [pendingGenerations, setPendingGenerations] = useState<Array<{
    id: string;
    taskId: string;
    title: string;
    status: string;
    createdAt: string;
  }>>([]);
  
  // Reference to store all polling intervals
  const intervalsRef = useRef<{[key: string]: NodeJS.Timeout}>({});
  const [showOptions, setShowOptions] = useState(false);
  const [instrumental, setInstrumental] = useState(false);
  const [trackMenuOpen, setTrackMenuOpen] = useState<string | null>(null);
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());
  
  // Add state for autonomous thinking
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [thoughts, setThoughts] = useState<Array<{
    step: string;
    content: any;
    timestamp?: string;
  }>>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  
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
        setLoading(true);
        const response = await fetch(`/api/foundries/${foundryId}`);
        
        if (!response.ok) {
          console.error(`Error fetching foundry: ${response.status}`);
          const errorText = await response.text();
          console.error(`Error details: ${errorText}`);
          
          // Create a fallback foundry object if we can't fetch the real one
          setFoundry({
            id: foundryId,
            name: "AI Musician",
            description: "Your AI music companion"
          });
          
          setError('Could not load foundry details, using default settings');
        } else {
          const data = await response.json();
          setFoundry(data);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching foundry:', err);
        
        // Create a fallback foundry object
        setFoundry({
          id: foundryId,
          name: "AI Musician",
          description: "Your AI music companion"
        });
        
        setError('Could not load foundry details, using default settings');
      } finally {
        setLoading(false);
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
        
        // Store the current track ID, URL, and playback state before updating
        const currentTrackId = currentTrack?.id;
        const currentTrackUrl = currentTrack?.url;
        const wasPlaying = isPlaying;
        const currentPlaybackTime = audioRef.current?.currentTime || 0;
        
        // Update tracks list without changing the current track
        setTracks(prevTracks => {
          // Merge new tracks with existing ones, preserving the current track
          if (currentTrackId) {
            // Find the current track in the new data
            const updatedCurrentTrack = data.find((track: Track) => track.id === currentTrackId);
            
            // If the current track exists in the new data but has a different URL,
            // we need to handle this special case
            if (updatedCurrentTrack && updatedCurrentTrack.url !== currentTrackUrl) {
              console.log(`[UI] Current track URL changed from ${currentTrackUrl} to ${updatedCurrentTrack.url}`);
              // We'll handle this after the state update
            }
          }
          return data;
        });
        
        // If we had a current track, find and restore it in the new tracks list
        if (currentTrackId) {
          const updatedCurrentTrack = data.find((track: Track) => track.id === currentTrackId);
          if (updatedCurrentTrack) {
            // Only update the current track reference if necessary, but don't change the audio element yet
            if (updatedCurrentTrack.url !== currentTrackUrl) {
              console.log(`[UI] Updating current track with new URL: ${updatedCurrentTrack.url}`);
              // Update the current track but don't reset the audio element yet
              setCurrentTrack(updatedCurrentTrack);
              
              // We need to manually update the audio source without interrupting playback
              if (audioRef.current) {
                // Store the current state
                const wasPlaying = !audioRef.current.paused;
                
                // Create a new Audio element to preload the new source
                const newAudio = new Audio();
                newAudio.src = updatedCurrentTrack.url;
                
                // When the new audio is ready, update the current audio element
                newAudio.addEventListener('canplaythrough', () => {
                  if (audioRef.current) {
                    // Save current position
                    const currentTime = audioRef.current.currentTime;
                    
                    // Update source
                    audioRef.current.src = updatedCurrentTrack.url;
                    audioRef.current.load();
                    
                    // Restore position
                    audioRef.current.currentTime = currentTime;
                    
                    // Resume playback if it was playing
                    if (wasPlaying) {
                      audioRef.current.play().catch(err => {
                        console.error('Error resuming playback after URL update:', err);
                      });
                    }
                  }
                });
                
                // Start loading the new audio
                newAudio.load();
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
    
    // No longer polling for tracks every 30 seconds
    
    return () => {
      console.log(`[UI] Cleaning up intervals in useEffect`);
      // Clear all polling intervals
      Object.values(intervalsRef.current).forEach(interval => {
        console.log(`[UI] Clearing polling interval in cleanup`);
        clearInterval(interval);
      });
    };
  }, [foundryId]); // Only keep foundryId in dependencies since we're using a ref
  
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
  
  // Add function to trigger autonomous thinking
  const triggerThinking = async () => {
    if (thinking) return;
    
    setThinking(true);
    // Don't clear thoughts here, as we want to keep displaying them while new ones arrive
    
    try {
      console.log(`[UI] Triggering autonomous thinking for foundry ID: ${foundryId}`);
      const response = await fetch(`/api/foundries/${foundryId}/thinking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          iterations: 1
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to trigger thinking: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`[UI] Autonomous thinking initiated:`, data);
      
      // We don't need to set thoughts here as they will come in via SSE
      // Instead, we'll refresh messages after a delay to show any new messages
      setTimeout(async () => {
        // Refresh messages to show any new thoughts that became messages
        const messagesResponse = await fetch(`/api/foundries/${foundryId}/messages`);
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          setMessages(messagesData.messages || []);
        }
        
        // Set thinking to false after a reasonable delay
        setThinking(false);
        
        // If autonomous mode is still on, trigger thinking again after a delay
        if (autonomousMode) {
          setTimeout(() => {
            if (autonomousMode) {
              triggerThinking();
            }
          }, 10000); // Wait 10 seconds before triggering again
        }
      }, 15000); // Wait 15 seconds for thinking to complete
      
    } catch (error) {
      console.error('[UI] Error triggering autonomous thinking:', error);
      setThinking(false);
      
      // If autonomous mode is still on, try again after a delay
      if (autonomousMode) {
        setTimeout(() => {
          if (autonomousMode) {
            triggerThinking();
          }
        }, 5000); // Wait 5 seconds before trying again
      }
    }
  };
  
  // Add effect to start/stop autonomous thinking when the toggle changes
  useEffect(() => {
    if (autonomousMode) {
      // Connect to SSE endpoint for real-time thinking updates
      connectToThinkingEvents();
      triggerThinking();
    } else {
      // Disconnect from SSE when autonomous mode is turned off
      if (eventSource) {
        console.log('[UI] Closing SSE connection');
        eventSource.close();
        setEventSource(null);
      }
      
      // Clear thoughts when turning off autonomous mode
      setThoughts([]);
    }
    
    return () => {
      // Clean up SSE connection when component unmounts
      if (eventSource) {
        console.log('[UI] Closing SSE connection on cleanup');
        eventSource.close();
      }
    };
  }, [autonomousMode]);
  
  // Add function to compile thinking results
  const compileThinkingResults = () => {
    if (thoughts.length === 0) return null;
    
    const keywordsThought = thoughts.find(t => t.step === 'keywords');
    const dreamThought = thoughts.find(t => t.step === 'dream');
    const daydreamingThought = thoughts.find(t => t.step === 'daydreaming');
    const initiativeThought = thoughts.find(t => t.step === 'initiative');
    
    // Create a comprehensive prompt from the thinking results
    let trackPrompt = "Create a track based on these thoughts:\n\n";
    
    if (keywordsThought && keywordsThought.content) {
      const keywords = keywordsThought.content.relevant_keywords || [];
      const emotions = keywordsThought.content.emotions || [];
      trackPrompt += `Keywords: ${keywords.join(', ')}\n`;
      trackPrompt += `Emotions: ${emotions.join(', ')}\n\n`;
    }
    
    if (dreamThought && dreamThought.content) {
      trackPrompt += `Dream: ${dreamThought.content}\n\n`;
    }
    
    if (daydreamingThought && daydreamingThought.content) {
      trackPrompt += `Daydreaming: ${daydreamingThought.content}\n\n`;
    }
    
    if (initiativeThought && initiativeThought.content) {
      trackPrompt += `Initiative: ${initiativeThought.content}\n\n`;
    }
    
    return trackPrompt;
  };

  // Add a function to create a track from thinking results
  const createTrackFromThinking = async (prompt: string) => {
    if (!prompt) return;
    
    console.log(`[UI] Creating track from autonomous thinking with prompt:`, prompt);
    
    // Change button text
    setCreateButtonText('Creating...');
    
    // Add a temporary loading generation immediately
    const tempId = `temp-${Date.now()}`;
    const tempTitle = "Generating from Thoughts...";
    setPendingGenerations(prev => [...prev, {
      id: tempId,
      taskId: 'pending',
      title: tempTitle,
      status: 'INITIALIZING',
      createdAt: new Date().toISOString()
    }]);
    
    // Reset button text after a short delay (1.5 seconds)
    setTimeout(() => {
      setCreateButtonText('Create Track');
    }, 1500);
    
    try {
      const trackResponse = await fetch(`/api/foundries/${foundryId}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: prompt,
          instrumental: instrumental,
          fromThinking: true
        }),
      });
      
      if (!trackResponse.ok) {
        console.error(`[UI] Error creating track from thinking:`, await trackResponse.text());
        
        // Remove the temporary loading generation
        setPendingGenerations(prev => prev.filter(gen => gen.id !== tempId));
        
        throw new Error('Failed to create track from thinking');
      }
      
      const trackData = await trackResponse.json();
      console.log(`[UI] Successfully created track from thinking:`, trackData);
      
      // If we have a task ID, start polling for status
      if (trackData.music_task_id) {
        console.log(`[UI] Starting to poll for task ID: ${trackData.music_task_id}`);
        // Extract title from the response if available
        const title = trackData.music_parameters?.title || 'Autonomous Track';
        
        // Remove the temporary loading generation
        setPendingGenerations(prev => prev.filter(gen => gen.id !== tempId));
        
        // Start the real polling with the actual task ID
        pollMusicGenerationStatus(trackData.music_task_id, title);
      } else {
        console.warn(`[UI] No music_task_id found in response, polling will not start`);
        
        // Keep the temporary loading generation but update its status
        setPendingGenerations(prev => prev.map(gen => 
          gen.id === tempId 
            ? { ...gen, status: 'ERROR', title: 'Failed to start generation' } 
            : gen
        ));
        
        // Remove it after a few seconds
        setTimeout(() => {
          setPendingGenerations(prev => prev.filter(gen => gen.id !== tempId));
        }, 5000);
      }
    } catch (trackError) {
      console.error('[UI] Error creating track from thinking:', trackError);
      
      // Remove the temporary loading generation
      setPendingGenerations(prev => prev.filter(gen => gen.id !== tempId));
      
      // Show error in the UI
      setPendingGenerations(prev => [...prev, {
        id: `error-${Date.now()}`,
        taskId: 'error',
        title: 'Error Creating from Thoughts',
        status: 'ERROR',
        createdAt: new Date().toISOString()
      }]);
      
      // Remove the error after a few seconds
      setTimeout(() => {
        setPendingGenerations(prev => prev.filter(gen => gen.taskId === 'error'));
      }, 5000);
    }
  };

  // Function to connect to the SSE endpoint
  const connectToThinkingEvents = () => {
    if (eventSource) {
      // Close existing connection
      eventSource.close();
    }
    
    console.log(`[UI] Connecting to thinking events for foundry ID: ${foundryId}`);
    const newEventSource = new EventSource(`/api/foundries/${foundryId}/thinking/events`);
    
    newEventSource.onopen = () => {
      console.log('[UI] SSE connection opened');
    };
    
    newEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[UI] Received thinking event:', data);
        
        // If this is just a connection message, ignore it
        if (data.type === 'connection') {
          console.log('[UI] Connected to thinking events');
          return;
        }
        
        // Add the new thinking step to our state
        if (data.step) {
          setThoughts(prev => {
            // Check if we already have this step
            const existingIndex = prev.findIndex(t => t.step === data.step);
            
            if (existingIndex >= 0) {
              // Replace the existing step
              const newThoughts = [...prev];
              newThoughts[existingIndex] = {
                step: data.step,
                content: data.content,
                timestamp: data.timestamp
              };
              return newThoughts;
            } else {
              // Add the new step
              const newThoughts = [...prev, {
                step: data.step,
                content: data.content,
                timestamp: data.timestamp
              }];
              
              // Check if we have all the required thinking steps
              const hasKeywords = newThoughts.some(t => t.step === 'keywords');
              const hasDream = newThoughts.some(t => t.step === 'dream');
              const hasDaydreaming = newThoughts.some(t => t.step === 'daydreaming');
              const hasInitiative = newThoughts.some(t => t.step === 'initiative');
              
              // If we have all the required steps, create a track
              if (hasKeywords && hasDream && hasDaydreaming && hasInitiative) {
                console.log('[UI] All thinking steps complete, creating track');
                
                // Wait a moment to ensure all data is processed
                setTimeout(() => {
                  const prompt = compileThinkingResults();
                  if (prompt) {
                    createTrackFromThinking(prompt);
                  }
                }, 1000);
              }
              
              return newThoughts;
            }
          });
        }
      } catch (error) {
        console.error('[UI] Error parsing SSE event:', error);
      }
    };
    
    newEventSource.onerror = (error) => {
      console.error('[UI] SSE connection error:', error);
      // Try to reconnect after a delay
      setTimeout(() => {
        if (autonomousMode) {
          connectToThinkingEvents();
        }
      }, 5000);
    };
    
    setEventSource(newEventSource);
  };
  
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
      
      if (trackMenuOpen && !(event.target as Element).closest('.track-menu')) {
        setTrackMenuOpen(null);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptions, trackMenuOpen]);
  
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
  const pollMusicGenerationStatus = async (taskId: string, title: string) => {
    console.log(`[UI] pollMusicGenerationStatus called with taskId: ${taskId}`);
    
    // Add this generation to the pending list
    const generationId = `gen-${Date.now()}`;
    setPendingGenerations(prev => [...prev, {
      id: generationId,
      taskId,
      title: title || 'New Track',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    }]);
    
    // Set up polling every 10 seconds
    const intervalId = setInterval(async () => {
      try {
        console.log(`[UI] Polling interval fired for task status: ${taskId}`);
        const response = await fetch(`/api/foundries/${foundryId}/tracks/status?taskId=${taskId}`);
        
        if (!response.ok) {
          console.error(`[UI] Error checking task status: ${response.status}`);
          return;
        }
        
        const data = await response.json();
        console.log(`[UI] Task status response:`, data);
        
        // Check for status in the correct location
        const status = data.data?.response?.status || data.data?.status;
        
        if (status) {
          // Update the status in our pending generations list
          setPendingGenerations(prev => prev.map(gen => 
            gen.taskId === taskId ? { ...gen, status } : gen
          ));
          
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
            
            // Remove this interval from our ref
            delete intervalsRef.current[taskId];
              
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
                
              // Set the first track as current if we don't have one yet
              if (!currentTrack) {
                console.log(`[UI] Setting current track to newest track: "${sortedTracks[0].name}"`);
                setCurrentTrack(sortedTracks[0]);
                setIsPlaying(true); // Auto-play the new track
              }
            }
            
            // Remove this generation from the pending list after a short delay
            setTimeout(() => {
              setPendingGenerations(prev => prev.filter(gen => gen.taskId !== taskId));
            }, 3000);
          } else if (status === 'CREATE_TASK_FAILED' || status === 'GENERATE_AUDIO_FAILED' || 
                    status === 'CALLBACK_EXCEPTION' || status === 'SENSITIVE_WORD_ERROR') {
            // If the task failed, stop polling
            console.error(`[UI] Music generation failed with status: ${status}`);
            clearInterval(intervalId);
            
            // Remove this interval from our ref
            delete intervalsRef.current[taskId];
            
            // Keep it in the list with the error status for a while, then remove
            setTimeout(() => {
              setPendingGenerations(prev => prev.filter(gen => gen.taskId !== taskId));
            }, 5000);
          }
        }
      } catch (error) {
        console.error('[UI] Error polling for task status:', error);
      }
    }, 10000); // Poll every 10 seconds
    
    // Store the interval ID in our ref
    intervalsRef.current[taskId] = intervalId;
  };

  // State for track generation (concept mode removed)
  const [createButtonText, setCreateButtonText] = useState('Create Track');
  
  const handleCreateTrack = async () => {
    if (!newMessage.trim()) return;
    
    console.log(`[UI] Creating track for foundry ID: ${foundryId}`);
    console.log(`[UI] Message content: ${newMessage}`);
    console.log(`[UI] Instrumental: ${instrumental}`);
    
    // Change button text
    setCreateButtonText('Creating...');
    
    // Store the message content before clearing it
    const messageContent = newMessage;
    setNewMessage('');
    
    // Add a temporary loading generation immediately
    const tempId = `temp-${Date.now()}`;
    const tempTitle = "Generating...";
    setPendingGenerations(prev => [...prev, {
      id: tempId,
      taskId: 'pending',
      title: tempTitle,
      status: 'INITIALIZING',
      createdAt: new Date().toISOString()
    }]);
    
    // Reset button text after a short delay (1.5 seconds)
    setTimeout(() => {
      setCreateButtonText('Create Track');
    }, 1500);
    
    try {
      console.log(`[UI] Sending POST request to /api/foundries/${foundryId}/tracks`);
      const response = await fetch(`/api/foundries/${foundryId}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageContent,
          instrumental: instrumental,
        }),
      });
      
      console.log(`[UI] Track creation response status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[UI] Error response:`, errorData);
        
        // Remove the temporary loading generation
        setPendingGenerations(prev => prev.filter(gen => gen.id !== tempId));
        
        throw new Error(errorData.error || 'Failed to create track');
      }
      
      const data = await response.json();
      console.log(`[UI] Track creation response:`, data);
      
      // Music generation response handling
      console.log(`[UI] Music generation initiated:`, data);
      console.log(`[UI] music_task_id:`, data.music_task_id);
      
      // If we have a task ID, start polling for status
      if (data.music_task_id) {
        console.log(`[UI] Starting to poll for task ID: ${data.music_task_id}`);
        // Extract title from the response if available
        const title = data.music_parameters?.title || 'New Track';
        
        // Remove the temporary loading generation
        setPendingGenerations(prev => prev.filter(gen => gen.id !== tempId));
        
        // Start the real polling with the actual task ID
        pollMusicGenerationStatus(data.music_task_id, title);
      } else {
        console.warn(`[UI] No music_task_id found in response, polling will not start`);
        
        // Keep the temporary loading generation but update its status
        setPendingGenerations(prev => prev.map(gen => 
          gen.id === tempId 
            ? { ...gen, status: 'ERROR', title: 'Failed to start generation' } 
            : gen
        ));
        
        // Remove it after a few seconds
        setTimeout(() => {
          setPendingGenerations(prev => prev.filter(gen => gen.id !== tempId));
        }, 5000);
      }
    } catch (err) {
      console.error('[UI] Error creating track:', err);
      
      // Remove the temporary loading generation
      setPendingGenerations(prev => prev.filter(gen => gen.id !== tempId));
      
      // Show error in the UI
      setPendingGenerations(prev => [...prev, {
        id: `error-${Date.now()}`,
        taskId: 'error',
        title: 'Error',
        status: 'ERROR',
        createdAt: new Date().toISOString()
      }]);
      
      // Remove the error after a few seconds
      setTimeout(() => {
        setPendingGenerations(prev => prev.filter(gen => gen.taskId === 'error'));
      }, 5000);
    }
  };
  
  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  };
  
  const handleDownloadTrack = async (track: Track) => {
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
  
  const toggleTrackExpansion = (trackId: string) => {
    setExpandedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
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
            ) : tracks.length === 0 && pendingGenerations.length === 0 ? (
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
            ) : pendingGenerations.length > 0 && !currentTrack ? (
              <div className="flex-1 flex flex-col">
                <div className="text-center mb-6">
                  <div className="w-48 h-48 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6 flex items-center justify-center animate-pulse">
                    <span className="text-4xl">🎵</span>
                  </div>
                  <p className="text-lg font-medium">Generating Music</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {pendingGenerations[0].title}
                  </p>
                  
                  <div className="mt-6">
                    <div className="space-y-4">
                      {pendingGenerations.map(gen => (
                        <div key={gen.id} className="bg-black/10 dark:bg-white/10 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{gen.title}</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {gen.status}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${
                                gen.status === 'SUCCESS' || gen.status === 'FIRST_SUCCESS' 
                                  ? 'bg-green-600 w-full' 
                                  : gen.status.includes('FAILED') || gen.status === 'ERROR'
                                    ? 'bg-red-600 w-full'
                                    : gen.status === 'INITIALIZING'
                                      ? 'bg-purple-600 animate-pulse w-1/4' // Show a shorter progress bar for initializing
                                      : 'bg-blue-600 animate-pulse w-full'
                              }`}
                            ></div>
                          </div>
                          <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">
                            {gen.status === 'INITIALIZING' && 'Preparing to generate music...'}
                            {gen.status === 'PENDING' && 'Music generation in progress... (this may take a few minutes)'}
                            {gen.status === 'TEXT_SUCCESS' && 'Lyrics generated, creating music...'}
                            {gen.status === 'FIRST_SUCCESS' && 'First track generated, creating variations...'}
                            {gen.status === 'SUCCESS' && 'Music generation complete!'}
                            {['CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION', 'SENSITIVE_WORD_ERROR', 'ERROR'].includes(gen.status) && 
                              `Music generation failed: ${gen.status}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto mb-4">
                  {/* Show pending generations at the top if any exist */}
                  {pendingGenerations.length > 0 && (
                    <div className="mb-6 space-y-4">
                      <h3 className="font-semibold">Generating Tracks</h3>
                      {pendingGenerations.map(gen => (
                        <div key={gen.id} className="bg-black/10 dark:bg-white/10 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{gen.title}</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {gen.status}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${
                                gen.status === 'SUCCESS' || gen.status === 'FIRST_SUCCESS' 
                                  ? 'bg-green-600 w-full' 
                                  : gen.status.includes('FAILED') || gen.status === 'ERROR'
                                    ? 'bg-red-600 w-full'
                                    : gen.status === 'INITIALIZING'
                                      ? 'bg-purple-600 animate-pulse w-1/4' // Show a shorter progress bar for initializing
                                      : 'bg-blue-600 animate-pulse w-full'
                              }`}
                            ></div>
                          </div>
                          <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">
                            {gen.status === 'INITIALIZING' && 'Preparing to generate music...'}
                            {gen.status === 'PENDING' && 'Music generation in progress... (this may take a few minutes)'}
                            {gen.status === 'TEXT_SUCCESS' && 'Lyrics generated, creating music...'}
                            {gen.status === 'FIRST_SUCCESS' && 'First track generated, creating variations...'}
                            {gen.status === 'SUCCESS' && 'Music generation complete!'}
                            {['CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION', 'SENSITIVE_WORD_ERROR', 'ERROR'].includes(gen.status) && 
                              `Music generation failed: ${gen.status}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  
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
                        className={`p-3 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 ${
                          currentTrack?.id === track.id ? 'bg-black/10 dark:bg-white/10' : ''
                        } relative`}
                      >
                        <div className="flex justify-between items-start">
                          <div 
                            className="flex-1 cursor-pointer" 
                            onClick={() => playTrack(track)}
                          >
                            <div className="font-medium">{track.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {new Date(track.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          
                          {/* Add expand/collapse button and track options menu */}
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTrackExpansion(track.id);
                              }}
                              className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                              aria-label={expandedTracks.has(track.id) ? "Collapse track details" : "Expand track details"}
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
                                className={`transition-transform ${expandedTracks.has(track.id) ? 'rotate-180' : ''}`}
                              >
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            </button>
                            
                            {/* Track options menu */}
                            <div className="relative">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTrackMenuOpen(trackMenuOpen === track.id ? null : track.id);
                                }}
                                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                                aria-label="Track options"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="1"></circle>
                                  <circle cx="12" cy="5" r="1"></circle>
                                  <circle cx="12" cy="19" r="1"></circle>
                                </svg>
                              </button>
                              
                              {trackMenuOpen === track.id && (
                                <div className="absolute right-0 mt-1 w-36 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10 track-menu">
                                  <div className="py-1" role="menu" aria-orientation="vertical">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadTrack(track);
                                        setTrackMenuOpen(null);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
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
                        
                        {/* Expanded track details */}
                        {expandedTracks.has(track.id) && (
                          <div 
                            className="mt-3 text-sm bg-black/5 dark:bg-white/5 p-3 rounded-lg"
                            onClick={(e) => e.stopPropagation()} // Prevent clicking here from playing the track
                          >
                            {track.prompt && (
                              <div className="mb-3">
                                <h4 className="font-medium mb-1">Prompt</h4>
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{track.prompt}</p>
                              </div>
                            )}
                            
                            {track.lyrics && track.lyrics !== track.prompt && (
                              <div>
                                <h4 className="font-medium mb-1">Lyrics</h4>
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{track.lyrics}</p>
                              </div>
                            )}
                          </div>
                        )}
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
                    
                    {/* Add the autonomous thinking toggle */}
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span>Create Autonomously</span>
                        <button 
                          onClick={() => setAutonomousMode(!autonomousMode)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full ${autonomousMode ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <span 
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${autonomousMode ? 'translate-x-6' : 'translate-x-1'}`} 
                          />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {autonomousMode ? 'AI will generate thoughts and music autonomously' : 'AI will respond to your messages'}
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
                {messages.map((message, index) => {
                  // Find any thoughts that might be related to this message
                  const messageThoughts = thinking && message.role === 'assistant' && index === messages.length - 1 
                    ? thoughts 
                    : [];
                    
                  return (
                    <div key={message.id || `message-${index}`}>
                      <div 
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
                      
                      {/* Display thoughts below the assistant's message */}
                      {message.role === 'assistant' && messageThoughts.length > 0 && (
                        <div className="ml-4 mr-12 mt-1 mb-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                          {messageThoughts.map((thought, i) => {
                            // Skip the kin_response step as it's already shown in the message
                            if (thought.step === 'kin_response') return null;
                            
                            return (
                              <div key={`thought-${i}`} className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                                <div className="font-medium mb-1">
                                  {thought.step === 'keywords' ? 'Keywords' : 
                                   thought.step === 'dream' ? 'Dream' : 
                                   thought.step === 'daydreaming' ? 'Daydreaming' : 
                                   thought.step === 'initiative' ? 'Initiative' : 
                                   thought.step.charAt(0).toUpperCase() + thought.step.slice(1)}
                                </div>
                                {thought.step === 'keywords' ? (
                                  <div>
                                    {thought.content.relevant_keywords && (
                                      <div><span className="font-medium">Keywords:</span> {thought.content.relevant_keywords.join(', ')}</div>
                                    )}
                                    {thought.content.emotions && (
                                      <div><span className="font-medium">Emotions:</span> {thought.content.emotions.join(', ')}</div>
                                    )}
                                  </div>
                                ) : (
                                  <div>{thought.content}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                
                {/* Show thinking indicator when in autonomous mode */}
                {autonomousMode && thinking && (
                  <div className="bg-black/10 dark:bg-white/20 p-3 rounded-lg mr-8">
                    <div className="font-medium mb-1 text-sm">
                      {foundry?.name || 'AI Musician'} is thinking...
                    </div>
                    <div className="flex space-x-1">
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                    </div>
                    
                    {/* Show the most recent thoughts as they arrive */}
                    {thoughts.length > 0 && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        <div className="font-medium">Latest thought:</div>
                        <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                          {thoughts[thoughts.length - 1].step === 'keywords' ? (
                            <div>
                              {thoughts[thoughts.length - 1].content.relevant_keywords && (
                                <div><span className="font-medium">Keywords:</span> {thoughts[thoughts.length - 1].content.relevant_keywords.join(', ')}</div>
                              )}
                              {thoughts[thoughts.length - 1].content.emotions && (
                                <div><span className="font-medium">Emotions:</span> {thoughts[thoughts.length - 1].content.emotions.join(', ')}</div>
                              )}
                            </div>
                          ) : (
                            <div>{typeof thoughts[thoughts.length - 1].content === 'string' 
                              ? thoughts[thoughts.length - 1].content 
                              : JSON.stringify(thoughts[thoughts.length - 1].content)}</div>
                          )}
                        </div>
                      </div>
                    )}
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
                disabled={sending}
              />
              <button
                type="submit"
                className="bg-foreground text-background px-4 py-2 rounded-none font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={sending || !newMessage.trim()}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
              <button
                type="button"
                onClick={handleCreateTrack}
                className="bg-purple-600 text-white px-4 py-2 rounded-r-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={sending || !newMessage.trim()}
              >
                {createButtonText}
              </button>
            </div>
            
            {/* Status indicators moved to the music player area */}
          </form>
        </div>
      </main>
    </div>
  );
}
