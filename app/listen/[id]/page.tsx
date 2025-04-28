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
      console.log(`[UI] Autonomous thinking response:`, data);
      
      // Check if we have steps in the response (sync mode)
      if (data.steps && Array.isArray(data.steps)) {
        // Update thoughts state with all steps
        setThoughts(data.steps.map(step => ({
          step: step.step,
          content: step.content,
          timestamp: new Date().toISOString()
        })));
        
        // Find the initiative step
        const initiativeStep = data.steps.find(step => step.step === 'initiative');
        
        if (initiativeStep && initiativeStep.content) {
          console.log('[UI] Found initiative step, creating track');
          
          // Create a prompt from just the initiative
          const prompt = `Create a track based on this initiative:\n\n${
            typeof initiativeStep.content === 'string' 
              ? initiativeStep.content 
              : JSON.stringify(initiativeStep.content)
          }`;
          
          console.log('[UI] Creating track with prompt:', prompt);
          createTrackFromThinking(prompt);
        } else {
          console.log('[UI] No initiative step found in response');
        }
      }
      
      // Refresh messages to show any new thoughts that became messages
      const messagesResponse = await fetch(`/api/foundries/${foundryId}/messages`);
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        setMessages(messagesData.messages || []);
      }
      
      // Set thinking to false after processing
      setTimeout(() => {
        setThinking(false);
        
        // If autonomous mode is still on, trigger thinking again after a delay
        if (autonomousMode) {
          setTimeout(() => {
            if (autonomousMode) {
              triggerThinking();
            }
          }, 10000); // Wait 10 seconds before triggering again
        }
      }, 3000);
      
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
      console.log('[UI] Autonomous mode enabled, connecting to thinking events');
      // Connect to SSE endpoint for real-time thinking updates
      connectToThinkingEvents();
      triggerThinking();
    } else {
      console.log('[UI] Autonomous mode disabled, disconnecting from thinking events');
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
    if (thoughts.length === 0) {
      console.log('[UI] No thoughts available to compile');
      return null;
    }
    
    console.log('[UI] Compiling thinking results from', thoughts.length, 'thoughts');
    console.log('[UI] Available thoughts:', thoughts.map(t => t.step).join(', '));
    
    // Create a comprehensive prompt from the thinking results
    let trackPrompt = "Create a track based on these thoughts:\n\n";
    let hasContent = false;
    
    // Include any available thoughts, don't require specific ones
    for (const thought of thoughts) {
      if (thought.step === 'keywords' && thought.content) {
        console.log('[UI] Adding keywords to prompt');
        const keywords = thought.content.relevant_keywords || [];
        const emotions = thought.content.emotions || [];
        if (keywords.length > 0) {
          trackPrompt += `Keywords: ${keywords.join(', ')}\n`;
          hasContent = true;
        }
        if (emotions.length > 0) {
          trackPrompt += `Emotions: ${emotions.join(', ')}\n`;
          hasContent = true;
        }
        trackPrompt += '\n';
      } else if (thought.step === 'dream' && thought.content) {
        console.log('[UI] Adding dream to prompt');
        trackPrompt += `Dream: ${thought.content}\n\n`;
        hasContent = true;
      } else if (thought.step === 'daydreaming' && thought.content) {
        console.log('[UI] Adding daydreaming to prompt');
        trackPrompt += `Daydreaming: ${thought.content}\n\n`;
        hasContent = true;
      } else if (thought.step === 'initiative' && thought.content) {
        console.log('[UI] Adding initiative to prompt');
        trackPrompt += `Initiative: ${thought.content}\n\n`;
        hasContent = true;
      }
    }
    
    if (!hasContent) {
      console.log('[UI] No content was added to the prompt');
      return null;
    }
    
    console.log('[UI] Compiled prompt:', trackPrompt);
    return trackPrompt;
  };

  // Add a function to create a track from thinking results
  const createTrackFromThinking = async (prompt: string) => {
    if (!prompt) {
      console.error('[UI] Cannot create track: prompt is empty');
      return;
    }
    
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
    
    console.log(`[UI] Added temporary generation with ID: ${tempId}`);
    
    // Reset button text after a short delay (1.5 seconds)
    setTimeout(() => {
      setCreateButtonText('Create Track');
    }, 1500);
    
    try {
      console.log(`[UI] Sending POST request to create track from thinking`);
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
      
      console.log(`[UI] Track creation response status: ${trackResponse.status}`);
      
      if (!trackResponse.ok) {
        const errorText = await trackResponse.text();
        console.error(`[UI] Error creating track from thinking:`, errorText);
        
        // Remove the temporary loading generation
        setPendingGenerations(prev => prev.filter(gen => gen.id !== tempId));
        
        throw new Error(`Failed to create track from thinking: ${trackResponse.status}`);
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
          console.log('[UI] Processing thinking step:', data.step);
          
          setThoughts(prev => {
            // Check if we already have this step
            const existingIndex = prev.findIndex(t => t.step === data.step);
            
            let newThoughts;
            if (existingIndex >= 0) {
              // Replace the existing step
              newThoughts = [...prev];
              newThoughts[existingIndex] = {
                step: data.step,
                content: data.content,
                timestamp: data.timestamp
              };
            } else {
              // Add the new step
              newThoughts = [...prev, {
                step: data.step,
                content: data.content,
                timestamp: data.timestamp
              }];
            }
            
            // Check if we have the initiative step
            const hasInitiative = newThoughts.some(t => t.step === 'initiative');
            
            console.log('[UI] Checking for initiative step:', hasInitiative);
            
            if (hasInitiative) {
              console.log('[UI] Initiative step received, creating track');
              
              // Wait a moment to ensure all data is processed
              setTimeout(() => {
                const prompt = compileThinkingResults();
                if (prompt) {
                  console.log('[UI] Created prompt from initiative, creating track');
                  createTrackFromThinking(prompt);
                } else {
                  console.error('[UI] Failed to create prompt from initiative');
                }
              }, 1000);
            } else {
              console.log('[UI] Waiting for initiative step');
            }
            
            return newThoughts;
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
      <header className="bg-background border-b border-border p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-foreground flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
            BeatFoundry
          </Link>
          {foundry && (
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-2">
                {foundry.name.charAt(0)}
              </div>
              <h1 className="text-xl font-semibold text-foreground">{foundry.name}</h1>
            </div>
          )}
        </div>
      </header>
      
      <main className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full">
        {/* Left side - Music Player */}
        <div className="w-full md:w-1/2 p-6 border-r">
          <div className="bg-gradient-to-br from-card to-card/80 text-card-foreground rounded-xl p-8 h-full flex flex-col shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-foreground">Music Player</h2>
            
            {loadingTracks ? (
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
                        <div key={gen.id} className="bg-card/50 dark:bg-card/30 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{gen.title}</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-foreground">
                              {gen.status}
                            </span>
                          </div>
                          <div className="w-full bg-muted dark:bg-muted/50 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${
                                gen.status === 'SUCCESS' || gen.status === 'FIRST_SUCCESS' 
                                  ? 'bg-success w-full' 
                                  : gen.status.includes('FAILED') || gen.status === 'ERROR'
                                    ? 'bg-destructive w-full'
                                    : gen.status === 'INITIALIZING'
                                      ? 'bg-primary animate-pulse w-1/4' // Show a shorter progress bar for initializing
                                      : 'bg-accent animate-pulse w-full'
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
                    <div className="relative w-48 h-48 mx-auto mb-8">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full"></div>
                      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-5xl">🎵</span>
                      </div>
                      {/* Add a spinning animation when playing */}
                      {isPlaying && (
                        <div className="absolute inset-0 border-4 border-primary/30 border-t-primary rounded-full animate-spin" style={{ animationDuration: '4s' }}></div>
                      )}
                    </div>
                    
                    {/* Improved Now Playing section */}
                    <div className="text-center mb-8">
                      <p className="text-sm uppercase tracking-wider text-muted-foreground mb-1">Now Playing</p>
                      <p className="text-xl font-bold text-foreground mb-1">{currentTrack?.name || 'Select a track'}</p>
                      <p className="text-sm text-muted-foreground">
                        {currentTrack ? new Date(currentTrack.createdAt).toLocaleDateString() : ''}
                      </p>
                    </div>
                    
                    <div className="mt-6">
                      {/* Improved progress bar */}
                      <div className="flex items-center space-x-3 mb-6">
                        <span className="text-xs font-medium">{formatTime(currentTime)}</span>
                        <div className="relative flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                          <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-accent rounded-full"
                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">{formatTime(duration)}</span>
                      </div>
                      
                      {/* Improved playback controls */}
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
                          {isPlaying ? (
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
                  </div>
                  
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    Track List
                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {tracks.length}
                    </span>
                  </h3>
                  
                  <div className="space-y-3">
                    {tracks.map((track, index) => (
                      <div 
                        key={track.id || `track-${index}`}
                        className={`p-4 rounded-xl transition-all ${
                          currentTrack?.id === track.id 
                            ? 'bg-primary/10 border-l-4 border-primary' 
                            : 'hover:bg-black/5 dark:hover:bg-white/5 border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div 
                            className="flex-1 cursor-pointer" 
                            onClick={() => playTrack(track)}
                          >
                            <div className="font-medium flex items-center">
                              {currentTrack?.id === track.id && (
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
                          
                          <div className="flex items-center space-x-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTrackExpansion(track.id);
                              }}
                              className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
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
                                className={`transition-transform duration-200 ${expandedTracks.has(track.id) ? 'rotate-180' : ''}`}
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
                                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
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
                        
                        {/* Expanded track details with animation */}
                        {expandedTracks.has(track.id) && (
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
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <h2 className="text-2xl font-bold text-foreground">Chat with {foundry?.name || 'AI Musician'}</h2>
              
              <div className="relative ml-2 group">
                <button 
                  className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold"
                  aria-label="Information"
                >
                  i
                </button>
                <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-card rounded-lg shadow-lg text-xs z-10 hidden group-hover:block border border-border">
                  <p className="mb-2 font-semibold">How to use:</p>
                  <p className="mb-2 text-muted-foreground">1. Use <strong>Send</strong> to chat with the AI and guide its artistic direction.</p>
                  <p className="text-muted-foreground">2. Use <strong>Create Track</strong> to generate music based on your prompt.</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setShowOptions(!showOptions)}
                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label="Options"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="19" cy="12" r="1"></circle>
                  <circle cx="5" cy="12" r="1"></circle>
                </svg>
              </button>
              
              {/* Improved options menu */}
              {showOptions && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg bg-card border border-border ring-1 ring-black ring-opacity-5 z-10 options-menu animate-fadeIn">
                  <div className="py-2" role="menu" aria-orientation="vertical">
                    <div className="px-4 py-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Instrumental Only</span>
                        <button 
                          onClick={() => setInstrumental(!instrumental)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${instrumental ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <span 
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${instrumental ? 'translate-x-6' : 'translate-x-1'}`} 
                          />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {instrumental ? 'Generate music without lyrics' : 'Generate music with lyrics'}
                      </p>
                    </div>
                    
                    <div className="px-4 py-3 text-sm border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Create Autonomously</span>
                        <button 
                          onClick={() => setAutonomousMode(!autonomousMode)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autonomousMode ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <span 
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${autonomousMode ? 'translate-x-6' : 'translate-x-1'}`} 
                          />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
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
          
          {/* Improved message container */}
          <div className="flex-1 overflow-y-auto mb-4 bg-black/5 dark:bg-white/5 rounded-xl p-4 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center">
                  <div className="relative w-12 h-12">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                  </div>
                  <p className="mt-4 text-muted-foreground">Loading conversation...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <p className="text-lg font-medium mb-2">No messages yet</p>
                  <p className="text-muted-foreground">
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
                    <div key={message.id || `message-${index}`} className="animate-fadeIn">
                      <div 
                        className={`p-4 rounded-xl ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground ml-12' 
                            : 'bg-muted dark:bg-muted/40 mr-12'
                        }`}
                      >
                        <div className="flex items-center mb-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                            message.role === 'user' 
                              ? 'bg-primary-foreground/20 text-primary-foreground' 
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {message.role === 'user' ? 'Y' : 'A'}
                          </div>
                          <div className="font-medium text-sm">
                            {message.role === 'user' ? 'You' : foundry?.name || 'AI Musician'}
                          </div>
                          <div className="text-xs opacity-70 ml-auto">
                            {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                        <div className={message.role === 'user' ? 'text-sm' : 'prose dark:prose-invert prose-sm max-w-none text-sm'}>
                          {message.role === 'user' ? (
                            <div>{message.content}</div>
                          ) : (
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          )}
                        </div>
                      </div>
                      
                      {/* Improved thoughts display */}
                      {message.role === 'assistant' && thoughts.length > 0 && index === messages.length - 1 && (
                        <div className="ml-8 mr-12 mt-2 mb-4 text-xs space-y-2 animate-fadeIn">
                          <div className="text-muted-foreground font-medium uppercase tracking-wider text-[10px] ml-2">
                            AI Thoughts
                          </div>
                          {thoughts.map((thought, i) => {
                            if (thought.step === 'kin_response') return null;
                            
                            return (
                              <div key={`thought-${i}`} className="bg-muted/50 dark:bg-muted/20 p-3 rounded-lg border-l-2 border-primary/50">
                                <div className="font-medium mb-1 text-primary/80">
                                  {thought.step === 'keywords' ? 'Keywords' : 
                                   thought.step === 'dream' ? 'Dream' : 
                                   thought.step === 'daydreaming' ? 'Daydreaming' : 
                                   thought.step === 'initiative' ? 'Initiative' : 
                                   thought.step.charAt(0).toUpperCase() + thought.step.slice(1)}
                                </div>
                                {thought.step === 'keywords' ? (
                                  <div>
                                    {thought.content.relevant_keywords && (
                                      <div className="mb-1"><span className="font-medium text-muted-foreground">Keywords:</span> {thought.content.relevant_keywords.join(', ')}</div>
                                    )}
                                    {thought.content.emotions && (
                                      <div><span className="font-medium text-muted-foreground">Emotions:</span> {thought.content.emotions.join(', ')}</div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-foreground">{typeof thought.content === 'string' 
                                    ? thought.content 
                                    : JSON.stringify(thought.content)}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Improved typing indicator */}
                {sending && (
                  <div className="bg-muted dark:bg-muted/40 p-4 rounded-xl mr-12 animate-fadeIn">
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-2">
                        A
                      </div>
                      <div className="font-medium text-sm">
                        {foundry?.name || 'AI Musician'}
                      </div>
                    </div>
                    <div className="flex space-x-2 items-center h-6 pl-2">
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                )}
                
                {/* Improved thinking indicator */}
                {autonomousMode && thinking && (
                  <div className="bg-muted dark:bg-muted/40 p-4 rounded-xl mr-12 animate-fadeIn">
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-2">
                        A
                      </div>
                      <div className="font-medium text-sm">
                        {foundry?.name || 'AI Musician'} is thinking...
                      </div>
                    </div>
                    <div className="flex space-x-2 items-center h-6 pl-2">
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    
                    {/* Show the most recent thought */}
                    {thoughts.length > 0 && (
                      <div className="mt-3 text-xs bg-black/5 dark:bg-white/5 p-3 rounded-lg animate-fadeIn">
                        <div className="font-medium mb-1 text-primary/80">
                          Latest thought: {thoughts[thoughts.length - 1].step === 'keywords' ? 'Keywords' : 
                           thoughts[thoughts.length - 1].step === 'dream' ? 'Dream' : 
                           thoughts[thoughts.length - 1].step === 'daydreaming' ? 'Daydreaming' : 
                           thoughts[thoughts.length - 1].step === 'initiative' ? 'Initiative' : 
                           thoughts[thoughts.length - 1].step.charAt(0).toUpperCase() + thoughts[thoughts.length - 1].step.slice(1)}
                        </div>
                        {thoughts[thoughts.length - 1].step === 'keywords' ? (
                          <div>
                            {thoughts[thoughts.length - 1].content.relevant_keywords && (
                              <div><span className="font-medium text-muted-foreground">Keywords:</span> {thoughts[thoughts.length - 1].content.relevant_keywords.join(', ')}</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-foreground line-clamp-2">{typeof thoughts[thoughts.length - 1].content === 'string' 
                            ? thoughts[thoughts.length - 1].content 
                            : JSON.stringify(thoughts[thoughts.length - 1].content)}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          {/* Improved message input */}
          <form onSubmit={handleSendMessage} className="flex flex-col">
            <div className="flex rounded-xl overflow-hidden border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/50 transition-all">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-4 bg-background text-foreground focus:outline-none"
                disabled={sending}
              />
              <button
                type="submit"
                className="bg-foreground text-background px-5 py-4 font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
                disabled={sending || !newMessage.trim()}
              >
                <span className="mr-2">Send</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
              <button
                type="button"
                onClick={handleCreateTrack}
                className="bg-primary text-primary-foreground px-5 py-4 font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
                disabled={sending || !newMessage.trim()}
              >
                <span className="mr-2">{createButtonText}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"></path>
                  <circle cx="6" cy="18" r="3"></circle>
                  <circle cx="18" cy="16" r="3"></circle>
                </svg>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
