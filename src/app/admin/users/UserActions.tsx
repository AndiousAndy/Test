'use client';

import { useState } from 'react';

interface UserActionsProps {
  userId: string;
  isAdmin: boolean;
}

export default function UserActions({ userId, isAdmin }: UserActionsProps) {
  const [showGrantCoinsModal, setShowGrantCoinsModal] = useState(false);
  const [coinAmount, setCoinAmount] = useState('100');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminStatus, setAdminStatus] = useState(isAdmin);

  const handleGrantCoins = async () => {
    if (!coinAmount || isNaN(Number(coinAmount))) {
      alert('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      // This would be replaced with an actual API call
      const response = await fetch(`/api/admin/users/${userId}/grant-coins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: Number(coinAmount) }),
      });

      if (!response.ok) {
        throw new Error('Failed to grant coins');
      }

      alert(`Successfully granted ${coinAmount} coins to user`);
      setShowGrantCoinsModal(false);
    } catch (error) {
      console.error('Error granting coins:', error);
      alert('Failed to grant coins. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAdminStatus = async () => {
    try {
      // This would be replaced with an actual API call
      const response = await fetch(`/api/admin/users/${userId}/toggle-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle admin status');
      }

      setAdminStatus(!adminStatus);
      alert(`User admin status ${!adminStatus ? 'granted' : 'revoked'} successfully`);
    } catch (error) {
      console.error('Error toggling admin status:', error);
      alert('Failed to update admin status. Please try again.');
    }
  };

  return (
    <div className="flex space-x-2">
      <button
        onClick={() => setShowGrantCoinsModal(true)}
        className="text-blue-500 hover:text-blue-400"
        title="Grant Coins"
      >
        💰
      </button>
      <button
        onClick={toggleAdminStatus}
        className={`${adminStatus ? 'text-red-500 hover:text-red-400' : 'text-green-500 hover:text-green-400'}`}
        title={`${adminStatus ? 'Revoke Admin' : 'Make Admin'}`}
      >
        👑
      </button>
      <button
        onClick={() => window.location.href = `/admin/users/${userId}`}
        className="text-yellow-500 hover:text-yellow-400"
        title="View Details"
      >
        👁️
      </button>

      {/* Grant Coins Modal */}
      {showGrantCoinsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Grant Coins</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Amount</label>
              <input
                type="number"
                value={coinAmount}
                onChange={(e) => setCoinAmount(e.target.value)}
                className="input-field"
                min="1"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowGrantCoinsModal(false)}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleGrantCoins}
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Grant Coins'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
