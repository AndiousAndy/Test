import Link from 'next/link';

export default function UsersPage() {
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

      {/* Users Table - Placeholder */}
      <div className="overflow-x-auto">
        <p className="text-center text-gray-500 py-10">User data display is disabled for static export.</p>
      </div>

      {/* Pagination Controls - Placeholder */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-400">
          Showing <span className="font-medium">0</span> users
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" disabled>Previous</button>
          <button className="btn-secondary" disabled>Next</button>
        </div>
      </div>
    </div>
  );
}
