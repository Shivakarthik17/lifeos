import nextConfig from "eslint-config-next/core-web-vitals";

export default [
  ...nextConfig,
  {
    ignores: ["app/generated/**", ".next/**", "node_modules/**"],
  },
];
