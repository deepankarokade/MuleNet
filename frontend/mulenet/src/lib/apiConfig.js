// Configuration for backend API URL
// In development, defaults to local FastAPI on port 8000.
// In production deployment, set NEXT_PUBLIC_API_URL in your hosting platform (Vercel, Docker, AWS, Render, etc.)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
