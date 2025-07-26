import { readFileSync } from 'fs'
import { resolve } from 'path'

export function shikiJsonjetPlugin() {
  return {
    name: 'shiki-jsonjet',
    configureServer(server) {
      // Register the custom language with Shiki
      server.middlewares.use((req, res, next) => {
        if (req.url === '/__shiki/jsonjet') {
          try {
            const grammarPath = resolve(__dirname, '../grammars/jsonjet.tmLanguage.json')
            const grammar = JSON.parse(readFileSync(grammarPath, 'utf8'))
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(grammar))
          } catch (error) {
            console.error('Error loading JSONJet grammar:', error)
            res.statusCode = 500
            res.end('Error loading grammar')
          }
        } else {
          next()
        }
      })
    }
  }
} 