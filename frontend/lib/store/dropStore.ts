import { create } from 'zustand';
import api from '../api';
import { Drop } from '../types';

interface DropState {
  drops: any[];
  currentDrop: any | null;
  isLoading: boolean;
  error: string | null;
  fetchDrops: (filter?: 'active' | 'upcoming' | 'all') => Promise<void>;
  fetchDropById: (id: number) => Promise<void>;
  joinWaitlist: (dropId: number) => Promise<void>;
  leaveWaitlist: (dropId: number) => Promise<void>;
  claimDrop: (dropId: number) => Promise<any>;
  clearError: () => void;
}

export const useDropStore = create<DropState>((set) => ({
  drops: [],
  currentDrop: null,
  isLoading: false,
  error: null,

  fetchDrops: async (filter) => {
    set({ isLoading: true, error: null });
    try {
      const url = filter ? `/drops?filter=${filter}` : '/drops';
      const response = await api.get(url);
      set({ drops: response.data.data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to fetch drops',
        isLoading: false,
      });
    }
  },

  fetchDropById: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/drops/${id}`);
      set({ currentDrop: response.data.data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to fetch drop',
        isLoading: false,
      });
    }
  },

  joinWaitlist: async (dropId: number) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/drops/${dropId}/join`);
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to join waitlist',
        isLoading: false,
      });
      throw error;
    }
  },

  leaveWaitlist: async (dropId: number) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/drops/${dropId}/leave`);
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to leave waitlist',
        isLoading: false,
      });
      throw error;
    }
  },

  claimDrop: async (dropId: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post(`/drops/${dropId}/claim`);
      set({ isLoading: false });
      return response.data.data;
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to claim drop',
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
