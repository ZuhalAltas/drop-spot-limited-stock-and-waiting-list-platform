'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function AdminDropsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [drops, setDrops] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/drops');
      return;
    }

    fetchDrops();
  }, [user, router]);

  const fetchDrops = async () => {
    try {
      const response = await api.get('/admin/drops');
      setDrops(response.data.data);
    } catch (err) {
      alert('Failed to fetch drops');
    }
    setIsLoading(false);
  };

  const handleDelete = async (dropId: number) => {
    if (!confirm('Are you sure you want to delete this drop?')) return;

    try {
      await api.delete(`/admin/drops/${dropId}`);
      fetchDrops();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete drop');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
            <p className="text-gray-600">Manage drops</p>
          </div>
          <Link
            href="/drops"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Back to Drops
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Title</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Stock</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Claims</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {drops.map((drop) => (
                <tr key={drop.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{drop.title}</div>
                    <div className="text-sm text-gray-500">{drop.description?.substring(0, 50)}...</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {drop.remaining_stock} / {drop.stock}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{drop.claim_count}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        drop.is_claim_window_open
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {drop.is_claim_window_open ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(drop.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {drops.length === 0 && (
            <div className="text-center py-12 text-gray-500">No drops found</div>
          )}
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Create/Edit functionality can be added via API calls to POST /admin/drops and PUT /admin/drops/:id
          </p>
        </div>
      </div>
    </div>
  );
}
