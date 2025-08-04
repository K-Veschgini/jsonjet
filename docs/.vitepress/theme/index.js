import DefaultTheme from 'vitepress/theme'
import './style.css'
import './custom-jsonjet.css'
import mermaid from 'mermaid'
import CustomFooter from '../components/CustomFooter.vue'
import Layout from '../components/Layout.vue'

export default {
  ...DefaultTheme,
  Layout: Layout,
  enhanceApp({ app, router, siteData }) {
    // Register global components
    app.component('CustomFooter', CustomFooter)
    // Initialize Mermaid
    if (typeof window !== 'undefined') {
      mermaid.initialize({ 
        startOnLoad: true,
        theme: 'default'
      })
      
      // Simple Mermaid rendering
      const renderMermaid = () => {
        mermaid.init()
      }
      
      // Initial render
      setTimeout(renderMermaid, 100)
      
      // Store original route change handler
      const originalOnAfterRouteChanged = router.onAfterRouteChanged
      
      // Combined route change handler
      router.onAfterRouteChanged = (to) => {
        // Render Mermaid diagrams
        setTimeout(renderMermaid, 100)
        
        // Handle homepage background video
        const isHomePage = to === '/' || to === siteData.base || to === '/jsonjet/'
        if (isHomePage) {
          // Force dark theme on homepage
          document.documentElement.classList.add('dark')
          
          // Remove theme toggle and dividers on homepage
          setTimeout(() => {
            const themeButton = document.querySelector('.VPSwitchAppearance')
            const appearance = document.querySelector('.VPNavBarAppearance')
            const dividers = document.querySelectorAll('.VPNavBarExtra .divider')
            
            if (themeButton) themeButton.style.display = 'none'
            if (appearance) appearance.style.display = 'none'
            
            // Hide last two dividers which are likely around the theme toggle
            if (dividers.length >= 2) {
              dividers[dividers.length - 1].style.display = 'none'
              dividers[dividers.length - 2].style.display = 'none'
            }
          }, 50)
          
          setTimeout(() => {
            const existing = document.querySelector('.home-background-video')
            if (existing) return
            
            const video = document.createElement('video')
            video.className = 'home-background-video'
            const basePath = siteData.base || '/jsonjet/'
            const videoSrc = basePath + 'background.mp4'
            video.src = videoSrc
            video.autoplay = true
            video.loop = true
            video.muted = true
            video.playsInline = true
            
            document.body.appendChild(video)
          }, 100)
        } else {
          // Restore theme toggle functionality on other pages
          const video = document.querySelector('.home-background-video')
          if (video) {
            video.remove()
          }
        }
      }
    }
  }
}