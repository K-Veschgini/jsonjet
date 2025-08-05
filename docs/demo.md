---
layout: page
title: Demo
---

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // Redirect to the demo directory (built by the demo package)
  window.location.href = '/demo/'
})
</script>

# Redirecting to Demo...

<div style="text-align: center; padding: 2rem;">
  <p>You are being redirected to the JSONJet demo...</p>
  <p>If you are not redirected automatically, <a href="/demo/">click here</a>.</p>
</div>