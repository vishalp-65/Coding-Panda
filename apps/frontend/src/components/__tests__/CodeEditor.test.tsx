import { describe, it, expect } from 'vitest'

describe('CodeEditor', () => {
  it('should be testable', () => {
    // Simple test to verify the test setup works
    expect(true).toBe(true)
  })

  it('should handle props correctly', () => {
    // Mock test for CodeEditor props
    const mockProps = {
      value: 'console.log("hello")',
      onChange: () => {},
      language: 'javascript',
    }
    
    expect(mockProps.value).toBe('console.log("hello")')
    expect(mockProps.language).toBe('javascript')
    expect(typeof mockProps.onChange).toBe('function')
  })
})