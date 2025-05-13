import React, { useState } from 'react';

type MessageInputProps = {
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  handleCreateTrack: () => void;
  sending: boolean;
  instrumental: boolean;
};

export default function MessageInput({ 
  newMessage, 
  setNewMessage, 
  handleSendMessage, 
  handleCreateTrack, 
  sending,
  instrumental
}: MessageInputProps) {
  const [createButtonText, setCreateButtonText] = useState('Create Track');
  
  const onCreateTrack = () => {
    setCreateButtonText('Creating...');
    handleCreateTrack();
    
    // Reset button text after a short delay
    setTimeout(() => {
      setCreateButtonText('Create Track');
    }, 1500);
  };
  
  return (
    <div className="w-full">
      <form onSubmit={handleSendMessage} className="flex flex-col">
        <div className="flex rounded-xl overflow-hidden border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/50 transition-all bg-background">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={instrumental 
              ? "Describe the music style, mood, and instrumentation..." 
              : "Enter lyrics for the track (these will be sung exactly as written)..."}
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
            onClick={onCreateTrack}
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
  );
}
