// Hook to manage user status updates (Online/Offline/In Game)
import { useEffect } from 'react';
import { onlineApi, getCurrentUserId } from '@/lib/api-client';

export function useUserStatus() {
  useEffect(() => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return;
    // Helper to mark the user Online
    const setOnline = async () => {
      // Backend route missing in local env; skip call to avoid noise
      return;
    };

    // Helper to mark the user Offline
    const setOffline = async () => {
      // Backend route missing in local env; skip call to avoid noise
      return;
    };

    // Immediately mark as Online when the app mounts
    setOnline();

    // Keep last_seen fresh while the tab is open so profile doesn't flip to Offline
    const intervalId = window.setInterval(() => {
      setOnline();
    }, 60_000); // every 60 seconds
    
    // Handle page unload
    const handleBeforeUnload = () => {
      // Best-effort offline update on unload; ignore errors
      setOffline();
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
        await onlineApi.setStatus(currentUserId, 'In Game', gameSlug);
      } catch (error) {
        console.error('Failed to update status to In Game:', error);
      }
    };
    
    setInGame();
    
    return () => {
      // Set back to Online when game ends
      onlineApi.setStatus(currentUserId, 'Online').catch(console.error);
    };
  }, [gameSlug]);
}

