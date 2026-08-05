import nodeConfig from '@nexor/config/eslint/node';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nodeConfig,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: ['dist/**', 'prisma/**'],
  },
];
