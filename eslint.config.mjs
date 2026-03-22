import eslint from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import promisePlugin from "eslint-plugin-promise";

export default [
  // Ignore patterns
  {
    ignores: ["dist/**", "node_modules/**", "*.d.ts"],
  },

  // ESLint recommended baseline for all files
  eslint.configs.recommended,

  // TypeScript and TSX files configuration
  {
    files: ["**/*.ts", "**/*.tsx"],

    plugins: {
      "@typescript-eslint": typescriptEslint,
      promise: promisePlugin,
    },

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        projectService: true,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser API globals (for webview/React components)
        window: "readonly",
        document: "readonly",
        MessageEvent: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        console: "readonly",

        // Node.js globals (for extension backend code)
        process: "readonly",
        Buffer: "readonly",
        global: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",

        // Mocha test globals
        describe: "readonly",
        it: "readonly",
        before: "readonly",
        after: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        suite: "readonly",
        test: "readonly",
        setup: "readonly",
        teardown: "readonly",
        suiteSetup: "readonly",
        suiteTeardown: "readonly",

        React: "readonly",
      },
    },

    rules: {
      "no-unused-vars": "off",

      // TypeScript ESLint recommended rules (non-type-checked)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-inferrable-types": "warn",
      "@typescript-eslint/no-empty-interface": "warn",
      "@typescript-eslint/no-var-requires": "warn",
      "@typescript-eslint/prefer-as-const": "warn",

      // Naming conventions
      "@typescript-eslint/naming-convention": [
        "warn",
        {
          selector: "import",
          format: ["camelCase", "PascalCase"],
        },
      ],

      // Code quality and consistency rules
      curly: "warn",
      eqeqeq: "warn",
      "no-throw-literal": "warn",
      "prefer-promise-reject-errors": "warn",
      "no-unsafe-finally": "warn",
      "no-async-promise-executor": "warn",
      "@typescript-eslint/only-throw-error": "warn",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-misused-promises": [
        "warn",
        {
          checksVoidReturn: false,
        },
      ],
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "warn",
      "promise/catch-or-return": "warn",
      "promise/always-return": "warn",
      "promise/param-names": "warn",
      "promise/no-return-wrap": "warn",
      "no-useless-catch": "warn",
      semi: "warn",
      "no-console": [
        "warn",
        {
          allow: ["warn", "error"],
        },
      ],
      "no-var": "warn",
      "prefer-const": "warn",
      "prefer-arrow-callback": "warn",
      "no-empty-function": "warn",
    },
  },

  // Test files - slightly relaxed
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "src/test/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-console": "off",
    },
  },
];
