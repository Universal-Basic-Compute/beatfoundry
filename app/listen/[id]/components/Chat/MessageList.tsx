import React, { useRef, useEffect } from 'react';
import MessageItem from './MessageItem';
import ThinkingIndicator from './ThinkingIndicator';

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

type MessageListProps = {
  messages: Message[];
  loading: boolean;
  sending: boolean;
  foundry: {
    name: string;
  } | null;
  thoughts: Thought[];
  thinking: boolean;
};

export default function MessageList({ 
  messages, 
  loading, 
  sending, 
  foundry, 
  thoughts,
  thinking 
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use useEffect to access the DOM safely on the client side
  useEffect(() => {
    if (containerRef.current) {
      console.log('MessageList component dimensions:', containerRef.current.getBoundingClientRect());
    }
  }, [messages]); // Log dimensions when messages change
  
  console.log('MessageList rendering with messages:', messages);
  console.log('MessageList rendering with thoughts:', thoughts);
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center">
          <div className="relative w-12 h-12">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }
  
  if (messages.length === 0) {
    return (
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
    );
  }
  
  return (
    <div className="space-y-4 message-list-container border border-green-500" ref={containerRef}>
      {messages && messages.map((message, index) => (
        <MessageItem 
          key={message.id || `message-${index}`}
          message={message}
          foundry={foundry}
          thoughts={thoughts || []}
          isLatestAssistantMessage={message.role === 'assistant' && index === messages.length - 1}
        />
      ))}
      
      {/* Typing indicator */}
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
      
      {/* Thinking indicator */}
      {thinking && <ThinkingIndicator foundry={foundry} thoughts={thoughts} />}
    </div>
  );
}
