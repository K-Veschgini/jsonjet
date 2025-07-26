import { readFileSync } from 'fs'
import { resolve } from 'path'

// Simple tokenizer for JSONJet syntax
function tokenizeJsonjet(code) {
  const tokens = []
  const lines = code.split('\n')
  let inObject = false
  let expectingKey = false
  let objectDepth = 0
  
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]
    const lineTokens = []
    
    // Different types of keywords
    const declarationKeywords = ['create', 'insert', 'delete', 'flush', 'list', 'info', 'subscribe', 'unsubscribe', 'print']
    const flowKeywords = ['stream', 'flow', 'lookup', 'as', 'into', 'ttl']
    const queryKeywords = ['where', 'select', 'scan', 'summarize', 'collect', 'by', 'over', 'step', 'emit']
    const controlKeywords = ['or', 'replace', 'if', 'not', 'exists', 'every', 'when', 'on', 'change', 'group', 'update', 'using']
    const windowKeywords = ['hopping_window', 'tumbling_window', 'sliding_window', 'count_window', 'hopping_window_by', 'tumbling_window_by', 'sliding_window_by', 'session_window']
    const logicalKeywords = ['and', 'or', 'not', 'if']
    const booleanLiterals = ['true', 'false', 'null']
    const specialFunctions = ['iff', 'assert_or_save_expected', 'write_to_file', 'insert_into']
    
    // Operators
    const operators = ['|', '=>', '==', '!=', '<=', '>=', '<', '>', '=', '+', '-', '*', '/', '%', '&&', '||', '...', '?', ':']
    
    // Functions
    const functions = ['count', 'sum', 'avg', 'min', 'max', 'abs', 'exp', 'pi', 'pow', 'mod', 'add', 'sub', 'mul', 'div', 'neg', 'eq', 'ne', 'lt', 'le', 'gt', 'ge']
    
    let current = line
    let pos = 0
    
    while (current.length > 0) {
      // Comments
      if (current.startsWith('//')) {
        lineTokens.push({
          type: 'comment',
          value: current,
          start: pos,
          end: pos + current.length
        })
        break
      }
      
      // Strings
      if (current.startsWith('"')) {
        const endQuote = current.indexOf('"', 1)
        if (endQuote !== -1) {
          const stringValue = current.substring(0, endQuote + 1)
          lineTokens.push({
            type: 'string',
            value: stringValue,
            start: pos,
            end: pos + stringValue.length
          })
          current = current.substring(endQuote + 1)
          pos += stringValue.length
          continue
        }
      }
      
      // Numbers
      const numberMatch = current.match(/^\d+(\.\d+)?/)
      if (numberMatch) {
        lineTokens.push({
          type: 'number',
          value: numberMatch[0],
          start: pos,
          end: pos + numberMatch[0].length
        })
        current = current.substring(numberMatch[0].length)
        pos += numberMatch[0].length
        continue
      }
      
      // Keywords - check in order of specificity
      let keywordFound = false
      
      // Check declaration keywords first (most specific)
      for (const keyword of declarationKeywords) {
        if (current.startsWith(keyword) && (current.length === keyword.length || !/[a-zA-Z0-9_]/.test(current[keyword.length]))) {
          lineTokens.push({
            type: 'keyword-declaration',
            value: keyword,
            start: pos,
            end: pos + keyword.length
          })
          current = current.substring(keyword.length)
          pos += keyword.length
          keywordFound = true
          break
        }
      }
      if (keywordFound) continue
      
      // Check query keywords
      for (const keyword of queryKeywords) {
        if (current.startsWith(keyword) && (current.length === keyword.length || !/[a-zA-Z0-9_]/.test(current[keyword.length]))) {
          lineTokens.push({
            type: 'keyword-query',
            value: keyword,
            start: pos,
            end: pos + keyword.length
          })
          current = current.substring(keyword.length)
          pos += keyword.length
          keywordFound = true
          break
        }
      }
      if (keywordFound) continue
      
      // Check flow keywords
      for (const keyword of flowKeywords) {
        if (current.startsWith(keyword) && (current.length === keyword.length || !/[a-zA-Z0-9_]/.test(current[keyword.length]))) {
          lineTokens.push({
            type: 'keyword-flow',
            value: keyword,
            start: pos,
            end: pos + keyword.length
          })
          current = current.substring(keyword.length)
          pos += keyword.length
          keywordFound = true
          break
        }
      }
      if (keywordFound) continue
      
      // Check window keywords
      for (const keyword of windowKeywords) {
        if (current.startsWith(keyword) && (current.length === keyword.length || !/[a-zA-Z0-9_]/.test(current[keyword.length]))) {
          lineTokens.push({
            type: 'keyword-window',
            value: keyword,
            start: pos,
            end: pos + keyword.length
          })
          current = current.substring(keyword.length)
          pos += keyword.length
          keywordFound = true
          break
        }
      }
      if (keywordFound) continue
      
      // Check control keywords
      for (const keyword of controlKeywords) {
        if (current.startsWith(keyword) && (current.length === keyword.length || !/[a-zA-Z0-9_]/.test(current[keyword.length]))) {
          lineTokens.push({
            type: 'keyword-control',
            value: keyword,
            start: pos,
            end: pos + keyword.length
          })
          current = current.substring(keyword.length)
          pos += keyword.length
          keywordFound = true
          break
        }
      }
      if (keywordFound) continue
      
      // Check logical keywords
      for (const keyword of logicalKeywords) {
        if (current.startsWith(keyword) && (current.length === keyword.length || !/[a-zA-Z0-9_]/.test(current[keyword.length]))) {
          lineTokens.push({
            type: 'keyword-logical',
            value: keyword,
            start: pos,
            end: pos + keyword.length
          })
          current = current.substring(keyword.length)
          pos += keyword.length
          keywordFound = true
          break
        }
      }
      if (keywordFound) continue
      
      // Check boolean literals
      for (const literal of booleanLiterals) {
        if (current.startsWith(literal) && (current.length === literal.length || !/[a-zA-Z0-9_]/.test(current[literal.length]))) {
          lineTokens.push({
            type: 'literal-boolean',
            value: literal,
            start: pos,
            end: pos + literal.length
          })
          current = current.substring(literal.length)
          pos += literal.length
          keywordFound = true
          break
        }
      }
      if (keywordFound) continue
      
      // Special functions
      let functionFound = false
      for (const func of specialFunctions) {
        if (current.startsWith(func) && current[func.length] === '(') {
          lineTokens.push({
            type: 'function-special',
            value: func,
            start: pos,
            end: pos + func.length
          })
          current = current.substring(func.length)
          pos += func.length
          functionFound = true
          break
        }
      }
      if (functionFound) continue
      
      // Regular functions
      for (const func of functions) {
        if (current.startsWith(func) && current[func.length] === '(') {
          lineTokens.push({
            type: 'function',
            value: func,
            start: pos,
            end: pos + func.length
          })
          current = current.substring(func.length)
          pos += func.length
          functionFound = true
          break
        }
      }
      if (functionFound) continue
      
      // Operators
      let operatorFound = false
      for (const op of operators) {
        if (current.startsWith(op)) {
          lineTokens.push({
            type: 'operator',
            value: op,
            start: pos,
            end: pos + op.length
          })
          current = current.substring(op.length)
          pos += op.length
          operatorFound = true
          break
        }
      }
      if (operatorFound) continue
      
      // Object context detection - handle before identifiers
      if (current.startsWith('{')) {
        objectDepth++
        inObject = objectDepth > 0
        expectingKey = true
      } else if (current.startsWith('}')) {
        objectDepth--
        inObject = objectDepth > 0
        expectingKey = false
      } else if (current.startsWith(':')) {
        expectingKey = false
      } else if (current.startsWith(',')) {
        expectingKey = true
      }
      
      // Identifiers - check if they're object keys
      const identifierMatch = current.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)
      if (identifierMatch) {
        // Check if this is a property key by looking ahead for a colon
        const afterIdentifier = current.substring(identifierMatch[0].length)
        const isPropertyKey = inObject && expectingKey && afterIdentifier.trim().startsWith(':')
        
        if (isPropertyKey) {
          // For object keys, only highlight the key part
          lineTokens.push({
            type: 'property-key',
            value: identifierMatch[0],
            start: pos,
            end: pos + identifierMatch[0].length
          })
        } else {
          // For regular identifiers
          lineTokens.push({
            type: 'identifier',
            value: identifierMatch[0],
            start: pos,
            end: pos + identifierMatch[0].length
          })
        }
        
        current = current.substring(identifierMatch[0].length)
        pos += identifierMatch[0].length
        continue
      }
      
      // Punctuation
      const punctuationMatch = current.match(/^[{}()[\].,;]/)
      if (punctuationMatch) {
        lineTokens.push({
          type: 'punctuation',
          value: punctuationMatch[0],
          start: pos,
          end: pos + 1
        })
        current = current.substring(1)
        pos += 1
        continue
      }
      
      // Whitespace
      const whitespaceMatch = current.match(/^\s+/)
      if (whitespaceMatch) {
        lineTokens.push({
          type: 'whitespace',
          value: whitespaceMatch[0],
          start: pos,
          end: pos + whitespaceMatch[0].length
        })
        current = current.substring(whitespaceMatch[0].length)
        pos += whitespaceMatch[0].length
        continue
      }
      
      // Unknown character
      lineTokens.push({
        type: 'unknown',
        value: current[0],
        start: pos,
        end: pos + 1
      })
      current = current.substring(1)
      pos += 1
    }
    
    tokens.push({
      line: lineIndex,
      tokens: lineTokens
    })
  }
  
  return tokens
}

// Convert tokens to HTML with syntax highlighting
function tokensToHtml(tokens) {
  let html = '<pre class="language-jsonjet"><code>'
  
  for (const line of tokens) {
    for (const token of line.tokens) {
      const className = `token-${token.type}`
      const escapedValue = token.value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
      
      html += `<span class="${className}">${escapedValue}</span>`
    }
    html += '\n'
  }
  
  html += '</code></pre>'
  return html
}

export function highlightJsonjet(code) {
  const tokens = tokenizeJsonjet(code)
  return tokensToHtml(tokens)
} 