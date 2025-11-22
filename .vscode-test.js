const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig([
  {
    label: 'unitTests',
    files: 'dist/test/**/*.test.js',
    version: 'stable',
    workspaceFolder: '.',
    mocha: {
      ui: 'tdd',
      timeout: 20000
    }
  }
]);
