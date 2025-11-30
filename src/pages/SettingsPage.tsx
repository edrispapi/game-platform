'use client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { UserProfile } from "@shared/types";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  User, Mail, Bell, Shield, Eye, EyeOff, Globe, Lock, 
  Palette, Gamepad2, Download, Trash2, Save, Upload,
  Settings as SettingsIcon, UserCircle, Key, Smartphone
} from "lucide-react";

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
  const [friendRequests, setFriendRequests] = useState(true);
  const [workshopUpdates, setWorkshopUpdates] = useState(true);
  const [gameUpdates, setGameUpdates] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [hideOnlineStatus, setHideOnlineStatus] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setBio(profile.bio);
      setProfilePublic(profile.settings.profilePublic);
      setEmailNotifications(profile.settings.emailNotifications);
      setHideOnlineStatus(profile.settings.hideOnlineStatus || false);
      setAvatarUrl(profile.avatar);
    }
  }, [profile]);

  const profileMutation = useMutation({
    mutationFn: (updatedProfile: { username: string; bio: string; avatar?: string }) => api('/api/profile', {
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

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => api('/api/profile/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: Error) => {
      toast.error(`Failed to change password: ${error.message}`);
    },
  });

  const twoFactorMutation = useMutation({
    mutationFn: (enabled: boolean) => api('/api/profile/two-factor', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),
    onSuccess: (data: any) => {
      if (data.qrCode) {
        toast.success('2FA enabled! Scan the QR code with your authenticator app.');
      } else {
        toast.success('2FA disabled successfully!');
      }
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update 2FA: ${error.message}`);
    },
  });

  const handleSaveProfile = () => {
    profileMutation.mutate({ username, bio, avatar: avatarUrl });
  };

  const handleSaveSettings = () => {
    settingsMutation.mutate({ profilePublic, emailNotifications, hideOnlineStatus });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="space-y-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="animate-fade-in">
        <Card className="bg-void-800 border-void-700">
          <CardContent className="p-12 text-center">
            <p className="text-red-500 text-lg">Failed to load settings.</p>
            <Button 
              className="mt-4 bg-blood-500 hover:bg-blood-600"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['profile'] })}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron text-4xl font-black text-blood-500 mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account, preferences, and privacy settings</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <SettingsIcon className="h-4 w-4 mr-2" />
          Account Active
        </Badge>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-void-800 border-void-700">
          <TabsTrigger value="profile" className="data-[state=active]:bg-blood-500 data-[state=active]:text-white">
            <UserCircle className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="account" className="data-[state=active]:bg-blood-500 data-[state=active]:text-white">
            <Shield className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-blood-500 data-[state=active]:text-white">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="data-[state=active]:bg-blood-500 data-[state=active]:text-white">
            <Lock className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="preferences" className="data-[state=active]:bg-blood-500 data-[state=active]:text-white">
            <Palette className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card className="bg-void-800 border-void-700 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <User className="h-6 w-6 text-blood-500" />
                Public Profile
              </CardTitle>
              <CardDescription>This is how others will see you on the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-void-600">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-void-700 text-2xl">
                    {username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Label>Profile Picture</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Avatar URL"
                      className="bg-void-700 border-void-600 flex-1"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                    />
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Enter a URL or upload a new image</p>
                </div>
              </div>

              <Separator className="bg-void-700" />

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-base font-semibold">Username</Label>
                <Input 
                  id="username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  className="bg-void-700 border-void-600 text-white"
                  placeholder="Enter your username"
                />
                <p className="text-xs text-gray-500">This is your unique identifier on the platform</p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-base font-semibold">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="bg-void-700 border-void-600 text-white min-h-[120px]"
                  placeholder="Tell the community about yourself..."
                />
                <p className="text-xs text-gray-500">{bio.length}/500 characters</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-void-700">
                <div className="text-center p-4 bg-void-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blood-500">{profile.hoursPlayed || 0}</div>
                  <div className="text-xs text-gray-400 mt-1">Hours Played</div>
                </div>
                <div className="text-center p-4 bg-void-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blood-500">{profile.achievementsCount || 0}</div>
                  <div className="text-xs text-gray-400 mt-1">Achievements</div>
                </div>
                <div className="text-center p-4 bg-void-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blood-500">{profile.friendsCount || 0}</div>
                  <div className="text-xs text-gray-400 mt-1">Friends</div>
                </div>
              </div>

              <Button 
                className="bg-blood-500 hover:bg-blood-600 w-full" 
                onClick={handleSaveProfile} 
                disabled={profileMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {profileMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6 mt-6">
          <Card className="bg-void-800 border-void-700 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Shield className="h-6 w-6 text-blood-500" />
                Account Security
              </CardTitle>
              <CardDescription>Manage your account security and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={profile.email || 'Not set'} 
                  disabled 
                  className="bg-void-900 border-void-700 text-gray-500" 
                />
                <p className="text-xs text-gray-500">
                  {profile.email ? 'Email cannot be changed. Contact support if needed.' : 'Email not set. Please update your account.'}
                </p>
              </div>

              <Separator className="bg-void-700" />

              <div className="space-y-4">
                <Card className="bg-void-700/50 border-void-600">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Key className="h-5 w-5 text-gray-400" />
                      Change Password
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="bg-void-800 border-void-600"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-void-800 border-void-600"
                          required
                          minLength={8}
                        />
                        <p className="text-xs text-gray-500">Must be at least 8 characters</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="bg-void-800 border-void-600"
                          required
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="bg-blood-500 hover:bg-blood-600"
                        disabled={passwordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                      >
                        {passwordMutation.isPending ? 'Changing...' : 'Change Password'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="bg-void-700/50 border-void-600">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Smartphone className="h-5 w-5 text-gray-400" />
                      Two-Factor Authentication
                    </CardTitle>
                    <CardDescription>Add an extra layer of security to your account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">Status</div>
                        <div className="text-sm text-gray-500">
                          {profile.settings.twoFactorEnabled ? '2FA is enabled' : '2FA is disabled'}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => twoFactorMutation.mutate(!profile.settings.twoFactorEnabled)}
                        disabled={twoFactorMutation.isPending}
                      >
                        {profile.settings.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                      </Button>
                    </div>
                    {twoFactorMutation.data?.qrCode && (
                      <div className="mt-4 p-4 bg-void-800 rounded-lg">
                        <p className="text-sm text-gray-400 mb-2">Scan this QR code with your authenticator app:</p>
                        <img src={twoFactorMutation.data.qrCode} alt="2FA QR Code" className="w-48 h-48 mx-auto" />
                        <p className="text-xs text-gray-500 mt-2 text-center">Or enter this code manually: {twoFactorMutation.data.secret}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Separator className="bg-void-700" />

              <div className="space-y-2">
                <Label className="text-base font-semibold text-red-400">Danger Zone</Label>
                <Card className="bg-red-950/20 border-red-900/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-red-400">Delete Account</div>
                        <div className="text-sm text-gray-500">Permanently delete your account and all data</div>
                      </div>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card className="bg-void-800 border-void-700 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Bell className="h-6 w-6 text-blood-500" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Control how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-void-700/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Notifications
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Receive notifications via email</div>
                  </div>
                  <Switch 
                    checked={emailNotifications} 
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-void-700/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Friend Requests
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Get notified when someone sends you a friend request</div>
                  </div>
                  <Switch 
                    checked={friendRequests} 
                    onCheckedChange={setFriendRequests}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-void-700/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Workshop Updates
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Notifications for workshop items you follow</div>
                  </div>
                  <Switch 
                    checked={workshopUpdates} 
                    onCheckedChange={setWorkshopUpdates}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-void-700/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold flex items-center gap-2">
                      <Gamepad2 className="h-4 w-4" />
                      Game Updates
                    </div>
                    <div className="text-sm text-gray-500 mt-1">News and updates about games in your library</div>
                  </div>
                  <Switch 
                    checked={gameUpdates} 
                    onCheckedChange={setGameUpdates}
                  />
                </div>
              </div>

              <Button 
                className="bg-blood-500 hover:bg-blood-600 w-full" 
                onClick={handleSaveSettings} 
                disabled={settingsMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {settingsMutation.isPending ? 'Saving...' : 'Save Notification Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6 mt-6">
          <Card className="bg-void-800 border-void-700 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Lock className="h-6 w-6 text-blood-500" />
                Privacy Settings
              </CardTitle>
              <CardDescription>Control who can see your profile and activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-void-700/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold flex items-center gap-2">
                      {profilePublic ? <Globe className="h-4 w-4 text-green-400" /> : <Lock className="h-4 w-4 text-gray-400" />}
                      Public Profile
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {profilePublic 
                        ? 'Your profile is visible to everyone' 
                        : 'Your profile is private and only visible to friends'}
                    </div>
                  </div>
                  <Switch 
                    checked={profilePublic} 
                    onCheckedChange={setProfilePublic}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-void-700/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Show Playtime
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Display your total hours played on your profile</div>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 bg-void-700/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Show Game Library
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Allow others to see your game collection</div>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 bg-void-700/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold flex items-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      Hide Online Status
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Don't show when you're online to other users</div>
                  </div>
                  <Switch 
                    checked={hideOnlineStatus} 
                    onCheckedChange={setHideOnlineStatus}
                  />
                </div>
              </div>

              <Button 
                className="bg-blood-500 hover:bg-blood-600 w-full" 
                onClick={handleSaveSettings} 
                disabled={settingsMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {settingsMutation.isPending ? 'Saving...' : 'Save Privacy Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-void-800 border-void-700 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-blood-500" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <select className="w-full px-4 py-2 bg-void-700 border border-void-600 rounded-md text-white">
                    <option>Dark (Default)</option>
                    <option>Light</option>
                    <option>Auto</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <select className="w-full px-4 py-2 bg-void-700 border border-void-600 rounded-md text-white">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-void-800 border-void-700 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-blood-500" />
                  Gaming Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Download Location</Label>
                  <Input 
                    placeholder="/games/downloads" 
                    className="bg-void-700 border-void-600"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Auto-update Games</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Cloud Save Sync</Label>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
