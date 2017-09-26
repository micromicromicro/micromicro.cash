module.exports = {
    'env': {
        'browser': true,
        'es6': true
    },
    'extends': 'eslint:recommended',
    'parserOptions': {
        'sourceType': 'module',
        'ecmaVersion': 8,
    },
    'rules': {
        'indent': [
            'error',
            'tab'
        ],
        'linebreak-style': [
            'error',
            'unix'
        ],
        'quotes': [
            'error',
            'single'
        ],
        'semi': [
            'error',
            'never'
        ],
        'no-var': 1,
	'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
	'no-implicit-globals': 1,
	    'comma-dangle': ['error', 'always-multiline'],
	'no-console': ['error', { 'allow': ['warn', 'error']}],
    }
};