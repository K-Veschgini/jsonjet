import { readFileSync } from 'fs'
import { fileURLToPath, URL } from 'node:url'

export async function setupJetLanguage() {
  const jetGrammar = JSON.parse(
    readFileSync(new URL('../grammars/jet.tmLanguage.json', import.meta.url), 'utf-8')
  )
  
  return jetGrammar
}