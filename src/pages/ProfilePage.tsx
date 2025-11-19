import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Trophy, Users } from "lucide-react";
export function ProfilePage() {
  return (
    <div className="animate-fade-in">
      <Card className="bg-void-800 border-void-700 mb-8">
        <CardContent className="p-6 flex items-center gap-6">
          <Avatar className="h-24 w-24 border-4 border-blood-500">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-orbitron font-bold">shadcn</h1>
            <p className="text-gray-400 mt-1">Building beautiful things.</p>
            <div className="flex gap-4 mt-4">
              <Badge variant="secondary" className="bg-void-700 text-gray-300 py-1 px-3">
                <Clock className="mr-2 h-4 w-4" /> 1,234 Hours Played
              </Badge>
              <Badge variant="secondary" className="bg-void-700 text-gray-300 py-1 px-3">
                <Trophy className="mr-2 h-4 w-4" /> 88 Achievements
              </Badge>
              <Badge variant="secondary" className="bg-void-700 text-gray-300 py-1 px-3">
                <Users className="mr-2 h-4 w-4" /> 123 Friends
              </Badge>
            </div>
          </div>
          <Button className="ml-auto bg-void-700 hover:bg-void-600">Edit Profile</Button>
        </CardContent>
      </Card>
      <Card className="bg-void-800 border-void-700">
        <CardHeader>
          <CardTitle className="font-orbitron text-2xl text-blood-500">Favorite Games</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">User's favorite games will be displayed here.</p>
          {/* Placeholder for GameCards */}
        </CardContent>
      </Card>
    </div>
  );
}