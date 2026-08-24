/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // @xenova/transformers (on-device semantic search, see components/SemanticToggle.js)
    // conditionally references onnxruntime-node and sharp — both Node-only native
    // packages we never actually need since this is only ever dynamically imported
    // client-side (browser uses onnxruntime-web/WASM instead). Stubbing them out
    // avoids webpack trying to resolve native binaries that don't exist in this build.
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-node$": false,
      sharp$: false,
    };
    return config;
  },
};

export default nextConfig;
