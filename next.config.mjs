/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ["pg", "exceljs", "xlsx"] },
};
export default nextConfig;
