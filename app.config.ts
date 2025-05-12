import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  middleware: "src/middleware/index.ts",
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ["9d6e0bd526b1d8.lhr.life"],
      esbuild: {
        options: {
          supported: {
            'top-level-await': true,
          },
          target: 'esnext'
        },
      },
    },
  }
});
