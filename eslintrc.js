module.exports = {
    extends: [
      'eslint:recommended',
      'plugin:vue/vue3-recommended', // Vue 3 recommended rules
      'plugin:prettier/recommended', // Integrates Prettier with ESLint
    ],
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    rules: {
      'prettier/prettier': 'error', // Force Prettier formatting as an error
      'vue/max-attributes-per-line': 'off', // Customize Vue-specific linting rules
      'no-console': 'warn',
    },
}
