import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } }
	},
	{
		files: ['**/*.svelte'],
		languageOptions: { parserOptions: { parser: ts.parser } }
	},
	{
		rules: {
			'svelte/no-navigation-without-resolve': 'off',
			'svelte/require-each-key': 'off',
			'svelte/no-useless-mustaches': 'off'
		}
	},
	{
		ignores: [
			'**/*.cjs',
			'.claude/',
			'.impeccable/',
			'build/',
			'.svelte-kit/',
			'energy-proxy/',
			'node_modules/'
		]
	}
);
