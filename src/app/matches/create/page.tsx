'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export const dynamic = 'force-dynamic';

// Define region options
const REGIONS = [
  { value: 'ANY', label: 'Any Region' },
  { value: 'NA', label: 'North America (NA)' },
  { value: 'EU', label: 'Europe (EU)' },
  { value: 'ASIA', label: 'Asia' },
  { value: 'SA', label: 'South America (SA)' },
  { value: 'AU', label: 'Oceania (AU)' },
];

export default function CreateMatch() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    entryFee: 100,
    scheduledFor: new Date(Date.now() + 3900000).toISOString().slice(0, 16), // 1 hour and 5 minutes from now (3600000 + 300000 = 3900000ms)
    isPrivate: false, // Default to public
    roundDurationMinutes: 3, // Default to 3 minutes
    numberOfRounds: 5,      // Default to 5 rounds
    region: 'ANY',         // Added: Default region
    isPractice: false,     // Added: Default practice status
  });

  // Effect to reset entry fee when isPractice changes
  useEffect(() => {
    if (formData.isPractice) {
      setFormData(prev => ({ ...prev, entryFee: 0 }));
    }
    // Optional: Restore a default fee when unchecked, or let user re-enter
    // else {
    //   setFormData(prev => ({ ...prev, entryFee: 100 })); 
    // }
  }, [formData.isPractice]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Prepare data, ensuring entryFee is 0 for practice matches
    const submissionData = {
      ...formData,
      entryFee: formData.isPractice ? 0 : formData.entryFee,
    };

    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData), // Send adjusted data
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      
      await update(); // Refresh session data to get updated balance

      const match = await res.json();
      router.push(`/matches/${match.id}`);
    } catch (error) {
      console.error('Error creating match:', error);
      setError(error instanceof Error ? error.message : 'Failed to create match. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-background-start/50 backdrop-blur-md p-6 rounded-lg border border-gray-800">
        <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Create New Match
        </h1>

        <p className="text-gray-400 mb-6">
          Create an equal wager fight. Both fighters must pay the entry fee to join, 
          and the winner takes the total prize pool (2x entry fee).
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="entryFee" className="block text-sm font-medium text-gray-400 mb-2">
              Entry Fee (Credits)
            </label>
            <div className="relative">
              <input
                type="number"
                id="entryFee"
                min="10"
                step="10"
                value={formData.entryFee}
                onChange={(e) => setFormData(prev => ({ ...prev, entryFee: parseInt(e.target.value) }))}
                className="w-full bg-white/5 border border-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={formData.isPractice} // Disable if practice match
              />
              <div className="absolute right-0 top-0 bg-white/5 border-l border-gray-800 px-3 py-2 text-gray-400 rounded-r-lg">
                Prize: {formData.isPractice ? 0 : formData.entryFee * 2} Credits
              </div>
            </div>
            {formData.isPractice && <p className="text-xs text-gray-500 mt-1">Entry fee is disabled for practice matches.</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="scheduledFor" className="block text-sm font-medium text-gray-400 mb-2">
                Match Date & Time
              </label>
              <input
                type="datetime-local"
                id="scheduledFor"
                value={formData.scheduledFor}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledFor: e.target.value }))}
                className="w-full bg-white/5 border border-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            {/* Region Selector */}
            <div>
              <label htmlFor="region" className="block text-sm font-medium text-gray-400 mb-2">
                Region
              </label>
              <select
                id="region"
                value={formData.region}
                onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                className="w-full bg-white/5 border border-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 [&>option]:text-black"
                required
              >
                {REGIONS.map(region => (
                  <option key={region.value} value={region.value}>{region.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Round Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="roundDurationMinutes" className="block text-sm font-medium text-gray-400 mb-2">
                Round Duration
              </label>
              <select
                id="roundDurationMinutes"
                value={formData.roundDurationMinutes}
                onChange={(e) => setFormData(prev => ({ ...prev, roundDurationMinutes: parseInt(e.target.value) }))}
                className="w-full bg-white/5 border border-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 [&>option]:text-black"
                required
              >
                <option value="1">1 Minute</option>
                <option value="2">2 Minutes</option>
                <option value="3">3 Minutes</option>
              </select>
            </div>

            <div>
              <label htmlFor="numberOfRounds" className="block text-sm font-medium text-gray-400 mb-2">
                Number of Rounds ({formData.numberOfRounds})
              </label>
              <input
                type="range"
                id="numberOfRounds"
                min="3"
                max="12"
                step="1"
                value={formData.numberOfRounds}
                onChange={(e) => setFormData(prev => ({ ...prev, numberOfRounds: parseInt(e.target.value) }))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 range-thumb-red"
                required
              />
            </div>
          </div>

          {/* Practice Match Checkbox */}
          <div className="relative flex items-start">
            <div className="flex h-6 items-center">
              <input
                id="isPractice"
                name="isPractice"
                type="checkbox"
                checked={formData.isPractice}
                onChange={(e) => setFormData(prev => ({ ...prev, isPractice: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-700 bg-white/5 text-red-600 focus:ring-red-600"
              />
            </div>
            <div className="ml-3 text-sm leading-6">
              <label htmlFor="isPractice" className="font-medium text-gray-400">
                Practice Match
              </label>
              <p className="text-gray-500 text-xs">No credits will be wagered or awarded.</p>
            </div>
          </div>

          {/* Privacy Setting */}
          <div className="relative flex items-start">
            <div className="flex h-6 items-center">
              <input
                id="isPrivate"
                name="isPrivate"
                type="checkbox"
                checked={formData.isPrivate}
                onChange={(e) => setFormData(prev => ({ ...prev, isPrivate: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-700 bg-white/5 text-red-600 focus:ring-red-600"
              />
            </div>
            <div className="ml-3 text-sm leading-6">
              <label htmlFor="isPrivate" className="font-medium text-gray-400">
                Private Match
              </label>
              <p className="text-gray-500 text-xs">Only users with the direct link can view and join.</p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Match'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
