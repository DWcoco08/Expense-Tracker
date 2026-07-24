export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'perf', 'docs', 'test', 'build', 'ci', 'style', 'chore'],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'auth',
        'users',
        'wallets',
        'categories',
        'transactions',
        'stats',
        'web',
        'db',
        'shared',
        'config',
        'ci',
      ],
    ],
    'scope-empty': [2, 'never'],
  },
}
