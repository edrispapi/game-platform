'use client';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const registerMutation = useMutation({
    mutationFn: (data: { username: string; email: string; password: string }) => 
      authApi.register(data),
    onSuccess: () => {
      toast.success('Account created successfully! Please log in.');
      navigate('/login');
    },
    onError: (error: Error) => {
      toast.error(`Registration failed: ${error.message}`);
    },
  });
  
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    registerMutation.mutate({ 
      username: username.trim(), 
      email: email.trim(), 
      password 
    });
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
              <Input 
                id="username" 
                placeholder="YourGamerTag" 
                required 
                minLength={3}
                maxLength={50}
                className="bg-void-700 border-void-600 focus:ring-blood-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={registerMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="gamer@example.com" 
                required 
                className="bg-void-700 border-void-600 focus:ring-blood-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={registerMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="********" 
                required 
                minLength={8}
                className="bg-void-700 border-void-600 focus:ring-blood-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={registerMutation.isPending}
              />
              <p className="text-xs text-gray-500">Must be at least 8 characters</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="********" 
                required 
                minLength={8}
                className="bg-void-700 border-void-600 focus:ring-blood-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={registerMutation.isPending}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-blood-500 hover:bg-blood-600 text-lg font-bold shadow-blood-glow"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>
            <p className="text-sm text-gray-400 text-center">
              Already have an account? <Link to="/login" className="font-semibold text-blood-500 hover:underline">Log in</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  );
}
