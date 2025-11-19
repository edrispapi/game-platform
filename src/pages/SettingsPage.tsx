import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { UserProfile } from "@shared/types";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isError } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: () => api('/api/profile'),
  });
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profilePublic, setProfilePublic] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setBio(profile.bio);
      setProfilePublic(profile.settings.profilePublic);
      setEmailNotifications(profile.settings.emailNotifications);
    }
  }, [profile]);
  const profileMutation = useMutation({
    mutationFn: (updatedProfile: { username: string; bio: string }) => api('/api/profile', {
      method: 'POST',
      body: JSON.stringify(updatedProfile),
    }),
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      toast.error('Failed to update profile. Please try again.');
    },
  });
  const settingsMutation = useMutation({
    mutationFn: (newSettings: UserProfile['settings']) => api('/api/profile/settings', {
      method: 'POST',
      body: JSON.stringify(newSettings),
    }),
    onSuccess: () => {
      toast.success('Settings saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      toast.error('Failed to save settings. Please try again.');
    },
  });
  const handleSaveProfile = () => {
    profileMutation.mutate({ username, bio });
  };
  const handleSaveSettings = () => {
    settingsMutation.mutate({ profilePublic, emailNotifications });
  };
  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-10 w-64 mb-8" />
        <Skeleton className="h-10 w-full mb-6" />
        <Card className="bg-void-800 border-void-700">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }
  if (isError || !profile) {
    return <div className="text-center text-red-500">Failed to load settings.</div>;
  }
  return (
    <div className="animate-fade-in">
      <h1 className="font-orbitron text-4xl font-black text-blood-500 mb-8">Settings</h1>
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-void-800 border-void-700">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="py-6">
          <Card className="bg-void-800 border-void-700">
            <CardHeader>
              <CardTitle>Public Profile</CardTitle>
              <CardDescription>This is how others will see you on the site.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="bg-void-700 border-void-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="bg-void-700 border-void-600" />
              </div>
              <Button className="bg-blood-500 hover:bg-blood-600" onClick={handleSaveProfile} disabled={profileMutation.isPending}>
                {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="account" className="py-6">
          <Card className="bg-void-800 border-void-700">
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account settings and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="user@example.com" disabled className="bg-void-900 border-void-700" />
              </div>
              <Button variant="destructive">Delete Account</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications" className="py-6">
          <Card className="bg-void-800 border-void-700">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control how you receive notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="profile-public">Public Profile</Label>
                <Switch id="profile-public" checked={profilePublic} onCheckedChange={setProfilePublic} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <Button className="bg-blood-500 hover:bg-blood-600" onClick={handleSaveSettings} disabled={settingsMutation.isPending}>
                {settingsMutation.isPending ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}