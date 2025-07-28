import { defineConfig } from 'vitepress'
import { highlightJsonjet } from './highlighter/jsonjet-highlighter.js'
import mermaid from 'mermaid'

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
      // Override the fence renderer to handle jsonjet language and mermaid
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
        
        if (lang === 'mermaid') {
          // Return a div that will be processed by mermaid on the client side
          return `<pre class="mermaid">${token.content}</pre>`
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
      { text: 'API Reference', link: '/api/' },
      { text: 'JSONJet Reference', link: '/api/' }
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
          { text: 'Server CLI', link: '/api/server-cli' },
          { text: 'HTTP and WebSocket APIs', link: '/api/http-websocket' },
          { text: 'WebSocket Message Reference', link: '/api/websocket-messages' }
        ]
      },
      {
        text: 'JSONJet Reference',
        items: [
          { text: 'Overview', link: '/api/' },
          {
            text: 'Statements',
            items: [
              { text: 'create stream', link: '/api/statements/create-stream' },
              { text: 'create flow', link: '/api/statements/create-flow' },
              { text: 'create lookup', link: '/api/statements/create-lookup' },
              { text: 'delete stream', link: '/api/statements/delete-stream' },
              { text: 'delete flow', link: '/api/statements/delete-flow' },
              { text: 'delete lookup', link: '/api/statements/delete-lookup' },
              { text: 'insert into', link: '/api/statements/insert-into' },
              { text: 'flush', link: '/api/statements/flush' },
              { text: 'list', link: '/api/statements/list' },
              { text: 'info', link: '/api/statements/info' },
              { text: 'subscribe', link: '/api/statements/subscribe' },
              { text: 'unsubscribe', link: '/api/statements/unsubscribe' },
              { text: '.print', link: '/api/statements/print' }
            ]
          },
          {
            text: 'Operators',
            items: [
              { text: 'where', link: '/api/operators/where' },
              { text: 'select', link: '/api/operators/select' },
              { text: 'scan', link: '/api/operators/scan' },
              { text: 'summarize', link: '/api/operators/summarize' },
              { text: 'insert_into', link: '/api/operators/insert-into' },
              { text: 'write_to_file', link: '/api/operators/write-to-file' },
              { text: 'assert_or_save_expected', link: '/api/operators/assert-or-save-expected' },
              { text: 'collect', link: '/api/operators/collect' }
            ]
          }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-org/jsdb' }
    ]
  }
})