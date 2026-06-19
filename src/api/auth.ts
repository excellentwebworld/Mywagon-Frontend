export { authService, getStoredToken, setStoredToken, clearStoredToken } from './auth/authService';
export type { LoginPayload, LoginResponse, ShipperUser, ShipperPermission } from './auth/types';

import axiosInstance from '../utils/axios';

/** Legacy axios auth APIs */
export const loginAPI = async (payload: { email: string; password: string }) => {
  try {
    const response = await axiosInstance.post('/auth/admin/login/', {
      ...payload,
    });
    return response.data;
  } catch (error: any) {
    throw error.response.data;
  }
};

export const forgotPasswordAPI = async (payload: { email: string }) => {
  try {
    const response = await axiosInstance.post('/auth/forgot-password/', payload);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export const resetPasswordAPI = async (payload: {
  token: string;
  new_password: string;
  confirm_password: string;
}) => {
  try {
    const response = await axiosInstance.post('/auth/reset-password/', payload);
    return response.data;
  } catch (error: any) {
    throw error.response.data;
  }
};

export const logoutAPI = async () => {
  try {
    const refresh_token = localStorage.getItem('refresh_token');
    const payload = {
      refresh_token: refresh_token,
    };
    const response = await axiosInstance.post('/auth/logout/', payload);
    localStorage.clear();
    sessionStorage.clear();
    return response.data;
  } catch (error: any) {
    throw error.response.data;
  }
};

export const getProfileAPI = async () => {
  try {
    const response = await axiosInstance.get('/me/');
    return response.data;
  } catch (error: any) {
    throw error.response.data;
  }
};
