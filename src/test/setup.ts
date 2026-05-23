import '@testing-library/jest-dom/vitest';
import '@/utils/i18n';

const originalGetComputedStyle = window.getComputedStyle;

Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  configurable: true,
  value: (element: Element) => originalGetComputedStyle(element),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
