'use client';

import { useEffect } from 'react';
import { useDropStore } from '@/lib/store/dropStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DropsPage() {
  const router = useRouter();
  const { drops, isLoading, fetchDrops } = useDropStore();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    fetchDrops();
  }, [fetchDrops]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            DropSpot
          </h1>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <span className="text-sm text-gray-600">{user.email}</span>
                {user.role === 'admin' && (
                  <Link
                    href="/admin/drops"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                  >
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  Logout
                </button>
              </>
            )}
            {!user && (
              <Link
                href="/auth/login"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Active Drops</h2>
          <p className="text-gray-600">Join the waitlist for exclusive drops</p>
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading drops...</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drops.map((drop) => (
            <Link
              key={drop.id}
              href={`/drops/${drop.id}`}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden group"
            >
              <div className="h-48 bg-gradient-to-br from-blue-500 to-cyan-500 relative">
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white text-2xl font-bold">{drop.title}</h3>
                </div>
              </div>

              <div className="p-6">
                <p className="text-gray-600 mb-4 line-clamp-2">{drop.description}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stock:</span>
                    <span className="font-semibold">
                      {drop.remaining_stock} / {drop.stock}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Claim Window:</span>
                    <span className={`font-semibold ${drop.is_claim_window_open ? 'text-green-600' : 'text-gray-900'}`}>
                      {drop.is_claim_window_open ? 'Open Now' : 'Upcoming'}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 mt-4">
                    <div>Start: {formatDate(drop.claim_window_start)}</div>
                    <div>End: {formatDate(drop.claim_window_end)}</div>
                  </div>
                </div>

                <button className="mt-6 w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold py-3 rounded-lg group-hover:from-blue-700 group-hover:to-cyan-700 transition">
                  View Details
                </button>
              </div>
            </Link>
          ))}
        </div>

        {!isLoading && drops.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No drops available at the moment</p>
          </div>
        )}
      </main>
    </div>
  );
}
