'use client';

import { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';

interface User {
  id: string;
  username: string;
  email: string | null;
  coins: number;
}

export default function AdminCoinManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [updateAmount, setUpdateAmount] = useState<{ [userId: string]: number }>({});

  useEffect(() => {
    // Fetch users from API
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch users from the new API endpoint
        const response = await fetch(`/api/admin/users?search=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) {
          // Handle non-OK responses (like 401 Unauthorized or 500 Internal Server Error)
          const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
          throw new Error(errorData.message || `Failed to fetch users (Status: ${response.status})`);
        }
        const data = await response.json();
        setUsers(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching users.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [searchTerm]); // Refetch when search term changes

  const handleCoinUpdate = async (userId: string, amount: number) => {
    if (isNaN(amount)) {
        alert('Please enter a valid number for coins.');
        return;
    }
    try {
      const response = await fetch('/api/admin/coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        throw new Error(errorData.message || `Failed to update coins (Status: ${response.status})`);
      }
      // Refresh users list or update locally
      const updatedUser = await response.json();
      setUsers(users.map(u => u.id === userId ? { ...u, coins: updatedUser.coins } : u));
      setUpdateAmount(prev => ({ ...prev, [userId]: 0 })); // Reset input
    } catch (err: any) {
      alert(`Error updating coins: ${err.message}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin - Coin Management</h1>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search users by username or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-700 rounded bg-gray-800 text-white"
        />
      </div>

      {isLoading && <p>Loading users...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {!isLoading && !error && (
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Current Coins</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Adjust Coins ( +/- amount)</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-700">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.email ?? 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.coins}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={updateAmount[user.id] || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setUpdateAmount(prev => ({ ...prev, [user.id]: value === '' ? 0 : parseInt(value, 10) }));
                      }}
                      className="w-24 p-1 border border-gray-600 rounded bg-gray-700 text-white"
                      placeholder="+/- amount"
                    />
                    <button
                      onClick={() => handleCoinUpdate(user.id, updateAmount[user.id] || 0)}
                      disabled={!updateAmount[user.id]}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Update
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
