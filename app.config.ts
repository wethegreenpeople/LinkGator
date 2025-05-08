import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  middleware: "src/middleware/index.ts",
  vite: {
    plugins: [tailwindcss()]
  }
});
