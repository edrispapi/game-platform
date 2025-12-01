'use client';
import React, { useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { Gamepad2, Library, User, Store, Users, Settings, ShoppingCart, Bell, Search, LogOut } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCartStore } from "@/stores/cart-store";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Notification, UserProfile } from "@shared/types";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Badge as StatusBadge } from "@/components/ui/badge";
const navItems = [
  { to: "/store", icon: Store, label: "Store" },
  { to: "/library", icon: Library, label: "Library" },
  { to: "/friends", icon: Users, label: "Friends" },
];
export function DashboardLayout(): JSX.Element {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const cartItemCount = useCartStore(s => s.items.length);
  const { data: notificationsResponse } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ items: Notification[] }>('/api/notifications'),
    refetchInterval: 60000,
  });
  const unreadCount = notificationsResponse?.items.filter(n => !n.read).length ?? 0;
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: () => api('/api/profile'),
  });
  const handleLogout = () => {
    toast.info("You have been logged out.");
    navigate('/login');
  };
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  return (
    <div className="min-h-screen flex bg-void-950 text-gray-200">
      <TooltipProvider>
        <aside className="w-20 bg-void-900 p-4 flex flex-col items-center justify-between border-r border-void-700">
          <div>
            <NavLink to="/store" className="mb-10 block">
              <Gamepad2 className="h-10 w-10 text-blood-500" />
            </NavLink>
            <nav className="flex flex-col items-center gap-6">
              {navItems.map((item) => (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `p-3 rounded-lg transition-colors duration-200 ${
                          isActive ? "bg-blood-500 text-white" : "text-gray-400 hover:bg-void-800 hover:text-white"
                        }`
                      }
                    >
                      <item.icon className="h-6 w-6" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </nav>
          </div>
          <div className="flex flex-col items-center gap-4">
             <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to="/cart"
                  className={({ isActive }) =>
                    `relative p-3 rounded-lg transition-colors duration-200 ${
                      isActive ? "bg-blood-500 text-white" : "text-gray-400 hover:bg-void-800 hover:text-white"
                    }`
                  }
                >
                  <ShoppingCart className="h-6 w-6" />
                  {cartItemCount > 0 && (
                    <div className="absolute -top-1 -right-1 flex items-center justify-center">
                      <div className="relative">
                        <div className="h-6 w-6 rounded-full bg-green-500 border-4 border-void-900 flex items-center justify-center shadow-lg">
                          <div className="h-2 w-2 rounded-full bg-green-300" />
                        </div>
                        <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-green-500 text-white text-[10px] font-bold border-2 border-void-900 shadow-lg pointer-events-none">
                          {cartItemCount > 99 ? '99+' : cartItemCount}
                    </Badge>
                      </div>
                    </div>
                  )}
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Cart</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>
      </TooltipProvider>
      <div className="flex-1 flex flex-col h-screen">
        <header className="h-20 flex-shrink-0 px-8 flex items-center justify-between border-b border-void-800 bg-void-900/80 backdrop-blur-sm">
            <Link to="/store" className="flex items-center gap-2">
                <Gamepad2 className="h-8 w-8 text-blood-500" />
                <span className="font-orbitron text-2xl font-bold">CRIMSON <span className="text-blood-500">GRID</span></span>
            </Link>
            <form onSubmit={handleSearchSubmit} className="relative w-full max-w-lg">
                <Input
                  placeholder="Search store, library, friends..."
                  className="pl-10 bg-void-800 border-void-700 focus:ring-blood-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </form>
            <div className="flex items-center gap-4">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <NavLink
                            to="/notifications"
                            className={({ isActive }) =>
                                `relative p-3 rounded-full transition-colors duration-200 ${
                                isActive ? "bg-blood-500/20 text-blood-400" : "text-gray-400 hover:bg-void-800 hover:text-white"
                                }`
                            }
                            >
                            <Bell className="h-6 w-6" />
                            {unreadCount > 0 && (
                                <Badge className="absolute top-1 right-1 h-4 w-4 p-0 flex items-center justify-center text-xs bg-blood-500 text-white">
                                {unreadCount}
                                </Badge>
                            )}
                            </NavLink>
                        </TooltipTrigger>
                        <TooltipContent><p>Notifications</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="relative">
                        <Avatar className="h-10 w-10 cursor-pointer border-2 border-transparent hover:border-blood-500">
                              <AvatarImage src={profile?.avatar} alt={profile?.username || 'User'} />
                              <AvatarFallback>{(profile?.username || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                          {profile && (
                            <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-void-900 ${
                              profile.status === 'Online' ? 'bg-green-500' : 
                              profile.status === 'In Game' ? 'bg-blue-500' : 
                              profile.status === 'Offline' ? 'bg-orange-500' :
                              'bg-gray-500'
                            }`} title={profile.status} />
                          )}
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-void-800 border-void-700 text-gray-200 w-56">
                        <DropdownMenuLabel className="flex flex-col">
                          <span className="font-semibold">{profile?.username || 'User'}</span>
                          {profile && (
                            <span className="text-xs text-gray-400 mt-1">
                              {profile.hoursPlayed} hrs • {profile.friendsCount} friends
                            </span>
                          )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-void-700" />
                        <DropdownMenuItem asChild><Link to="/profile" className="cursor-pointer flex items-center"><User className="mr-2 h-4 w-4" /> Profile</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to="/settings" className="cursor-pointer flex items-center"><Settings className="mr-2 h-4 w-4" /> Settings</Link></DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-void-700" />
                        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 focus:bg-red-500/20 focus:text-red-300 flex items-center">
                            <LogOut className="mr-2 h-4 w-4" /> Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
        <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
            <Outlet />
            </div>
        </main>
      </div>
    </div>
  );
}