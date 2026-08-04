import nextConfig from "@multica/eslint-config/next";

export default [
  ...nextConfig,
  { ignores: [".next/", ".source/", "public/"] },
  {
    files: ["**/*.test.{ts,tsx}", "**/test/**/*.{ts,tsx}"],
    rules: {
      "react/display-name": "off",
    },
  },
];
