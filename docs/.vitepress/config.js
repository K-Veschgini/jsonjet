import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'JSDB Documentation',
  description: 'JavaScript Database with real-time streaming capabilities',
  
  // Enable local search without external services
  themeConfig: {
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
          { text: 'Quick Start', link: '/guide/quick-start' }
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