'use client';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, getCurrentUserId } from "@/lib/api-client";
import { Notification } from "@shared/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Bell, Check, UserPlus, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
export function NotificationsPage() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  const { data: notifications = [], isLoading, isError } = useQuery({
    queryKey: ['notifications', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      try {
        return await notificationsApi.list(userId, false, 50);
      } catch (err: any) {
        const msg = String(err?.message || '');
        if (msg.includes('404')) return [];
        throw err;
      }
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const sortedNotifications = notifications.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => notificationsApi.markRead(notificationId, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
    onError: () => {
      toast.error("Failed to mark notification as read.");
    }
  });
  const getIcon = (type: string) => {
    switch (type) {
      case 'friend-request':
        return <UserPlus className="h-6 w-6 text-blue-400" />;
      case 'achievement':
        return <Trophy className="h-6 w-6 text-yellow-400" />;
      default:
        return <Bell className="h-6 w-6 text-gray-400" />;
    }
  };
  if (!userId) {
    return <div className="text-center text-gray-400">Please log in to view notifications.</div>;
  }
  if (isError) {
    return <div className="text-center text-red-500">Failed to load notifications.</div>;
  }
  return (
    <div className="animate-fade-in">
      <h1 className="font-orbitron text-4xl font-black text-blood-500 mb-8">Notifications</h1>
      <div className="space-y-4 max-w-3xl mx-auto">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4 bg-void-800 rounded-lg border border-void-700">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-grow space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))
        ) : sortedNotifications.length > 0 ? (
          sortedNotifications.map(notif => (
            <div
              key={notif.id}
              className={cn(
                "flex items-start gap-4 p-4 bg-void-800 rounded-lg border border-void-700 transition-colors",
                !notif.is_read && "bg-void-700/50 border-blood-500/30"
              )}
            >
              <div className="bg-void-900 p-2 rounded-full mt-1">{getIcon(notif.type)}</div>
              <div className="flex-grow">
                <p className="text-gray-200">{notif.message}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                </p>
              </div>
              {!notif.is_read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsReadMutation.mutate(notif.id)}
                  disabled={markAsReadMutation.isPending}
                >
                  <Check className="mr-2 h-4 w-4" /> Mark as read
                </Button>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-void-800 rounded-lg border border-void-700">
            <h2 className="text-2xl font-bold mb-2">All caught up!</h2>
            <p className="text-gray-400">You have no new notifications.</p>
          </div>
        )}
      </div>
    </div>
  );
}