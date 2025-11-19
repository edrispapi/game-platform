import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
export function RegisterPage() {
  const navigate = useNavigate();
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // For the demo, we just navigate to the store.
    navigate('/store');
  };
  return (
    <AuthLayout>
      <Card className="bg-void-800/80 border-void-700 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-orbitron font-bold text-blood-500">Create Your Account</CardTitle>
          <CardDescription className="text-gray-400">Join the Crimson Grid and start your journey.</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="YourGamerTag" required className="bg-void-700 border-void-600 focus:ring-blood-500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="gamer@example.com" required className="bg-void-700 border-void-600 focus:ring-blood-500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="********" required className="bg-void-700 border-void-600 focus:ring-blood-500" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full bg-blood-500 hover:bg-blood-600 text-lg font-bold shadow-blood-glow">Sign Up</Button>
            <p className="text-sm text-gray-400 text-center">
              Already have an account? <Link to="/login" className="font-semibold text-blood-500 hover:underline">Log in</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  );
}