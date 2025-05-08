import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  middleware: "src/middleware/index.ts",
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ["61cd35249952f904a71a31e760a2c693.serveo.net"]
    }
  }
});
