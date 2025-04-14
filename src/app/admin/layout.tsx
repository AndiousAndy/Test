import { getServerSession, Session } from 'next-auth'; // Import Session type
import { authOptions } from '@/app/api/auth/config'; // Import authOptions
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Explicitly cast to augmented Session type
  const session = await getServerSession(authOptions) as Session | null;

  // Check if the user is logged in and if they are an admin
  // Note: The type augmentation should make `isAdmin` available here.
  // If you encounter type errors, ensure `next-auth.d.ts` is correctly loaded by TS server.
  // Use type assertion to tell TypeScript that isAdmin exists on session.user
  const userIsAdmin = session?.user ? (session.user as any).isAdmin === true : false;

  if (!userIsAdmin) {
    console.log('AdminLayout: User is not an admin, redirecting to /');
    redirect('/'); // Redirect non-admin users to the homepage
  }

  console.log('AdminLayout: User is admin, rendering admin content.');
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
