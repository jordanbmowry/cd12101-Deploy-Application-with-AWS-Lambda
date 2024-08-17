import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'aws-sdk' // Exclude AWS SDK from the bundle, since it's provided by Lambda
      ]
    }
  },
  resolve: {
    extensions: ['.ts', '.js']
  }
})
