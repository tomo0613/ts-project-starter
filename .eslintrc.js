const DISABLED = 0;
const WARNING = 1;
const ERROR = 2;

module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
    },
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'airbnb-base',
        'plugin:@typescript-eslint/recommended',
    ],
    env: {
        'browser': true,
        'node': true,
    },
    rules: {
        'sort-imports': WARNING,
        'indent': [ERROR, 4, {SwitchCase: 1}],
        'max-len': [ERROR, 120],
        'no-param-reassign': WARNING,
        'no-continue': DISABLED,
        'import/prefer-default-export': DISABLED,
        'import/no-unresolved': DISABLED,
        'no-multi-spaces': WARNING,
        'no-plusplus': DISABLED,
        'no-use-before-define': [ERROR, 'nofunc'],
        '@typescript-eslint/no-use-before-define': [ERROR, 'nofunc'],
        '@typescript-eslint/camelcase': DISABLED,
        'object-curly-newline': DISABLED,
        '@typescript-eslint/explicit-function-return-type': DISABLED,
        'lines-between-class-members': [WARNING, 'always', {"exceptAfterSingleLine": true}],
        'no-underscore-dangle': DISABLED,
        '@typescript-eslint/explicit-member-accessibility': DISABLED,
        'linebreak-style': DISABLED,
    },
};
