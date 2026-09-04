import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        form: resolve(import.meta.dirname, "index.html"),
        admin: resolve(import.meta.dirname, "admin.html")
      }
    }
  }
});
