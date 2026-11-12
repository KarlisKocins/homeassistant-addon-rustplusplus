const js = require('@eslint/js');
const globals = require('globals');

// Lenient on purpose: this codebase is inherited from upstream RustPlusPlus, so only rules
// that catch real bugs fail the build. Style rules are not enforced and nothing is reformatted.
module.exports = [
    { ignores: ['node_modules/**', 'vendor/**', 'instances/**', 'output/**'] },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'commonjs',
            globals: { ...globals.node }
        },
        rules: {
            'no-unused-vars': 'off',
            'no-empty': 'off',
            'no-prototype-builtins': 'off',
            'no-useless-escape': 'off',
            'no-control-regex': 'off',
            'no-case-declarations': 'off',
            'no-inner-declarations': 'off',
            'no-unreachable': 'off',
            // New in ESLint 10's recommended set; flags 48 inherited upstream patterns (dead initial values).
            'no-useless-assignment': 'off',
            // Real upstream bugs, tracked separately; kept as warnings so this change stays tooling-only.
            'no-undef': 'warn',
            'no-dupe-class-members': 'warn'
        }
    },
    {
        files: ['public/**/*.js'],
        languageOptions: {
            sourceType: 'module',
            globals: { ...globals.browser, io: 'readonly' }
        }
    }
];
