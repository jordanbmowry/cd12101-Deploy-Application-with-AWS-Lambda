import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // Each Lambda function as a separate entry point
        auth0Authorizer: resolve(
          __dirname,
          'src/lambda/auth/auth0Authorizer.ts'
        ),
        createTodo: resolve(__dirname, 'src/lambda/http/createTodo.ts'),
        deleteTodo: resolve(__dirname, 'src/lambda/http/deleteTodo.ts'),
        generateUploadUrl: resolve(
          __dirname,
          'src/lambda/http/generateUploadUrl.ts'
        ),
        getTodos: resolve(__dirname, 'src/lambda/http/getTodos.ts'),
        updateTodo: resolve(__dirname, 'src/lambda/http/updateTodo.ts')
      },
      output: {
        // Output settings
        entryFileNames: 'lambda/[name]/index.js',
        format: 'cjs',
        dir: 'dist'
      },
      external: ['aws-sdk'] // AWS SDK is excluded since it's provided by the Lambda runtime
    },
    target: 'node20' // Match the Node.js runtime version in your serverless.yml
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
