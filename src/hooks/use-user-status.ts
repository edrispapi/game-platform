// Hook to manage user status updates (Online/Offline/In Game)
import { useEffect } from 'react';
import { api } from '@/lib/api-client';

const CURRENT_USER_ID = 'user-1'; // In a real app, get from auth context

export function useUserStatus() {
  useEffect(() => {
    // Set status to Online when component mounts
    const setOnline = async () => {
      try {
        await api(`/api/users/${CURRENT_USER_ID}/status`, {
          method: 'POST',
          body: JSON.stringify({ status: 'Online' }),
        });
      } catch (error) {
        console.error('Failed to update status to Online:', error);
      }
    };
    
    setOnline();
    
    // Set status to Offline when component unmounts or page unloads
    const setOffline = async () => {
      try {
        await api(`/api/users/${CURRENT_USER_ID}/status`, {
          method: 'POST',
          body: JSON.stringify({ status: 'Offline' }),
        });
      } catch (error) {
        // Ignore errors on unload (network may be unavailable)
        console.error('Failed to update status to Offline:', error);
      }
    };
    
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
      setOffline();
    };
  }, []);
}

// Hook to update status when starting/stopping a game
export function useGameStatus(gameSlug?: string) {
  useEffect(() => {
    if (!gameSlug) return;
    
    const setInGame = async () => {
      try {
        await api(`/api/users/${CURRENT_USER_ID}/status`, {
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
      api(`/api/users/${CURRENT_USER_ID}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: 'Online' }),
      }).catch(console.error);
    };
  }, [gameSlug]);
}

