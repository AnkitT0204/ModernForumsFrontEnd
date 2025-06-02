import React, { useEffect, useState, useRef } from 'react'; // Added React import
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LayoutDashboard, PlusCircle, Trash2, Users as UsersIcon, ListOrdered, MessageSquare, CheckCircle, XCircle, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react'; // Icons

// Import the CSS file
import './Dashboard.css';

function Dashboard() {
  const { user, role } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [threads, setThreads] = useState([]);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [moderators, setModerators] = useState({}); // Store mods by boardId: { boardId: [userObj, ...] }
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({}); // For individual button loading: { action_id: true }
  const [error, setError] = useState(null); // General fetch error
  const [message, setMessage] = useState(null); // For success/error messages from actions

  // Form states for creating new board
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [createBoardError, setCreateBoardError] = useState(null);

  // State for moderator assignment dropdowns
  const [selectedBoardForUser, setSelectedBoardForUser] = useState({}); // { userId: boardId }

  // Refs for animations
  const containerRef = useRef(null);
  const messageBannerRef = useRef(null);
  // Refs for sections (optional, can target by class)
  const createBoardSectionRef = useRef(null);
  const boardsSectionRef = useRef(null);
  const threadsSectionRef = useRef(null);
  const postsSectionRef = useRef(null);
  const usersSectionRef = useRef(null);


  // Initial Data Fetch & Admin Check
  useEffect(() => {
    if (!user || role !== 'admin') {
      navigate('/'); // Redirect if not admin
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [boardsRes, threadsRes, postsRes, usersRes] = await Promise.all([
          api.get('/boards').catch(e => ({ data: { boards: [] }, error: e })), // Add individual catch
          api.get('/threads').catch(e => ({ data: { threads: [] }, error: e })),
          api.get('/posts').catch(e => ({ data: { posts: [] }, error: e })),
          api.get('/users').catch(e => ({ data: { users: [] }, error: e })),
        ]);

        // Check for errors in individual fetches
        if (boardsRes.error || threadsRes.error || postsRes.error || usersRes.error) {
            console.error("Error fetching some dashboard data:", {boardsRes, threadsRes, postsRes, usersRes});
            // Set partial data if some fetches succeeded
        }

        setBoards(boardsRes.data.boards || []);
        setThreads(threadsRes.data.threads || []);
        setPosts(postsRes.data.posts || []);
        setUsers(usersRes.data.users || []);

        // Pre-calculate moderators for each board (more efficient than on-the-fly in map)
        const modsByBoard = {};
        if (usersRes.data.users && boardsRes.data.boards) {
            boardsRes.data.boards.forEach(board => {
                modsByBoard[board._id] = usersRes.data.users.filter(
                    u => u.role === 'moderator' && u.moderatorBoards.includes(board._id)
                );
            });
        }
        setModerators(modsByBoard);

      } catch (err) { // Catch Promise.all error
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to fetch all dashboard data. Some sections might be unavailable.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, role, navigate]);


  // GSAP Animations for sections and list items
  useEffect(() => {
    if (!loading && !error) { // Only run if data is loaded and no major error
        const sections = [
            createBoardSectionRef.current,
            boardsSectionRef.current,
            threadsSectionRef.current,
            postsSectionRef.current,
            usersSectionRef.current
        ].filter(Boolean);

        gsap.to(sections, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'power2.out',
            stagger: 0.1
        });

        // Animate list items within each section
        sections.forEach(section => {
            const items = section?.querySelectorAll('.list-item-container');
            if (items && items.length > 0) {
                gsap.to(items, {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.4,
                    ease: 'power2.out',
                    stagger: 0.07,
                    scrollTrigger: {
                        trigger: section,
                        start: "top bottom-=100px",
                        toggleActions: "play none none none",
                    }
                });
            }
        });
         // Cleanup on unmount
         return () => {
             gsap.killTweensOf(sections);
             sections.forEach(section => {
                  const items = section?.querySelectorAll('.list-item-container');
                  if (items && items.length > 0) gsap.killTweensOf(items);
             });
             ScrollTrigger.getAll().forEach(trigger => {
                 if (trigger.trigger && sections.includes(trigger.trigger)) {
                     trigger.kill();
                 }
             });
         }
    }
  }, [loading, error, boards, threads, posts, users]); // Rerun if data changes for list items

  // Message Banner Animation
  useEffect(() => {
    if (message && messageBannerRef.current) {
        gsap.fromTo(messageBannerRef.current,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out',
              onComplete: () => {
                setTimeout(() => {
                    gsap.to(messageBannerRef.current, { opacity: 0, y: -20, duration: 0.3, onComplete: () => setMessage(null) });
                }, 2500); // Message stays for 2.5s
              }
            }
        );
    }
  }, [message]);


  // --- Action Handlers ---
  const handleAction = async (actionId, actionFn, successMsg, errorMsgPrefix) => {
    setActionLoading(prev => ({ ...prev, [actionId]: true }));
    setMessage(null);
    setCreateBoardError(null); // Clear specific errors too
    try {
      await actionFn();
      setMessage(successMsg);
    } catch (err) {
      console.error(`${errorMsgPrefix} error:`, err.response || err);
      const specificError = err.response?.data?.error || `Failed to ${errorMsgPrefix.toLowerCase()}`;
      setMessage({ type: 'error', text: specificError }); // Use object for message type
    } finally {
      setActionLoading(prev => ({ ...prev, [actionId]: false }));
    }
  };

  const handleCreateBoard = () => {
    if (!newBoardName.trim() || !newBoardDescription.trim()) {
      setCreateBoardError('Board name and description are required.');
      gsap.fromTo(createBoardSectionRef.current?.querySelector('.form-error-message') || null, {opacity:0, y:-10}, {opacity:1, y:0, duration:0.3});
      return;
    }
    handleAction(
      'createBoard',
      async () => {
        const res = await api.post('/boards', { name: newBoardName, description: newBoardDescription });
        setBoards(prev => [...prev, res.data]);
        setNewBoardName('');
        setNewBoardDescription('');
      },
      'Board created successfully!',
      'Create Board'
    );
  };

  const handleDeleteBoard = (boardId) => handleAction(
    `deleteBoard_${boardId}`,
    async () => {
      await api.delete(`/boards/${boardId}`);
      setBoards(prev => prev.filter(b => b._id !== boardId));
      // Also update related data, e.g., threads, user moderatorBoards
       setThreads(prev => prev.filter(t => t.board?._id !== boardId && t.board !== boardId)); // Handle populated vs ID
       setModerators(prev => { // Remove board from moderators map
           const newMods = { ...prev };
           delete newMods[boardId];
           return newMods;
       });
       setUsers(prevUsers => prevUsers.map(u => ({
           ...u,
           moderatorBoards: u.moderatorBoards.filter(bId => bId !== boardId)
       })));
    },
    'Board deleted successfully!',
    'Delete Board'
  );

  // Similar refactoring for handleDeleteThread, handleDeletePost, handleDeleteUser, handleMakeModerator, handleRemoveModerator
    const handleDeleteThread = (threadId) => handleAction(
        `deleteThread_${threadId}`,
        async () => {
            await api.delete(`/threads/${threadId}`);
            setThreads(prev => prev.filter(t => t._id !== threadId));
            setPosts(prev => prev.filter(p => p.thread?._id !== threadId && p.thread !== threadId));
        },
        'Thread deleted successfully!',
        'Delete Thread'
    );

    const handleDeletePost = (postId) => handleAction(
        `deletePost_${postId}`,
        async () => {
            await api.delete(`/posts/${postId}`);
            setPosts(prev => prev.filter(p => p._id !== postId));
        },
        'Post deleted successfully!',
        'Delete Post'
    );

    const handleDeleteUser = (userId) => handleAction(
        `deleteUser_${userId}`,
        async () => {
            await api.delete(`/users/${userId}`);
            setUsers(prev => prev.filter(u => u._id !== userId));
            // Also remove user from any moderator lists
            const newModerators = { ...moderators };
            Object.keys(newModerators).forEach(boardId => {
                newModerators[boardId] = newModerators[boardId].filter(mod => mod._id !== userId);
            });
            setModerators(newModerators);
        },
        'User deleted successfully!',
        'Delete User'
    );

    const handleMakeModerator = (userId, boardId) => {
        if (!boardId) {
            setMessage({ type: 'error', text: 'Please select a board to assign moderator role.' });
            return;
        }
        handleAction(
            `makeMod_${userId}_${boardId}`,
            async () => {
                await api.post(`/boards/${boardId}/moderators`, { userId });
                const updatedUser = users.find(u => u._id === userId);
                if (updatedUser) {
                    setUsers(prev => prev.map(u =>
                        u._id === userId ? { ...u, role: 'moderator', moderatorBoards: [...new Set([...u.moderatorBoards, boardId])] } : u
                    ));
                    setModerators(prev => ({
                        ...prev,
                        [boardId]: [...(prev[boardId] || []), { ...updatedUser, role: 'moderator' }]
                    }));
                }
            },
            'Moderator assigned successfully!',
            'Assign Moderator'
        );
    };

    const handleRemoveModerator = (userId, boardId) => {
        if (!boardId) {
            setMessage({ type: 'error', text: 'Please select a board to remove moderator role from.' });
            return;
        }
        handleAction(
            `removeMod_${userId}_${boardId}`,
            async () => {
                await api.delete(`/boards/${boardId}/moderators/${userId}`);
                setUsers(prev => prev.map(u => {
                    if (u._id === userId) {
                        const newModBoards = u.moderatorBoards.filter(b => b !== boardId);
                        return { ...u, role: newModBoards.length > 0 ? 'moderator' : 'user', moderatorBoards: newModBoards };
                    }
                    return u;
                }));
                setModerators(prev => ({
                    ...prev,
                    [boardId]: (prev[boardId] || []).filter(mod => mod._id !== userId)
                }));
            },
            'Moderator removed successfully!',
            'Remove Moderator'
        );
    };

  // --- Render Logic ---

  if (loading && !boards.length) return <div className="loading-indicator">Loading Dashboard Data...</div>; // Initial full load

  return (
    // Use CSS classes for structure
    <div className="dashboard-container" ref={containerRef}>
      <header className="dashboard-header">
        <h1 className="dashboard-title"><LayoutDashboard size={28}/> Admin Dashboard</h1>
      </header>

      {/* Message Banner */}
      {message && (
        <div
          ref={messageBannerRef}
          className={`message-banner ${message.type === 'error' ? 'error' : 'success'}`}
          style={{ opacity: 0 }} // Start hidden for GSAP
        >
          {message.type === 'error' ? <XCircle /> : <CheckCircle />}
          <span>{message.text || message}</span>
        </div>
      )}

      {/* Create New Board */}
      <section
        ref={createBoardSectionRef}
        className="dashboard-section create-board-section"
        style={{ opacity: 0, transform: 'translateY(20px)' }}
      >
        <h2 className="section-title"><PlusCircle size={22}/> Create New Board</h2>
        <div className="dashboard-card">
          <input
            type="text"
            placeholder="Board Name (e.g., 'Frontend Frameworks')"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            className="form-input" // Use CSS class
            aria-label="New board name"
          />
          <textarea
            placeholder="Board Description (A place to discuss...)"
            value={newBoardDescription}
            onChange={(e) => setNewBoardDescription(e.target.value)}
            className="form-textarea" // Use CSS class
            rows="2"
            aria-label="New board description"
          />
          {/* Create Board Error (specific to this form) */}
          {createBoardError && <p className="form-error-message animate-fade-slide-up" style={{opacity:1}}>{createBoardError}</p>}
          <button
            onClick={handleCreateBoard}
            disabled={actionLoading['createBoard']}
            className="dashboard-button button-primary mt-2" // Added mt-2
          >
            {actionLoading['createBoard'] ? <Loader2 size={16} className="spinner" /> : <PlusCircle size={16}/>}
            Create Board
          </button>
        </div>
      </section>

      {/* --- Boards Section --- */}
       <section
        ref={boardsSectionRef}
        className="dashboard-section"
        style={{ opacity: 0, transform: 'translateY(20px)' }}
       >
         <h2 className="section-title"><ListOrdered size={22}/> Manage Boards ({boards.length})</h2>
         {boards.map(board => (
           <div key={board._id} className="list-item-container" style={{ opacity: 0, transform: 'scale(0.98) translateY(10px)' }}>
             <div className="dashboard-card list-item-card">
               <div className="item-info">
                 <h3 className="item-title">{board.name}</h3>
                 <p className="item-description">{board.description}</p>
               </div>
               <div className="item-actions">
                 <button
                   onClick={() => handleDeleteBoard(board._id)}
                   disabled={actionLoading[`deleteBoard_${board._id}`]}
                   className="dashboard-button button-danger"
                 >
                   {actionLoading[`deleteBoard_${board._id}`] ? <Loader2 size={16} className="spinner" /> : <Trash2 size={16}/>}
                   Delete
                 </button>
               </div>
             </div>
           </div>
         ))}
       </section>

      {/* --- Threads Section --- */}
      <section
        ref={threadsSectionRef}
        className="dashboard-section"
        style={{ opacity: 0, transform: 'translateY(20px)' }}
      >
        <h2 className="section-title"><MessageSquare size={22}/> Manage Threads ({threads.length})</h2>
        {threads.map(thread => (
           <div key={thread._id} className="list-item-container" style={{ opacity: 0, transform: 'scale(0.98) translateY(10px)' }}>
             <div className="dashboard-card list-item-card">
               <div className="item-info">
                 <h3 className="item-title">{thread.title}</h3>
                 <p className="item-meta">Board: {thread.board?.name || 'Unknown'}</p>
                 <p className="item-meta">
                   Moderators: {(moderators[thread.board?._id] || []).map(mod => mod.username).join(', ') || 'None'}
                 </p>
               </div>
               <div className="item-actions">
                 <button
                   onClick={() => handleDeleteThread(thread._id)}
                   disabled={actionLoading[`deleteThread_${thread._id}`]}
                   className="dashboard-button button-danger"
                 >
                   {actionLoading[`deleteThread_${thread._id}`] ? <Loader2 size={16} className="spinner" /> : <Trash2 size={16}/>}
                   Delete
                 </button>
               </div>
             </div>
           </div>
        ))}
      </section>

      {/* --- Posts Section --- */}
       <section
        ref={postsSectionRef}
        className="dashboard-section"
        style={{ opacity: 0, transform: 'translateY(20px)' }}
       >
         <h2 className="section-title"><MessageSquare size={22}/> Manage Posts ({posts.length})</h2>
         {posts.map(post => (
           <div key={post._id} className="list-item-container" style={{ opacity: 0, transform: 'scale(0.98) translateY(10px)' }}>
             <div className="dashboard-card list-item-card">
               <div className="item-info">
                 <h3 className="item-title">By: {post.displayUsername || 'Anonymous'}</h3>
                 <p className="item-description">{post.content?.substring(0,100)}{post.content?.length > 100 ? '...' : ''}</p>
                 <p className="item-meta">Thread: {post.thread?.title || 'Unknown'}</p>
               </div>
               <div className="item-actions">
                 <button
                   onClick={() => handleDeletePost(post._id)}
                   disabled={actionLoading[`deletePost_${post._id}`]}
                   className="dashboard-button button-danger"
                 >
                   {actionLoading[`deletePost_${post._id}`] ? <Loader2 size={16} className="spinner" /> : <Trash2 size={16}/>}
                   Delete
                 </button>
               </div>
             </div>
           </div>
         ))}
       </section>

      {/* --- Users Section --- */}
       <section
        ref={usersSectionRef}
        className="dashboard-section"
        style={{ opacity: 0, transform: 'translateY(20px)' }}
       >
         <h2 className="section-title"><UsersIcon size={22}/> Manage Users ({users.length})</h2>
         {users.map(u => (
           <div key={u._id} className="list-item-container" style={{ opacity: 0, transform: 'scale(0.98) translateY(10px)' }}>
             <div className="dashboard-card list-item-card">
               <div className="item-info">
                 <h3 className="item-title">{u.username} ({u.email})</h3>
                 <p className="item-meta">Role: <span style={{fontWeight: 'bold', color: u.role === 'admin' ? 'var(--error-color)' : u.role === 'moderator' ? 'var(--accent-secondary)' : 'inherit'}}>{u.role}</span></p>
                 <p className="item-meta">
                   Moderating: {u.moderatorBoards.length > 0 ? u.moderatorBoards.map(boardId =>
                     boards.find(b => b._id === boardId)?.name || 'Unknown Board'
                   ).join(', ') : 'None'}
                 </p>
               </div>
               {u.role !== 'admin' && (
                 <div className="item-actions">
                   <select
                     value={selectedBoardForUser[u._id] || ''}
                     onChange={(e) => setSelectedBoardForUser(prev => ({ ...prev, [u._id]: e.target.value }))}
                     className="form-select"
                     aria-label={`Select board to manage moderator role for ${u.username}`}
                   >
                     <option value="">Select a Board...</option>
                     {boards.map(board => (
                       <option key={board._id} value={board._id}>{board.name}</option>
                     ))}
                   </select>
                   <button
                     onClick={() => handleMakeModerator(u._id, selectedBoardForUser[u._id])}
                     disabled={!selectedBoardForUser[u._id] || actionLoading[`makeMod_${u._id}_${selectedBoardForUser[u._id]}`] || u.moderatorBoards.includes(selectedBoardForUser[u._id])}
                     className="dashboard-button button-success"
                   >
                     {actionLoading[`makeMod_${u._id}_${selectedBoardForUser[u._id]}`] ? <Loader2 size={16} className="spinner" /> : <ShieldCheck size={16} />}
                     Assign Mod
                   </button>
                   {u.moderatorBoards.includes(selectedBoardForUser[u._id]) && ( // Only show if mod of selected board
                     <button
                       onClick={() => handleRemoveModerator(u._id, selectedBoardForUser[u._id])}
                       disabled={!selectedBoardForUser[u._id] || actionLoading[`removeMod_${u._id}_${selectedBoardForUser[u._id]}`]}
                       className="dashboard-button button-warning"
                     >
                       {actionLoading[`removeMod_${u._id}_${selectedBoardForUser[u._id]}`] ? <Loader2 size={16} className="spinner" /> : <ShieldOff size={16} />}
                       Remove Mod
                     </button>
                   )}
                   <button
                     onClick={() => handleDeleteUser(u._id)}
                     disabled={actionLoading[`deleteUser_${u._id}`]}
                     className="dashboard-button button-danger"
                   >
                     {actionLoading[`deleteUser_${u._id}`] ? <Loader2 size={16} className="spinner" /> : <Trash2 size={16} />}
                     Delete User
                   </button>
                 </div>
               )}
             </div>
           </div>
         ))}
       </section>
    </div>
  );
}

export default Dashboard;