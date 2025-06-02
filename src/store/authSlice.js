import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunks
export const login = createAsyncThunk('auth/login', async ({ username, password }, { rejectWithValue }) => {
  try {
    const response = await axios.post('https://modernforumsbackend.onrender.com/api/auth/login', { username, password });
    return response.data;
  } catch (err) {
    return rejectWithValue(err.response.data.error || 'Login failed');
  }
});

export const register = createAsyncThunk('auth/register', async ({ username, password }, { rejectWithValue }) => {
  try {
    const response = await axios.post('https://modernforumsbackend.onrender.com/api/auth/register', { username, password });
    return response.data;
  } catch (err) {
    return rejectWithValue(err.response.data.error || 'Registration failed');
  }
});

export const checkAuth = createAsyncThunk('auth/checkAuth', async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }
    const response = await axios.get('https://modernforumsbackend.onrender.com/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { token, ...response.data };
  } catch (err) {
    localStorage.removeItem('token');
    return rejectWithValue(err.response?.data?.error || 'Invalid token');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: localStorage.getItem('token') || null,
    user: null,
    role: null,
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.role = null;
      localStorage.removeItem('token');
    },
    setUser: (state, action) => {
      state.user = action.payload.username;
      state.role = action.payload.role;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.meta.arg.username;
        state.role = JSON.parse(atob(action.payload.token.split('.')[1])).role;
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.username;
        state.role = action.payload.role;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.loading = false;
        state.token = null;
        state.user = null;
        state.role = null;
        state.error = action.payload;
      });
  },
});

export const { logout, setUser } = authSlice.actions;
export default authSlice.reducer;
