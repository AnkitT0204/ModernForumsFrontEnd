import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

import './BoardsPage.css';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

function BoardsPage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('grid');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { user } = useSelector((state) => state.auth);

  const pageRef = useRef(null);
  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const boardsContainerRef = useRef(null);
  const ctaRef = useRef(null);
  const filterRef = useRef(null);
  const animationRefs = useRef({}).current;

  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      document.documentElement.setAttribute('data-theme', storedTheme);
      return storedTheme;
    }
    document.documentElement.setAttribute('data-theme', 'dark');
    return 'dark';
  });

  useEffect(() => {
    setLoading(true);
    api
      .get('/boards')
      .then((response) => {
        console.log('API Response:', response.data);
        if (response.data && Array.isArray(response.data.boards)) {
          setBoards(response.data.boards);
          setError(null);
        } else {
          console.error("Invalid data structure received:", response.data);
          setBoards([]);
          setError('Received invalid board data format');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('API Error:', err);
        setError('Failed to fetch boards. Please try again.');
        setBoards([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!loading && !error && pageRef.current) {
      cleanupAnimations();
      animationRefs.cleanup = initAnimations();
    }
    return () => {
      cleanupAnimations();
    };
  }, [loading, error, boards, view]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const cleanupAnimations = useCallback(() => {
    console.log("Attempting GSAP cleanup...");
    ScrollTrigger.getAll().forEach(trigger => {
      if (trigger.vars.id === "boardCardStagger" || trigger.trigger === filterRef.current || trigger.elements?.some(el => el.classList.contains('stats-item'))) {
        console.log("Killing trigger:", trigger.vars.id || trigger.trigger);
        trigger.kill();
      }
    });
    Object.values(animationRefs).forEach(anim => {
      if (anim && typeof anim.kill === 'function') {
        console.log("Killing animation instance...");
        anim.kill();
      }
    });
    if (typeof animationRefs.cleanup === 'function') {
      console.log("Executing specific cleanup function...");
      animationRefs.cleanup();
      animationRefs.cleanup = null;
    }
    Object.keys(animationRefs).forEach(key => delete animationRefs[key]);
  }, [animationRefs]);

  const initAnimations = useCallback(() => {
    console.log("Initializing GSAP animations...");
    const cleanupFuncs = [];

    if (titleRef.current && subtitleRef.current) {
      const heroTl = gsap.timeline();
      animationRefs.heroTl = heroTl;

      heroTl.fromTo(titleRef.current, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.1 });
      const highlightEl = titleRef.current.querySelector('.hero-title-highlight');
      if (highlightEl) {
        heroTl.fromTo(highlightEl, { width: '0%' }, { width: '100%', duration: 0.6, ease: "power3.inOut" }, "-=0.4");
      }
      heroTl.fromTo(subtitleRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, "-=0.6");

      if (ctaRef.current) {
        heroTl.fromTo(ctaRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, "-=0.6");
      }
      if (filterRef.current) {
        heroTl.fromTo(filterRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, "-=0.4");
      }
      cleanupFuncs.push(() => { console.log("Killing heroTl"); heroTl.kill(); });
    }

    if (boardsContainerRef.current && boards.length > 0) {
      const cards = gsap.utils.toArray(boardsContainerRef.current.querySelectorAll('.board-card'));

      if (cards.length > 0) {
        console.log(`Animating ${cards.length} board cards`);
        const cardStaggerTween = gsap.fromTo(
          cards,
          { y: 50, opacity: 0, scale: 0.95 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: 0.1,
            duration: 0.6,
            ease: "power3.out",
            overwrite: true,
            scrollTrigger: {
              trigger: boardsContainerRef.current,
              start: "top bottom-=150",
              toggleActions: "play none none none",
              markers: false,
              id: "boardCardStagger"
            }
          }
        );
        cleanupFuncs.push(() => {
          console.log("Killing card stagger tween and trigger");
          const st = ScrollTrigger.getById("boardCardStagger");
          if (st) st.kill();
          cardStaggerTween.kill();
        });

        cards.forEach(card => {
          const tl = gsap.timeline({ paused: true });
          const cardBg = card.querySelector('.card-bg');
          const cardContent = card.querySelector('.card-content');
          const cardIcon = card.querySelector('.card-icon');
          const cardArrow = card.querySelector('.card-arrow');

          if (cardBg) tl.to(cardBg, { scale: 1.02, duration: 0.4, ease: "power2.out" }, 0);
          if (cardContent) tl.to(cardContent, { y: -5, duration: 0.4, ease: "power2.out" }, 0);
          if (cardIcon) tl.to(cardIcon, { y: -3, rotation: -10, duration: 0.5, ease: "power2.out" }, 0);
          if (cardArrow) tl.to(cardArrow, { x: 5, duration: 0.3, ease: "power2.out" }, 0);

          const playFunc = () => tl.play();
          const reverseFunc = () => tl.reverse();

          card.addEventListener('mouseenter', playFunc);
          card.addEventListener('mouseleave', reverseFunc);

          cleanupFuncs.push(() => {
            card.removeEventListener('mouseenter', playFunc);
            card.removeEventListener('mouseleave', reverseFunc);
            tl.kill();
          });
        });
      } else {
        console.log("No board cards found to animate.");
      }
    }

    const statsItems = gsap.utils.toArray(".stats-item");
    if (statsItems.length > 0) {
      console.log(`Animating ${statsItems.length} stats items`);
      const statsBatch = ScrollTrigger.batch(statsItems, {
        onEnter: batch => gsap.fromTo(batch,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: "power3.out", overwrite: true }
        ),
        start: "top bottom-=100",
        once: true
      });
      cleanupFuncs.push(() => {
        console.log("Cleaning up stats batch triggers");
        if (statsBatch) {
          statsBatch.forEach(st => st.kill());
        }
      });
    } else {
      console.log("No stats items found to animate.");
    }

    return () => {
      console.log("Running GSAP cleanup function from initAnimations return...");
      cleanupFuncs.forEach(cleanup => cleanup());
    };
  }, [boards, loading, error, view]);

  const generateStats = (boardId) => {
    let hash = 0;
    for (let i = 0; i < String(boardId).length; i++) {
      const char = String(boardId).charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    const rand = (seed) => {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }
    const seed = Math.abs(hash);
    const baseThreads = 10 + Math.floor(rand(seed) * 50);
    const basePosts = baseThreads * (3 + Math.floor(rand(seed + 1) * 10));
    const baseUsers = Math.floor(basePosts / (2 + Math.floor(rand(seed + 2) * 5)));
    return { threads: baseThreads, posts: basePosts, users: baseUsers };
  };

  const categories = ['all', 'technology', 'design', 'gaming', 'creative', 'discussion'];

  const filteredBoards = boards.filter(board => {
    if (activeCategory === 'all') return true;
    const boardIndex = boards.findIndex(b => b._id === board._id);
    const categoryIndex = categories.indexOf(activeCategory);
    if (categoryIndex <= 0) return false;
    return boardIndex % (categories.length - 1) === (categoryIndex - 1);
  });

  const handleThemeChange = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    // setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const scrollToTop = () => {
    gsap.to(window, {
      scrollTo: { y: 0, autoKill: false },
      duration: 0.8,
      ease: "power3.inOut"
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner-outer">
          <div className="loading-spinner"></div>
          <div className="loading-ping"></div>
        </div>
        <div className="loading-text-container">
          <h3 className="loading-title">Loading Boards</h3>
          <p className="loading-subtitle">Please wait while we load the latest discussions</p>
          <div className="loading-dots">
            <span className="loading-dot loading-dot-1"></span>
            <span className="loading-dot loading-dot-2"></span>
            <span className="loading-dot loading-dot-3"></span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container-outer">
        <div className="error-container-inner">
          <div className="error-bg-blur-1"></div>
          <div className="error-bg-blur-2"></div>
          <div className="error-content">
            <div className="error-icon-container">
              <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="error-title">
              <span className="error-title-main">{error}</span>
              <span className="error-title-glitch1" aria-hidden="true">{error}</span>
              <span className="error-title-glitch2" aria-hidden="true">{error}</span>
            </h2>
            <p className="error-message">
              Please check your connection and try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="error-retry-button"
            >
              <svg className="error-retry-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4V9H4.58152M19.9381 11C19.446 7.05369 16.0796 4 12 4C8.64262 4 5.76829 6.06817 4.58152 9M4.58152 9H9M20 20V15H19.4185M19.4185 15C18.2317 17.9318 15.3574 20 12 20C7.92038 20 4.55399 16.9463 4.06189 13M19.4185 15H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="boards-page-container">
      <div ref={heroRef} className="hero-section">
        <div className="hero-bg-blur-1"></div>
        <div className="hero-bg-blur-2"></div>
        <div className="hero-content-container">
          <div className="hero-text-container">
            <h1 ref={titleRef} className="hero-title" style={{ opacity: 0 }}>
              Explore Community <br/>
              <span className="hero-title-highlight-container">
                Boards
                <span className="hero-title-highlight"></span>
              </span>
            </h1>
            <p ref={subtitleRef} className="hero-subtitle" style={{ opacity: 0 }}>
              Join vibrant discussions across diverse topics and connect with a community of passionate individuals.
            </p>

            {!user && (
              <div ref={ctaRef} className="cta-container" style={{ opacity: 0 }}>
                <div className="cta-bg-blur"></div>
                <div className="cta-content">
                  <div className="cta-text">
                    <h3 className="cta-title">Join The Conversation</h3>
                    <p className="cta-description">Sign in to post threads, reply to discussions and track your favorite topics.</p>
                  </div>
                  <div className="cta-buttons">
                    <Link to="/login" className="cta-button cta-button-secondary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13 12H3" />
                      </svg>
                      Sign In
                    </Link>
                    <Link to="/register" className="cta-button cta-button-primary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="23" y1="11" x2="17" y2="11" />
                      </svg>
                      Create Account
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div ref={filterRef} className="filter-view-container" style={{ opacity: 0 }}>
              <div className="filter-buttons-container">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`filter-button ${activeCategory === category ? 'active' : ''}`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="view-toggle-container">
                <span className="view-toggle-label">View:</span>
                <div className="view-toggle-buttons">
                  <button
                    onClick={() => setView('grid')}
                    className={`view-toggle-button ${view === 'grid' ? 'active' : ''}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={`view-toggle-button ${view === 'list' ? 'active' : ''}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="boards-section-container">
        {filteredBoards.length > 0 ? (
          <div
            ref={boardsContainerRef}
            className={view === 'grid' ? "boards-grid-container" : "boards-list-container"}
          >
            {filteredBoards.map((board, index) => {
              const colorIndex = index % 3;
              const stats = generateStats(board._id);

              return (
                <Link
                  key={board._id}
                  to={`/boards/${board._id}`}
                  className={`board-card board-color-${colorIndex}`}
                  style={{ opacity: 0 }}
                >
                  <div className="card-bg"></div>

                  {view === 'grid' && (
                    <>
                      {/* <div className="card-deco-1"></div> */}
                      {/* <div className="card-deco-2"></div> */}
                    </>
                  )}

                  {view === 'grid' ? (
                    <div className="card-content">
                      <div className="card-header">
                        <div className="card-icon">
                          {board.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="card-title-container">
                          <h2 className="card-title">/{board.name}/</h2>
                          <div className="card-meta">
                            {stats.users > 0 && <>
                              <span className="card-meta-dot"></span>
                              <span>{stats.users} active members</span>
                            </>}
                            {stats.users <= 0 && <span>New community!</span>}
                          </div>
                        </div>
                      </div>
                      <p className="card-description">
                        {board.description || `Explore discussions about ${board.name}.`}
                      </p>
                      <div className="card-footer">
                        <div className="card-stats">
                          <span className="stats-item" style={{ opacity: 0 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                            {stats.threads}
                          </span>
                          <span className="stats-item" style={{ opacity: 0 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                            {stats.posts}
                          </span>
                        </div>
                        <span className="card-arrow">
                          Browse
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="card-content">
                      <div className="card-icon">
                        {board.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="card-text-container">
                        <h2 className="card-title">/{board.name}/</h2>
                        <p className="card-description">
                          {board.description || `Discussions about ${board.name}.`}
                        </p>
                      </div>
                      <div className="card-stats">
                        <span className="stats-item" style={{ opacity: 0 }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                          {stats.threads} threads
                        </span>
                        <span className="stats-item" style={{ opacity: 0 }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                          {stats.posts} posts
                        </span>
                        <span className="stats-item" style={{ opacity: 0 }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                          {stats.users} members
                        </span>
                      </div>
                      <div className="card-actions">
                        <span className="card-arrow">
                          <span className="browse-text">Browse</span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                        </span>
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          !loading && !error && (
            <div className="empty-state-container">
              <div className="empty-state-bg-blur-1"></div>
              <div className="empty-state-bg-blur-2"></div>
              <div className="empty-state-content">
                <div className="empty-state-icon-container">
                  <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                </div>
                <h3 className="empty-state-title">No boards found</h3>
                <p className="empty-state-message">
                  We couldn't find any boards in the '{activeCategory}' category. Try selecting 'all' or check back later.
                </p>
                <button
                  onClick={() => setActiveCategory('all')}
                  className="empty-state-button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  Show All Boards
                </button>
              </div>
            </div>
          )
        )}
      </div>

      <button
        onClick={handleThemeChange}
        className="floating-button theme-toggle-button"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
        )}
      </button>

      <button
        onClick={scrollToTop}
        className={`floating-button scroll-top-button ${showScrollTop ? 'visible' : ''}`}
        aria-label="Scroll to top"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
      </button>
    </div>
  );
}

export default BoardsPage;