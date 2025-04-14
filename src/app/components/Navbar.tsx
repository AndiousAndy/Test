'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { WalletIcon } from '@heroicons/react/24/outline'; 
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { formatBalance } from '@/lib/utils'; 
import { useState } from 'react'; 
import WalletModal from '@/components/WalletModal'; 
import { Decimal } from '@prisma/client/runtime/library'; 

// Helper type for asserting custom properties on session.user
type CustomUser = {
  id?: string;
  username?: string | null;
  balance?: Decimal | null;
  isAdmin?: boolean;
};

export function Navbar() {
  const { data: session, status, update } = useSession(); 
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to refresh the session data
  const refreshSession = async () => {
    setIsRefreshing(true);
    await update();
    setIsRefreshing(false);
  };

  // Simple approach - just use the balance directly
  const balance = (session?.user as CustomUser)?.balance;
  const formattedBalance = formatBalance(balance?.toString());

  return (
    <>
      <nav className="fixed w-full top-0 z-50 bg-background-start/80 backdrop-blur-md border-b border-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center group">
                <img src="/logo.svg" alt="KnockoutVR" className="h-8 w-auto group-hover:scale-110 transition-transform" />
                <span className="ml-2 text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  KnockoutVR<span className="text-red-500">.gg</span>
                </span>
              </Link>
              {status === 'authenticated' && (
                <div className="hidden md:flex md:items-center md:space-x-3 md:ml-6">
                  <Link href="/dashboard" className="nav-link whitespace-nowrap">Dashboard</Link>
                  <Link href="/matches" className="nav-link whitespace-nowrap">My Matches</Link>
                  <Link href="/matches/create" className="nav-link whitespace-nowrap">Create Match</Link>
                  <Link href="/tournaments" className="nav-link whitespace-nowrap">Tournaments</Link>
                  { (session?.user as CustomUser)?.isAdmin && (
                    <Link href="/admin" className="nav-link text-red-400 hover:text-red-300 whitespace-nowrap">Admin Panel</Link>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {status === 'authenticated' ? (
                <>
                  <div className="flex items-center space-x-2 bg-black/30 px-3 py-1.5 rounded-md border border-gray-700 shadow-inner">
                    <span 
                      className="text-sm font-semibold text-green-400 tracking-wider"
                      title={`Balance: ${balance?.toString() ?? '0'} Credits`}
                    >
                      {formattedBalance}
                    </span>
                    <button 
                      onClick={refreshSession} 
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Refresh Balance"
                      disabled={isRefreshing}
                    >
                      <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                      onClick={() => setIsWalletModalOpen(true)} 
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Wallet (Coming Soon)"
                    >
                      <WalletIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <span className="hidden sm:inline text-gray-300 text-sm">
                    { (session?.user as CustomUser)?.username ?? 'Fighter'}
                  </span>

                  <button 
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="nav-link"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="nav-link">Login</Link>
                  <Link href="/register" className="btn-primary">Register</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Render Wallet Modal */}
      <WalletModal 
        isOpen={isWalletModalOpen} 
        onClose={() => setIsWalletModalOpen(false)} 
      />
    </>
  );
}
