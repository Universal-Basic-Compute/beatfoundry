import React from 'react';
import ReactMarkdown from 'react-markdown';

type Thought = {
  step: string;
  content: any;
  timestamp?: string;
};

type MessageProps = {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  };
  foundry: {
    name: string;
  } | null;
  thoughts: Thought[];
  isLatestAssistantMessage: boolean;
};

export default function MessageItem({ message, foundry, thoughts, isLatestAssistantMessage }: MessageProps) {
  // Find any thoughts that might be related to this message
  const messageThoughts = isLatestAssistantMessage ? thoughts : [];
  
  console.log('MessageItem rendering message:', message);
  console.log('MessageItem isLatestAssistantMessage:', isLatestAssistantMessage);
  console.log('MessageItem thoughts available:', thoughts?.length || 0);
  
  return (
    <div className="animate-fadeIn">
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
      
      {/* Thoughts display */}
      {message.role === 'assistant' && messageThoughts.length > 0 && (
        <div className="ml-8 mr-12 mt-2 mb-4 text-xs space-y-2 animate-fadeIn">
          <div className="text-muted-foreground font-medium uppercase tracking-wider text-[10px] ml-2">
            AI Thoughts
          </div>
          {messageThoughts.map((thought, i) => {
            if (thought.step === 'kin_response') return null;
            
            return (
              <div key={`thought-${i}`} className="bg-muted/50 dark:bg-muted/20 p-3 rounded-lg border-l-2 border-primary/50">
                <div className="font-medium mb-1 text-primary/80">
                  {thought.step === 'keywords' ? 'Keywords' : 
                   thought.step === 'dream' ? 'Dream' : 
                   thought.step === 'daydreaming' ? 'Daydreaming' : 
                   thought.step === 'initiative' ? 'Initiative' : 
                   ((step: string) => step.charAt(0).toUpperCase() + step.slice(1))(thought.step)}
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
}
