import React from 'react';
import TrackItem from './TrackItem';

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

type TrackListProps = {
  tracks: Track[];
  currentTrack: Track | null;
  playTrack: (track: Track) => void;
  addReaction: (trackId: string, reaction: string) => void;
};

export default function TrackList({ tracks, currentTrack, playTrack, addReaction }: TrackListProps) {
  // Define the reaction types and their descriptions
  const reactionTypes = [
    { emoji: '⭐', description: 'Quality rating (general excellence)' },
    { emoji: '🎵', description: 'Melody focus (strong melodic elements)' },
    { emoji: '🥁', description: 'Rhythm focus (strong beat/percussion)' },
    { emoji: '🔊', description: 'Production quality (sound design/mixing)' },
    { emoji: '📝', description: 'Needs work/revision (constructive criticism)' },
    { emoji: '❓', description: 'Confusion/question (something doesn\'t work)' },
    { emoji: '💡', description: 'Innovative idea (creative or novel approach)' },
    { emoji: '🔁', description: 'Repetitive (could use more variation)' },
    { emoji: '🌟', description: 'Standout track (exceptional compared to others)' },
    { emoji: '📈', description: 'Showing improvement/growth (evolutionary progress)' },
    { emoji: '❌', description: 'Bad track/has errors' }
  ];
  
  return (
    <div>
      <h3 className="text-xl font-bold mb-4 flex items-center">
        Track List
        <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
          {tracks.length}
        </span>
      </h3>
      
      <div className="space-y-3">
        {tracks.map((track) => (
          <TrackItem
            key={track.id}
            track={track}
            isCurrentTrack={currentTrack?.id === track.id}
            onPlay={playTrack}
            onReaction={addReaction}
            reactionTypes={reactionTypes}
          />
        ))}
      </div>
    </div>
  );
}
