import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface UserRole {
  id: string;
  name: string;
  slug: string;
}

export interface UserDetails {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  admin_type: string | null;
  is_email_verified: boolean;
  phone: string;
  avatar_url: string;
  image?: string;
  is_active: boolean;
  created_at: string;
  roles: UserRole[];
  permissions: string[];
}

export interface UserState {
  details: UserDetails;
  isUserDetailsFetched: boolean;
}

const initialState: UserState = {
  details: {
    id: "",
    email: "",
    first_name: "",
    last_name: "",
    user_type: "",
    admin_type: null,
    is_email_verified: false,
    phone: "",
    avatar_url: "",
    image: "",
    is_active: false,
    created_at: "",
    roles: [],
    permissions: [],
  },
  isUserDetailsFetched: false,
};

const userSlice = createSlice({
  name: "user",
  initialState: initialState,
  reducers: {
    setUserDetails: (state, action: PayloadAction<UserDetails>) => {
      state.details = action.payload;
    },
    setIsUserDetailsFetched: (state, action: PayloadAction<boolean>) => {
      state.isUserDetailsFetched = action.payload;
    },
  },
});

export const { setUserDetails, setIsUserDetailsFetched } = userSlice.actions;
export default userSlice.reducer;
