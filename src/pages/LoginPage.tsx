'use client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import React from "react";
export function LoginPage() {
  const navigate = useNavigate();
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd have auth logic here.
    // For the demo, we just navigate to the store.
    navigate('/store');
  };
  return (
    <AuthLayout>
      <Card className="bg-void-800/80 border-void-700 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-orbitron font-bold text-blood-500">Welcome Back</CardTitle>
          <CardDescription className="text-gray-400">Enter your credentials to access your grid.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
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
            <Button type="submit" className="w-full bg-blood-500 hover:bg-blood-600 text-lg font-bold shadow-blood-glow">Login</Button>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-void-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-void-800 px-2 text-gray-400">Or continue with</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full">
              <Button variant="outline" className="border-void-600 hover:bg-void-700">Google</Button>
              <Button variant="outline" className="border-void-600 hover:bg-void-700">Discord</Button>
              <Button variant="outline" className="border-void-600 hover:bg-void-700">Steam</Button>
            </div>
            <p className="text-sm text-gray-400 text-center">
              Don't have an account? <Link to="/register" className="font-semibold text-blood-500 hover:underline">Sign up</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  );
}