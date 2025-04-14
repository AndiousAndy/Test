'use client';

import { MATCH_STATUS } from '@/lib/matchStatus';
import Link from 'next/link';

interface MatchCardProps {
  id: string;
  status: string;
  scheduledFor: Date | string;
  player1: { username: string | null } | null;
  player2: { username: string | null } | null;
  entryFee: string;
  roundDurationMinutes: number;
  numberOfRounds: number;
}

export default function MatchCard({
  id,
  status,
  scheduledFor,
  player1,
  player2,
  entryFee,
  roundDurationMinutes,
  numberOfRounds,
}: MatchCardProps) {
  const isWaitingForOpponent = status === MATCH_STATUS.WAITING_OPPONENT;
  // Ensure we handle the date properly, whether it's a string or Date object
  const matchDate = scheduledFor instanceof Date ? scheduledFor : new Date(scheduledFor);
  const formattedDate = isNaN(matchDate.getTime()) 
    ? 'Date not set'
    : matchDate.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
  const player1Name = player1?.username ?? 'Anonymous';
  const player2Name = player2?.username ?? 'Waiting...';

  return (
    <Link href={`/matches/${id}`} className="match-card group">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <h3 className="text-xl font-bold group-hover:text-red-500 transition-colors">
            {isWaitingForOpponent ? 'Open Challenge' : 'Scheduled Match'}
          </h3>
          <p className="text-sm text-gray-400">
            Scheduled for {formattedDate}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-red-500">{entryFee} credits</p>
          <p className="text-sm text-gray-400">per player</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🎮</span>
            <span className="font-medium">{player1Name}</span>
          </div>
          <div className="text-sm text-gray-400">Host</div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🎮</span>
            <span className="font-medium">{player2Name}</span>
          </div>
          <div className="text-sm text-gray-400">Challenger</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between text-sm text-gray-400">
          <span>{numberOfRounds} {numberOfRounds === 1 ? 'round' : 'rounds'}</span>
          <span>{roundDurationMinutes} {roundDurationMinutes === 1 ? 'min' : 'mins'}/round</span>
          <span className="px-2 py-1 rounded bg-gray-700 text-gray-300">
            {status}
          </span>
        </div>
      </div>
    </Link>
  );
}
