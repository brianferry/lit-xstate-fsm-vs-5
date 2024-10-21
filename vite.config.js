import { resolve } from "path";
import { defineConfig } from "vite";

console.log(resolve(__dirname, 'src/my-element.js'));

export default defineConfig({
  build: {
    lib: {
      entry: [resolve(__dirname, 'src/my-element.ts'), resolve(__dirname, 'src/my-element-v2.ts')]
    }
  }
});