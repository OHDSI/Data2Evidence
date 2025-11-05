// Environment configuration for notebook-ui
// In production, these will be provided by the parent application (vue-mri-ui-lib)
// In development, they can be set via .env files

const env = {
  REACT_APP_DN_BASE_URL: import.meta.env.VITE_API_URL || "/",
  REACT_APP_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "/api",
};

export default env;
