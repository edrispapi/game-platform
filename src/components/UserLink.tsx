'use client';
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface UserLinkProps {
  username: string;
  className?: string;
  children?: React.ReactNode;
}

export function UserLink({ username, className, children }: UserLinkProps) {
  return (
    <Link
      to={`/user/${username}`}
      className={cn("hover:text-blood-400 transition-colors", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {children || username}
    </Link>
  );
}

