import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md relative text-gray-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-100 transition-colors"
          aria-label="Close wallet modal"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <h2 className="text-2xl font-semibold mb-6 text-center text-white">Wallet</h2>

        {/* Placeholder Sections */}
        <div className="space-y-6">
          {/* Add Balance Section (Placeholder) */}
          <div className="bg-gray-700 p-4 rounded-md">
            <h3 className="text-lg font-medium mb-3 text-white">Add Balance</h3>
            <p className="text-sm text-gray-400 mb-3">
              Payment processor integration coming soon.
            </p>
            <button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
              disabled // Disabled for now
            >
              Add Funds (Coming Soon)
            </button>
          </div>

          {/* Withdraw Section (Placeholder) */}
          <div className="bg-gray-700 p-4 rounded-md">
            <h3 className="text-lg font-medium mb-3 text-white">Withdraw</h3>
            <p className="text-sm text-gray-400 mb-3">
              Withdrawal options coming soon.
            </p>
            <button 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
              disabled // Disabled for now
            >
              Withdraw Funds (Coming Soon)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WalletModal;
