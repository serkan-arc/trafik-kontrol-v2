'use client';

import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="ml-64">
        <main className="w-full p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
