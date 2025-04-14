import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // Import Prisma namespace
import type { Match as PrismaMatch, User as PrismaUser } from '@prisma/client';
import Link from 'next/link';
import { MATCH_STATUS } from '@/lib/matchStatus'; 
import MatchCard from '@/components/MatchCard'; 
import { Decimal } from '@prisma/client/runtime/library'; // Correct Decimal import

// Define the select object separately for type inference
const matchSelect = {
  id: true, status: true, scheduledFor: true, createdAt: true, updatedAt: true,
  player1Id: true, player2Id: true, winnerId: true, player1Outcome: true,
  player2Outcome: true, lobbyNumber: true, isPrivate: true,
  roundDurationMinutes: true, numberOfRounds: true, entryFee: true,
  player1: { select: { id: true, username: true } },
  player2: { select: { id: true, username: true } },
} // Remove 'satisfies Prisma.MatchSelect'

// Define the type for the player object structure we expect from the query
type PlayerInfo = { id: string; username: string | null } | null;

// Infer the precise type returned by Prisma based on the select statement
type FetchedMatchType = Prisma.MatchGetPayload<{ select: typeof matchSelect }>;

// Define the final type for the component, converting entryFee to string
type MatchWithPlayers = Omit<FetchedMatchType, 'entryFee'> & {
  entryFee: string;
};

export default function Home() {
  // Use an empty array for matches in static export
  const matches: MatchWithPlayers[] = [];

  return (
    <div className="space-y-12">
      <div className="relative -mt-8 py-48 px-6 text-center min-h-[80vh] flex items-center justify-center">
        <div className="absolute inset-0 bg-[url('/images/knockout-punch.jpg')] bg-cover bg-center opacity-30 blur-[6px]"></div>
        <div className="relative w-full">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 glow-text">
            Fight. Win. <span className="text-red-500">Earn.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join the ultimate Thrill of the Fight 2 competitive platform
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register" className="btn-primary">Become a Fighter</Link>
            <Link href="#matches" className="btn-secondary">View Matches</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
        <div className="stat-card text-center">
          <div className="text-3xl font-bold text-red-500 mb-2">1,000+</div>
          <div className="text-gray-400">Credits Paid Out</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-3xl font-bold text-red-500 mb-2">200+</div>
          <div className="text-gray-400">Matches Completed</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-3xl font-bold text-red-500 mb-2">50+</div>
          <div className="text-gray-400">Active Fighters</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-3xl font-bold text-red-500 mb-2">95%</div>
          <div className="text-gray-400">Payout Rate</div>
        </div>
      </div>

      <div id="matches" className="space-y-6 px-4 pb-12">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Available Matches</h2>
          <div className="flex gap-4">
            <Link href="/matches" className="btn-secondary">View all fights</Link>
            <Link href="/matches/create" className="btn-primary">Create Match</Link>
          </div>
        </div>

        {matches.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <MatchCard
                key={match.id}
                id={match.id}
                status={match.status}
                scheduledFor={match.scheduledFor}
                player1={match.player1}
                player2={match.player2}
                entryFee={match.entryFee}
                roundDurationMinutes={match.roundDurationMinutes}
                numberOfRounds={match.numberOfRounds}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">Match data will be loaded client-side.</p>
        )}
      </div>
    </div>
  );
}
