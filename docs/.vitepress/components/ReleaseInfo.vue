<template>
  <div v-if="loading" class="release-loading">
    <p>Loading latest release...</p>
  </div>
  
  <div v-else-if="latest" class="release-info">
    <div class="release-header">
      <h3>Latest Release</h3>
      <span class="version-badge">{{ latest.tag_name }}</span>
      <button @click="refreshReleases" class="refresh-btn" title="Refresh releases">🔄</button>
    </div>
    
    <div class="release-content">
      <p class="release-date">Released {{ formatDate(latest.published_at) }}</p>
      
      <div v-if="latest.assets && latest.assets.length > 0" class="download-section">
        <h4>Downloads</h4>
        <div class="download-buttons">
          <a 
            v-for="asset in latest.assets" 
            :key="asset.id"
            :href="asset.browser_download_url"
            class="download-btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="download-icon">⬇️</span>
            {{ asset.name }}
            <span class="download-size">({{ formatSize(asset.size) }})</span>
          </a>
        </div>
      </div>
      

      
      <div class="release-links">
        <a :href="latest.html_url" target="_blank" rel="noopener noreferrer">
          View Release Notes →
        </a>
        <span class="last-updated">Last updated: {{ formatDate(lastUpdated) }}</span>
      </div>
    </div>
  </div>
  
  <div v-else-if="error" class="release-error">
    <p>{{ error }}</p>
    <button @click="refreshReleases" class="retry-btn">Try Again</button>
  </div>
  
  <div v-else class="no-releases">
    <p>No releases available yet. Check back soon!</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// Configuration - actual repo
const REPO_OWNER = 'K-Veschgini'
const REPO_NAME = 'jsonjet'

// Reactive state
const latest = ref(null)
const loading = ref(true)
const error = ref(null)
const lastUpdated = ref(null)

async function fetchReleases() {
  loading.value = true
  error.value = null
  
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`)
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }
    
    const releases = await response.json()
    
    if (releases.length > 0) {
      latest.value = releases[0]
      lastUpdated.value = new Date().toISOString()
    } else {
      latest.value = null
    }
    
  } catch (err) {
    console.error('Failed to fetch releases:', err)
    error.value = `Failed to load releases: ${err.message}`
  } finally {
    loading.value = false
  }
}

function refreshReleases() {
  fetchReleases()
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatSize(bytes) {
  if (!bytes) return 'Unknown size'
  const mb = bytes / (1024 * 1024)
  return mb < 1 ? `${(bytes / 1024).toFixed(1)}KB` : `${mb.toFixed(1)}MB`
}



// Fetch releases when component mounts
onMounted(() => {
  fetchReleases()
})
</script>

<style scoped>
.release-info {
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  padding: 24px;
  margin: 24px 0;
  background: var(--vp-c-bg-soft);
}

.release-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.release-header h3 {
  margin: 0;
  color: var(--vp-c-text-1);
}

.version-badge {
  background: var(--vp-c-brand);
  color: white;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 600;
}

.release-date {
  color: var(--vp-c-text-2);
  margin: 0 0 16px 0;
  font-size: 14px;
}

.download-section h4 {
  margin: 16px 0 8px 0;
  color: var(--vp-c-text-1);
}

.download-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.download-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  text-decoration: none;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  transition: all 0.2s;
}

.download-btn:hover {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-bg-soft);
}

.download-size {
  color: var(--vp-c-text-2);
  font-size: 12px;
  margin-left: auto;
}



.release-links {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--vp-c-border);
}

.release-links a {
  color: var(--vp-c-brand);
  text-decoration: none;
  font-weight: 500;
}

.release-links a:hover {
  text-decoration: underline;
}

.no-releases {
  text-align: center;
  padding: 24px;
  color: var(--vp-c-text-2);
  font-style: italic;
}

.release-loading {
  text-align: center;
  padding: 24px;
  color: var(--vp-c-text-2);
}

.release-error {
  text-align: center;
  padding: 24px;
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.refresh-btn, .retry-btn {
  background: none;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  margin-left: 8px;
  transition: all 0.2s;
}

.refresh-btn:hover, .retry-btn:hover {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-bg-soft);
}

.last-updated {
  color: var(--vp-c-text-2);
  font-size: 12px;
  margin-left: 16px;
}

@media (min-width: 768px) {
  .download-buttons {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .download-btn {
    flex: 1;
    min-width: 200px;
  }
}
</style>