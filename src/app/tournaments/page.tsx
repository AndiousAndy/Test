'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Define types for tournament data
type Match = {
  player1: string;
  player2: string;
  winner: string;
};

type TournamentData = {
  round1: Match[];
  round2: Match[];
  round3: Match[];
  final: Match;
};

// Random name generator for tournament participants
const generateRandomName = () => {
  const prefixes = ['Cyber', 'Neon', 'Virtual', 'Digital', 'Quantum', 'Pixel', 'Glitch', 'Tech', 'Laser', 'Crypto'];
  const suffixes = ['Striker', 'Ninja', 'Warrior', 'Slayer', 'Hunter', 'Assassin', 'Master', 'Champion', 'Legend', 'Titan'];
  
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
};

// Generate a bracket of 16 players (15 matches)
const generateTournamentData = (): TournamentData => {
  const players = Array(16).fill(null).map(() => generateRandomName());
  
  // Round 1 - 8 matches
  const round1: Match[] = [];
  for (let i = 0; i < players.length; i += 2) {
    const player1 = players[i];
    const player2 = players[i + 1];
    const winner = Math.random() > 0.5 ? player1 : player2;
    round1.push({ player1, player2, winner });
  }
  
  // Round 2 - 4 matches
  const round2: Match[] = [];
  for (let i = 0; i < round1.length; i += 2) {
    const player1 = round1[i].winner;
    const player2 = round1[i + 1].winner;
    const winner = Math.random() > 0.5 ? player1 : player2;
    round2.push({ player1, player2, winner });
  }
  
  // Round 3 - 2 matches (semifinals)
  const round3: Match[] = [
    {
      player1: round2[0].winner,
      player2: round2[1].winner,
      winner: Math.random() > 0.5 ? round2[0].winner : round2[1].winner
    },
    {
      player1: round2[2].winner,
      player2: round2[3].winner,
      winner: Math.random() > 0.5 ? round2[2].winner : round2[3].winner
    }
  ];
  
  // Final match
  const final: Match = {
    player1: round3[0].winner,
    player2: round3[1].winner,
    winner: Math.random() > 0.5 ? round3[0].winner : round3[1].winner
  };
  
  return {
    round1,
    round2,
    round3,
    final
  };
};

export default function TournamentsPage() {
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  
  useEffect(() => {
    setTournament(generateTournamentData());
  }, []);
  
  if (!tournament) return <div className="min-h-screen bg-background-end pt-20">Loading...</div>;
  
  return (
    <div className="min-h-screen bg-background-end pt-20 pb-10 relative overflow-hidden">
      {/* Tournament Bracket (Background) */}
      <div className="absolute inset-0 pt-20 opacity-40 filter blur-[2px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex h-full items-center justify-center">
            <div className="w-full flex flex-col items-center">
              {/* Tournament Bracket */}
              <div className="w-full flex justify-between">
                {/* Round 1 */}
                <div className="w-1/5 space-y-4">
                  <h3 className="text-center text-gray-400 font-semibold mb-6">Round 1</h3>
                  {tournament.round1.map((match: Match, index: number) => (
                    <div key={`r1-${index}`} className="bg-gray-800/50 border border-gray-700 rounded-md p-2 text-xs">
                      <div className={`p-1 ${match.winner === match.player1 ? 'text-green-400 font-bold' : 'text-gray-400'}`}>{match.player1}</div>
                      <div className="border-t border-gray-700 my-1"></div>
                      <div className={`p-1 ${match.winner === match.player2 ? 'text-green-400 font-bold' : 'text-gray-400'}`}>{match.player2}</div>
                    </div>
                  ))}
                </div>
                
                {/* Round 2 */}
                <div className="w-1/5 space-y-8 mt-12">
                  <h3 className="text-center text-gray-400 font-semibold mb-6">Round 2</h3>
                  {tournament.round2.map((match: Match, index: number) => (
                    <div key={`r2-${index}`} className="bg-gray-800/50 border border-gray-700 rounded-md p-2 text-xs">
                      <div className={`p-1 ${match.winner === match.player1 ? 'text-green-400 font-bold' : 'text-gray-400'}`}>{match.player1}</div>
                      <div className="border-t border-gray-700 my-1"></div>
                      <div className={`p-1 ${match.winner === match.player2 ? 'text-green-400 font-bold' : 'text-gray-400'}`}>{match.player2}</div>
                    </div>
                  ))}
                </div>
                
                {/* Round 3 (Semifinals) */}
                <div className="w-1/5 space-y-16 mt-24">
                  <h3 className="text-center text-gray-400 font-semibold mb-6">Semifinals</h3>
                  {tournament.round3.map((match: Match, index: number) => (
                    <div key={`r3-${index}`} className="bg-gray-800/50 border border-gray-700 rounded-md p-2 text-xs">
                      <div className={`p-1 ${match.winner === match.player1 ? 'text-green-400 font-bold' : 'text-gray-400'}`}>{match.player1}</div>
                      <div className="border-t border-gray-700 my-1"></div>
                      <div className={`p-1 ${match.winner === match.player2 ? 'text-green-400 font-bold' : 'text-gray-400'}`}>{match.player2}</div>
                    </div>
                  ))}
                </div>
                
                {/* Final */}
                <div className="w-1/5 mt-40">
                  <h3 className="text-center text-gray-400 font-semibold mb-6">Final</h3>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-md p-2 text-xs">
                    <div className={`p-1 ${tournament.final.winner === tournament.final.player1 ? 'text-green-400 font-bold' : 'text-gray-400'}`}>{tournament.final.player1}</div>
                    <div className="border-t border-gray-700 my-1"></div>
                    <div className={`p-1 ${tournament.final.winner === tournament.final.player2 ? 'text-green-400 font-bold' : 'text-gray-400'}`}>{tournament.final.player2}</div>
                  </div>
                </div>
                
                {/* Champion */}
                <div className="w-1/5 mt-40">
                  <h3 className="text-center text-gray-400 font-semibold mb-6">Champion</h3>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-md p-2 text-sm font-bold text-center text-yellow-400">
                    {tournament.final.winner}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Coming Soon Overlay */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[70vh]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-black/70 backdrop-blur-md border border-red-500/30 rounded-xl p-10 shadow-2xl shadow-red-500/20 max-w-2xl w-full text-center"
        >
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-5xl font-extrabold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent mb-6"
          >
            Tournaments
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="relative"
          >
            <div className="text-2xl font-bold text-white mb-6">Coming Soon</div>
            <p className="text-gray-300 mb-8">
              Get ready for epic VR boxing tournaments with multiple brackets, amazing prizes, and live spectating. 
              Compete against the best fighters and climb the global leaderboards!
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button className="btn-primary opacity-50 cursor-not-allowed" disabled>
                Register Interest
              </button>
              <button className="btn-secondary opacity-50 cursor-not-allowed" disabled>
                View Schedule
              </button>
            </div>
            
            <div className="mt-8 text-sm text-gray-400">
              Want to be notified when tournaments launch? Follow us on social media for updates!
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
