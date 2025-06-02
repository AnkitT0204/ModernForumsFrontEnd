import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import ThreadForm from './ThreadForm'; // Your modernized ThreadForm
import gsap from 'gsap';
import { MessageSquare, ThumbsUp, ListChecks, Edit3, Loader2 } from 'lucide-react'; // Icons

// Import the CSS file
import './ThreadPage.css';

function ThreadsPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const [boardInfo, setBoardInfo] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useSelector((state) => state.auth); // User object or null

  const pageHeaderRef = useRef(null);
  const createThreadSectionRef = useRef(null);
  const listContainerRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      api.get(`/boards/${boardId}`),
      api.get(`/boards/${boardId}/threads`)
    ])
    .then(([boardRes, threadsRes]) => {
      setBoardInfo(boardRes.data.board); // Assuming API returns { board: { name: '...', ... } }
      setThreads(threadsRes.data.threads || []);
      setLoading(false);
    })
    .catch((err) => {
      console.error("Fetch error in ThreadsPage:", err.response || err);
      if (err.response?.status === 404) {
        setError(`Board "/${boardId}" not found. You will be redirected.`);
        setTimeout(() => navigate('/boards'), 3500);
      } else {
        setError('Failed to fetch board data. Please refresh or try again later.');
      }
      setLoading(false);
    });
  }, [boardId, navigate]);

  // GSAP Animations
  useEffect(() => {
    if (loading) return;

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    // Animate header and create thread section first
    if (pageHeaderRef.current) {
      tl.fromTo(pageHeaderRef.current,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.6 }
      );
    }
    if (createThreadSectionRef.current) {
      tl.fromTo(createThreadSectionRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.5 },
        pageHeaderRef.current ? "-=0.3" : "+=0" // Stagger relative to header
      );
    }

    // Animate thread cards or empty state message
    if (listContainerRef.current) {
      if (!error && threads.length > 0) {
        // Initial state for cards is set via inline style in JSX
        gsap.to(listContainerRef.current.children, {
          opacity: 1,
          y: 0,
          // scale: 1, // Scale can be handled by CSS hover if preferred
          duration: 0.45,
          stagger: 0.08,
          delay: tl.duration() * 0.3, // Delay after header/form animations
          ease: "power2.out",
        });
      } else if (!error && threads.length === 0) {
        const emptyMsgEl = listContainerRef.current.querySelector('.empty-threads-container');
        if (emptyMsgEl) {
          gsap.fromTo(emptyMsgEl,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5, delay: tl.duration() * 0.4, ease: 'power2.out' }
          );
        }
      }
    }

    return () => {
      tl.kill();
      if (listContainerRef.current?.children) {
        gsap.killTweensOf(listContainerRef.current.children);
      }
      const emptyMsgEl = listContainerRef.current?.querySelector('.empty-threads-container');
      if(emptyMsgEl) gsap.killTweensOf(emptyMsgEl);
    };
  }, [loading, error, threads, user]); // Rerun if these change

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="loading-indicator">
        <Loader2 size={28} className="spinner" />
        Loading Threads for /{boardId}...
      </div>
    );
  }

  if (error && !boardInfo) { // If fundamental error (e.g., board not found)
    return (
      <div className="threads-page-container"> {/* Keep basic container for consistent offset */}
        <div className="error-indicator">{error}</div>
      </div>
    );
  }

  return (
    <div className="threads-page-container">
      <header
        ref={pageHeaderRef}
        className="threads-page-header"
        style={{ opacity: 0, transform: 'translateY(-30px)' }}
      >
        <h1 className="threads-page-title">
          <ListChecks size={28} />
          Threads in <span className="board-name-highlight">/{boardInfo?.name || boardId}</span>
        </h1>
        <div
            ref={createThreadSectionRef}
            className="create-thread-cta-section"
            style={{ opacity: 0, transform: 'translateY(-20px)' }}
        >
          {user ? (
            <div className="thread-form-inline-wrapper">
              {/* The ThreadForm component itself should be styled and animated */}
              <ThreadForm boardId={boardId} />
            </div>
          ) : (
            <p className="login-prompt-threads">
              <Link to="/login">Log in</Link> or <Link to="/register">register</Link> to create a new thread.
            </p>
          )}
        </div>
      </header>

      {error && boardInfo && ( // If there was an error fetching threads but board info loaded
           <div className="error-indicator" style={{ marginTop: '0', marginBottom: '1.5rem' }}>{error}</div>
       )}

      <div className="threads-list-container" ref={listContainerRef}>
        {threads.length === 0 && !loading && !error ? (
          <div className="empty-threads-container" style={{ opacity: 0 }}>
            <MessageSquare size={48} className="empty-threads-icon" />
            <p className="empty-threads-title">It's quiet in here...</p>
            <p className="empty-threads-subtitle">Be the first to spark a discussion in /{boardInfo?.name || boardId}!</p>
          </div>
        ) : (
          threads.map((thread) => {
            const firstPost = thread.posts?.[0];
            const contentPreview = firstPost?.content?.substring(0, 120) || "No content preview.";
            const hasMoreContent = firstPost?.content?.length > 120;
            const author = firstPost?.displayUsername || firstPost?.user?.username || 'Anonymous';
            const authorInitial = author?.[0]?.toUpperCase() || 'A';
            const timestamp = firstPost?.createdAt ? new Date(firstPost.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'A while ago';
            const commentCount = thread.postCount ? Math.max(0, thread.postCount - 1) : (thread.posts?.length ? Math.max(0, thread.posts.length - 1) : 0);
            const voteScore = (thread.upvotes?.length || 0) - (thread.downvotes?.length || 0);

            return (
              <Link
                key={thread._id}
                to={`/threads/${thread._id}`}
                className="thread-card-link"
                style={{ opacity: 0, transform: 'translateY(25px)' }} // GSAP initial state for stagger
              >
                <div className="thread-card-inner">
                  <div className="thread-card-header">
                    <span className="author-avatar">{authorInitial}</span>
                    <span className="thread-author-name">{author}</span>
                    <span className="thread-timestamp">· {timestamp}</span>
                  </div>

                  <h2 className="thread-card-title">{thread.title || "Untitled Thread"}</h2>

                  <p className="thread-content-preview">
                    {contentPreview}{hasMoreContent && '...'}
                  </p>

                  {firstPost?.media && (
                    <div className="thread-media-preview">
                      <img
                        src={firstPost.media.startsWith('http') ? firstPost.media : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${firstPost.media}`}
                        alt="Thread media"
                        className="thread-media-image"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="thread-card-footer">
                    <span className="thread-stat-item">
                      <ThumbsUp size={16} />
                      <span>{voteScore} Votes</span>
                    </span>
                    <span className="thread-stat-item">
                      <MessageSquare size={16} />
                      <span>{commentCount} Comments</span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ThreadsPage;