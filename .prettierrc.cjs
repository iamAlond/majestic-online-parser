/** @type {import("prettier").Config} */
module.exports = {
	plugins: [require.resolve('@trivago/prettier-plugin-sort-imports')],

	trailingComma: 'none',
	proseWrap: 'always',
	tabWidth: 2,
	useTabs: true,
	semi: false,
	singleQuote: true,
	jsxSingleQuote: true,
	bracketSpacing: true,
	arrowParens: 'avoid',
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,
	importOrderCaseInsensitive: true,
	importOrderParserPlugins: ['typescript', 'classProperties', 'decorators-legacy'],
	importOrder: ['<THIRD_PARTY_MODULES>', '^@/(.*)$', '^../(.*)', '^./(.*)'],
	printWidth: 140
}
