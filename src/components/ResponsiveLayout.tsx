import React, { useState, useEffect } from 'react';
import './ResponsiveLayout.css';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  onSignOut: () => void;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  isAdmin,
  onSignOut,
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigationItems = [
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'account', label: 'My Account', icon: '👤' },
  ];

  if (isAdmin) {
    navigationItems.push({ id: 'admin', label: 'Admin Panel', icon: '🛡️' });
  }

  // --- MOBILE SCREEN LAYOUT ---
  if (isMobile) {
    return (
      <div className="mobile-container">
        <header className="mobile-header">
          <span className="logo-text">Uniform Exchange</span>
          <button className="signout-btn-mini" onClick={onSignOut}>🚪</button>
        </header>
        
        <main className="mobile-main-content">
          {children}
        </main>

        <nav className="mobile-bottom-nav">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  }

  // --- PC / TABLET SCREEN LAYOUT ---
  return (
    <div className="desktop-container">
      <aside className="desktop-sidebar">
        <div className="sidebar-brand">
          <h2>Uniform Exchange</h2>
          <p>Inventory Manager</p>
        </div>
        
        <nav className="desktop-nav-links">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              className={`desktop-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="desktop-icon">{item.icon}</span>
              <span className="desktop-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="desktop-signout-btn" onClick={onSignOut}>
            <span>Exit Session</span>
          </button>
        </div>
      </aside>

      <main className="desktop-main-content">
        {children}
      </main>
    </div>
  );
};
