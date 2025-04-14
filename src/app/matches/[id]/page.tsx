'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MatchChat from '@/components/MatchChat';
import MatchOutcome from '@/components/MatchOutcome';
import CountdownTimer from '@/components/CountdownTimer';
import { MATCH_STATUS, MatchStatus } from '@/lib/matchStatus';

interface Match {
  id: string;
  entryFee: number;
  status: MatchStatus;
  scheduledFor: string;
  player1Id: string;
  player2Id: string | null;
  player1: { username: string };
  player2: { username: string } | null;
  player1Outcome: string | null;
  player2Outcome: string | null;
  winner: { username: string } | null;
  roundDurationMinutes: number;
  numberOfRounds: number;
  lobbyNumber: string | null;
}

export default function MatchPage({ params }: { params: { id: string } }) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState(false);
  const [submitOutcomeError, setSubmitOutcomeError] = useState('');

  // Helper logic to determine if outcome submission is allowed
  const isUserPlayer = match && session?.user?.id && (match.player1Id === session.user.id || match.player2Id === session.user.id);

  const isMatchInProgressOrWaitingPastStart =
    match && (
      match.status === MATCH_STATUS.IN_PROGRESS ||
      (match.status === MATCH_STATUS.WAITING_START && new Date(match.scheduledFor) <= new Date())
    );

  const isMatchCompletedWithoutWinner =
    match && match.status === MATCH_STATUS.COMPLETED && !match.winner;

  const isMatchDisputed = match && match.status === MATCH_STATUS.DISPUTED;

  const userHasSubmitted = match && session?.user?.id && (
      (match.player1Id === session.user.id && match.player1Outcome) ||
      (match.player2Id === session.user.id && match.player2Outcome)
  );

  const canSubmitOutcome = 
    isUserPlayer &&
    (isMatchInProgressOrWaitingPastStart || isMatchCompletedWithoutWinner) &&
    !isMatchDisputed &&
    !userHasSubmitted; // Check if user has *not* submitted yet

  const fetchMatch = async () => {
    try {
      const res = await fetch(`/api/matches/${params.id}`);
      if (!res.ok) throw new Error('Failed to fetch match');
      const data = await res.json();
      setMatch(data);
    } catch (err) {
      setError('Failed to load match details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatch();
  }, [params.id]);

  const handleJoinMatch = async () => {
    if (!session?.user?.id || !match) return;
    
    setIsJoining(true);
    setJoinError('');
    
    try {
      const res = await fetch(`/api/matches/${match.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join match');
      }
      
      // Refresh match data
      fetchMatch();
      router.refresh();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join match');
    } finally {
      setIsJoining(false);
    }
  };

  const canJoinMatch = () => {
    if (!session?.user?.id || !match) return false;
    
    return (
      // User is not the host
      match.player1Id !== session.user.id &&
      // Match doesn't have a player2 yet
      !match.player2Id &&
      // Match is either OPEN or WAITING_OPPONENT
      (match.status === MATCH_STATUS.OPEN || match.status === MATCH_STATUS.WAITING_OPPONENT)
    );
  };

  const handleCancelMatch = async () => {
    if (!session?.user?.id || !match) return;
    
    setIsCancelling(true);
    setCancelError('');
    
    try {
      const res = await fetch(`/api/matches/${match.id}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel match');
      }
      
      // Force session update to refresh balance in Navbar
      await update();
      
      // Option 2: Update state locally and stay on page (or show success message)
      setShowCancelModal(false);
      setMatch(prevMatch => prevMatch ? { ...prevMatch, status: 'CANCELLED_BY_HOST' } : null);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel match');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleOutcomeSubmit = async (outcome: 'WIN' | 'LOSS') => {
    if (!match || !session?.user?.id) return;
    
    setIsSubmittingOutcome(true);
    setSubmitOutcomeError('');
    
    try {
      const res = await fetch(`/api/matches/${match.id}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to submit outcome');
      }
      
      // Refresh match data to reflect the submitted outcome or status change (e.g., DISPUTED)
      fetchMatch();
      console.log('Outcome submitted successfully:', data);
      
    } catch (err: any) {
      console.error('Error submitting outcome:', err);
      setSubmitOutcomeError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmittingOutcome(false);
    }
  };

  const canCancelMatch = () => {
    if (!session?.user?.id || !match) {
      console.log('[canCancelMatch] Condition failed: Missing session or match data.', { hasSession: !!session?.user?.id, hasMatch: !!match });
      return false;
    }

    const isHost = match.player1Id === session.user.id;
    const isValidStatus = match.status === 'OPEN' || match.status === 'WAITING_OPPONENT';

    console.log('[canCancelMatch] Checking conditions:', {
      loggedInUserId: session.user.id,
      matchHostId: match.player1Id,
      matchStatus: match.status,
      isHost: isHost, // Should be true
      isValidStatus: isValidStatus, // Should be true for new match
      finalResult: isHost && isValidStatus // Overall result
    });

    return (
      // User is the host
      isHost &&
      // Match status allows cancellation (OPEN or WAITING_OPPONENT)
      isValidStatus
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading match...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error || 'Match not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Add relative positioning to the card */}
        <div className="relative bg-background-start/50 backdrop-blur-md rounded-lg border border-gray-800 p-6">

          {/* Cancel Match Button (Positioned Top-Right) */}
          {canCancelMatch() && (
            <div className="absolute top-4 right-4 z-10"> {/* Position container */} 
              <button
                onClick={() => setShowCancelModal(true)} 
                disabled={isCancelling || showCancelModal} 
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1 px-2 rounded shadow hover:shadow-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          )}

          <h1 className="text-2xl font-bold text-gray-200 mb-4">
            Match Details
          </h1>
          
          {/* Status Banner for Cancelled Matches */}
          {match?.status === 'CANCELLED_BY_HOST' && (
            <div className="bg-red-500/20 border border-red-500 rounded-md p-3 mb-6 text-center">
              <p className="text-red-200 font-medium">This match has been cancelled by the host. Entry fees have been refunded.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-300 mb-2">Players</h2>
              <div className="space-y-2">
                <p className="text-gray-400">
                  Player 1: <span className="text-white">{match.player1.username}</span>
                </p>
                <p className="text-gray-400">
                  Player 2:{' '}
                  {match.player2 ? (
                    <span className="text-white">{match.player2.username}</span>
                  ) : (
                    <span className="text-yellow-500">Waiting for opponent</span>
                  )}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-300 mb-2">Match Info</h2>
              <div className="space-y-2">
                <p className="text-gray-400">
                  Status: <span className="text-white">{match.status}</span>
                </p>
                <p className="text-gray-400">
                  Entry Fee: <span className="text-white">{match.entryFee} credits</span>
                </p>
                <p className="text-gray-400">
                  Prize Pool: <span className="text-white">{match.entryFee * 2} credits</span>
                </p>
                <p className="text-gray-400">
                  Scheduled For: <span className="text-white">
                    {new Date(match.scheduledFor).toLocaleString()}
                    {/* Conditionally render Countdown Timer */} 
                    {new Date(match.scheduledFor) > new Date() && (match.status === MATCH_STATUS.OPEN || match.status === MATCH_STATUS.WAITING_OPPONENT) && (
                      <span className="ml-2 text-yellow-400">
                        (Starts in: <CountdownTimer targetDate={new Date(match.scheduledFor)} onComplete={fetchMatch} />)
                      </span>
                    )}
                    {/* Optionally show 'Live' if time passed but status hasn't updated */}
                    {new Date(match.scheduledFor) <= new Date() && (match.status === MATCH_STATUS.OPEN || match.status === MATCH_STATUS.WAITING_OPPONENT) && (
                        <span className="ml-2 text-green-400 font-semibold">(Live)</span>
                    )}
                  </span>
                </p>
                <p className="text-gray-400">
                  Round Duration: <span className="text-white">{match.roundDurationMinutes} minute(s)</span>
                </p>
                <p className="text-gray-400">
                  Number of Rounds: <span className="text-white">{match.numberOfRounds}</span>
                </p>
                {match.lobbyNumber && (
                  <p className="text-gray-400">
                    Lobby Number: <span className="text-white">{match.lobbyNumber}</span>
                  </p>
                )}
                {match.winner && (
                  <p className="text-gray-400">
                    Winner: <span className="text-green-400">{match.winner.username}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Outcome Submission Buttons */}
          {canSubmitOutcome && (
            <div className="mt-6 p-4 bg-gray-700 bg-opacity-50 rounded-lg border border-gray-600">
              <h3 className="text-lg font-semibold text-white mb-3 text-center">Submit Your Result</h3>
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={() => handleOutcomeSubmit('WIN')}
                  disabled={isSubmittingOutcome}
                  className="btn-primary bg-green-600 hover:bg-green-700 disabled:opacity-50 flex-1"
                >
                  {isSubmittingOutcome ? 'Submitting...' : 'I Won'}
                </button>
                <button
                  onClick={() => handleOutcomeSubmit('LOSS')}
                  disabled={isSubmittingOutcome}
                  className="btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50 flex-1"
                >
                  {isSubmittingOutcome ? 'Submitting...' : 'I Lost'}
                </button>
              </div>
              {submitOutcomeError && (
                <p className="mt-3 text-red-500 text-sm text-center">{submitOutcomeError}</p>
              )}
            </div>
          )}

          {/* Join Match Button */}
          {canJoinMatch() && (
            <div className="mb-6">
              <button
                onClick={handleJoinMatch}
                disabled={isJoining}
                className="btn-primary w-full"
              >
                {isJoining ? 'Joining...' : `Join Match (${match.entryFee} credits)`}
              </button>
              {joinError && (
                <p className="mt-2 text-red-500 text-sm">{joinError}</p>
              )}
            </div>
          )}

          {/* Display Submitted Outcome (if applicable) */}
          {match && session?.user?.id && 
            ((
                match.player1Id === session.user.id && match.player1Outcome
            ) || (
                match.player2Id === session.user.id && match.player2Outcome
            ))
            && (
                <div className="mt-4 p-3 bg-blue-900 bg-opacity-50 rounded-lg border border-blue-700 text-center">
                    <p className="text-blue-200 text-sm">
                        Your outcome ({match.player1Id === session.user.id ? match.player1Outcome : match.player2Outcome}) has been submitted.
                        {match.status !== MATCH_STATUS.DISPUTED && match.status !== MATCH_STATUS.COMPLETED && ' Waiting for opponent...'} 
                        {match.status === MATCH_STATUS.DISPUTED && ' Result conflict detected. An administrator has been notified.'}
                        {match.status === MATCH_STATUS.COMPLETED && match.winner && ' Match finalized.'}
                    </p>
                </div>
            )
          }

          <div className="mt-6">
            <MatchChat matchId={match.id} />
          </div>
        </div>
      </div>

      {/* --- Confirmation Modal --- */}
      {showCancelModal && (
        <>
          {/* Actual Modal */}
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white">Cancel Match</h2>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="text-gray-400 hover:text-gray-200 transition duration-150 ease-in-out"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-gray-400 mb-4">
                Are you sure you want to cancel this match? This action cannot be
                undone.
              </p>
              <button
                onClick={handleCancelMatch}
                disabled={isCancelling}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-4 rounded shadow hover:shadow-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed w-full"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Match'}
              </button>
              {cancelError && (
                <p className="mt-2 text-red-500 text-sm">{cancelError}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
