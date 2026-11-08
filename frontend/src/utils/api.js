// API configuration utility
// In development: uses proxy from package.json (empty string = relative paths)
// In production: uses REACT_APP_API_URL environment variable (e.g., Render backend URL)

const getApiBaseUrl = () => {
  // If REACT_APP_API_URL is set, use it (production - e.g., Render backend)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // Otherwise, use empty string for relative paths (development with proxy to localhost:5001)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to build API URLs
export const getApiUrl = (endpoint) => {
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If API_BASE_URL is empty (development), return relative path
  if (!API_BASE_URL) {
    return `/${cleanEndpoint}`;
  }
  
  // If API_BASE_URL exists (production), ensure no trailing slash and build URL
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${baseUrl}/${cleanEndpoint}`;
};
