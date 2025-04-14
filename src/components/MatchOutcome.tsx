'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface MatchOutcomeProps {
  matchId: string;
  status: string;
  scheduledFor: Date;
  player1Id: string;
  player2Id: string;
  player1Outcome?: string | null;
  player2Outcome?: string | null;
  onOutcomeSubmitted?: () => void;
}

export default function MatchOutcome({
  matchId,
  status,
  scheduledFor,
  player1Id,
  player2Id,
  player1Outcome,
  player2Outcome,
  onOutcomeSubmitted
}: MatchOutcomeProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!session?.user?.id) return null;

  const isParticipant = session.user.id === player1Id || session.user.id === player2Id;
  const isPlayer1 = session.user.id === player1Id;
  const myOutcome = isPlayer1 ? player1Outcome : player2Outcome;
  const opponentOutcome = isPlayer1 ? player2Outcome : player1Outcome;

  if (!isParticipant) return null;
  
  const canSubmit = (status === 'IN_PROGRESS' || status === 'WAITING_START') && 
                   new Date() >= new Date(scheduledFor) && 
                   !myOutcome;

  const handleOutcomeSubmit = async (outcome: 'WIN' | 'LOSS') => {
    try {
      setIsSubmitting(true);
      setError('');

      const res = await fetch(`/api/matches/${matchId}/outcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outcome }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to submit outcome');
      }

      if (onOutcomeSubmitted) {
        onOutcomeSubmitted();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit outcome');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'COMPLETED') {
    return (
      <div className="mt-4 p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
        <p className="text-green-400">Match completed!</p>
      </div>
    );
  }

  if (status === 'DISPUTED') {
    return (
      <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
        <p className="text-yellow-400">Match disputed - outcomes did not match</p>
      </div>
    );
  }

  if (myOutcome) {
    return (
      <div className="mt-4 p-4 bg-gray-500/10 border border-gray-500/50 rounded-lg">
        <p className="text-gray-400">
          You submitted: {myOutcome}
          {opponentOutcome 
            ? ` | Opponent submitted: ${opponentOutcome}`
            : ' | Waiting for opponent...'}
        </p>
      </div>
    );
  }

  if (!canSubmit) {
    return (
      <div className="mt-4 p-4 bg-gray-500/10 border border-gray-500/50 rounded-lg">
        <p className="text-gray-400">
          {new Date() < new Date(scheduledFor)
            ? 'Match outcome submission will be available after the scheduled time'
            : 'Match outcome submission is not available'}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold text-gray-200 mb-2">Submit Match Outcome</h3>
      
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => handleOutcomeSubmit('WIN')}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white rounded-lg transition-colors"
        >
          I Won
        </button>
        <button
          onClick={() => handleOutcomeSubmit('LOSS')}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-lg transition-colors"
        >
          I Lost
        </button>
      </div>
    </div>
  );
}
