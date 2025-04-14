import Link from 'next/link';

type Match = {
  id: string;
  player1: { username: string };
  player2: { username: string };
  winner?: { username: string };
  status: string;
  entryFee: number;
  scheduledFor: string;
  winnerId?: string;
};

export default function MatchesPage() {
  const userId = 'user123';
  
  // Placeholder match data
  const matches: Match[] = [
    {
      id: '1',
      player1: { username: 'Player1' },
      player2: { username: 'Player2' },
      winner: { username: 'Player1' },
      status: 'COMPLETED',
      entryFee: 100,
      scheduledFor: '2025-04-14T14:00:00Z',
      winnerId: 'user123'
    },
    {
      id: '2',
      player1: { username: 'Player3' },
      player2: { username: 'Player4' },
      status: 'IN_PROGRESS',
      entryFee: 200,
      scheduledFor: '2025-04-14T15:00:00Z'
    },
    {
      id: '3',
      player1: { username: 'Player5' },
      player2: { username: 'Player6' },
      status: 'CANCELLED_BY_HOST',
      entryFee: 150,
      scheduledFor: '2025-04-14T16:00:00Z'
    }
  ];

  const getMatchResult = (match: Match, userId: string) => {
    if (match.status === 'CANCELLED_BY_HOST' || match.status === 'CANCELLED_BY_ADMIN' || match.status === 'CANCELLED_EXPIRED') {
      return {
        text: 'CANCELLED',
        color: 'text-gray-500',
      };
    }
    if (match.status !== 'COMPLETED') {
      return {
        text: match.status.replace('_', ' '),
        color: 'text-yellow-500',
      };
    }
    if (!match.winnerId) {
      return {
        text: 'NO RESULT',
        color: 'text-gray-500',
      };
    }
    if (match.winnerId === userId) {
      return {
        text: 'VICTORY',
        color: 'text-green-500',
      };
    }
    return {
      text: 'DEFEAT',
      color: 'text-red-500',
    };
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Match History</h1>
        <Link href="/matches/create" className="btn-primary">
          Create Match
        </Link>
      </div>

      {/* Match History Table */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/30">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Players
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Entry Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {matches.map((match: Match) => {
                const result = getMatchResult(match, userId || '');
                return (
                  <tr
                    key={match.id}
                    className="hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/matches/${match.id}`}
                        className="hover:text-red-500 transition-colors"
                      >
                        {new Date(match.scheduledFor).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className={match.player1?.username === 'Player1' ? 'font-bold' : ''}>
                          {match.player1?.username || 'TBD'}
                        </span>
                        <span className="text-gray-500">vs</span>
                        <span className={match.player2?.username === 'Player1' ? 'font-bold' : ''}>
                          {match.player2?.username || 'TBD'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="text-red-500 font-medium">
                        {match.entryFee.toString()} Credits
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${result.color}`}>
                        {result.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <div
                          className={`w-2 h-2 rounded-full mr-2 ${
                            match.status === 'COMPLETED'
                              ? 'bg-green-500'
                              : match.status === 'CANCELLED_BY_HOST'
                              ? 'bg-red-500'
                              : 'bg-yellow-500'
                          }`}
                        />
                        {match.status.replace('_', ' ')}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {matches.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No matches found.</p>
          <p className="text-gray-500 mt-2">
            Create a match or join an existing one to get started!
          </p>
        </div>
      )}
    </div>
  );
}
