import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FiHome, FiBox, FiPackage, FiUsers, FiShoppingCart, FiMessageSquare,
  FiCpu, FiSearch, FiDollarSign, FiSun, FiFileText, FiBarChart2,
  FiTrendingUp, FiHeart, FiEdit3, FiStar, FiActivity, FiPieChart,
  FiLogOut, FiMenu, FiX, FiZap
} from 'react-icons/fi';

const mainNav = [
  { to: '/', label: 'Dashboard', icon: FiHome },
];

const managementNav = [
  { to: '/subscription-boxes', label: 'Subscription Boxes', icon: FiBox },
  { to: '/products', label: 'Products', icon: FiPackage },
  { to: '/customers', label: 'Customers', icon: FiUsers },
  { to: '/orders', label: 'Orders', icon: FiShoppingCart },
  { to: '/feedback', label: 'Feedback', icon: FiMessageSquare },
];

const aiNav = [
  { to: '/ai/curate-box', label: 'Box Curator', icon: FiBox },
  { to: '/ai/discover-products', label: 'Product Discovery', icon: FiSearch },
  { to: '/ai/optimize-price', label: 'Price Optimizer', icon: FiDollarSign },
  { to: '/ai/generate-theme', label: 'Theme Generator', icon: FiSun },
  { to: '/ai/write-description', label: 'Description Writer', icon: FiFileText },
  { to: '/ai/analyze-feedback', label: 'Feedback Analyzer', icon: FiBarChart2 },
  { to: '/ai/forecast-demand', label: 'Demand Forecaster', icon: FiTrendingUp },
  { to: '/ai/personalize-recommendations', label: 'Personalized Recs', icon: FiHeart },
  { to: '/ai/generate-marketing', label: 'Marketing Copy', icon: FiEdit3 },
  { to: '/ai/score-quality', label: 'Quality Scorer', icon: FiStar },
  { to: '/ai/analyze-trends', label: 'Trend Analyzer', icon: FiActivity },
  { to: '/ai/segment-customers', label: 'Customer Segmentation', icon: FiPieChart },
];

export default function Sidebar({ user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : 'U';

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <FiX /> : <FiMenu />}
      </button>
      {mobileOpen && <div className="sidebar-overlay" onClick={closeMobile} />}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><FiZap /></div>
          <div>
            <h1>AI Box Curator</h1>
            <span>Smart Subscription Platform</span>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Main</div>
          <ul className="sidebar-nav">
            {mainNav.map((item) => (
              <li key={item.to} className="sidebar-nav-item">
                <NavLink to={item.to} end onClick={closeMobile} className={({ isActive }) => isActive ? 'active' : ''}>
                  <item.icon className="nav-icon" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Management</div>
          <ul className="sidebar-nav">
            {managementNav.map((item) => (
              <li key={item.to} className="sidebar-nav-item">
                <NavLink to={item.to} onClick={closeMobile} className={({ isActive }) => isActive ? 'active' : ''}>
                  <item.icon className="nav-icon" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">AI Center</div>
          <ul className="sidebar-nav">
            <li className="sidebar-nav-item">
              <NavLink to="/ai-center" onClick={closeMobile} className={({ isActive }) => isActive ? 'active' : ''}>
                <FiCpu className="nav-icon" />
                All AI Features
              </NavLink>
            </li>
            {aiNav.map((item) => (
              <li key={item.to} className="sidebar-nav-item">
                <NavLink to={item.to} onClick={closeMobile} className={({ isActive }) => isActive ? 'active' : ''}>
                  <item.icon className="nav-icon" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <div className="sidebar-avatar">{initials}</div>
            <div>
              <div className="sidebar-user-name">{user?.name || 'User'}</div>
              <div className="sidebar-user-email">{user?.email || ''}</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            <FiLogOut /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
