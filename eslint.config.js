import js from '@eslint/js';
import globals from 'globals';
import typescriptEslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';

export default typescriptEslint.config(
  // Base configuration
  { ignores: ['dist'] },

  // JavaScript files configuration
  {
    files: ['**/*.js', '**/*.jsx'],
    extends: [js.configs.recommended, ...typescriptEslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      prettier,
    },
    rules: {
      // Use prettier rules from .prettierrc
      'prettier/prettier': ['error'],
    },
  },

  // TypeScript files configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [...typescriptEslint.configs.recommended],
    languageOptions: {
      parser: typescriptEslint.parser,
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint.plugin,
      'unused-imports': unusedImports,
      'simple-import-sort': simpleImportSort,
      prettier: prettier,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Use prettier rules from .prettierrc
      'prettier/prettier': ['error'],

      // Import/export rules
      'import/extensions': 'off',
      'import/prefer-default-export': 'off',
      'import/order': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // React rules
      'react/function-component-definition': 'off',
      'react/destructuring-assignment': 'off',
      'react/require-default-props': 'off',
      'react/jsx-props-no-spreading': 'off',
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // TypeScript rules
      '@typescript-eslint/comma-dangle': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variableLike',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'],
        },
      ],

      // Unused imports
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Other rules
      'no-restricted-syntax': [
        'error',
        'ForInStatement',
        'LabeledStatement',
        'WithStatement',
      ],
      'no-underscore-dangle': ['error', { allow: ['_id'] }],
      'jsx-a11y/label-has-associated-control': 'off',
    },
  }
);
