module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'commonjs'
  },
  rules: {
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_'
      }
    ],
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single']
  }
};