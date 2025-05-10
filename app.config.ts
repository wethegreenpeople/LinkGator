import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  middleware: "src/middleware/index.ts",
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ["b0d5b0c0f2bbd0d8feca222c4e33245b.serveo.net"],
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
