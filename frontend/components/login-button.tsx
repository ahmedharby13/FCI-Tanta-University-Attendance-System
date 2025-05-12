'use client';
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import Link from 'next/link';
import { LogIn, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function LoginButton({
  className,
  variant = "outline",
}: {
  className?: string;
  variant?:
    | "outline"
    | "link"
    | "default"
    | "destructive"
    | "secondary"
    | "ghost"
    | null
    | undefined;
}) {
  // Use state instead of ref for reactivity
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Check login status on mount and when component updates
  useEffect(() => {
    // Safe check for localStorage (for SSR)
    if (typeof window !== 'undefined') {
      setIsLoggedIn(localStorage.getItem("token") !== null);
    }
    
    // Optional: Set up event listener to detect changes from other components
    const handleStorageChange = () => {
      setIsLoggedIn(localStorage.getItem("token") !== null);
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
const router =   useRouter();
  
  const handleLogout = (e: React.MouseEvent) => {
    if (isLoggedIn) {
      // Prevent navigation to login page when logging out
      e.preventDefault();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      toast.success("Logged out successfully");
      setIsLoggedIn(false);
      router.push("/"); // Redirect to login page after logout
    }
  };
  
  if (isLoggedIn) {
    // Render a regular button for logout (no navigation)
    return (
      <Button
        onClick={handleLogout}
        className={`text-muted-foreground ${className}`}
        variant={variant}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    );
  }
  
  // Render a link button for login
  return (
    <Link href="/login">
      <Button
        className={`text-muted-foreground ${className}`}
        variant={variant}
      >
        <LogIn className="mr-2 h-4 w-4" />
        Login
      </Button>
    </Link>
  );
}