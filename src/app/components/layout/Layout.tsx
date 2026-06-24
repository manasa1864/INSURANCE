// Main app shell — sidebar + sticky header + page outlet.
// This wraps every authenticated route; public pages (landing, auth) skip it.
// Sidebar collapses to icon-only mode when sidebarOpen is false.

import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard, PlusCircle, Scale, SlidersHorizontal,
  Bookmark, FileText, HelpCircle, Settings, Search,
  User, Menu, Shield, LogOut,
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../../lib/api/supabaseClient';
import { AIChatWidget } from '../chat/AIChatWidget';

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // pull display name from supabase auth metadata on first load
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User');
        setUserEmail(user.email || '');
      }
    });
  }, []);

  const navigation = [
    { name: 'Dashboard',          href: '/dashboard',           icon: LayoutDashboard    },
    { name: 'New Recommendation', href: '/new-recommendation',  icon: PlusCircle         },
    { name: 'Compare Policies',   href: '/compare',             icon: Scale              },
    { name: 'What-if Simulator',  href: '/whatif',              icon: SlidersHorizontal  },
    { name: 'Saved Plans',        href: '/saved',               icon: Bookmark           },
    { name: 'Reports',            href: '/reports',             icon: FileText           },
    { name: 'Help & Support',     href: '/support',             icon: HelpCircle         },
    { name: 'Settings',           href: '/settings',            icon: Settings           },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ── Sidebar ── */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-[#1E64FF] p-2 rounded-lg shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className={clsx('font-bold text-slate-900 tracking-tight whitespace-nowrap transition-opacity', !sidebarOpen && 'opacity-0 w-0')}>
              POLICYWISE AI
            </span>
          </div>
        </div>

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                  isActive
                    ? 'bg-blue-50 text-[#1E64FF] font-medium shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
                title={!sidebarOpen ? item.name : undefined}
              >
                <item.icon className={clsx('w-5 h-5 shrink-0 transition-colors', isActive ? 'text-[#1E64FF]' : 'text-slate-400 group-hover:text-slate-600')} />
                <span className={clsx('whitespace-nowrap transition-opacity duration-200', !sidebarOpen && 'opacity-0 w-0 hidden')}>
                  {item.name}
                </span>
                {/* active dot — only visible when sidebar is expanded */}
                {isActive && sidebarOpen && (
                  <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-[#1E64FF]" />
                )}
              </NavLink>
            );
          })}
        </div>

        {/* User avatar at the bottom of the sidebar */}
        <div className="p-4 border-t border-slate-100">
          <div className={clsx('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
              <span className="font-bold text-[#1E64FF]">
                {userName ? userName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : '?'}
              </span>
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-slate-900 truncate">{userName || 'Loading...'}</p>
                <p className="text-xs text-slate-500 truncate">{userEmail}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className={clsx('flex-1 flex flex-col min-h-screen transition-all duration-300', sidebarOpen ? 'ml-64' : 'ml-20')}>

        {/* Sticky top header */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative hidden md:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search policies, types..."
                className="block w-64 pl-10 pr-3 py-2 border border-slate-200 rounded-full leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1E64FF] focus:border-[#1E64FF] sm:text-sm transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-8 w-px bg-slate-200 mx-1" />
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page content — each route renders into here */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Floating AI chat widget — lives outside the scroll container */}
      <AIChatWidget />
    </div>
  );
};
