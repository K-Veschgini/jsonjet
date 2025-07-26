import { readFileSync } from 'fs'
import { resolve } from 'path'

export function jsonjetTransformer() {
  return {
    name: 'jsonjet-transformer',
    async transform(code, lang, options) {
      if (lang === 'jsonjet' || lang === 'jet') {
        // Load the grammar
        const grammarPath = resolve(__dirname, '../grammars/jsonjet.tmLanguage.json')
        const grammar = JSON.parse(readFileSync(grammarPath, 'utf8'))
        
        // Register the language with Shiki
        if (options.shiki) {
          options.shiki.loadLanguage({
            id: 'jsonjet',
            scopeName: 'source.jsonjet',
            grammar: grammar,
            aliases: ['jet', 'jsonjet']
          })
        }
        
        return {
          code,
          lang: 'jsonjet'
        }
      }
      return undefined
    }
  }
} 