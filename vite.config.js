import { resolve } from "path";
import { defineConfig } from "vite";

console.log(resolve(__dirname, 'src/my-element-controller.js'));

export default defineConfig({
  build: {
    lib: {
      entry: [resolve(__dirname, 'src/my-element-controller.ts')]
    }
  }
});