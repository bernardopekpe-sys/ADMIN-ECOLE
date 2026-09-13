/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Autoriser les photos élèves/personnel servies depuis Supabase Storage (URLs signées)
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' }
    ]
  }
};

export default nextConfig;
