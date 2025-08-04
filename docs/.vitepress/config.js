import { defineConfig } from 'vitepress'
import { highlightJsonjet } from './highlighter/jsonjet-highlighter.js'
import mermaid from 'mermaid'

export default defineConfig({
  title: 'JSONJet Documentation',
  description: 'Document-based stream processing engine with declarative query language by Prof. Dr. Kambis Veschgini',
  
  // GitHub Pages base path (same for local and production)
  base: '/jsonjet/',
  
  // Multiple favicon formats for maximum browser compatibility
  head: [
    ['link', { rel: 'icon', href: '/jsonjet/favicon.ico', sizes: 'any' }],
    ['link', { rel: 'icon', href: '/jsonjet/favicon.png', type: 'image/png' }],
    ['link', { rel: 'icon', href: '/jsonjet/logo.svg', type: 'image/svg+xml' }],
    ['link', { rel: 'apple-touch-icon', href: '/jsonjet/favicon.png' }]
  ],
  
  // Ignore dead links for now - can be fixed later
  ignoreDeadLinks: true,
  
  appearance: false, // Disable theme toggle completely
  
  markdown: {
    theme: 'github-dark', // Force dark theme for code blocks
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
      { text: 'Downloads', link: '/downloads' },
      { text: 'Documentation', link: '/guide/' },
      { text: 'Demo', link: './demo/', target: '_blank' },
      { text: 'Veschgini Consulting', link: 'https://veschgini-consulting.com', target: '_blank' },    
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/guide/' },
          { text: 'Project Status', link: '/status' },
          { text: 'Downloads', link: '/downloads' },
          { text: 'Quick Start', link: '/guide/quick-start' },
        ]
      },
      {
        text: 'Server Reference',
        items: [
          { text: 'Server CLI', link: '/server/server-cli' },
          { text: 'HTTP and WebSocket APIs', link: '/server/http-websocket' },
          { text: 'Log Stream', link: '/server/log-stream' },
        ]
      },
      {
        text: 'Jet Language Reference',
        items: [
          { text: 'Syntax', link: '/jet/syntax' },
          {
            text: 'Statements',
            collapsed: true,
            items: [
              { text: 'create stream', link: '/jet/statements/create-stream' },
              { text: 'create flow', link: '/jet/statements/create-flow' },
              { text: 'create lookup', link: '/jet/statements/create-lookup' },
              { text: 'delete stream', link: '/jet/statements/delete-stream' },
              { text: 'delete flow', link: '/jet/statements/delete-flow' },
              { text: 'delete lookup', link: '/jet/statements/delete-lookup' },
              { text: 'insert into', link: '/jet/statements/insert-into' },
              { text: 'flush', link: '/jet/statements/flush' },
              { text: 'list', link: '/jet/statements/list' },
              { text: 'info', link: '/jet/statements/info' },
              { text: 'subscribe', link: '/jet/statements/subscribe' },
              { text: 'unsubscribe', link: '/jet/statements/unsubscribe' }
            ]
          },
          {
            text: 'Operators',
            collapsed: true,
            items: [
              { text: 'where', link: '/jet/operators/where' },
              { text: 'select', link: '/jet/operators/select' },
              { text: 'scan', link: '/jet/operators/scan' },
              { text: 'summarize', link: '/jet/operators/summarize' },
              { text: 'insert_into', link: '/jet/operators/insert-into' },
              { text: 'write_to_file', link: '/jet/operators/write-to-file' },
              { text: 'assert_or_save_expected', link: '/jet/operators/assert-or-save-expected' },
            ]
          }
        ]
      },
      {
        text: 'Links',
        items: [
          { text: 'Veschgini Consulting', link: 'https://veschgini-consulting.com' },
          { text: 'Legal Notice', link: 'https://veschgini-consulting.com/impressum' },
          { text: 'Cookie Policy', link: 'https://veschgini-consulting.com/cookie-richtlinie' },
          { text: 'Privacy Policy', link: 'https://veschgini-consulting.com/datenschutzerklarung' },
          { text: 'Terms & Conditions', link: 'https://veschgini-consulting.com/geschaftsbedingungen' }
        ]
      },
      {
        text: 'Contact',
        items: [
          { text: 'Prof. Dr. Kambis Veschgini', link: 'mailto:k.veschgini@oth-aw.de' },
          { text: 'OTH Amberg-Weiden', link: 'https://www.oth-aw.de/' }
        ]
      },
      {
        text: 'Copyright',
        items: [
          { text: '© 2025 Prof. Dr. Kambis Veschgini', link: 'https://veschgini-consulting.com' },
          { text: 'PolyForm Noncommercial License', link: 'https://polyformproject.org/licenses/noncommercial/1.0.0/' }
        ]
      }
    ],

    socialLinks: [
              { icon: 'github', link: 'https://github.com/K-Veschgini/jsonjet' }
    ]
  }
})