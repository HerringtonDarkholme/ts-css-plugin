// migrate from css-loader
// https://github.com/webpack-contrib/css-loader/blob/76eb7f670ce0c4028e48b3ca981a4fb127ec9efd/lib/processCss.js
import * as postcss from 'postcss'
var localByDefault = require('postcss-modules-local-by-default')
var modulesScope = require('postcss-modules-scope')
var modulesValues = require('postcss-modules-values')

type ParserOption = {
  exports: string[]
}

var parserPlugin = postcss.plugin('css-loader-parser', function(options: ParserOption) {
	return function(css) {
		var exports: string[] = []
		css.walkRules(function(rule) {
			if(rule.selector === ':export') {
				rule.walkDecls(function(decl) {
					exports.push(decl.prop)
				})
				rule.remove()
			}
		})
		options.exports = exports
	}
})

export function processCss(inputSource: string) {
	let parserOptions = {exports: []}


  let process = postcss([
      localByDefault(),
      modulesValues,
      modulesScope(),
      parserPlugin(parserOptions)
    ])
    .process(inputSource)

  try {
    process.css
  } catch (e) {
    parserOptions.exports = []
  }
  return parserOptions.exports
    .map(e => `export const ${e}: string = ''`)
    .join('\n')
};
