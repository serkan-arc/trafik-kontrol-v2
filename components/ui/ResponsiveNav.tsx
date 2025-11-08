'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Home, BarChart, Settings, Users, Shield, Globe } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export default function ResponsiveNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/', icon: <Home className="w-5 h-5" /> },
    { label: 'Analytics', href: '/analytics', icon: <BarChart className="w-5 h-5" /> },
    { label: 'Sites', href: '/sites', icon: <Globe className="w-5 h-5" /> },
    { label: 'Security', href: '/security', icon: <Shield className="w-5 h-5" /> },
    { label: 'Users', href: '/users', icon: <Users className="w-5 h-5" /> },
    { label: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Prevent body scroll when mobile menu is open
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Navigation Header */}
      <nav
        className={`fixed top-0 left-0 right-0 z-40 bg-white transition-shadow duration-300 ${
          isScrolled ? 'shadow-md' : ''
        }`}
      >
        <div className="container-responsive">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold">Traffic Control</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden tap-target"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="mobile-menu-overlay md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <div className={`mobile-menu md:hidden ${isMobileMenuOpen ? 'open' : 'closed'}`}>
        <div className="pt-20 px-4 safe-padding">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors tap-target"
              >
                {item.icon}
                <span className="text-lg">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 safe-padding-bottom border-t">
            <p className="text-sm text-gray-600 text-center">
              © 2024 Traffic Control System
            </p>
          </div>
        </div>
      </div>

      {/* Spacer for fixed navigation */}
      <div className="h-16" />
    </>
  );
}