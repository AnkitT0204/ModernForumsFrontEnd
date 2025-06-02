import React, { useEffect, useState, useRef } from 'react'; // Added React import
import { useSelector } from 'react-redux';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'; // Added Link
import { io } from 'socket.io-client';
import api from '../utils/api';
import gsap from 'gsap';
import { Loader2 } from 'lucide-react'; // Loader icon\]
import { Send, Users, Tv, Trophy, Globe, MessageSquare, LogIn } from 'lucide-react'; // Icons

// Import the CSS file
import './DiscussionRoom.css';

// Keep hash function or use a library if more robustness needed
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `room_${Math.abs(hash).toString(36)}`; // Prefix for clarity
};

// --- Socket Connection (Consider moving to Context or higher level) ---
// Ensure this connects only once or manage connection state carefully
// For simplicity here, we assume it connects on component mount if not already connected.
// WARNING: Defining socket here might lead to multiple connections if DiscussionRoom mounts/unmounts often.
// A better approach is a dedicated socket service or context.
let socket;
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001'; // Use env var

// --- Component ---
function DiscussionRoom() {
  const { roomId } = useParams(); // This is the original ID/URL segment
  const { state } = useLocation(); // Contains data passed from Link state
  const navigate = useNavigate();
  const authState = useSelector((storeState) => storeState.auth); // Correct selector naming
  const user = authState.user; // User object or null
  const [roomData, setRoomData] = useState(null); // For custom room data fetched via API
  const [comments, setComments] = useState([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState(null); // General page/fetch error
  const [commentError, setCommentError] = useState(null); // Specific comment sending error
  const [loading, setLoading] = useState(true);
  const commentsEndRef = useRef(null);
  const chatListRef = useRef(null); // Ref for the comment list container

  // Decode and sanitize room ID for socket communication
  const decodedRoomId = decodeURIComponent(roomId);
  const sanitizedRoomId = hashString(decodedRoomId); // Use this for socket events

  // Determine room type
  const isCustomRoom = window.location.pathname.startsWith('/rooms/');

  // --- Effects ---

  // Effect for initializing socket connection and joining room
  useEffect(() => {
      if (!user) return; // Don't connect if not logged in

      // Initialize socket if not already connected
      if (!socket || !socket.connected) {
          console.log('Initializing socket connection...');
          socket = io(SOCKET_URL, {
              withCredentials: true,
              // Add auth if needed by backend: query: { token: authState.token }
          });

          socket.on('connect', () => {
              console.log('Socket connected:', socket.id);
              console.log(`Joining room: ${sanitizedRoomId}`);
              socket.emit('joinRoom', { roomId: sanitizedRoomId, userId: user._id, username: user.username });
          });

          socket.on('disconnect', (reason) => {
              console.log('Socket disconnected:', reason);
              // Handle disconnection, maybe attempt reconnection
          });

          socket.on('connect_error', (err) => {
              console.error('Socket connection error:', err);
              setError(`Cannot connect to discussion server: ${err.message}`);
          });

      } else {
           // If socket already exists and is connected, just join the room
           console.log(`Socket already connected. Joining room: ${sanitizedRoomId}`);
           socket.emit('joinRoom', { roomId: sanitizedRoomId, userId: user._id, username: user.username });
      }

      // --- Socket Event Listeners ---
      const handleActiveUsers = (count) => {
        console.log(`Active users in ${sanitizedRoomId}: ${count}`);
        setActiveUsers(count);
      };
      const handleNewComment = (comment) => {
        console.log(`Received new comment in ${sanitizedRoomId}:`, comment);
        // Add only if not already present (basic duplicate check)
        setComments((prev) => {
            if (!prev.some(c => c._id === comment._id || c.tempId === comment.tempId)) { // Check tempId too
                return [...prev, { ...comment, isNew: true }]; // Flag as new for animation
            }
            return prev;
        });
      };

      socket.on('activeUsers', handleActiveUsers);
      socket.on('newComment', handleNewComment);

      // --- Cleanup ---
      return () => {
        console.log(`Leaving room: ${sanitizedRoomId}`);
        if (socket) {
            socket.emit('leaveRoom', { roomId: sanitizedRoomId, userId: user._id });
            // Don't disconnect globally, just remove listeners for this room
            socket.off('activeUsers', handleActiveUsers);
            socket.off('newComment', handleNewComment);
            // Consider full disconnect if DiscussionRoom is the *only* place socket is used
            // socket.disconnect();
            // socket = null; // Allow re-init on next mount
        }
      };
  }, [sanitizedRoomId, user, authState.token]); // Re-run if room or user changes

  // Effect for fetching initial data (room info and comments)
  useEffect(() => {
    if (!user) { // Skip fetch if user log out while viewing
        setLoading(false);
        setError('Please log in to view the discussion.');
        return;
    }

    const fetchInitialData = async () => {
      setLoading(true);
      setError(null); // Clear previous errors
      setComments([]); // Clear previous comments
      try {
        let fetchedRoomData = null;
        // Fetch custom room data if needed
        if (isCustomRoom) {
          console.log(`Fetching custom room data for roomId: ${roomId}`);
          const roomResponse = await api.get(`/rooms/${roomId}`);
          fetchedRoomData = roomResponse.data;
          setRoomData(fetchedRoomData);
        } else if (state) { // Use location state for news rooms
          fetchedRoomData = { ...state }; // Use passed state
          setRoomData(fetchedRoomData); // Set state for consistency
        } else {
          // Try fetching from a generic endpoint if state is missing? Depends on API.
          console.warn("No location state found for non-custom room.");
          throw new Error('Room information is missing.');
        }

        // Fetch comments for the sanitized room ID
        console.log(`Fetching comments for sanitized room ID: ${sanitizedRoomId}`);
        const commentsRes = await api.get(`/comments/${encodeURIComponent(sanitizedRoomId)}`);
        setComments(commentsRes.data || []);

      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError(err.message || 'Unable to load discussion details.');
        setRoomData(state); // Fallback to state data if fetch fails but state exists
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

  }, [roomId, sanitizedRoomId, user, state, isCustomRoom]); // Dependencies for fetching data

  // Effect for scrolling to bottom and animating new comments
  useEffect(() => {
      // Scroll to bottom smoothly
      if (commentsEndRef.current) {
          commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      // Animate new comments
      if (chatListRef.current) {
          const newCommentElements = chatListRef.current.querySelectorAll('.comment-item.is-new');
          if (newCommentElements.length > 0) {
              gsap.fromTo(newCommentElements,
                  { opacity: 0, y: 15, scale: 0.98 },
                  {
                      opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.1, ease: 'power2.out',
                      // Remove the is-new flag after animation completes
                      onComplete: () => {
                          newCommentElements.forEach(el => el.classList.remove('is-new'));
                      }
                  }
              );
          }
      }
  }, [comments]); // Run whenever comments array changes


   // Handle Sending Comment
   const handleSendComment = () => {
     // Basic checks
     if (!user) {
       setCommentError('Please log in to send messages.'); // Use specific error state
       gsap.fromTo('.chat-input-area .form-error-message', { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.3 });
       return;
     }
     if (!newComment.trim()) {
       // Optional: Add shake animation to input
       gsap.fromTo('.chat-input', { x: 0 }, { x: 5, duration: 0.07, repeat: 5, yoyo: true, ease: 'power1.inOut' });
       return;
     }
     if (!socket || !socket.connected) {
        setCommentError('Not connected to the discussion server.');
        gsap.fromTo('.chat-input-area .form-error-message', { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.3 });
        return;
     }

     setCommentError(null); // Clear previous error

     try {
       const commentData = {
         roomId: sanitizedRoomId, // Use hashed ID for socket
         userId: user._id, // Send user ID
         content: newComment,
         displayUsername: user.username || 'User', // Send display name
         // tempId: `temp_${Date.now()}` // Optional: temporary ID for tracking
       };

       console.log(`Emitting new comment:`, commentData);
       socket.emit('newComment', commentData);

       // OPTIONAL: Optimistic UI Update (add locally immediately)
       // const tempComment = {
       //   ...commentData,
       //   _id: commentData.tempId, // Use tempId locally
       //   createdAt: new Date().toISOString(), // Add timestamp locally
       //   isOwn: true // Flag for styling
       // };
       // setComments((prev) => [...prev, tempComment]);

       setNewComment(''); // Clear input field
       // Auto-resize textarea back down if needed (if using textarea)
       const inputElement = document.querySelector('.chat-input'); // Or textarea selector
       if (inputElement && inputElement.style.height !== 'auto') {
           inputElement.style.height = 'auto';
       }


     } catch (err) {
       console.error('Send comment error:', err);
       setCommentError('Failed to send comment.');
       gsap.fromTo('.chat-input-area .form-error-message', { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.3 });
     }
   };

    // Clear comment error when typing
    useEffect(() => {
      if (commentError && newComment) {
        setCommentError(null);
        gsap.to('.chat-input-area .form-error-message', { opacity: 0, duration: 0.3 });
      }
    }, [newComment, commentError]);


  // --- Render Logic ---

  // Loading State
  if (loading) {
    return <div className="loading-indicator"><Loader2 size={24} className="spinner" /> Loading Discussion...</div>;
  }

  // Error State (if room data failed fundamentally)
  if (error && !roomData) {
    return <div className="general-error-indicator">{error}</div>;
  }

  // Extract final room details (handle potential missing data)
  const { title = "Discussion Room", description = "", category = "General" } = roomData || state || {};
  const displayCategory = category.charAt(0).toUpperCase() + category.slice(1);

  // Check again if user is logged out after initial load attempt
  if (!user) {
    return (
        <div className="general-error-indicator">
            <LogIn size={32} className="mb-2"/>
             You must be logged in to view this discussion.
            <Link to="/login" className="login-prompt-link mt-4">Go to Login</Link>
        </div>
    );
  }


  return (
    // Use CSS classes for structure
    <div className="discussion-room-container">
      {/* Room Header */}
      <header className="room-header">
        <h1 className="room-title">{title}</h1>
        {description && <p className="room-description">{description}</p>}
        <div className="room-meta">
           <span className="room-category">{displayCategory}</span>
           <span className="active-users"><Users size={14} /> {activeUsers} Active</span>
        </div>
         {/* Display general fetch errors here if they occured but data partially loaded */}
         {error && !commentError && (
             <div className="room-error-message animate-fade-slide-up">{error}</div>
         )}
      </header>

      {/* Chat Area */}
      <div className="chat-area">
        {/* Comments List */}
        <div className="comments-list-wrapper">
          <div className="comments-list" ref={chatListRef}>
            {comments.length > 0 ? (
              comments.map((comment, index) => {
                const isOwn = comment.userId === user?._id; // Determine if message is user's own
                return (
                  <div
                    key={comment._id || comment.tempId || index} // Use best available key
                    className={`comment-item ${isOwn ? 'is-own-message' : ''} ${comment.isNew ? '' : 'animate-message-in'}`} // Apply animation only if not new (new handled by useEffect)
                  >
                    {/* Avatar (Optional - Consider fetching user avatars later) */}
                    {!isOwn && ( // Show avatar only for others
                         <div className="comment-avatar">
                           {comment.displayUsername?.[0]?.toUpperCase() || '?'}
                         </div>
                     )}
                    <div className="comment-bubble">
                      {!isOwn && ( // Show author only for others
                        <span className="comment-author">{comment.displayUsername || 'User'}</span>
                      )}
                      <p className="comment-content">{comment.content}</p>
                      <span className="comment-timestamp">
                        {new Date(comment.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="empty-comments-message">No comments yet. Start the discussion!</p>
            )}
            {/* Scroll target */}
            <div ref={commentsEndRef} style={{ height: '1px' }} />
          </div>
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
           {/* Display comment-specific errors here */}
           {commentError && (
                <div className="form-error-message animate-fade-slide-up" style={{ marginBottom: '0.5rem', opacity: 1 }}>
                  {commentError}
                </div>
            )}
          <form onSubmit={(e) => { e.preventDefault(); handleSendComment(); }} className="chat-input-form">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type your message..."
              className="chat-input" // Use CSS class
              disabled={!user} // Already checked above, but good practice
              aria-label="New comment input"
            />
            <button
              type="submit"
              disabled={!user || !newComment.trim()}
              className="send-button" // Use CSS class
              aria-label="Send comment"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default DiscussionRoom;