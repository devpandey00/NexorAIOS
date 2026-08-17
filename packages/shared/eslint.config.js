import nodeConfig from '@nexor/config/eslint/node';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nodeConfig,
  {
    files: ['src/**/*.test.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['./tsconfig.eslint.json'],
      },
    },
  },
];
