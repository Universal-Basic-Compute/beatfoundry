import { useState, useEffect, useRef, useCallback } from 'react';

// Types
type Foundry = {
  id: string;
  name: string;
  description: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
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
  reactions?: Record<string, number>;
};

type PendingGeneration = {
  id: string;
  taskId: string;
  title: string;
  status: string;
  createdAt: string;
};

type Thought = {
  step: string;
  content: any;
  timestamp?: string;
};

// Hook for foundry data
export function useFoundry(foundryId: string) {
  const [foundry, setFoundry] = useState<Foundry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
  
  return { foundry, loading, error };
}

// Hook for tracks data and management
export function useTracks(foundryId: string) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [pendingGenerations, setPendingGenerations] = useState<PendingGeneration[]>([]);
  
  // Reference to store all polling intervals
  const intervalsRef = useRef<{[key: string]: NodeJS.Timeout}>({});
  
  // Fetch tracks
  useEffect(() => {
    const fetchTracks = async () => {
      try {
        setLoadingTracks(true);
        const response = await fetch(`/api/foundries/${foundryId}/tracks`);
        if (!response.ok) throw new Error('Failed to fetch tracks');
        const data = await response.json();
        
        // Store the current track ID, URL, and playback state before updating
        const currentTrackId = currentTrack?.id;
        const currentTrackUrl = currentTrack?.url;
        
        // Update tracks list without changing the current track
        setTracks(data);
        
        // If we had a current track, find and restore it in the new tracks list
        if (currentTrackId) {
          const updatedCurrentTrack = data.find((track: Track) => track.id === currentTrackId);
          if (updatedCurrentTrack) {
            // Only update the current track reference if necessary
            if (updatedCurrentTrack.url !== currentTrackUrl) {
              console.log(`[UI] Updating current track with new URL: ${updatedCurrentTrack.url}`);
              setCurrentTrack(updatedCurrentTrack);
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
    
    return () => {
      // Clear all polling intervals
      Object.values(intervalsRef.current).forEach(interval => {
        clearInterval(interval);
      });
    };
  }, [foundryId, currentTrack]);
  
  // Function to add a reaction to a track
  const addReaction = async (trackId: string, reaction: string) => {
    try {
      const response = await fetch(`/api/foundries/${foundryId}/tracks/${trackId}/reactions`, {
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
      
      // Update the track in the local state
      setTracks(prevTracks => 
        prevTracks.map(track => 
          track.id === trackId 
            ? { ...track, reactions: updatedReactions } 
            : track
        )
      );
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };
  
  // Function to create a new track
  const createTrack = async (message: string, instrumental: boolean) => {
    if (!message.trim()) return;
    
    console.log(`[UI] Creating track for foundry ID: ${foundryId}`);
    console.log(`[UI] Message content: ${message}`);
    console.log(`[UI] Instrumental: ${instrumental}`);
    
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
    
    try {
      console.log(`[UI] Sending POST request to /api/foundries/${foundryId}/tracks`);
      const response = await fetch(`/api/foundries/${foundryId}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
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
  
  // Add polling function for music generation status
  const pollMusicGenerationStatus = (taskId: string, title: string) => {
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
  
  return { 
    tracks, 
    currentTrack, 
    setCurrentTrack, 
    isPlaying, 
    setIsPlaying, 
    pendingGenerations, 
    createTrack, 
    addReaction, 
    loadingTracks 
  };
}

// Hook for messages
export function useMessages(foundryId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
  
  // Send a message
  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    // Optimistically add user message to the UI
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: content,
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
          content: content,
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
  
  return {
    messages,
    newMessage,
    setNewMessage,
    sending,
    sendMessage,
    loading,
    error
  };
}

// Hook for thinking functionality
export function useThinking(
  foundryId: string, 
  instrumental: boolean, 
  autonomousMode: boolean, 
  createTrack: (message: string, instrumental: boolean) => void
) {
  const [thinking, setThinking] = useState(false);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const lastInitiativeRef = useRef<string | null>(null);
  
  // Function to trigger autonomous thinking
  const triggerThinking = useCallback(async () => {
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
          iterations: 1,
          sync: false // Use async mode with webhooks
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to trigger thinking: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`[UI] Autonomous thinking response:`, data);
      
      // We don't need to process steps here anymore since we'll get them via SSE
      // Just set up the connection to the thinking events if not already connected
      if (!eventSource) {
        connectToThinkingEvents();
      }
      
      // Set thinking to false after a delay
      setTimeout(() => {
        setThinking(false);
        
        // If autonomous mode is still on, trigger thinking again after a longer delay (two minutes)
        if (autonomousMode) {
          setTimeout(() => {
            if (autonomousMode) {
              triggerThinking();
            }
          }, 120000); // Wait 120 seconds (two minutes) before triggering again
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
        }, 120000); // Wait 120 seconds (two minutes) before trying again
      }
    }
  }, [foundryId, thinking, autonomousMode, eventSource]);
  
  // Function to connect to the SSE endpoint
  const connectToThinkingEvents = useCallback(() => {
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
            
            // Check if this is the initiative step
            if (data.step === 'initiative') {
              console.log('[UI] Initiative step received, checking content');
              
              // Validate the initiative content
              if (!data.content) {
                console.log('[UI] Initiative has null content, skipping track creation');
                return newThoughts;
              }
              
              // Create a string representation of the content for comparison
              const contentString = typeof data.content === 'string' 
                ? data.content 
                : JSON.stringify(data.content);
              
              // Check if this is a duplicate initiative
              if (lastInitiativeRef.current === contentString) {
                console.log('[UI] Duplicate initiative detected, skipping track creation');
                return newThoughts;
              }
              
              // Store this initiative as the last one we've seen
              lastInitiativeRef.current = contentString;
              
              // Create a prompt from the initiative
              const initiativeContent = typeof data.content === 'string' 
                ? data.content 
                : JSON.stringify(data.content);
                
              const prompt = `Create a track based on this initiative:\n\n${initiativeContent}`;
              
              console.log('[UI] Created prompt from initiative:', prompt);
              
              // Use the debounced function to create the track
              // We'll implement this in the createTrackFromThinking function
              setTimeout(() => {
                createTrackFromThinking(prompt);
              }, 2000);
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
  }, [foundryId, autonomousMode]);
  
  // Connect/disconnect from thinking events when autonomousMode changes
  useEffect(() => {
    if (autonomousMode) {
      console.log('[UI] Autonomous mode enabled, connecting to thinking events');
      connectToThinkingEvents();
      triggerThinking();
    } else {
      console.log('[UI] Autonomous mode disabled, disconnecting from thinking events');
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
  }, [autonomousMode, connectToThinkingEvents, triggerThinking, eventSource]);
  
  // Function to create a track from thinking results
  const createTrackFromThinking = (prompt: string) => {
    if (!prompt || prompt.trim() === '') {
      console.error('[UI] Cannot create track: prompt is empty or invalid');
      return;
    }
    
    console.log(`[UI] Creating track from autonomous thinking with prompt:`, prompt);
    
    // Call the createTrack function passed from props
    createTrack(prompt, instrumental);
  };
  
  return {
    thinking,
    thoughts,
    triggerThinking,
    createTrackFromThinking
  };
}
