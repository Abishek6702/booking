import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    // Try tm_accessToken first (correct key), fallback to owner_token (legacy)
    const token = localStorage.getItem("tm_accessToken") || localStorage.getItem("owner_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling 401 and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRequest = originalRequest.url?.includes("/auth/login") || originalRequest.url?.includes("/auth/register");

    // If 401 and not already retrying, and NOT a login/register request
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("tm_refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const response = await axios.post("http://localhost:4000/api/v1/auth/refresh", {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
        
        localStorage.setItem("tm_accessToken", accessToken);
        localStorage.setItem("tm_refreshToken", newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Clear everything and redirect to login
        localStorage.removeItem("tm_accessToken");
        localStorage.removeItem("tm_refreshToken");
        localStorage.removeItem("tm_user");
        
        // Redirect based on current path
        const isOwnerPath = window.location.pathname.startsWith("/owner");
        window.location.href = isOwnerPath ? "/owner/login" : "/login";
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
