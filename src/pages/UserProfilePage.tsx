'use client';

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, onlineApi, achievementsApi, friendsApi, getCurrentUserId } from '@/lib/api-client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Gamepad2, Trophy } from 'lucide-react';
import { getDefaultAvatarForUsername } from '@/config/gameAvatarIcons';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface UserSearchItem {
  id: number;
  uuid: string;
  username: string;
  email: string;
  full_name?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  status?: string;
}

export function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const currentUserId = getCurrentUserId();

  const { data: userSearchResult, isLoading, isError } = useQuery({
    queryKey: ['user-profile', username],
    enabled: !!username,
    queryFn: async () => {
      // Fetch a page of users and find the username client-side (no search endpoint exposed)
      try {
        const res = await api<UserSearchItem[]>(`/api/v1/users/users?limit=1000&skip=0`);
        const exact = res.find(
          (u) => u.username.toLowerCase() === username!.toLowerCase()
        );
        return exact || null;
      } catch {
        return null;
      }
    },
    retry: 1,
  });

  const user = userSearchResult;

  const { data: achievementsData } = useQuery({
    queryKey: ['user-achievements', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        return await achievementsApi.getUserAchievements(String(user!.id));
      } catch (err) {
        return [];
      }
    },
  });

  const achievements = achievementsData || [];

  const { data: playtimeData } = useQuery({
    queryKey: ['user-playtime', user?.id],
    enabled: !!user?.id,
    // No playtime endpoint yet; return placeholder structure
    queryFn: async () => ({ totalHours: 0, items: [] as Array<{ game: string; hours: number }> }),
  });

  const isOwnProfile = !!currentUserId && user && String(user.id) === currentUserId;

  const { data: friendsData } = useQuery({
    queryKey: ['user-friends', isOwnProfile],
    enabled: !!isOwnProfile,
    queryFn: async () => {
      try {
        // friends service returns current user's friends; only fetch for own profile
        const res = await friendsApi.getFriendsList();
        const ids = res.friends || [];
        return { count: ids.length, items: ids.slice(0, 6) };
      } catch {
        return { count: 0, items: [] as string[] };
      }
    },
  });

  const { data: statusData } = useQuery({
    queryKey: ['user-status', user?.uuid],
    enabled: !!user?.uuid,
    queryFn: () =>
      user?.uuid ? onlineApi.getStatus(user.uuid).catch(() => ({ status: 'Offline' })) : Promise.resolve({ status: 'Offline' }),
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-gray-300 mb-2">Failed to load profile.</p>
        <p className="text-sm text-gray-500">Please try again later.</p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-gray-300 mb-2">User not found.</p>
        <p className="text-sm text-gray-500">The profile you’re looking for does not exist.</p>
      </div>
    );
  }

  const avatarSrc = user.avatar_url || getDefaultAvatarForUsername(user.username);
  const status = statusData?.status || user.status || 'Offline';
  const gameSlug = (statusData as any)?.game_slug as string | undefined;

  const isOnline = status === 'Online' || status === 'online';
  const isInGame = status === 'In Game' || status === 'in_game' || !!gameSlug;

  return (
    <div className="animate-fade-in space-y-6">
      <Card className="bg-void-800 border-void-700">
        <CardContent className="p-6 flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-blood-500/60">
              <AvatarImage src={avatarSrc} alt={user.username} />
              <AvatarFallback>
                {user.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span
              className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-void-900 ${
                isOnline ? 'bg-green-400' : isInGame ? 'bg-blue-400' : 'bg-gray-500'
              }`}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="font-orbitron text-2xl font-black text-white">
                {user.display_name || user.username}
              </h1>
              <Badge variant="outline" className="text-xs">
                @{user.username}
              </Badge>
              {isOwnProfile && (
                <Button asChild size="sm" variant="outline">
                  <Link to="/profile">View your profile</Link>
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-400 max-w-xl">
              {user.bio || 'No bio provided yet.'}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-300">
              <span className="flex items-center gap-1">
                <div
                  className={`h-2 w-2 rounded-full ${
                    isOnline ? 'bg-green-400 animate-pulse' : isInGame ? 'bg-blue-400' : 'bg-gray-500'
                  }`}
                />
                {isInGame ? 'In Game' : isOnline ? 'Online' : 'Offline'}
                {gameSlug && ` – Playing ${gameSlug}`}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {playtimeData?.totalHours ?? 0}h played
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {isOwnProfile
                  ? `${friendsData?.count ?? 0} friends`
                  : 'Friends hidden'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-void-800 border-void-700">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                <h3 className="font-semibold text-white">Achievements</h3>
              </div>
              <Badge variant="secondary">{achievements.length}</Badge>
            </div>
            {achievements.length ? (
              <div className="space-y-2">
                {achievements.slice(0, 6).map((a: any) => (
                  <div key={a.achievement.id} className="flex items-center justify-between bg-void-900/60 border border-void-700 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm text-white">{a.achievement.name}</p>
                      <p className="text-xs text-gray-400 line-clamp-1">{a.achievement.description}</p>
                    </div>
                    <Badge variant={a.unlocked ? 'default' : 'outline'}>
                      {a.unlocked ? 'Unlocked' : `${Math.round((a.progress ?? 0) * 100)}%`}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No achievements yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-void-800 border-void-700">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-400" />
                <h3 className="font-semibold text-white">Playtime</h3>
              </div>
              <Badge variant="secondary">{playtimeData?.totalHours ?? 0}h</Badge>
            </div>
            {playtimeData?.items?.length ? (
              <div className="space-y-2">
                {playtimeData.items.slice(0, 5).map((g) => (
                  <div key={g.game} className="flex items-center justify-between text-sm text-gray-300 bg-void-900/60 rounded-lg px-3 py-2">
                    <span>{g.game}</span>
                    <span className="text-gray-400">{g.hours}h</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Playtime data not available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-void-800 border-void-700">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-400" />
              <h3 className="font-semibold text-white">Friends</h3>
            </div>
            <Badge variant="secondary">
              {isOwnProfile ? friendsData?.count ?? 0 : 'Private'}
            </Badge>
          </div>
          {isOwnProfile ? (
            friendsData?.items?.length ? (
              <div className="flex flex-wrap gap-2">
                {friendsData.items.map((fid: string) => (
                  <Badge key={fid} variant="outline">{fid}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No friends yet.</p>
            )
          ) : (
            <p className="text-sm text-gray-400">Friends are private.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



