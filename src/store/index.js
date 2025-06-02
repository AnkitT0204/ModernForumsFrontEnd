import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import socketReducer from './socketSlice';

export default configureStore({
  reducer: {
    auth: authReducer,
    socket: socketReducer,
  },
});