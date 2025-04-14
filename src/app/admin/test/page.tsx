'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function AdminTestPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      console.log('Session Data:', session);
    }
  }, [session, status]);

  if (status === 'loading') {
    return <p>Loading session...</p>;
  }

  if (status === 'unauthenticated') {
    return <p>Access Denied: You must be logged in.</p>;
  }

  // Now status is 'authenticated'
  // Use type assertion to tell TypeScript that isAdmin exists on session.user
  const userIsAdmin = session?.user ? (session.user as any).isAdmin === true : false;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Status Test</h1>
      <p className="mb-2">Session Status: <span className="font-semibold">{status}</span></p>
      {session?.user && (
        <div className="mb-4 p-4 border rounded bg-gray-800 border-gray-700">
          <p>User ID: {session.user.id}</p>
          <p>Username: {session.user.username ?? 'N/A'}</p>
          <p>Email: {session.user.email ?? 'N/A'}</p>
          <p>Balance: {session.user.balance?.toString() ?? 'N/A'} credits</p>
          <p>Is Admin: <span className={`font-semibold ${userIsAdmin ? 'text-green-500' : 'text-red-500'}`}>
            {String((session.user as any).isAdmin === true)}
          </span></p>
        </div>
      )}

      {userIsAdmin ? (
        <div>
          <p className="text-green-500 font-semibold mb-4">Welcome, Admin! You have access to restricted controls.</p>
          <button className="btn-primary">Example Admin Action (Grant Coins)</button>
        </div>
      ) : (
        <p className="text-red-500 font-semibold">Access Denied: You do not have admin privileges.</p>
      )}
    </div>
  );
}
