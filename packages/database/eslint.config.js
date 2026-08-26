import nodeConfig from '@nexor/config/eslint/node';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nodeConfig,
  {
    ignores: ['dist/**', 'prisma/**'],
  },
];
