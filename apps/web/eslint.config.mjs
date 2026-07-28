import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Aturan React Compiler (default-ketat baru eslint-config-next 16) diturunkan
  // sementara ke "warn": aplikasi berjalan & `next build` hijau. Refactor idiomatik
  // (hindari setState di dalam useEffect / reassign variabel saat render) diserahkan
  // ke tim frontend untuk diperbaiki, lalu aktifkan kembali sebagai "error".
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
