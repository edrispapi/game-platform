import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
export function SettingsPage() {
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
                <Input id="username" defaultValue="shadcn" className="bg-void-700 border-void-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input id="bio" defaultValue="Building beautiful things." className="bg-void-700 border-void-600" />
              </div>
              <Button className="bg-blood-500 hover:bg-blood-600">Save Changes</Button>
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
                <Label htmlFor="friend-requests">Friend Requests</Label>
                <Switch id="friend-requests" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="game-updates">Game Updates</Label>
                <Switch id="game-updates" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="promotions">Promotions & Offers</Label>
                <Switch id="promotions" />
              </div>
              <Button className="bg-blood-500 hover:bg-blood-600">Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}