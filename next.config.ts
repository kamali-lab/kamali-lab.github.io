import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // this will prevent any 3rd party library to be able to use `eval`
    // and prevent angular from running
    unsafeFunctionEval: false,
  },
};

export default nextConfig;
