import React, { useEffect, useState, useCallback } from 'react'; // Added React and useCallback
import { useSelector, useDispatch } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import PostForm from './PostForm'; // Assumes styled separately or globally
import ReplyForm from '../components/ReplyForm'; // Assumes styled separately or globally

// Import socket logic
import {
  addNewPost,
  addNewReply,
  addDeletedPost,
  addReaction,
  addVote,
  addStar,
  clearNewPosts,
  clearNewReplies,
  clearDeletedPosts,
  clearReactions,
  clearVotes,
  clearStars,
  connectSocket,
  socket // Import the external socket
} from '../store/socketSlice';

// Import the CSS file
import './PostsPage.css'; // Adjust path if needed

function PostsPage() {
  const { threadId } = useParams();
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null); // ID of the post being replied to

  // Selectors and Dispatch
  const { user, role, moderatorBoards } = useSelector((state) => state.auth);
  const { newPosts, newReplies, deletedPosts, reactions, votes, stars, isConnected } = useSelector((state) => state.socket);
  const dispatch = useDispatch();

  // --- Socket Effects ---
  useEffect(() => {
    if (!isConnected) {
      dispatch(connectSocket());
    }

    // Ensure socket is connected before emitting/listening
    if (socket.connected) {
        console.log(`Socket connected, joining thread: ${threadId}`);
        socket.emit('joinThread', threadId);
    } else {
        // Handle case where socket is not immediately connected
        socket.once('connect', () => {
            console.log(`Socket connected (via once), joining thread: ${threadId}`);
            socket.emit('joinThread', threadId);
        });
    }

    // Define handlers
    const handleNewPost = (post) => {
      console.log('Received newPost:', post);
      // Check if the post belongs to the current thread before dispatching
      if (post.thread === threadId) {
        dispatch(addNewPost(post));
      }
    };
    const handleNewReply = (post) => {
      console.log('Received newReply:', post);
      if (post.thread === threadId) {
        dispatch(addNewReply(post));
      }
    };
    const handlePostDeleted = (postId) => {
      console.log('Received postDeleted:', postId);
       // We don't need threadId check here, postId is globally unique
      dispatch(addDeletedPost(postId));
    };
     const handleReactionAdded = ({ postId, reactions: updatedReactions }) => {
        console.log('Received reactionAdded:', { postId, updatedReactions });
        // We might not have threadId here, but update based on postId
        dispatch(addReaction({ postId, reactions: updatedReactions }));
     };
    const handleVoteUpdated = ({ postId, upvotes, downvotes }) => {
      console.log('Received voteUpdated:', { postId, upvotes, downvotes });
      dispatch(addVote({ postId, upvotes, downvotes }));
    };
    const handleStarToggled = ({ postId, userId, starred }) => {
      console.log('Received starToggled:', { postId, userId, starred });
      dispatch(addStar({ postId, userId, starred }));
    };

    // Attach listeners
    socket.on('newPost', handleNewPost);
    socket.on('newReply', handleNewReply);
    socket.on('postDeleted', handlePostDeleted);
    socket.on('reactionAdded', handleReactionAdded);
    socket.on('voteUpdated', handleVoteUpdated);
    socket.on('starToggled', handleStarToggled);

    // Cleanup: Remove listeners and leave thread
    return () => {
      console.log(`Leaving thread: ${threadId}`);
      socket.emit('leaveThread', threadId);
      socket.off('newPost', handleNewPost);
      socket.off('newReply', handleNewReply);
      socket.off('postDeleted', handlePostDeleted);
      socket.off('reactionAdded', handleReactionAdded);
      socket.off('voteUpdated', handleVoteUpdated);
      socket.off('starToggled', handleStarToggled);
       // Don't disconnect socket here if it's shared globally
    };
  }, [threadId, dispatch, isConnected]); // isConnected dependency ensures re-join if connection drops and comes back

  // --- Fetch Initial Thread Data ---
  useEffect(() => {
    setLoading(true); // Ensure loading state is set
    api
      .get(`/threads/${threadId}`)
      .then((response) => {
        console.log('Fetched thread:', response.data);
        setThread(response.data);
        setError(null); // Clear previous errors
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch thread error:", err);
        setError(err.response?.data?.error || 'Failed to fetch thread');
        setThread(null); // Clear thread data on error
        setLoading(false);
      });
  }, [threadId]);

  // --- Update State with Socket Data ---
  const updateThreadState = useCallback((updateLogic) => {
      setThread(prev => {
          if (!prev) return null; // Don't update if thread isn't loaded
          return updateLogic(prev);
      });
  }, []); // No dependencies, setThread is stable

  // New Posts/Replies Effect
  useEffect(() => {
    if (newPosts.length > 0 || newReplies.length > 0) {
       console.log('Processing new posts/replies from socket state');
       updateThreadState(prev => {
            const existingIds = new Set(prev.posts.map((p) => p._id));
            // Filter posts/replies for *this* thread only and avoid duplicates
            const postsToAdd = [...newPosts, ...newReplies].filter(
                (post) => post.thread === threadId && !existingIds.has(post._id)
            );

            if (postsToAdd.length > 0) {
                console.log('Adding new posts/replies to thread:', postsToAdd);
                return { ...prev, posts: [...prev.posts, ...postsToAdd] };
            }
            return prev; // No changes needed for this thread
       });
       dispatch(clearNewPosts());
       dispatch(clearNewReplies());
    }
  }, [newPosts, newReplies, threadId, dispatch, updateThreadState]);

  // Deleted Posts Effect
  useEffect(() => {
    if (deletedPosts.length > 0) {
        console.log('Processing deleted posts from socket state:', deletedPosts);
        updateThreadState(prev => {
             const deletedSet = new Set(deletedPosts);
             const updatedPosts = prev.posts.filter(post => !deletedSet.has(post._id));
             // Only update state if posts actually changed
             if (updatedPosts.length !== prev.posts.length) {
                  console.log('Removing deleted posts from thread state');
                  return { ...prev, posts: updatedPosts };
             }
             return prev;
        });
        dispatch(clearDeletedPosts());
    }
  }, [deletedPosts, dispatch, updateThreadState]);

  // Reactions Effect
  useEffect(() => {
    if (reactions.length > 0) {
        console.log('Processing reactions from socket state:', reactions);
        updateThreadState(prev => {
            const reactionMap = new Map(reactions.map(r => [r.postId, r.reactions]));
            let changed = false;
            const updatedPosts = prev.posts.map(post => {
                if (reactionMap.has(post._id)) {
                    changed = true;
                    return { ...post, reactions: reactionMap.get(post._id) };
                }
                return post;
            });
            return changed ? { ...prev, posts: updatedPosts } : prev;
        });
        dispatch(clearReactions());
    }
  }, [reactions, dispatch, updateThreadState]);

  // Votes Effect
  useEffect(() => {
    if (votes.length > 0) {
        console.log('Processing votes from socket state:', votes);
        updateThreadState(prev => {
            const voteMap = new Map(votes.map(v => [v.postId, { upvotes: v.upvotes, downvotes: v.downvotes }]));
            let changed = false;
            const updatedPosts = prev.posts.map(post => {
                if (voteMap.has(post._id)) {
                    changed = true;
                    const voteUpdate = voteMap.get(post._id);
                    return { ...post, upvotes: voteUpdate.upvotes, downvotes: voteUpdate.downvotes };
                }
                return post;
            });
            return changed ? { ...prev, posts: updatedPosts } : prev;
        });
        dispatch(clearVotes());
    }
  }, [votes, dispatch, updateThreadState]);

    // Stars Effect - Careful with user ID check
    useEffect(() => {
        if (stars.length > 0 && user?._id) { // Only process if user is known
            console.log('Processing stars from socket state:', stars);
            updateThreadState(prev => {
                let changed = false;
                const updatedPosts = prev.posts.map(post => {
                    const starUpdate = stars.find(s => s.postId === post._id);
                    if (starUpdate) {
                        // Update starredBy array for the correct user
                        const currentStarredBy = post.starredBy || [];
                        const userPresent = currentStarredBy.includes(starUpdate.userId);

                        if (starUpdate.starred && !userPresent) {
                            // Add user if starred and not present
                            changed = true;
                            return { ...post, starredBy: [...currentStarredBy, starUpdate.userId] };
                        } else if (!starUpdate.starred && userPresent) {
                            // Remove user if not starred and present
                            changed = true;
                            return { ...post, starredBy: currentStarredBy.filter(id => id !== starUpdate.userId) };
                        }
                    }
                    return post;
                });
                return changed ? { ...prev, posts: updatedPosts } : prev;
            });
            dispatch(clearStars());
        } else if (stars.length > 0) {
             // Clear stars even if user is not logged in, to prevent processing later
             dispatch(clearStars());
        }
    }, [stars, user, dispatch, updateThreadState]);


  // --- API Call Handlers ---
  const handleReact = async (postId, type) => {
    if (!user) return; // Or show login prompt
    try {
      await api.post(`/posts/${postId}/react`, { type });
      // Rely on socket broadcast to update state
    } catch (err) {
      console.error('Failed to react:', err);
      // TODO: Show user feedback
    }
  };

  const handleVote = async (postId, voteType) => {
    if (!user) return;
    try {
      await api.post(`/posts/${postId}/vote`, { vote: voteType });
      // Rely on socket broadcast
    } catch (err) {
      console.error(`Failed to ${voteType}vote:`, err);
      // TODO: Show user feedback
    }
  };

  const handleStar = async (postId) => {
    if (!user) return;
    try {
      await api.post(`/posts/${postId}/star`);
      // Rely on socket broadcast
    } catch (err) {
      console.error('Failed to star:', err);
      // TODO: Show user feedback
    }
  };

  const handleDelete = async (postId) => {
     if (!user || !(role === 'admin' || (role === 'moderator' && moderatorBoards?.includes(thread?.board)))) return;
     // Optional: Add a confirmation dialog here
     if (window.confirm('Are you sure you want to delete this post?')) {
         try {
           await api.delete(`/posts/${postId}`);
           // Rely on socket broadcast
         } catch (err) {
           console.error('Failed to delete post:', err);
           // TODO: Show user feedback
         }
     }
  };

  // --- Render Logic ---

  if (loading) return <div className="loading-container">Loading thread...</div>; // Use CSS class?
  if (error) return <div className="error-container-outer">{error}</div>; // Use CSS class?
  if (!thread) return <div className="no-comments-text">Thread not found.</div>; // Use CSS class?

  // Separate posts - OP vs Replies
  const originalPost = thread.posts.find((post) => !post.parentPost);
  const replies = thread.posts.filter((post) => post._id !== originalPost?._id); // All other posts are replies/comments


  // Build comment tree (no change needed here)
  const buildCommentTree = (posts, parentId = null) => {
     // Find direct children of the parentId (or root posts if parentId is null)
     const children = posts.filter((post) => {
         // Check if post.parentPost exists and its _id matches parentId
         // Or if parentId is null, check if post.parentPost is null or undefined
         return parentId ? post.parentPost?._id === parentId : !post.parentPost;
     });

     // Recursively build the tree for each child
     return children.map((child) => ({
         ...child,
         // Recursively find children of the current child
         children: buildCommentTree(posts, child._id),
     }));
   };


   // Filter root-level comments (direct replies to the OP or thread itself)
   const rootComments = buildCommentTree(replies, originalPost?._id);


  // Recursive comment rendering function
  const renderComment = (post) => {
    // Determine if the current user authored this post for potential styling
    // const isAuthor = user && post.user?._id === user._id; // Requires post.user._id from backend

    return (
      // Use CSS classes for the comment card
      <div key={post._id} className="comment-card post-card">
         {/* Post Meta */}
        <p className="post-meta">
          <span className="post-author">{post.displayUsername || 'User'}</span> -{' '}
          {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {' '}
          {new Date(post.createdAt).toLocaleDateString()}
          {/* Show parent only if it's not the OP */}
          {post.parentPost && post.parentPost._id !== originalPost?._id && (
            <span className="reply-target">
              (replying to @{post.parentPost.displayUsername || 'User'})
            </span>
          )}
        </p>
         {/* Content */}
        <p className="post-content">{post.content}</p>
         {/* Media */}
        {post.media && (
          <img
            // Ensure correct URL for media
            src={post.media.startsWith('http') ? post.media : `http://localhost:5000${post.media}`}
            alt="Comment media"
            className="post-media" // Use CSS class
          />
        )}
         {/* Actions */}
        <div className="post-actions">
          {user && ( // Only show reply button if logged in
            <button
                onClick={() => setReplyingTo(replyingTo === post._id ? null : post._id)} // Toggle reply form
                className="action-button reply-button"
            >
                {replyingTo === post._id ? 'Cancel Reply' : 'Reply'}
            </button>
          )}
          {/* Reactions */}
          <div className="flex space-x-1"> {/* Keep flex for reactions */}
            {['heart', 'like', 'happy', 'laugh', 'angry'].map((type) => {
              const isActive = user && post.reactions?.some((r) => r.user === user._id && r.type === type);
              const count = post.reactions?.filter((r) => r.type === type).length || 0;
              return (
                <button
                  key={type}
                  onClick={() => handleReact(post._id, type)}
                  // Use CSS classes + conditional 'active' class
                  className={`action-button reaction-button ${isActive ? 'active' : ''}`}
                  title={type} // Tooltip for accessibility
                  disabled={!user} // Disable if not logged in
                >
                  {/* Emojis */}
                  {type === 'heart' ? '❤️' : type === 'like' ? '👍' : type === 'happy' ? '😊' : type === 'laugh' ? '😂' : '😣'}
                  <span className="reaction-count">{count > 0 ? count : ''}</span> {/* Show count only if > 0 */}
                </button>
              );
            })}
          </div>
          {/* Votes */}
          <button
            onClick={() => handleVote(post._id, 'up')}
            className={`action-button vote-button ${user && post.upvotes?.includes(user._id) ? 'active' : ''}`}
            disabled={!user}
          >
            ⬆ <span className="vote-count">{post.upvotes?.length || 0}</span>
          </button>
          <button
            onClick={() => handleVote(post._id, 'down')}
            className={`action-button vote-button ${user && post.downvotes?.includes(user._id) ? 'active' : ''}`}
            disabled={!user}
          >
            ⬇ <span className="vote-count">{post.downvotes?.length || 0}</span>
          </button>
          {/* Star */}
          <button
            onClick={() => handleStar(post._id)}
            className={`action-button star-button ${user && post.starredBy?.includes(user._id) ? 'active' : ''}`}
            disabled={!user}
          >
            ⭐
          </button>
          {/* Delete Button (Conditional) */}
          {(role === 'admin' || (role === 'moderator' && moderatorBoards?.includes(thread?.board))) && (
            <button
              onClick={() => handleDelete(post._id)}
              className="action-button delete-button" // Use specific class
            >
              Delete
            </button>
          )}
        </div>

        {/* Reply Form (Conditional) */}
        {replyingTo === post._id && user && (
          <div className="reply-form-container"> {/* Added wrapper */}
            <ReplyForm
              threadId={threadId}
              parentPostId={post._id}
              onCancel={() => setReplyingTo(null)}
              // Add onSubmitted to potentially close form?
               onSubmitted={() => setReplyingTo(null)}
            />
          </div>
        )}

        {/* Render Children Recursively */}
        {/* Check if children exist and map over them */}
        {post.children && post.children.length > 0 && (
          <div className="nested-comments"> {/* Optional wrapper for styling */}
            {post.children.map((child) => renderComment(child))}
          </div>
        )}
      </div>
    );
  };


  return (
    // Use CSS class for the main container
    <div className="posts-page-container">
      <h1 className="thread-title">{thread.title}</h1>

      {/* Original Post */}
      {originalPost && (
        <div className="original-post-card post-card"> {/* Use CSS classes */}
           {/* Post Meta */}
          <p className="post-meta">
            <span className="post-author">{originalPost.displayUsername || 'Original Poster'}</span> -{' '}
             {new Date(originalPost.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {' '}
             {new Date(originalPost.createdAt).toLocaleDateString()}
          </p>
           {/* Content */}
          <p className="post-content">{originalPost.content}</p>
           {/* Media */}
          {originalPost.media && (
            <img
              src={originalPost.media.startsWith('http') ? originalPost.media : `http://localhost:5000${originalPost.media}`}
              alt="Original post media"
              className="post-media"
            />
          )}
           {/* Delete Button (Conditional) */}
          {(role === 'admin' || (role === 'moderator' && moderatorBoards?.includes(thread?.board))) && (
            <div className="post-actions"> {/* Place delete in actions row for consistency */}
                <button
                onClick={() => handleDelete(originalPost._id)}
                className="action-button delete-button"
                >
                Delete Thread OP
                </button>
            </div>
          )}
        </div>
      )}

      {/* Comments Section */}
      <h2 className="comments-title">Comments ({replies.length})</h2> {/* Show reply count */}
      {rootComments.length === 0 && !originalPost ? ( // Handle case where OP might be deleted but replies exist?
          <p className="no-comments-text">Thread content not available.</p>
      ) : rootComments.length === 0 ? (
           <p className="no-comments-text">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="comments-list">
          {rootComments.map((post) => renderComment(post))}
        </div>
      )}

      {/* Post Form (for new root comments/replies to OP) */}
      {user && originalPost && ( // Only show if user is logged in AND OP exists
        <div className="new-post-form-container mt-8 pt-4 border-t border-[var(--card-border)]"> {/* Added wrapper & spacing */}
             <h3 className="text-xl font-semibold mb-3">Add a comment</h3>
            <PostForm threadId={threadId} parentPostId={originalPost._id} />
        </div>
      )}

      {/* Login Prompt Bar */}
      {!user && (
        <div className="login-prompt-bar">
          <p className="login-prompt-text">
            Please <Link to="/login" className="login-prompt-link">login</Link> or <Link to="/register" className="login-prompt-link">register</Link> to participate in the discussion.
          </p>
        </div>
      )}
    </div>
  );
}

export default PostsPage;