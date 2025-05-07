import React from 'react';

type PendingGeneration = {
  id: string;
  taskId: string;
  title: string;
  status: string;
  createdAt: string;
};

type PendingGenerationsProps = {
  pendingGenerations: PendingGeneration[];
};

export default function PendingGenerations({ pendingGenerations }: PendingGenerationsProps) {
  if (pendingGenerations.length === 0) return null;
  
  return (
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
  );
}
