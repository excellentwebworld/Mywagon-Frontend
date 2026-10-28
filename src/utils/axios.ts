import { legacyApiRoot } from '../config/deploymentEnv';
/** @deprecated Legacy axios client — use `api/client.ts` and `api/auth/authService.ts` instead. */
import axios from "axios";

const axiosInstance = axios.create({ baseURL: legacyApiRoot() });

axiosInstance.interceptors.request.use(
  (config) => {
    const authToken = localStorage.getItem("token") || sessionStorage.getItem("token");
    config.headers.Accept = "application/json";
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    throw error;
  }
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if originalRequest is a login request to prevent redirect/refresh loop on incorrect credentials
    const isLoginRequest = originalRequest?.url?.includes("/login");

    // Soften: do not wipe every storage key / hard-redirect on an unrelated 401
    // (legacy client can 401 during chat-adjacent calls). Prefer clearing only
    // the auth token and raising the same event the modern client uses — Auth
    // then decides. Force-logout / FCM still has its own path.
    if (error.response?.status === 401 && !originalRequest?._retry && !isLoginRequest) {
      try {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        localStorage.removeItem("shipper_auth_token");
      } catch {
        /* ignore storage errors */
      }
      window.dispatchEvent(new CustomEvent("shipper:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
