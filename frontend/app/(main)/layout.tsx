'use client';
import React from 'react'
import Navigation from './_components/navigation';

export default function MainLayout({
    children
}: {
    children: React.ReactNode
}) {
  return (
    <div className="h-screen flex dark:bg-[#1F1F1F] ">
      <Navigation />
      <main className="flex-1 h-full overflow-y-auto px-5 py-15">{children}</main>
    </div>
  );
}
