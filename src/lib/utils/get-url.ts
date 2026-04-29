export const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env vars
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/';
  
  // Make sure to include `https://` when not localhost.
  url = url.includes('http') ? url : `https://${url}`;
  
  // Remove trailing slash for consistency
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  
  return url;
};
