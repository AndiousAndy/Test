'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react'; // Assuming you might check session here

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="text-sm text-gray-400">
          Welcome to the Knockout VR admin panel
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* User Management Card */}
        <Link href="/admin/users" className="admin-card group">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold group-hover:text-red-500 transition-colors">User Management</h3>
            <span className="text-2xl">👥</span>
          </div>
          <p className="mt-2 text-gray-400">View, edit, and manage user accounts.</p>
          <div className="mt-4 text-sm text-gray-500">Manage permissions, reset passwords, view activity</div>
        </Link>

        {/* Coin Management Card */}
        <Link href="/admin/coins" className="admin-card group">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold group-hover:text-red-500 transition-colors">Coin Management</h3>
            <span className="text-2xl">💰</span>
          </div>
          <p className="mt-2 text-gray-400">Grant or revoke coins from users.</p>
          <div className="mt-4 text-sm text-gray-500">Adjust balances, view transaction history</div>
        </Link>

        {/* Match Disputes Card */}
        <Link href="/admin/disputes" className="admin-card group">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold group-hover:text-red-500 transition-colors">Match Disputes</h3>
            <span className="text-2xl">⚔️</span>
          </div>
          <p className="mt-2 text-gray-400">Resolve disputes between players.</p>
          <div className="mt-4 text-sm text-gray-500">Review evidence, make rulings, refund matches</div>
        </Link>

        {/* System Stats Card */}
        <Link href="/admin/stats" className="admin-card group">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold group-hover:text-red-500 transition-colors">System Stats</h3>
            <span className="text-2xl">📊</span>
          </div>
          <p className="mt-2 text-gray-400">View platform statistics and metrics.</p>
          <div className="mt-4 text-sm text-gray-500">User growth, match volume, revenue data</div>
        </Link>
      </div>

      {/* Quick Actions Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button className="btn-secondary">
            View Recent Disputes
          </button>
          <button className="btn-secondary">
            Check System Health
          </button>
          <Link href="/admin/test" className="btn-secondary">
            Test Admin Access
          </Link>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 italic">Activity feed will appear here in future updates.</p>
        </div>
      </div>
    </div>
  );
}
