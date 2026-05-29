import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

if (!API_BASE_URL) {
  console.warn(
    "[admin/api] VITE_API_BASE_URL is not set. " +
    "Copy admin/.env.example to admin/.env and set the correct backend URL."
  );
}

const api = axios.create({
  baseURL: API_BASE_URL ?? "http://localhost:4000/api/v1",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRequest =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/admin/register");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem("admin_refreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        // Use the same base URL from env — no hardcoded localhost
        const response = await axios.post(
          `${API_BASE_URL ?? "http://localhost:4000/api/v1"}/auth/refresh`,
          { refreshToken }
        );
        const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;

        localStorage.setItem("admin_accessToken", accessToken);
        localStorage.setItem("admin_refreshToken", newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem("admin_accessToken");
        localStorage.removeItem("admin_refreshToken");
        localStorage.removeItem("admin_user");
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
