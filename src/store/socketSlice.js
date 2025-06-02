import { createSlice } from '@reduxjs/toolkit';
import { io } from 'socket.io-client';

// Create socket instance outside Redux state
export const socket = io('https://modernforumsbackend.onrender.com', { autoConnect: false });

const socketSlice = createSlice({
  name: 'socket',
  initialState: {
    newPosts: [],
    newReplies: [],
    deletedPosts: [],
    reactions: [],
    votes: [],
    stars: [],
    isConnected: false,
  },
  reducers: {
    connectSocket: (state) => {
      if (!state.isConnected) {
        socket.connect();
        state.isConnected = true;
        console.log('Socket connected');
      }
    },
    disconnectSocket: (state) => {
      socket.disconnect();
      state.isConnected = false;
      console.log('Socket disconnected');
    },
    addNewPost: (state, action) => {
      console.log('Adding new post:', action.payload);
      state.newPosts.push(action.payload);
    },
    addNewReply: (state, action) => {
      console.log('Adding new reply:', action.payload);
      state.newReplies.push(action.payload);
    },
    addDeletedPost: (state, action) => {
      console.log('Adding deleted post:', action.payload);
      state.deletedPosts.push(action.payload);
    },
    addReaction: (state, action) => {
      console.log('Adding reaction:', action.payload);
      state.reactions.push(action.payload);
    },
    addVote: (state, action) => {
      console.log('Adding vote:', action.payload);
      state.votes.push(action.payload);
    },
    addStar: (state, action) => {
      console.log('Adding star:', action.payload);
      state.stars.push(action.payload);
    },
    clearNewPosts: (state) => {
      state.newPosts = [];
    },
    clearNewReplies: (state) => {
      state.newReplies = [];
    },
    clearDeletedPosts: (state) => {
      state.deletedPosts = [];
    },
    clearReactions: (state) => {
      state.reactions = [];
    },
    clearVotes: (state) => {
      state.votes = [];
    },
    clearStars: (state) => {
      state.stars = [];
    },
  },
});

export const {
  connectSocket,
  disconnectSocket,
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
  clearStars
} = socketSlice.actions;
export default socketSlice.reducer;