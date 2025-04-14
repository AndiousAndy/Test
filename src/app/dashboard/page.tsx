'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch('/api/matches');
        if (!res.ok) throw new Error('Failed to fetch matches');
        const data = await res.json();
        setMatches(data);
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchMatches();
    }
  }, [status]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const stats = {
    totalMatches: matches.length,
    wins: matches.filter(m => m.winner === session?.user?.id).length,
    totalEarnings: matches
      .filter(m => m.winner === session?.user?.id)
      .reduce((sum, match) => sum + match.prizePool, 0),
    upcomingMatches: matches.filter(m => m.status === 'OPEN' || m.status === 'IN_PROGRESS').length
  };

  // Sort matches by date
  const recentMatches = [...matches]
    .sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime())
    .slice(0, 5);

  const upcomingMatches = matches
    .filter(m => m.status === 'OPEN' || m.status === 'IN_PROGRESS')
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Fighter Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Welcome back, {session?.user?.username}!
          </p>
        </div>
        <Link 
          href="/matches/create" 
          className="btn-primary"
        >
          Create New Match
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background-start/50 backdrop-blur-md p-6 rounded-lg border border-gray-800">
          <div className="text-sm text-gray-400">Total Matches</div>
          <div className="text-2xl font-bold mt-1">{stats.totalMatches}</div>
        </div>
        <div className="bg-background-start/50 backdrop-blur-md p-6 rounded-lg border border-gray-800">
          <div className="text-sm text-gray-400">Wins</div>
          <div className="text-2xl font-bold mt-1">{stats.wins}</div>
        </div>
        <div className="bg-background-start/50 backdrop-blur-md p-6 rounded-lg border border-gray-800">
          <div className="text-sm text-gray-400">Win Rate</div>
          <div className="text-2xl font-bold mt-1">
            {stats.totalMatches > 0 ? ((stats.wins / stats.totalMatches) * 100).toFixed(1) : '0'}%
          </div>
        </div>
        <div className="bg-background-start/50 backdrop-blur-md p-6 rounded-lg border border-gray-800">
          <div className="text-sm text-gray-400">Total Earnings</div>
          <div className="text-2xl font-bold mt-1">{stats.totalEarnings} Credits</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background-start/50 backdrop-blur-md p-6 rounded-lg border border-gray-800">
          <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Recent Matches
          </h2>
          <div className="space-y-4">
            {recentMatches.map((match) => (
              <Link 
                key={match.id}
                href={`/matches/${match.id}`}
                className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-gray-800 hover:bg-white/10 transition-colors"
              >
                <div>
                  <div className="font-medium">
                    vs {match.player1.username === session?.user?.username 
                      ? match.player2?.username || 'Open Slot'
                      : match.player1.username}
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(match.scheduledFor).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`text-sm px-2 py-1 rounded ${
                    match.winner === session?.user?.id
                      ? 'bg-green-500/10 text-green-400 border border-green-500/50' 
                      : match.winner 
                        ? 'bg-red-500/10 text-red-400 border border-red-500/50'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/50'
                  }`}>
                    {match.winner === session?.user?.id 
                      ? 'WIN'
                      : match.winner
                        ? 'LOSS'
                        : match.status}
                  </span>
                  <span className="text-sm font-medium">
                    {match.winner === session?.user?.id ? `+${match.prizePool} Credits` : '-'}
                  </span>
                </div>
              </Link>
            ))}
            {recentMatches.length === 0 && (
              <div className="text-center text-gray-400 py-4">
                No matches found
              </div>
            )}
          </div>
        </div>

        <div className="bg-background-start/50 backdrop-blur-md p-6 rounded-lg border border-gray-800">
          <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Upcoming Matches
          </h2>
          <div className="space-y-4">
            {upcomingMatches.map((match) => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="block p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-gray-800 hover:bg-white/10 transition-colors"
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium">
                    vs {match.player1.username === session?.user?.username 
                      ? match.player2?.username || 'Open Slot'
                      : match.player1.username}
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(match.scheduledFor).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm text-gray-400 mb-3">
                  Prize Pool: {match.prizePool} Credits
                </div>
                <div className="flex space-x-2">
                  <span className="btn-secondary text-sm">View Details</span>
                  {match.status === 'IN_PROGRESS' && (
                    <span className="btn-primary text-sm">Enter Match</span>
                  )}
                </div>
              </Link>
            ))}
            {upcomingMatches.length === 0 && (
              <div className="text-center text-gray-400 py-4">
                No upcoming matches
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface Match {
  id: string;
  prizePool: number;
  entryFee: number;
  status: string;
  scheduledFor: string;
  player1: { username: string };
  player2: { username: string } | null;
  winner: string | null;
}
