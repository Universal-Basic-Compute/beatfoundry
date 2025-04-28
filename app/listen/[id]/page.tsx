'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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

export default function ListenPage() {
  const params = useParams();
  const foundryId = params.id as string;
  
  const [foundry, setFoundry] = useState<Foundry | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
      setMessages(prev => [...prev, {
        id: data.id || `response-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        timestamp: data.timestamp || new Date().toISOString(),
      }]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
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
        {/* Left side - Music Player (placeholder) */}
        <div className="w-full md:w-1/2 p-6 border-r">
          <div className="bg-black/5 dark:bg-white/10 rounded-lg p-6 h-full flex flex-col">
            <h2 className="text-2xl font-semibold mb-4">Music Player</h2>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-48 h-48 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <span className="text-4xl">🎵</span>
                </div>
                <p className="text-lg font-medium">Now Playing</p>
                <p className="text-gray-600 dark:text-gray-400">
                  {foundry ? foundry.name : 'Loading...'}
                </p>
                <div className="mt-6 flex justify-center space-x-4">
                  <button className="p-3 rounded-full bg-foreground text-background">
                    <span>⏮️</span>
                  </button>
                  <button className="p-3 rounded-full bg-foreground text-background">
                    <span>▶️</span>
                  </button>
                  <button className="p-3 rounded-full bg-foreground text-background">
                    <span>⏭️</span>
                  </button>
                </div>
              </div>
            </div>
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
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-foreground text-background ml-8' 
                        : 'bg-black/10 dark:bg-white/20 mr-8'
                    }`}
                  >
                    <div className="font-medium mb-1">
                      {message.role === 'user' ? 'You' : foundry?.name || 'AI Musician'}
                    </div>
                    <div>{message.content}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          <form onSubmit={handleSendMessage} className="flex">
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
              className="bg-foreground text-background px-4 py-2 rounded-r-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              disabled={sending || !newMessage.trim()}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
