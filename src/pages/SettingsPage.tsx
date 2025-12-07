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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, authApi, gamesApi, type UserResponse } from "@/lib/api-client";
import { UserProfile } from "@shared/types";
import React, { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  User, Mail, Bell, Shield, Eye, EyeOff, Globe, Lock, 
  Palette, Gamepad2, Download, Trash2, Save, Upload,
  Settings as SettingsIcon, UserCircle, Key, Smartphone
} from "lucide-react";
import { getDefaultAvatarForUsername } from "@/config/gameAvatarIcons";
import { GAME_AVATAR_ICONS } from "@/config/gameAvatarIcons";
import { cn } from "@/lib/utils";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading, isError, error } = useQuery<UserResponse>({
    queryKey: ['user', 'me'],
    queryFn: () => authApi.me(),
    retry: 1,
    retryOnMount: false,
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
  const [disableVideoPreviews, setDisableVideoPreviews] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showGameIcons, setShowGameIcons] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Always use static game avatar icons from config (PDF) - no loading needed
  const gameIcons = GAME_AVATAR_ICONS;
  const isLoadingIcons = false;
  
  // Game icon chooser removed; no dialog handling needed
  useEffect(() => {
    if (showGameIcons) {
      setShowGameIcons(false);
    }
  }, [showGameIcons]);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setBio(user.bio || '');
      setProfilePublic(user.profile_visibility === 'public');
      setHideOnlineStatus(!user.show_online_status);
      setAvatarUrl(user.avatar_url || getDefaultAvatarForUsername(user.username));
      if (user.extra_metadata && typeof user.extra_metadata.disable_video_previews === 'boolean') {
        setDisableVideoPreviews(user.extra_metadata.disable_video_previews);
      }
    }
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: (updatedProfile: { display_name?: string; bio?: string; avatar_url?: string }) => 
      authApi.updateProfile(updatedProfile),
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const settingsMutation = useMutation({
    mutationFn: (newSettings: {
      profile_visibility?: string;
      show_online_status?: boolean;
      extra_metadata?: Record<string, any>;
    }) =>
      authApi.updateProfile(newSettings),
    onSuccess: () => {
      toast.success('Settings saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) => 
      api<{ message: string }>('/api/v1/users/change-password', {
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
    mutationFn: (enabled: boolean) => 
      api<{ enabled: boolean; qr_code?: string; secret?: string; message: string }>('/api/v1/users/two-factor', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),
    onSuccess: (data) => {
      if (data.enabled && data.qr_code) {
        toast.success('2FA enabled! Scan the QR code with your authenticator app.');
      } else {
        toast.success('2FA disabled successfully!');
      }
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update 2FA: ${error.message}`);
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Convert file to base64 data URL for now (in production, upload to S3/MinIO)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        // Update profile with the data URL
        await profileMutation.mutateAsync({ 
          display_name: username, 
          bio: bio, 
          avatar_url: base64String 
        });
        setAvatarUrl(base64String);
        setIsUploadingAvatar(false);
        toast.success('Avatar uploaded successfully!');
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error(`Failed to upload avatar: ${(error as Error).message}`);
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = () => {
    profileMutation.mutate({ 
      display_name: username, 
      bio: bio, 
      avatar_url: avatarUrl || undefined 
    });
  };

  const handleSaveSettings = () => {
    settingsMutation.mutate({ 
      profile_visibility: profilePublic ? 'public' : 'private',
      show_online_status: !hideOnlineStatus
    });
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
    passwordMutation.mutate({ current_password: currentPassword, new_password: newPassword });
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

  if (isError || !user) {
    const errorMessage = (isError && error) ? (error as Error).message : 'Failed to load settings.';
    const isAuthError = errorMessage.includes('Not authenticated') || errorMessage.includes('Could not validate credentials');
    
    return (
      <div className="animate-fade-in">
        <Card className="bg-void-800 border-void-700">
          <CardContent className="p-12 text-center">
            <p className="text-red-500 text-lg mb-2">
              {isAuthError ? 'لطفاً دوباره لاگین کنید، نشست شما منقضی شده است.' : 'Failed to load settings.'}
            </p>
            {errorMessage && !isAuthError && (
              <p className="text-gray-400 text-sm mb-4">{errorMessage}</p>
            )}
            <div className="flex gap-3 justify-center">
              {isAuthError ? (
                <Button 
                  className="bg-blood-500 hover:bg-blood-600"
                  onClick={() => window.location.href = '/login'}
                >
                  Go to Login
                </Button>
              ) : (
            <Button 
                  className="bg-blood-500 hover:bg-blood-600"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['user', 'me'] })}
            >
              Retry
            </Button>
              )}
            </div>
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
                Profile
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
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Profile Picture</Label>
                    <span className="text-[11px] text-gray-500">PNG/JPG, square works best</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <Button 
                      size="sm"
                      className="bg-blood-500 hover:bg-blood-600"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploadingAvatar ? 'Uploading...' : 'Upload Image'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setAvatarUrl(getDefaultAvatarForUsername(username))}
                    >
                      Reset to Default
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500 break-all">
                    Current: {avatarUrl || 'Not set'}
                  </div>
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

              {/* Stats - Placeholder for now, can be fetched from other services */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-void-700">
                <div className="text-center p-4 bg-void-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blood-500">0</div>
                  <div className="text-xs text-gray-400 mt-1">Hours Played</div>
                </div>
                <div className="text-center p-4 bg-void-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blood-500">0</div>
                  <div className="text-xs text-gray-400 mt-1">Achievements</div>
                </div>
                <div className="text-center p-4 bg-void-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blood-500">0</div>
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
                  value={user.email || 'Not set'} 
                  disabled 
                  className="bg-void-900 border-void-700 text-gray-500" 
                />
                <p className="text-xs text-gray-500">
                  {user.email ? 'Email cannot be changed. Contact support if needed.' : 'Email not set. Please update your account.'}
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
                          {user.two_factor_enabled ? '2FA is enabled' : '2FA is disabled'}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => twoFactorMutation.mutate(!user.two_factor_enabled)}
                        disabled={twoFactorMutation.isPending}
                      >
                        {user.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA'}
                      </Button>
                    </div>
                    {twoFactorMutation.data?.qr_code && (
                      <div className="mt-4 p-4 bg-void-800 rounded-lg">
                        <p className="text-sm text-gray-400 mb-2">Scan this QR code with your authenticator app:</p>
                        <img src={twoFactorMutation.data.qr_code} alt="2FA QR Code" className="w-48 h-48 mx-auto" />
                        {twoFactorMutation.data.secret && (
                          <p className="text-xs text-gray-500 mt-2 text-center">Or enter this code manually: <code className="bg-void-700 px-2 py-1 rounded">{twoFactorMutation.data.secret}</code></p>
                        )}
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
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Video previews in Store</Label>
                    <p className="text-xs text-gray-400">
                      Disable hover video trailers on game cards (useful on low bandwidth or laptops).
                    </p>
                  </div>
                  <Switch
                    checked={!disableVideoPreviews}
                    onCheckedChange={(checked) => {
                      setDisableVideoPreviews(!checked);
                      const current = user?.extra_metadata || {};
                      settingsMutation.mutate({
                        profile_visibility: profilePublic ? 'public' : 'private',
                        show_online_status: !hideOnlineStatus,
                        extra_metadata: {
                          ...current,
                          disable_video_previews: !checked,
                        },
                      });
                    }}
                  />
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

      {/* Game icon chooser dialog removed */}
    </div>
  );
}
