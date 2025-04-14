'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Channel } from 'pusher-js';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  matchId: string;
  isSystem: boolean;
  type: string;
  user: { 
    id: string; 
    username: string 
  }; 
}

interface DisputedMatch {
  id: string;
  player1: { id: string; username: string };
  player2: { id: string; username: string } | null;
  player1Outcome: string | null;
  player2Outcome: string | null;
  messages: Message[];
  updatedAt: string;
}

export default function AdminDisputesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [disputes, setDisputes] = useState<DisputedMatch[]>([]);
  const [isLoadingDisputes, setIsLoadingDisputes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingMatchId, setResolvingMatchId] = useState<string | null>(null);
  const [adminMessages, setAdminMessages] = useState<{ [matchId: string]: string }>({});
  const [sendingMessageMatchId, setSendingMessageMatchId] = useState<string | null>(null);
  const pusherClientRef = useRef<any | null>(null);
  const subscribedChannelsRef = useRef<{ [channelName: string]: Channel }>({});

  useEffect(() => {
    if (status === 'authenticated' && !session?.user?.isAdmin) {
      router.push('/');
    }
  }, [session, status, router]);

  // Effect for initializing and cleaning up Pusher
  useEffect(() => {
    let pusherInstance: any = null;

    const initializePusher = async () => {
      if (status !== 'authenticated' || !session?.user?.isAdmin) {
        return;
      }

      // Check for Pusher environment variables
      const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
      const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

      if (!pusherKey || !pusherCluster) {
        console.warn('[Pusher] Missing environment variables. Real-time updates will not work.');
        return;
      }

      try {
        // Dynamically import Pusher only in the browser
        const PusherClient = (await import('pusher-js')).default;
        console.log('[Pusher] Initializing client...');
        
        pusherInstance = new PusherClient(pusherKey, {
          cluster: pusherCluster,
          authEndpoint: '/api/pusher/auth'
        });

        pusherClientRef.current = pusherInstance;

        pusherInstance.connection.bind('connected', () => {
          console.log('[Pusher] Connection established');
        });

        pusherInstance.connection.bind('error', (err: any) => {
          console.error('[Pusher] Connection error:', err);
          const errorMessage = err.error?.data?.message || err.error?.data?.code || 'Unknown error';
          setError(`Pusher connection error: ${errorMessage}`);
        });
      } catch (error) {
        console.error('[Pusher] Failed to initialize client:', error);
        setError('Failed to initialize real-time updates');
      }
    };

    initializePusher();

    // Cleanup function
    return () => {
      if (pusherInstance) {
        console.log('[Pusher] Disconnecting...');
        try {
          Object.values(subscribedChannelsRef.current).forEach(channel => {
            try {
              channel.unbind_all();
            } catch (e) {
              console.warn('[Pusher] Error unbinding channel:', e);
            }
          });
          pusherInstance.disconnect();
        } catch (e) {
          console.warn('[Pusher] Error during cleanup:', e);
        }
        pusherClientRef.current = null;
        subscribedChannelsRef.current = {};
      }
    };
  }, [status, session]);

  useEffect(() => {
    if (!pusherClientRef.current || disputes.length === 0) {
      return;
    }

    const currentPusherClient = pusherClientRef.current;
    const currentSubscribedChannels = subscribedChannelsRef.current;
    const activeMatchIds = new Set(disputes.map(d => d.id));

    disputes.forEach(match => {
      const channelName = `private-match-${match.id}`;
      if (!currentSubscribedChannels[channelName]) {
        try {
          console.log(`[Pusher] Subscribing to ${channelName}`);
          const channel = currentPusherClient.subscribe(channelName);

          channel.bind('pusher:subscription_succeeded', () => {
            console.log(`[Pusher] Successfully subscribed to ${channelName}`);
          });

          channel.bind('pusher:subscription_error', (status: number) => {
            console.error(`[Pusher] Failed to subscribe to ${channelName}, status: ${status}`);
            setError(`Failed to subscribe to chat for match ${match.id} (Status: ${status})`);
          });

          channel.bind('new-message', (newMessage: Message) => {
            console.log(`[Pusher] Received new message for ${channelName}:`, newMessage);
            setDisputes(currentDisputes =>
              currentDisputes.map(dispute => {
                if (dispute.id === match.id) {
                   if (!dispute.messages.some(msg => msg.id === newMessage.id)) {
                     return { ...dispute, messages: [...dispute.messages, newMessage].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) }; 
                  }
                }
                return dispute;
              })
            );
          });

          currentSubscribedChannels[channelName] = channel;
        } catch (error) {
            console.error(`[Pusher] Error subscribing to ${channelName}:`, error);
            setError(`Error subscribing to chat for match ${match.id}`);
        }
      }
    });

    Object.keys(currentSubscribedChannels).forEach(channelName => {
      const matchId = channelName.substring('private-match-'.length);
      if (!activeMatchIds.has(matchId)) {
        console.log(`[Pusher] Unsubscribing from ${channelName}`);
        currentSubscribedChannels[channelName].unbind_all();
        currentPusherClient.unsubscribe(channelName);
        delete currentSubscribedChannels[channelName];
      }
    });

  }, [disputes]); 

  useEffect(() => {
    const fetchDisputes = async () => {
      if (session?.user?.isAdmin) {
        setIsLoadingDisputes(true);
        setError(null);
        try {
          const res = await fetch('/api/admin/disputes');
          if (!res.ok) {
            throw new Error(`Failed to fetch disputes: ${res.statusText}`);
          }
          const data = await res.json();
          const disputesWithSortedMessages = data.map((dispute: DisputedMatch) => ({
            ...dispute,
            messages: dispute.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
          }));
          setDisputes(disputesWithSortedMessages);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred');
          console.error('Error fetching disputes:', err);
        } finally {
          setIsLoadingDisputes(false);
        }
      }
    };

    if (status === 'authenticated') {
      fetchDisputes();
    }
  }, [session, status]);

  const handleResolveDispute = async (matchId: string, winnerId: string, winnerUsername: string) => {
    if (!confirm(`Are you sure you want to declare ${winnerUsername} (${winnerId}) as the winner for match ${matchId}? This cannot be undone.`)) {
      return;
    }
    setResolvingMatchId(matchId);
    setError(null);
    try {
      const res = await fetch('/api/admin/disputes/resolve', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchId, winnerId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to resolve dispute: ${res.statusText}`);
      }

      setDisputes(currentDisputes => currentDisputes.filter(d => d.id !== matchId));
      alert(`Match ${matchId} resolved successfully! Winner: ${winnerUsername}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during resolution');
      console.error('Error resolving dispute:', err);
      alert(`Error resolving dispute: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setResolvingMatchId(null);
    }
  };

  const handleAdminSendMessage = async (matchId: string) => {
    const messageContent = adminMessages[matchId]?.trim();
    if (!messageContent || !session?.user) return; 

    setSendingMessageMatchId(matchId);
    setError(null);

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`, 
      content: messageContent,
      createdAt: new Date().toISOString(),
      userId: session.user.id,
      matchId: matchId,
      isSystem: false,
      type: 'USER',
      user: {
        id: session.user.id,
        username: session.user.username || session.user.name || 'Admin',
      },
    };

    setDisputes(currentDisputes =>
        currentDisputes.map(dispute => {
        if (dispute.id === matchId) {
            return { ...dispute, messages: [...dispute.messages, optimisticMessage].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) };
        }
        return dispute;
        })
    );
    setAdminMessages(prev => ({ ...prev, [matchId]: '' }));

    try {
      const res = await fetch(`/api/matches/${matchId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: messageContent }),
      });

      if (!res.ok) {
        setDisputes(currentDisputes =>
          currentDisputes.map(dispute => {
            if (dispute.id === matchId) {
              return { ...dispute, messages: dispute.messages.filter(msg => msg.id !== optimisticMessage.id) };
            }
            return dispute;
          })
        );
        setAdminMessages(prev => ({ ...prev, [matchId]: messageContent }));

        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to send message: ${res.statusText}`);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while sending message');
      console.error('Error sending admin message:', err);
      setDisputes(currentDisputes =>
          currentDisputes.map(dispute => {
            if (dispute.id === matchId) {
              return { ...dispute, messages: dispute.messages.filter(msg => msg.id !== optimisticMessage.id) };
            }
            return dispute;
          })
        );
       setAdminMessages(prev => ({ ...prev, [matchId]: messageContent }));
    } finally {
      setSendingMessageMatchId(null);
    }
  };

  const handleAdminInputChange = (matchId: string, value: string) => {
    setAdminMessages(prev => ({ ...prev, [matchId]: value }));
  };

  if (status === 'loading') {
    return <p className="text-center mt-10">Loading admin disputes...</p>;
  }

  if (status === 'unauthenticated' || !session?.user?.isAdmin) {
    return <p className="text-center mt-10 text-red-500">Access Denied. Redirecting...</p>;
  }

  const adminUserId = session.user.id; 

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-yellow-400">⚠️ Disputed Matches</h1>
      
      {/* Disputed Matches Section */} 
      <section className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-semibold mb-4 text-white">Resolve Disputes ({disputes.length})</h2>
        
        {error && <p className="text-red-500 mb-4 bg-red-900 bg-opacity-50 p-3 rounded">Error: {error}</p>}
        
        {isLoadingDisputes ? (
          <p className="text-gray-400">Loading disputes...</p>
        ) : disputes.length === 0 ? (
          <p className="text-gray-400">No disputed matches found.</p>
        ) : (
          <div className="space-y-6">
            {disputes.map((match) => (
              <div key={match.id} className="bg-gray-900 p-4 rounded-md border border-gray-600">
                <h3 className="text-lg font-bold text-white mb-2">Match ID: {match.id}</h3>
                <p className="text-sm text-gray-400 mb-3">Disputed on: {new Date(match.updatedAt).toLocaleString()}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Player 1 Info */} 
                  <div className="bg-gray-800 p-3 rounded border border-gray-700">
                    <p className="font-semibold text-blue-400">Player 1: {match.player1.username} ({match.player1.id})</p>
                    <p className="text-white">Claimed Outcome: <span className={`font-bold ${match.player1Outcome === 'WIN' ? 'text-green-500' : 'text-red-500'}`}>{match.player1Outcome || 'N/A'}</span></p>
                  </div>
                  {/* Player 2 Info */} 
                  <div className="bg-gray-800 p-3 rounded border border-gray-700">
                    <p className="font-semibold text-purple-400">Player 2: {match.player2?.username || 'N/A'} ({match.player2?.id || 'N/A'})</p>
                    <p className="text-white">Claimed Outcome: <span className={`font-bold ${match.player2Outcome === 'WIN' ? 'text-green-500' : 'text-red-500'}`}>{match.player2Outcome || 'N/A'}</span></p>
                  </div>
                </div>
                
                {/* Chat Box */} 
                <div className="mb-4">
                  <h4 className="text-md font-semibold text-gray-300 mb-2">Chat Log:</h4>
                  <div className="bg-gray-700 p-3 rounded h-48 overflow-y-auto text-sm border border-gray-600 mb-2">
                    {match.messages.length > 0 ? (
                      match.messages.map(msg => (
                        <p key={msg.id} className={`mb-1 ${msg.isSystem ? 'text-yellow-300 italic' : 'text-gray-200'}`}>
                          <span className="font-semibold">
                            {msg.user.id === adminUserId ? '[Admin] ' : ''}
                            {msg.user.username}:
                          </span>
                          {' '}{msg.content}
                          <span className="text-xs text-gray-500 ml-2">({new Date(msg.createdAt).toLocaleTimeString()})</span>
                        </p>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">No chat messages found.</p>
                    )}
                  </div>
                   {/* Admin Message Input */} 
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={adminMessages[match.id] || ''}
                      onChange={(e) => handleAdminInputChange(match.id, e.target.value)}
                      placeholder="Send message as Admin..."
                      className="flex-grow input-base bg-gray-600 border-gray-500 text-white"
                      disabled={sendingMessageMatchId === match.id}
                       onKeyDown={(e) => { 
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault(); 
                          handleAdminSendMessage(match.id);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleAdminSendMessage(match.id)}
                      disabled={sendingMessageMatchId === match.id || !adminMessages[match.id]?.trim()}
                      className="btn-secondary bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded transition duration-150 ease-in-out"
                    >
                      {sendingMessageMatchId === match.id ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
                
                {/* Resolution Buttons */} 
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mt-4">
                  <button
                    onClick={() => handleResolveDispute(match.id, match.player1.id, match.player1.username)}
                    disabled={resolvingMatchId === match.id}
                    className="btn-primary bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex-1 py-2 px-4 rounded transition duration-150 ease-in-out"
                  >
                    {resolvingMatchId === match.id ? 'Resolving...' : `Declare ${match.player1.username} Winner`}
                  </button>
                  {match.player2 && (
                     <button
                      onClick={() => handleResolveDispute(match.id, match.player2!.id, match.player2!.username)}
                      disabled={resolvingMatchId === match.id}
                      className="btn-primary bg-purple-600 hover:bg-purple-700 disabled:opacity-50 flex-1 py-2 px-4 rounded transition duration-150 ease-in-out"
                    >
                      {resolvingMatchId === match.id ? 'Resolving...' : `Declare ${match.player2.username} Winner`}
                    </button>
                  )}
                   {!match.player2 && (
                     <p className="text-gray-500 flex-1 text-center py-2">Player 2 missing.</p> 
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
