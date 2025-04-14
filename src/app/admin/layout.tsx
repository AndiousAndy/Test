import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  // If the user is an admin, render the requested admin page
  return (
    <div className="admin-container min-h-screen bg-gray-900 text-white">
      {/* You could add a common admin sidebar or header here */} 
      <main className="p-4 md:p-8">
        {children} 
      </main>
    </div>
  );
}
