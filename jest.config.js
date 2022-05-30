export default {
  transform: {
    "^.+\\.tsx?$": ["esbuild-jest", {

      sourcemap: true,
      loaders: {
        '.ts': 'ts'
      }
    }]
  }
}