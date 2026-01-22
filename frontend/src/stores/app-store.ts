import { create } from 'zustand';
import { Event, User } from '../types';

interface AppState {
  // Selected items
  selectedEvent: Event | null;
  selectedUser: User | null;
  
  // Actions
  setSelectedEvent: (event: Event | null) => void;
  setSelectedUser: (user: User | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  selectedEvent: null,
  selectedUser: null,
  
  // Actions
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  setSelectedUser: (user) => set({ selectedUser: user }),
}));
