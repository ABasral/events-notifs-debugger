import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';

const navItems = [
  { path: '/events', label: 'Event Explorer', icon: '📥' },
  { path: '/notifications', label: 'User Notifications', icon: '🔔' },
];

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-dark-surface border-b border-dark-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔧</span>
            <h1 className="text-lg font-semibold text-dark-text">
              Event & Notification Debugger
            </h1>
          </div>
          
          <div className="text-sm text-dark-muted">
            Debug Console
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex px-4 gap-1">
          {navItems.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                clsx(
                  'px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
                  isActive
                    ? 'bg-dark-bg text-dark-accent border-t border-x border-dark-border'
                    : 'text-dark-muted hover:text-dark-text hover:bg-dark-border/50'
                )
              }
            >
              <span className="mr-2">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      
      {/* Main content */}
      <main className="flex-1 p-4 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
