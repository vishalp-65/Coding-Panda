import '@testing-library/jest-dom'

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
}

// Mock MediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
        getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [
                { stop: vi.fn(), enabled: true },
                { stop: vi.fn(), enabled: true }
            ]
        })
    }
})

// Mock MediaRecorder
global.MediaRecorder = class MediaRecorder {
    constructor() { }
    start() { }
    stop() { }
    pause() { }
    resume() { }
} as any
import { vi } from 'vitest'

// Mock environment variables
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock sessionStorage
const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })