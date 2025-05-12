'use client';
import React, { useEffect, useState } from 'react'
import { Button } from './ui/button'
import Link from 'next/link';


export default function RegisterButton({className, variant = 'outline'}: {className?: string, variant?: "outline" | "link" | "default" | "destructive" | "secondary" | "ghost" | null | undefined}) {
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
if (!isLoggedIn) {
  return (
    <Link href={"/register"}>
      <Button
        className={`text-muted-foreground ${className}`}
        variant={variant}
      >
        Register
      </Button>
    </Link>
  );
}
return null
}
