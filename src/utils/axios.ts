/** @deprecated Legacy axios client — use `api/client.ts` and `api/auth/authService.ts` instead. */
import axios from "axios";

const axiosInstance = axios.create({ baseURL: import.meta.env.VITE_API_URL + import.meta.env.VITE_API_VERSION });

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

    if (error.response?.status === 401 && !originalRequest?._retry && !isLoginRequest) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
