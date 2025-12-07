'use client';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

interface ErrorPageProps {
  title?: string;
  message?: string;
  statusCode?: number;
}

export function ErrorPage({ title, message, statusCode }: ErrorPageProps) {
  const displayTitle = title || (statusCode === 404 ? "404 Not Found" : "Something went wrong");
  const displayMessage =
    message ||
    (statusCode === 404
      ? "The page you are looking for doesn’t exist or has been moved."
      : "Sorry, an unexpected error occurred while loading this page.");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-void-950 via-void-900 to-void-950 px-4">
      <div className="max-w-xl w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blood-500/10 border border-blood-500/40 mb-2">
          <AlertTriangle className="h-8 w-8 text-blood-400" />
        </div>
        <h1 className="font-orbitron text-3xl sm:text-4xl font-black text-white">
          {displayTitle}
        </h1>
        <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto">
          {displayMessage}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          <Button asChild className="bg-blood-500 hover:bg-blood-600">
            <Link to="/store">
              <Home className="mr-2 h-4 w-4" />
              Go to Store
            </Link>
          </Button>
          <Button
            variant="outline"
            className="border-void-600 hover:bg-void-800 text-gray-200"
            onClick={() => window.location.reload()}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}


