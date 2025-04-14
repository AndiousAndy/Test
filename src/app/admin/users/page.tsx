import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import UserActions from './UserActions';

export const dynamic = 'force-dynamic';

// Type for user data with selected fields
type UserData = {
  id: string;
  username: string;
  email: string;
  balance: string; // Converted to string for display
  credits: number;
  isAdmin: boolean;
  createdAt: Date;
};

async function getUsers(): Promise<UserData[]> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        balance: true,
        credits: true,
        isAdmin: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert Decimal balance to string for serialization
    return users.map(user => ({
      ...user,
      balance: user.balance.toString(),
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Link href="/admin" className="btn-secondary">
          Back to Dashboard
        </Link>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <form className="flex gap-2">
            <input
              type="text"
              placeholder="Search by username or email"
              className="input-field flex-1"
              name="search"
            />
            <button type="submit" className="btn-primary">
              Search
            </button>
          </form>
        </div>
        <div className="flex gap-2">
          <select className="input-field" defaultValue="all">
            <option value="all">All Users</option>
            <option value="admin">Admins Only</option>
            <option value="player">Players Only</option>
          </select>
          <button className="btn-secondary">
            Filter
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-gray-800 text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">Username</th>
              <th scope="col" className="px-6 py-3">Email</th>
              <th scope="col" className="px-6 py-3">Balance</th>
              <th scope="col" className="px-6 py-3">Credits</th>
              <th scope="col" className="px-6 py-3">Admin</th>
              <th scope="col" className="px-6 py-3">Joined</th>
              <th scope="col" className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b bg-gray-800 border-gray-700 hover:bg-gray-700">
                <td className="px-6 py-4 font-medium whitespace-nowrap">
                  {user.username}
                </td>
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4">{user.balance}</td>
                <td className="px-6 py-4">{user.credits}</td>
                <td className="px-6 py-4">
                  <span className={user.isAdmin ? "text-green-500" : "text-gray-500"}>
                    {user.isAdmin ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <UserActions userId={user.id} isAdmin={user.isAdmin} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-400">No users found</p>
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">
          Showing <span className="font-medium">{users.length}</span> users
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" disabled>Previous</button>
          <button className="btn-secondary" disabled>Next</button>
        </div>
      </div>
    </div>
  );
}
