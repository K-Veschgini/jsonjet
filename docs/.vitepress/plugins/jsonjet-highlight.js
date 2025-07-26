import { readFileSync } from 'fs'
import { resolve } from 'path'

export function jsonjetHighlightPlugin() {
  return {
    name: 'jsonjet-highlight',
    config() {
      return {
        markdown: {
          async highlight(code, lang) {
            if (lang === 'jsonjet' || lang === 'jet') {
              const { getHighlighter } = await import('shiki')
              const highlighter = await getHighlighter({
                theme: 'github-dark',
                langs: ['javascript']
              })
              
              // Load the JSONJet grammar
              const grammarPath = resolve(__dirname, './grammars/jsonjet.tmLanguage.json')
              const grammar = JSON.parse(readFileSync(grammarPath, 'utf8'))
              
              // Register the custom language
              highlighter.loadLanguage({
                id: 'jsonjet',
                scopeName: 'source.jsonjet',
                grammar: grammar,
                aliases: ['jet', 'jsonjet']
              })
              
              const tokens = highlighter.codeToThemedTokens(code, { lang: 'jsonjet' })
              return tokens
            }
            return null
          }
        }
      }
    }
  }
} 