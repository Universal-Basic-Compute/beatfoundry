'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from './components/Header';
import MusicPlayer from './components/MusicPlayer';
import Chat from './components/Chat';
import { useFoundry, useTracks, useMessages, useThinking } from './hooks';

export default function ListenPage(): JSX.Element {
  const params = useParams();
  const foundryId = params.id as string;
  
  // State for options menu
  const [showOptions, setShowOptions] = useState(false);
  const [instrumental, setInstrumental] = useState(false);
  const [autonomousMode, setAutonomousMode] = useState(false);
  
  // Use custom hooks to manage data and state
  const { foundry, loading: loadingFoundry, error: foundryError } = useFoundry(foundryId);
  const { 
    tracks, 
    currentTrack, 
    setCurrentTrack,
    isPlaying, 
    setIsPlaying,
    pendingGenerations,
    createTrack,
    addReaction,
    loadingTracks 
  } = useTracks(foundryId);
  
  const {
    messages,
    newMessage,
    setNewMessage,
    sending,
    sendMessage,
    loading: loadingMessages,
    error: messagesError
  } = useMessages(foundryId);
  
  const {
    thinking,
    thoughts,
    triggerThinking,
    createTrackFromThinking
  } = useThinking(foundryId, instrumental, autonomousMode, createTrack);
  
  // Start/stop autonomous thinking when the toggle changes
  useEffect(() => {
    if (autonomousMode) {
      triggerThinking();
    }
  }, [autonomousMode, triggerThinking]);
  
  const error = foundryError || messagesError;
  
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
          iterations: 1,
          sync: false // Change to false to use async mode with webhooks
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
    
    // Find the initiative step
    const initiativeStep = thoughts.find(thought => thought.step === 'initiative');
    
    if (initiativeStep && initiativeStep.content) {
      console.log('[UI] Found initiative step, creating prompt');
      
      // Create a prompt from just the initiative
      const prompt = `Create a track based on this initiative:\n\n${
        typeof initiativeStep.content === 'string' 
          ? initiativeStep.content 
          : JSON.stringify(initiativeStep.content)
      }`;
      
      console.log('[UI] Created prompt from initiative:', prompt);
      return prompt;
    }
    
    console.log('[UI] No initiative step found in thoughts');
    return null;
  };

  // Create a debounced version of createTrackFromThinking
  const debouncedCreateTrack = useDebounce((prompt) => {
    if (prompt && prompt.trim() !== '') {
      createTrackFromThinking(prompt);
    }
  }, 2000);

  // Add a function to create a track from thinking results
  const createTrackFromThinking = async (prompt: string) => {
    if (!prompt || prompt.trim() === '') {
      console.error('[UI] Cannot create track: prompt is empty or invalid');
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
              debouncedCreateTrack(prompt);
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
  
  // Scroll to bottom when messages or thoughts change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thoughts]);
  
  // Add click outside handler for options menu and reaction popup
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showOptions && !(event.target as Element).closest('.options-menu')) {
        setShowOptions(false);
      }
      
      if (trackMenuOpen && !(event.target as Element).closest('.track-menu')) {
        setTrackMenuOpen(null);
      }
      
      if (showReactionPopup && !(event.target as Element).closest('.reaction-popup')) {
        setShowReactionPopup(null);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptions, trackMenuOpen, showReactionPopup]);
  
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
      <Header foundry={foundry} />
      
      <main className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full h-[calc(100vh-80px)]">
        {/* Left side - Music Player */}
        <MusicPlayer
          tracks={tracks}
          currentTrack={currentTrack}
          setCurrentTrack={setCurrentTrack}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          pendingGenerations={pendingGenerations}
          addReaction={addReaction}
          loading={loadingTracks}
        />
        
        {/* Right side - Chat */}
        <Chat
          foundry={foundry}
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          sending={sending}
          sendMessage={sendMessage}
          loading={loadingMessages}
          error={error}
          showOptions={showOptions}
          setShowOptions={setShowOptions}
          instrumental={instrumental}
          setInstrumental={setInstrumental}
          autonomousMode={autonomousMode}
          setAutonomousMode={setAutonomousMode}
          thinking={thinking}
          thoughts={thoughts}
          createTrack={createTrack}
          createTrackFromThinking={createTrackFromThinking}
        />
      </main>
    </div>
  );
}
