import DefaultTheme from 'vitepress/theme'
import './style.css'
import './custom-jsonjet.css'

export default {
  ...DefaultTheme,
  enhanceApp({ app, router, siteData }) {
    // Add background video to home page
    if (typeof window !== 'undefined') {
      router.onAfterRouteChanged = (to) => {
        if (to === '/') {
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
            video.src = '/background.mp4'
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