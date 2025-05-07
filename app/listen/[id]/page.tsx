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
