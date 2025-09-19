import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  usersList: [],
  loading: false,
  error: null,
  successMessage: null,
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    fetchUsers(state) {
      state.loading = true;
      state.error = null;
      state.successMessage = null;
    },
    addUser(state) {
      state.loading = true;
      state.error = null;
      state.successMessage = null;
    },
    updateUser(state) {
      state.loading = true;
      state.error = null;
      state.successMessage = null;
    },
    deleteUser(state) {
      state.loading = true;
      state.error = null;
      state.successMessage = null;
    },
    fetchUsersSucceeded(state, action) {
      state.loading = false;
      state.usersList = action.payload;
    },
    addUserSucceeded(state, action) {
      state.loading = false;
      state.usersList.push(action.payload.userData);
      state.successMessage = 'User created successfully';
    },
    updateUserSucceeded(state, action) {
      state.loading = false;
      const idx = state.usersList.findIndex(u => u.id === action.payload.userData.id);
      if (idx !== -1) {
        state.usersList[idx] = action.payload.userData;
      }
      state.successMessage = 'User updated successfully';
    },
    deleteUserSucceeded(state, action) {
      state.loading = false;
      state.usersList = state.usersList.filter(u => u.id !== action.payload.userId);
    },
    failed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    clearMessages(state) {
      state.error = null;
      state.successMessage = null;
    },
  },
});

export const {
  fetchUsers,
  addUser,
  updateUser,
  deleteUser,
  fetchUsersSucceeded,
  addUserSucceeded,
  updateUserSucceeded,
  deleteUserSucceeded,
  failed,
  clearMessages,
} = usersSlice.actions;

export default usersSlice.reducer;
