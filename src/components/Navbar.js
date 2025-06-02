import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink as RouterNavLink, useNavigate } from 'react-router-dom'; // Use NavLink for active styles
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice'; // Adjust path if needed
import { useTheme } from '../context/ThemeContext'; // Adjust path if needed
import gsap from 'gsap';
import { Sun, Moon, LogIn as LoginIcon, UserPlus, LogOut, Menu, X as CloseIcon, LayoutDashboard, MessageSquareText, Users } from 'lucide-react'; // Example icons

// Import the new CSS
import './Navbar.css';

// Helper for active NavLink
const NavLink = ({ to, children, ...props }) => (
  <RouterNavLink
    to={to}
    className={({ isActive }) =>
      `nav-center-link ${isActive ? 'active' : ''}`
    }
    {...props}
  >
    {children}
    <span className="link-highlight"></span>
  </RouterNavLink>
);

const MobileNavLink = ({ to, children, icon, onClick }) => (
    <RouterNavLink
      to={to}
      className={({ isActive }) =>
        `mobile-nav-link ${isActive ? 'active' : ''}`
      }
      onClick={onClick}
    >
      {icon}
      <span>{children}</span>
    </RouterNavLink>
  );


function Navbar() {
  const { user, role } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme(); // Use setTheme from context
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const logoRef = useRef(null);
  const navbarRef = useRef(null);
  const mobileMenuNodeRef = useRef(null); // For GSAP and click outside
  const mobileMenuTriggerRef = useRef(null);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initial Navbar Animation
  useEffect(() => {
    if (navbarRef.current) {
      gsap.to(navbarRef.current, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.2
      });
    }
    // Cleanup
    return () => {
      gsap.killTweensOf(navbarRef.current);
    }
  }, []);

  // Link Hover Animation (for underline highlight)
  useEffect(() => {
    const links = document.querySelectorAll('.nav-center-link');
    links.forEach(link => {
      const highlight = link.querySelector('.link-highlight');
      if (highlight) {
        link.addEventListener('mouseenter', () => gsap.to(highlight, { width: '60%', opacity: 1, duration: 0.3, ease: 'power2.out' }));
        link.addEventListener('mouseleave', () => gsap.to(highlight, { width: '0%', opacity: 0, duration: 0.3, ease: 'power2.out' }));
      }
    });
    // No specific cleanup needed as GSAP auto-manages these if elements are removed
  }, [user, role]); // Rerun if links change (e.g., admin link appears)

  // Mobile Menu Toggle Animation & Click Outside
  useEffect(() => {
    const menuNode = mobileMenuNodeRef.current;
    if (menuNode) {
      gsap.killTweensOf(menuNode); // Kill previous tweens
      if (mobileMenuOpen) {
        gsap.to(menuNode, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.3,
          ease: 'power2.out',
          onStart: () => menuNode.style.pointerEvents = 'auto'
        });
      } else {
        gsap.to(menuNode, {
          opacity: 0,
          y: -10,
          scale: 0.95,
          duration: 0.25,
          ease: 'power2.in',
          onComplete: () => menuNode.style.pointerEvents = 'none'
        });
      }
    }

    // Click outside to close mobile menu
    const handleClickOutside = (event) => {
        if (
            mobileMenuNodeRef.current && !mobileMenuNodeRef.current.contains(event.target) &&
            mobileMenuTriggerRef.current && !mobileMenuTriggerRef.current.contains(event.target)
        ) {
            setMobileMenuOpen(false);
        }
    };
    if (mobileMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);

  }, [mobileMenuOpen]);

  const handleLogout = () => {
    if (mobileMenuOpen) setMobileMenuOpen(false); // Close menu
    // Optional: Add a fade out for user avatar before dispatching
    gsap.to(navbarRef.current, { // Fade out whole navbar briefly
        opacity: 0.7, duration: 0.2,
        onComplete: () => {
            dispatch(logout());
            navigate('/');
            gsap.to(navbarRef.current, { opacity: 1, duration: 0.3, delay: 0.1 });
        }
    });
  };

  const toggleThemeHandler = () => {
    const newTheme = theme === 'light-gray' ? 'dark-blue' : (theme === 'dark-blue' ? 'neon-black' : 'light-gray');
    // setTheme(newTheme);
  };


  return (
    <>
      <nav
        ref={navbarRef}
        className={`new-navbar ${scrolled ? 'scrolled' : ''}`}
        style={{ transform: 'translateX(-50%) translateY(-100%)', opacity: 0 }} // GSAP initial state
      >
        <div className="navbar-content-wrapper">
          {/* Logo */}
          <Link to="/" className="logo-container" ref={logoRef}>
          <div className="logo-text">
            <span className="accent">Modern Forum's</span><span className="beta-tag">beta</span>
          </div>
        </Link>
          {/* Center Navigation Links */}
          <div className="nav-center-links">
            <NavLink to="/boards">Boards</NavLink>
            <NavLink to="/live-discussion">Live</NavLink>
            <NavLink to="/games">Games</NavLink>
            
            {role === 'admin' && <NavLink to="/dashboard">Dashboard</NavLink>}
            {/* Add more links as needed */}
          </div>

          {/* Right Side Actions */}
          <div className="nav-right-actions">
            <button onClick={toggleThemeHandler} className="action-icon-button theme-toggle-button" aria-label="Toggle theme">
              {theme === 'light-gray' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {user ? (
              <button onClick={() => setMobileMenuOpen(prev => !prev)} className="user-avatar-button action-icon-button" ref={mobileMenuTriggerRef} aria-label="User menu">
                {user?.charAt(0).toUpperCase() || 'U'}
              </button>
            ) : (
              <>
                <Link to="/login" className="user-action-button login">Login</Link>
                {/* <Link to="/register" className="user-action-button register">Sign Up</Link> */}
              </>
            )}
             {/* Mobile Menu Trigger (Hamburger/Close) - visible only on mobile */}
            <button
              ref={mobileMenuTriggerRef}
              className="action-icon-button mobile-menu-trigger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <CloseIcon size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu (Overlay & Menu) */}
      <div
        className={`mobile-nav-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)} // Close on overlay click
      />
      <div
        ref={mobileMenuNodeRef}
        className={`mobile-nav-menu ${mobileMenuOpen ? 'open' : ''}`}
        style={{ opacity: 0, transform: 'translateY(-10px) scale(0.95)', pointerEvents: 'none' }} // GSAP initial state
      >
        {user && (
             <div className="mobile-nav-link" style={{cursor: 'default', fontWeight: 600, color: 'var(--text-primary)'}}>
                Hi, {user}!
                {role && <span style={{fontSize: '0.75rem', color: 'var(--accent-primary)', marginLeft: '0.5rem', fontWeight: 'bold', textTransform: 'uppercase'}}>({role})</span>}
            </div>
        )}
        <MobileNavLink to="/boards" icon={<LayoutDashboard size={18}/>} onClick={() => setMobileMenuOpen(false)}>Boards</MobileNavLink>
        <MobileNavLink to="/live-discussion" icon={<MessageSquareText size={18}/>} onClick={() => setMobileMenuOpen(false)}>Live Discussion</MobileNavLink>
        {role === 'admin' && <MobileNavLink to="/dashboard" icon={<Users size={18}/>} onClick={() => setMobileMenuOpen(false)}>Dashboard</MobileNavLink>}
        <div className="mobile-nav-divider"></div>
        {user ? (
          <button onClick={handleLogout} className="mobile-nav-link">
            <LogOut size={18}/>Logout
          </button>
        ) : (
          <>
            <MobileNavLink to="/login" icon={<LoginIcon size={18}/>} onClick={() => setMobileMenuOpen(false)}>Login</MobileNavLink>
            <MobileNavLink to="/register" icon={<UserPlus size={18}/>} onClick={() => setMobileMenuOpen(false)}>Register</MobileNavLink>
          </>
        )}
      </div>
    </>
  );
}

export default Navbar;
