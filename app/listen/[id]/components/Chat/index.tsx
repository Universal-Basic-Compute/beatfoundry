import React, { useRef, useEffect, useState } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import OptionsMenu from '../OptionsMenu';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

type Thought = {
  step: string;
  content: any;
  timestamp?: string;
};

type ChatProps = {
  foundry: {
    name: string;
  } | null;
  messages: Message[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  sending: boolean;
  sendMessage: (message: string) => void;
  loading: boolean;
  error: string | null;
  showOptions: boolean;
  setShowOptions: (show: boolean) => void;
  instrumental: boolean;
  setInstrumental: (instrumental: boolean) => void;
  autonomousMode: boolean;
  setAutonomousMode: (autonomous: boolean) => void;
  thinking: boolean;
  thoughts: Thought[];
  createTrack: (message: string, instrumental: boolean) => void;
  createTrackFromThinking: (prompt: string) => void;
};

export default function Chat({
  foundry,
  messages,
  newMessage,
  setNewMessage,
  sending,
  sendMessage,
  loading,
  error,
  showOptions,
  setShowOptions,
  instrumental,
  setInstrumental,
  autonomousMode,
  setAutonomousMode,
  thinking,
  thoughts,
  createTrack,
  createTrackFromThinking
}: ChatProps) {
  const [showModelNotification, setShowModelNotification] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages or thoughts change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thoughts]);
  
  console.log('Chat component rendering with messages:', messages);
  console.log('Chat component rendering with thoughts:', thoughts);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    // Call the sendMessage function from props
    sendMessage(newMessage);
  };
  
  const handleCreateTrack = () => {
    if (!newMessage.trim()) return;
    createTrack(newMessage, instrumental);
  };
  
  return (
    <div className="w-full md:w-1/2 flex flex-col h-[calc(100vh-80px)] bg-background">
      {/* En-tête du chat */}
      <div className="flex justify-between items-center p-6">
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
            className="p-2 rounded-full bg-background hover:bg-muted transition-colors"
            aria-label="Options"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </button>
          
          {/* Options menu */}
          {showOptions && (
            <OptionsMenu 
              instrumental={instrumental}
              setInstrumental={setInstrumental}
              autonomousMode={autonomousMode}
              setAutonomousMode={setAutonomousMode}
            />
          )}
        </div>
      </div>
      
      {showModelNotification && (
        <div className="bg-primary/10 border-l-4 border-primary p-4 mx-6 mb-4 rounded-r-lg animate-fadeIn">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-primary">New Suno V4_5 Model Available!</h3>
              <p className="text-sm mt-1">
                <strong>For tracks with lyrics:</strong> Your prompt will be used as the exact lyrics to be sung (up to 5000 characters).
              </p>
              <p className="text-sm mt-1">
                <strong>For all tracks:</strong> The style description can be up to 1000 characters, describing the musical style, sonorities, and emotions.
              </p>
            </div>
            <button 
              onClick={() => setShowModelNotification(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-3 mx-6 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {/* Corps du chat - utilise flex-1 pour prendre tout l'espace disponible */}
      <div className="flex-1 overflow-y-auto bg-black/5 dark:bg-white/5 rounded-xl p-4 mx-6 custom-scrollbar mb-20">
        <MessageList 
          messages={messages} 
          loading={loading} 
          sending={sending} 
          foundry={foundry} 
          thoughts={thoughts}
          thinking={thinking}
        />
        <div ref={messagesEndRef} />
      </div>
      
      {/* Zone de saisie de message - position fixe en bas */}
      <div className="p-6 pt-0 mt-auto">
        <MessageInput 
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          handleCreateTrack={handleCreateTrack}
          sending={sending}
          instrumental={instrumental}
        />
      </div>
    </div>
  );
}
