'use client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import React, { useState } from "react";
import { authApi, setAuthToken, setCurrentUserId } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Login via FastAPI
      const response = await authApi.login({
        username_or_email: email.trim(),
        password: password,
        remember_me: true,
      });
      
      // Store auth token and user info
      setAuthToken(response.access_token);
      setCurrentUserId(String(response.user.id));
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('crimson-username', response.user.username);
        window.localStorage.setItem('crimson-email', response.user.email);
      }
      
      navigate('/store');
    } catch (err) {
      console.error('Login error:', err);
      setError((err as Error).message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'discord' | 'steam') => {
    setIsOAuthLoading(provider);
    setError(null);
    
    try {
      // Prompt user for email (OAuth providers typically provide this)
      const userEmail = prompt(`Enter your ${provider.charAt(0).toUpperCase() + provider.slice(1)} email address:`);
      if (!userEmail || !userEmail.includes('@')) {
        setError('Please enter a valid email address.');
        setIsOAuthLoading(null);
        return;
      }

      // Generate a unique provider user ID (in production, this comes from OAuth provider)
      const providerUserId = `${provider}_${userEmail.replace('@', '_').replace(/\./g, '_')}_${Date.now()}`;
      
      // Extract username from email or prompt for it
      const emailUsername = userEmail.split('@')[0];
      const username = prompt(`Enter a username (or press OK to use "${emailUsername}"):`) || emailUsername;
      
      // Call OAuth login endpoint - no password required!
      const response = await authApi.oauthLogin({
        provider,
        provider_user_id: providerUserId,
        email: userEmail,
        username: username,
        full_name: username,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=4285f4&color=fff`,
        remember_me: true,
      });
      
      // Store auth token and user info
      setAuthToken(response.access_token);
      setCurrentUserId(String(response.user.id));
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('crimson-username', response.user.username);
        window.localStorage.setItem('crimson-email', response.user.email);
        // Store token expiration time (1 day from now)
        const expirationTime = Date.now() + (24 * 60 * 60 * 1000); // 1 day in milliseconds
        window.localStorage.setItem('crimson-token-expires', String(expirationTime));
      }
      
      navigate('/store');
    } catch (err: any) {
      console.error(`${provider} OAuth error:`, err);
      const errorMessage = err?.message || err?.response?.data?.detail || 'Login failed';
      if (errorMessage.includes('expired') || errorMessage.includes('منقضی')) {
        setError('لطفاً دوباره لاگین کنید، نشست شما منقضی شده است. / Please log in again, your session has expired.');
      } else {
        setError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login failed: ${errorMessage}`);
      }
    } finally {
      setIsOAuthLoading(null);
    }
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
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email or Username</Label>
              <Input
                id="email"
                type="text"
                placeholder="gamer@example.com"
                required
                className="bg-void-700 border-void-600 focus:ring-blood-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                required
                className="bg-void-700 border-void-600 focus:ring-blood-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-blood-500 hover:bg-blood-600 text-lg font-bold shadow-blood-glow"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-void-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-void-800 px-2 text-gray-400">Or continue with</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full">
              <Button
                variant="outline"
                className="border-void-600 hover:bg-void-700"
                type="button"
                onClick={() => handleOAuthLogin('google')}
                disabled={isLoading || isOAuthLoading !== null}
              >
                {isOAuthLoading === 'google' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Google'
                )}
              </Button>
              <Button
                variant="outline"
                className="border-void-600 hover:bg-void-700"
                type="button"
                onClick={() => handleOAuthLogin('discord')}
                disabled={isLoading || isOAuthLoading !== null}
              >
                {isOAuthLoading === 'discord' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Discord'
                )}
              </Button>
              <Button
                variant="outline"
                className="border-void-600 hover:bg-void-700"
                type="button"
                onClick={() => handleOAuthLogin('steam')}
                disabled={isLoading || isOAuthLoading !== null}
              >
                {isOAuthLoading === 'steam' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Steam'
                )}
              </Button>
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
