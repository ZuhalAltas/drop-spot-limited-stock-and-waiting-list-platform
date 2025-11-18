'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDropStore } from '@/lib/store/dropStore';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';

export default function DropDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dropId = parseInt(params.id as string);

  const { currentDrop, isLoading, fetchDropById, joinWaitlist, leaveWaitlist, claimDrop } = useDropStore();
  const { user } = useAuthStore();

  const [claimCode, setClaimCode] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchDropById(dropId);
  }, [dropId, fetchDropById]);

  const handleJoinWaitlist = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setActionLoading(true);
    try {
      await joinWaitlist(dropId);
      await fetchDropById(dropId); // Refresh
    } catch (err) {
      alert('Failed to join waitlist');
    }
    setActionLoading(false);
  };

  const handleLeaveWaitlist = async () => {
    setActionLoading(true);
    try {
      await leaveWaitlist(dropId);
      await fetchDropById(dropId); // Refresh
    } catch (err) {
      alert('Failed to leave waitlist');
    }
    setActionLoading(false);
  };

  const handleClaim = async () => {
    setActionLoading(true);
    try {
      const result = await claimDrop(dropId);
      setClaimCode(result.claim.claim_code);
      await fetchDropById(dropId); // Refresh
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to claim drop');
    }
    setActionLoading(false);
  };

  if (isLoading || !currentDrop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      </div>
    );
  }

  const userInWaitlist = currentDrop.user_in_waitlist ?? false;
  const claimWindowOpen = currentDrop.is_claim_window_open;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/drops" className="text-blue-600 hover:underline mb-6 inline-block">
          ← Back to Drops
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="h-64 bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <h1 className="text-white text-5xl font-bold">{currentDrop.title}</h1>
          </div>

          <div className="p-8">
            <p className="text-gray-700 text-lg mb-8">{currentDrop.description}</p>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Remaining Stock</div>
                <div className="text-3xl font-bold text-blue-600">
                  {currentDrop.remaining_stock} / {currentDrop.stock}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Claim Window</div>
                <div className={`text-2xl font-bold ${currentDrop.is_claim_window_open ? 'text-green-600' : 'text-gray-600'}`}>
                  {currentDrop.is_claim_window_open ? 'Open Now!' : 'Not Open'}
                </div>
              </div>
            </div>

            {/* Claim Code Display */}
            {claimCode && (
              <div className="bg-green-50 border-2 border-green-500 p-6 rounded-lg mb-6 text-center">
                <div className="text-lg font-semibold text-green-800 mb-2">
                  Congratulations! Your Claim Code:
                </div>
                <div className="text-4xl font-mono font-bold text-green-600">{claimCode}</div>
                <p className="text-sm text-green-700 mt-2">Save this code! You&apos;ll need it to collect your item.</p>
              </div>
            )}

            {/* Already Claimed */}
            {currentDrop.user_has_claimed && !claimCode && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 text-center">
                <div className="text-blue-800 font-medium">You have already claimed this drop!</div>
              </div>
            )}

            {/* Waitlist status */}
            {user && !currentDrop.user_has_claimed && userInWaitlist && !claimWindowOpen && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 text-center">
                <div className="text-blue-800 font-medium">You&apos;re currently in the waitlist.</div>
                <p className="text-sm text-blue-700 mt-1">Check back when the claim window opens.</p>
              </div>
            )}

            {user && !currentDrop.user_has_claimed && claimWindowOpen && !userInWaitlist && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6 text-center">
                <div className="text-yellow-800 font-medium">Join the waitlist before claiming this drop.</div>
              </div>
            )}

            {/* Action Buttons */}
            {user && !currentDrop.user_has_claimed && (
              <div className="space-y-4">
                {!userInWaitlist && (
                  <button
                    onClick={handleJoinWaitlist}
                    disabled={actionLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold py-4 rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 transition text-lg"
                  >
                    {actionLoading ? 'Processing...' : 'Join Waitlist'}
                  </button>
                )}

                {claimWindowOpen && (
                  <button
                    onClick={handleClaim}
                    disabled={
                      actionLoading ||
                      currentDrop.remaining_stock <= 0 ||
                      !userInWaitlist
                    }
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-4 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-lg"
                  >
                    {actionLoading
                      ? 'Processing...'
                      : currentDrop.remaining_stock <= 0
                      ? 'Sold Out'
                      : !userInWaitlist
                      ? 'Join waitlist to claim'
                      : 'Claim Now!'}
                  </button>
                )}

                {userInWaitlist && (
                  <button
                    onClick={handleLeaveWaitlist}
                    disabled={actionLoading}
                    className="w-full border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                  >
                    Leave Waitlist
                  </button>
                )}
              </div>
            )}

            {!user && (
              <Link
                href="/auth/login"
                className="block w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold py-4 rounded-lg text-center hover:from-blue-700 hover:to-cyan-700 transition text-lg"
              >
                Login to Join
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
