'use client';

import { useUser, SignOutButton } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard, BarChart3, Users, Mail, Phone, MessageCircle,
  Facebook, Instagram, Settings, Bot, LogOut, Zap, Target
} from 'lucide-react';

const NAV = [
  {
    group: null,
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    group: 'Leads',
    items: [
      { label: 'Lead Management', href: '/leads', icon: Target },
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    ]
  },
  {
    group: 'Channels',
    items: [
      { label: 'Email AI', href: '/email', icon: Mail },
      { label: 'SMS', href: '/customer-sms-dashboard', icon: Phone },
      { label: 'Web Chat', href: '/demo', icon: MessageCircle },
      { label: 'Facebook', href: '/facebook-setup', icon: Facebook },
      { label: 'Instagram', href: '/instagram-setup', icon: Instagram },
    ]
  },
  {
    group: 'Account',
    items: [
      { label: 'AI Settings', href: '/settings', icon: Bot },
      { label: 'Settings', href: '/settings', icon: Settings },
    ]
  }
];

export default function DashboardLayout({ children }) {
  const { isSignedIn, isLoaded, user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1117]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) return null;

  const displayName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'User';

  return (
    <div className="flex h-screen bg-[#0D1117] overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-60 flex-shrink-0 bg-[#0F1117] border-r border-gray-800 flex flex-col">

        {/* Brand */}
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-white font-semibold text-sm leading-tight">BizzyBot AI</div>
              <div className="text-gray-500 text-xs truncate">{displayName}</div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {NAV.map((section, si) => (
            <div key={si} className={si > 0 ? 'pt-4' : ''}>
              {section.group && (
                <p className="px-3 pb-1.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  {section.group}
                </p>
              )}
              {section.items.map(item => {
                const isActive = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group ${
                      isActive
                        ? 'text-white bg-violet-500/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-500 rounded-r-full" />
                    )}
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? 'text-violet-400' : 'text-gray-500 group-hover:text-gray-300'
                    }`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-gray-800">
          <SignOutButton>
            <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all w-full">
              <LogOut className="w-4 h-4 text-gray-500" />
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
