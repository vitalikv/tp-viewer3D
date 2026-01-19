module.exports = {
  root: true,

  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    // Переменные объявлены, но не используются
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    // Явное использование `any` — предупреждение
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-function-type': 'warn',
    // Консоль разрешена только для warn и error (запрещает console.log/info/debug)
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // Отключаем запрет на комментарии типа `// @ts-ignore` или `// @ts-expect-error`
    '@typescript-eslint/ban-ts-comment': 'off',
    // Разрешаем `const self = this`
    '@typescript-eslint/no-this-alias': 'off',

    // Правила, отключённые для удобства разработки или дублирующие другие линтеры:

    'no-shadow': 'off', // Разрешаем затенение переменных (например, в разных scopes)
    'no-underscore-dangle': 'off', // Разрешаем `_private` поля (часто используется)
    'no-param-reassign': 'off', // Разрешаем изменять параметры (иногда необходимо)
    'no-undef': 'off', // Отключено, так как TypeScript уже проверяет существование
    'arrow-body-style': 'off', // Разрешаем и `{ return x; }`, и `x => x`
    'no-case-declarations': 'off', // Отключено — запрет на декларацию переменных в case
    'no-prototype-builtins': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
    'no-useless-escape': 'off',
    'no-unsafe-optional-chaining': 'off',
    'prefer-rest-params': 'off',
    'prefer-spread': 'off',

    // Prettier интеграция
    'prettier/prettier': 'error',
  },
  globals: {
    ResizeObserver: 'readonly',
  },
  ignorePatterns: [
    '.vscode/',
    '.idea/',
    'dist/',
    'node_modules/',
    'public/',
    '*.min.js',
    'vite.config.ts',
  ],
};
