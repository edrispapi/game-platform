import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Gamepad2, Library, User, Store, Users, Settings, ShoppingCart } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCartStore } from "@/stores/cart-store";
import { Badge } from "@/components/ui/badge";
const navItems = [
  { to: "/store", icon: Store, label: "Store" },
  { to: "/library", icon: Library, label: "Library" },
  { to: "/friends", icon: Users, label: "Friends" },
  { to: "/profile", icon: User, label: "Profile" },
];
export function DashboardLayout(): JSX.Element {
  const cartItemCount = useCartStore(s => s.items.length);
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
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-blood-500 text-white">
                      {cartItemCount}
                    </Badge>
                  )}
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Cart</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    `p-3 rounded-lg transition-colors duration-200 ${
                      isActive ? "bg-blood-500 text-white" : "text-gray-400 hover:bg-void-800 hover:text-white"
                    }`
                  }
                >
                  <Settings className="h-6 w-6" />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink to="/profile">
                  <Avatar className="h-10 w-10 cursor-pointer border-2 border-transparent hover:border-blood-500">
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Your Profile</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>
      </TooltipProvider>
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}