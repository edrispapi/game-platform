'use client';

import { Award, SmilePlus, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React, { useState } from "react";

interface CommentReactionsProps {
  compact?: boolean;
  className?: string;
  onAwardClick?: () => void;
}

export function CommentReactions({ compact = false, className, onAwardClick }: CommentReactionsProps) {
  const [selected, setSelected] = useState<null | "yes" | "no" | "funny" | "award">(null);
  const sizeClasses = compact ? "h-7 px-2 text-[11px]" : "h-7 px-2 text-xs";

  return (
    <div
      className={cn(
        "mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400",
        compact && "mt-2",
        className
      )}
    >
      {!compact && <span className="mr-1">Was this helpful?</span>}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setSelected(prev => (prev === "yes" ? null : "yes"))}
        className={cn(
          sizeClasses,
          "gap-1",
          selected === "yes"
            ? "text-green-400 bg-void-700"
            : "text-gray-300 hover:text-green-400 hover:bg-void-700"
        )}
      >
        <ThumbsUp className="h-3 w-3" /> Yes
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setSelected(prev => (prev === "no" ? null : "no"))}
        className={cn(
          sizeClasses,
          "gap-1",
          selected === "no"
            ? "text-red-400 bg-void-700"
            : "text-gray-300 hover:text-red-400 hover:bg-void-700"
        )}
      >
        <ThumbsDown className="h-3 w-3" /> No
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setSelected(prev => (prev === "funny" ? null : "funny"))}
        className={cn(
          sizeClasses,
          "gap-1",
          selected === "funny"
            ? "text-yellow-300 bg-void-700"
            : "text-gray-300 hover:text-yellow-300 hover:bg-void-700"
        )}
      >
        <SmilePlus className="h-3 w-3" /> Funny
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setSelected(prev => (prev === "award" ? null : "award"))}
        // When award is selected, also trigger optional handler (open popup, etc.)
        onMouseUp={() => {
          if (onAwardClick) {
            onAwardClick();
          }
        }}
        className={cn(
          sizeClasses,
          "gap-1",
          selected === "award"
            ? "text-blood-200 bg-void-700"
            : "text-blood-300 hover:text-blood-200 hover:bg-void-700"
        )}
      >
        <Award className="h-3 w-3" /> Award
      </Button>
    </div>
  );
}


