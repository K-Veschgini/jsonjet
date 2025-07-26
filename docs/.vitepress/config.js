import { defineConfig } from 'vitepress'
import { highlightJsonjet } from './highlighter/jsonjet-highlighter.js'

export default defineConfig({
  title: 'JSONJet Documentation',
  description: 'Stream processing engine with Kusto-like query language',
  
  appearance: true, // Enable dark mode toggle
  
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    config: (md) => {
      // Override the fence renderer to handle jsonjet language
      const defaultRender = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options)
      }
      
      md.renderer.rules.fence = function (tokens, idx, options, env, self) {
        const token = tokens[idx]
        const lang = token.info.trim()
        
        if (lang === 'jsonjet' || lang === 'jet') {
          // Use custom JSONJet highlighter
          return highlightJsonjet(token.content)
        }
        
        return defaultRender(tokens, idx, options, env, self)
      }
    }
  },
  
  // Enable local search without external services
  themeConfig: {
    logo: '/logo.svg',
    
    search: {
      provider: 'local',
      options: {
        detailedView: true,
        detailedViewByDefault: true,
        disableQueryPersistence: false,
        miniSearch: {
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: { title: 4, text: 2, titles: 1 }
          }
        }
      }
    },
    
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' }
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/guide/' },
          { text: 'Quick Start', link: '/guide/quick-start' },
          { text: 'Syntax Reference', link: '/guide/syntax' },
          { text: 'Syntax Highlighting', link: '/syntax-highlighting-demo' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Overview', link: '/api/' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-org/jsdb' }
    ]
  }
})