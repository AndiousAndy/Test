'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function CreateMatchPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Create a Match</h1>
      
      <div className="bg-gray-800 p-6 rounded-lg">
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Entry Fee (USD)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                min="10"
                step="10"
                required
                className="block w-full pl-7 pr-12 py-2 rounded-md border-0 text-gray-900"
                placeholder="1000"
              />
            </div>
            <p className="mt-1 text-sm text-gray-400">
              Minimum $10. Winner takes 95% of the total pool.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Match Date & Time
            </label>
            <input
              type="datetime-local"
              required
              className="block w-full py-2 px-3 rounded-md border-0 text-gray-900"
            />
            <p className="mt-1 text-sm text-gray-400">
              Schedule at least 1 hour in advance
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Match Rules
            </label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rules-rounds"
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600"
                />
                <label htmlFor="rules-rounds" className="ml-2 text-sm">
                  3 rounds (2 minutes each)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rules-recording"
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600"
                />
                <label htmlFor="rules-recording" className="ml-2 text-sm">
                  Match must be recorded
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rules-discord"
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600"
                />
                <label htmlFor="rules-discord" className="ml-2 text-sm">
                  Join Discord voice channel during match
                </label>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 p-4 rounded-md">
            <h3 className="text-sm font-medium mb-2">Match Creation Summary</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Your entry fee will be locked until the match is complete</li>
              <li>• Match must start within 15 minutes of scheduled time</li>
              <li>• Both fighters must verify match results</li>
              <li>• Platform fee: 5% of the prize pool</li>
            </ul>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="btn-primary w-full"
            >
              Create Match & Lock Entry Fee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
