<template>
  <footer class="custom-footer">
    <div class="footer-content">
      <div class="footer-section">
        <h3>Links</h3>
        <ul>
          <li><a href="https://veschgini-consulting.com" target="_blank" rel="noopener">Veschgini Consulting</a></li>
          <li><a href="https://veschgini-consulting.com/impressum" target="_blank" rel="noopener">Legal Notice</a></li>
          <li><a href="https://veschgini-consulting.com/cookie-richtlinie" target="_blank" rel="noopener">Cookie Policy</a></li>
          <li><a href="https://veschgini-consulting.com/datenschutzerklarung" target="_blank" rel="noopener">Privacy Policy</a></li>
          <li><a href="https://veschgini-consulting.com/geschaftsbedingungen" target="_blank" rel="noopener">Terms & Conditions</a></li>
        </ul>
      </div>
      
      <div class="footer-section">
        <h3>Contact</h3>
        <p>Prof. Dr. Kambis Veschgini</p>
        <p>k.veschgini@oth-aw.de</p>
        <p>OTH Amberg-Weiden</p>
      </div>
    </div>
    
    <div class="footer-bottom">
      <p>&copy; 2025 Prof. Dr. Kambis Veschgini. Licensed under PolyForm Noncommercial License 1.0.0</p>
    </div>
  </footer>
</template>

<style scoped>
.custom-footer {
  background-color: var(--vp-c-bg-soft);
  border-top: 1px solid var(--vp-c-divider);
  padding: 2rem 1rem 1rem;
  box-sizing: border-box;
  position: relative;
  z-index: 100;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.footer-section h3 {
  color: var(--vp-c-text-1);
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  border-bottom: 2px solid var(--vp-c-brand-1);
  padding-bottom: 0.5rem;
}

.footer-section p {
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0.5rem 0;
}

.footer-section ul {
  list-style: none;
  padding: 0;
}

.footer-section li {
  margin: 0.5rem 0;
}

.footer-section a {
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.2s;
}

.footer-section a:hover {
  color: var(--vp-c-brand-1);
}

.footer-bottom {
  max-width: 1200px;
  margin: 0 auto;
  padding-top: 1rem;
  border-top: 1px solid var(--vp-c-divider);
  text-align: center;
}

.footer-bottom p {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  margin: 0;
}

@media (max-width: 768px) {
  .footer-content {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .custom-footer {
    padding: 1.5rem 1rem 1rem;
  }
}
</style>