import LoginButton from '@/components/login-button';
import RegisterButton from '@/components/register-button';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import React from 'react';
import { GraduationCap } from 'lucide-react'; // Example icon

export default function Home() { // Renamed 'page' to 'Home' for clarity

  return (
    // Use flex column to structure Nav, Main, Footer
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-neutral-900">

      {/* Navigation Bar */}
    <nav className="bg-primary text-primary-foreground shadow-md sticky top-0 z-50 dark:bg-neutral-800 dark:text-white"> {/* Use primary color */}
        <div className="container mx-auto flex justify-between items-center p-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
             <GraduationCap size={28} /> {/* Example Logo/Icon */}
             <h1 className="text-xl md:text-2xl font-bold ">
                Student Management
             </h1>
          </Link>
          <div className="flex space-x-2 md:space-x-4 items-center">
             {/* Keep using components if they handle auth state */}
             <LoginButton variant="ghost" size="sm" className="hover:bg-primary/90 hover:text-primary-foreground dark:text-white">Login</LoginButton>
             <RegisterButton className='dark:text-white' variant="secondary" size="sm">Register</RegisterButton>
             {/* Alternatively, use simple links if components aren't needed here:
             <Link href="/login"><Button variant="ghost" size="sm">Login</Button></Link>
             <Link href="/register"><Button variant="secondary" size="sm">Register</Button></Link>
             */}
          </div>
        </div>
      </nav>

      {/* Main Content - Hero Section */}
      <main className="flex-grow flex items-center justify-center"> {/* flex-grow makes it take available space */}
        <div className="container mx-auto px-6 py-16 md:py-24 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
            Welcome to Your <span className="text-primary">Student Hub</span>
          </h1>
          <p className="mt-4 md:mt-6 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
            Simplify attendance tracking, manage class sections, and streamline your educational workflow all in one place.
          </p>
          <div className="mt-8 md:mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
             {/* Clearer Call-to-Action Buttons */}
             <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto">
                   Access Your Dashboard
                </Button>
             </Link>
             <Link href="/register">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                   Get Started Free
                </Button>
             </Link>
          </div>
           {/* Optional: Link to a features page or demo */}
           {/* <div className="mt-6">
             <Link href="/features">
               <Button variant="link" className="text-primary">
                 Learn More Features →
               </Button>
             </Link>
           </div> */}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 bg-gray-100 dark:bg-neutral-800 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Student Management System. All Rights Reserved.
          {/* Add other footer links if needed */}
          {/* <span className="mx-2">|</span>
          <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link> */}
        </div>
      </footer>
    </div>
  );
}