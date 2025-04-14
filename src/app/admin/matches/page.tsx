'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns'; // For formatting dates
import { MATCH_STATUS } from '@/lib/matchStatus'; // Import status enum

interface Player {
  id: string;
  username: string;
}

interface Match {
  id: string;
  player1: Player;
  player2: Player;
  winner?: Player | null;
  status: string;
  betAmount: number; // Assuming betAmount is a number
  prizeAmount: number; // Assuming prizeAmount is a number
  createdAt: string;
  updatedAt: string;
  disputeReason?: string | null;
}

export default function AdminAllMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // TODO: Add state for filters (status, date range, etc.)

  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/admin/matches');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
          throw new Error(errorData.message || `Failed to fetch matches (Status: ${response.status})`);
        }
        const data = await response.json();
        setMatches(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching matches.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, []); // Fetch on initial load

  // Placeholder functions for admin actions
  const handleCancelMatch = async (matchId: string) => {
    // Confirmation prompt
    if (!confirm(`Are you sure you want to cancel match ${matchId}? This will refund entry fees.`)) {
      return; // User cancelled the action
    }

    try {
      // Add loading state indicator? (Optional)
      const response = await fetch(`/api/admin/matches/${matchId}/cancel`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Failed to cancel match (Status: ${response.status})`);
      }

      // Update local state on success
      setMatches(prevMatches =>
        prevMatches.map(match =>
          match.id === matchId ? { ...match, status: result.status } : match // Use status from response
        )
      );

      alert(`Match ${matchId} cancelled successfully.`);

    } catch (err: any) {
      console.error(`Error cancelling match ${matchId}:`, err);
      alert(`Failed to cancel match: ${err.message || 'An unknown error occurred.'}`);
    } finally {
      // Remove loading state indicator? (Optional)
    }
  };

  const handleResolveDispute = (matchId: string) => {
    console.log(`TODO: Implement resolve dispute action for match ${matchId}`);
    alert(`Action: Resolve Dispute ${matchId} (Not Implemented)`);
    // Could redirect to the disputes page or open a modal
  };

  const handleViewDetails = (matchId: string) => {
    // Could redirect to a detailed match view page for admins
    console.log(`TODO: Implement view details action for match ${matchId}`);
    alert(`Action: View Details ${matchId} (Not Implemented)`);
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin - All Matches</h1>

      {/* TODO: Add Filters (Status Dropdown, Date Range, Search?) */} 

      {isLoading && <p>Loading matches...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {!isLoading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Match ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Player 1</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Player 2</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Winner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Bet</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Prize</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created At</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900 divide-y divide-gray-700">
              {matches.map((match) => (
                <tr key={match.id}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">
                    <Link href={`/match/${match.id}`} className="hover:underline" title={match.id}> {match.id.substring(0, 8)}...</Link>
                  </td>
                  {/* Use optional chaining for safety */}
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">{match.player1?.username ?? 'N/A'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">{match.player2?.username ?? 'N/A'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">{match.winner?.username ?? 'N/A'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">{match.status}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">{match.betAmount}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">{match.prizeAmount}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">{format(new Date(match.createdAt), 'Pp')}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300 space-x-2">
                    {/* Admin Action Buttons */}
                    <button
                      onClick={() => handleViewDetails(match.id)}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs"
                    >
                      Details
                    </button>
                    {(match.status === MATCH_STATUS.OPEN || match.status === MATCH_STATUS.WAITING_OPPONENT) && (
                       <button
                        onClick={() => handleCancelMatch(match.id)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs"
                      >
                        Cancel
                      </button>
                    )}
                    {match.status === MATCH_STATUS.DISPUTED && (
                       <button
                        onClick={() => handleResolveDispute(match.id)}
                        className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-white text-xs"
                      >
                        Resolve
                      </button>
                    )}
                    {/* Add more actions as needed */}
                  </td>
                </tr>
              ))}
              {matches.length === 0 && (
                 <tr>
                    <td colSpan={9} className="text-center py-4 text-gray-500">No matches found.</td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
