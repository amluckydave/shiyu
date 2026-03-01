import axios from "axios"
import { API_ROUTES } from "@shiyu/shared"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3100"

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: { "Content-Type": "application/json" }
})

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("shiyu_token")
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Response interceptor — handle 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("shiyu_token")
            localStorage.removeItem("shiyu_user")
            if (window.location.pathname !== "/login") {
                window.location.href = "/login"
            }
        }
        return Promise.reject(error)
    }
)

export { api, API_ROUTES }
export default api
