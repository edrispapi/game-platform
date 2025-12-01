// Hook to manage user status updates (Online/Offline/In Game)
import { useEffect } from 'react';
import { api } from '@/lib/api-client';

// NOTE: For this local demo, we use the same default user ID that the backend
// reads from DEFAULT_USER_ID in .env. In a real app you would replace this
// with the authenticated user's ID from your auth system.
const FALLBACK_USER_ID = '11111111-1111-1111-1111-111111111111';

function getCurrentUserId() {
  if (typeof window === 'undefined') return FALLBACK_USER_ID;
  return window.localStorage.getItem('crimson-user-id') || FALLBACK_USER_ID;
}

export function useUserStatus() {
  useEffect(() => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return;
    // Helper to mark the user Online
    const setOnline = async () => {
      try {
        await api(`/api/users/${currentUserId}/status`, {
          method: 'POST',
          body: JSON.stringify({ status: 'Online' }),
        });
      } catch (error) {
        console.error('Failed to update status to Online:', error);
      }
    };

    // Helper to mark the user Offline
    const setOffline = async () => {
      try {
        await api(`/api/users/${currentUserId}/status`, {
          method: 'POST',
          body: JSON.stringify({ status: 'Offline' }),
        });
      } catch (error) {
        // Ignore errors on unload (network may be unavailable)
        console.error('Failed to update status to Offline:', error);
      }
    };

    // Immediately mark as Online when the app mounts
    setOnline();

    // Keep last_seen fresh while the tab is open so profile doesn't flip to Offline
    const intervalId = window.setInterval(() => {
      setOnline();
    }, 60_000); // every 60 seconds
    
    // Handle page unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery on page unload
      navigator.sendBeacon(
        `/api/users/${CURRENT_USER_ID}/status`,
        JSON.stringify({ status: 'Offline' })
      );
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.clearInterval(intervalId);
      setOffline();
    };
  }, []);
}

// Hook to update status when starting/stopping a game
export function useGameStatus(gameSlug?: string) {
  useEffect(() => {
    if (!gameSlug) return;
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return;
    
    const setInGame = async () => {
      try {
        await api(`/api/users/${currentUserId}/status`, {
          method: 'POST',
          body: JSON.stringify({ 
            status: 'In Game',
            gameSlug,
          }),
        });
      } catch (error) {
        console.error('Failed to update status to In Game:', error);
      }
    };
    
    setInGame();
    
    return () => {
      // Set back to Online when game ends
      api(`/api/users/${currentUserId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: 'Online' }),
      }).catch(console.error);
    };
  }, [gameSlug]);
}

