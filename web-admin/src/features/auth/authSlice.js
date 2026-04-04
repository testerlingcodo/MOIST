import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as authApi from '../../api/auth.api';

export const loginThunk = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const res = await authApi.login(email, password);
    const data = res.data;
    if (data.user?.role === 'student') {
      return rejectWithValue('Access denied. Students must use the Student Portal.');
    }
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Login failed');
  }
});

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  await authApi.logout().catch(() => {});
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: null,
    loading: false,
    error: null,
  },
  reducers: {
    setSession(state, action) {
      state.accessToken = action.payload?.accessToken || null;
      state.user = action.payload?.user || null;
    },
    setAccessToken(state, action) {
      state.accessToken = action.payload;
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
      });
  },
});

export const { setSession, setAccessToken, logout } = authSlice.actions;
export default authSlice.reducer;
