/**
 * @jest-environment jsdom
 * 
 * E2E Simulation Tests - Complete User Workflow
 * 
 * Simulates the full user flow from icon click through PiP toggle:
 * Icon click → background.js sends message → content.js handles → modules coordinate → PiP opens/closes
 */
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// Import all modules to make their functions available globally
const domDetector = require('../src/dom-detector.js');
const cssSync = require('../src/css-sync.js');
const pipManager = require('../src/pip-manager.js');
const notification = require('../src/notification.js');

// Make module functions available globally (simulating content script scope)
// In browser context, these are loaded as separate scripts and functions become global
global.findVideoContainer = domDetector.findVideoContainer;
global.copyStylesheets = cssSync.copyStylesheets;
global.openPiP = pipManager.openPiP;
global.closePiP = pipManager.closePiP;
global.togglePiP = pipManager.togglePiP;
global.showError = notification.showError;
global.showSuccess = notification.showSuccess;
global.notifyApiNotSupported = notification.notifyApiNotSupported;
global.notifyContainerNotFound = notification.notifyContainerNotFound;

/**
 * Helper function to set up realistic Stremio-like DOM structure
 */
function setupStremioDOM() {
  document.body.innerHTML = `
    <div class="player-container-wIELK overlayHidden-gyJIy">
      <div class="layer-qaLDW video-container-v9_vA">
        <div class="video-tkpQm">
          <div style="position:absolute;z-index:1">Subtitle text here</div>
          <video class="noselect" src="test.mp4"></video>
        </div>
      </div>
    </div>
  `;
}

/**
 * Helper function to create mock PiP window with proper append functionality
 * Uses a real DOM element that can properly track appended children
 */
function createMockPipWindow() {
  // Create a container div to simulate the PiP window's body
  // This allows proper DOM operations like append and querySelector
  const pipBodyContainer = document.createElement('div');
  const pipHeadContainer = document.createElement('div');
  
  // Track all children added to the body
  const bodyChildren = [];
  const originalAppendChild = pipBodyContainer.appendChild.bind(pipBodyContainer);
  pipBodyContainer.appendChild = function(child) {
    bodyChildren.push(child);
    return originalAppendChild(child);
  };
  
  // Also track via append method
  pipBodyContainer.append = function(...children) {
    children.forEach(child => {
      bodyChildren.push(child);
      pipBodyContainer.appendChild(child);
    });
  };
  
  const pipDoc = {
    body: pipBodyContainer,
    head: pipHeadContainer,
    createElement: (tag) => document.createElement(tag),
    querySelector: (selector) => pipBodyContainer.querySelector(selector)
  };
  
  return {
    document: pipDoc,
    addEventListener: jest.fn(),
    close: jest.fn(),
    _bodyChildren: bodyChildren // For testing assertions
  };
}

describe('E2E Simulation Tests - Complete User Workflow', () => {
  let mockPipWindow;
  let messageListener;
  let consoleWarnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    
    // Mock documentPictureInPicture API
    mockPipWindow = createMockPipWindow();
    global.documentPictureInPicture = {
      requestWindow: jest.fn().mockResolvedValue(mockPipWindow),
      window: null
    };
    
    // Mock chrome APIs
    global.chrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn((callback) => {
            messageListener = callback;
          })
        }
      },
      notifications: {
        create: jest.fn(),
        clear: jest.fn()
      }
    };
    
    // Spy on console.warn for fallback notification tests
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Reset modules and reload content script
    jest.resetModules();
    
    // Re-import modules after reset
    const domDetectorFresh = require('../src/dom-detector.js');
    const cssSyncFresh = require('../src/css-sync.js');
    const pipManagerFresh = require('../src/pip-manager.js');
    const notificationFresh = require('../src/notification.js');
    
    global.findVideoContainer = domDetectorFresh.findVideoContainer;
    global.copyStylesheets = cssSyncFresh.copyStylesheets;
    global.openPiP = pipManagerFresh.openPiP;
    global.closePiP = pipManagerFresh.closePiP;
    global.togglePiP = pipManagerFresh.togglePiP;
    global.showError = notificationFresh.showError;
    global.showSuccess = notificationFresh.showSuccess;
    global.notifyApiNotSupported = notificationFresh.notifyApiNotSupported;
    global.notifyContainerNotFound = notificationFresh.notifyContainerNotFound;
    
    // Load content.js to register the message listener
    require('../src/content.js');
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    jest.resetModules();
  });

  describe('1. Complete happy path: Open PiP', () => {
    it('should complete full flow: message received → container found → PiP opened → CSS synced → success notification', async () => {
      // Arrange: Set up realistic Stremio DOM
      setupStremioDOM();
      
      // Add stylesheets to sync
      const subtitleStyle = document.createElement('style');
      subtitleStyle.textContent = '.subtitle { font-size: 4vmin; color: white; }';
      document.head.appendChild(subtitleStyle);
      
      // Act: Simulate chrome.runtime.onMessage with togglePiP action
      const sendResponse = jest.fn();
      const result = messageListener({ action: 'togglePiP' }, {}, sendResponse);
      
      // Wait for async handler to complete (returns true to keep channel open)
      expect(result).toBe(true);
      
      // Need to wait for the promise to resolve
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Assert: Container was found
      expect(global.documentPictureInPicture.requestWindow).toHaveBeenCalled();
      
      // Assert: PiP window was requested with container dimensions
      expect(global.documentPictureInPicture.requestWindow).toHaveBeenCalledWith({
        width: expect.any(Number),
        height: expect.any(Number)
      });
      
      // Assert: Container was moved to PiP window
      expect(mockPipWindow._bodyChildren.length).toBeGreaterThan(0);
      // Assert: CSS was synced to PiP window
      expect(mockPipWindow.document.head.children.length).toBeGreaterThan(0);
      
      // Assert: Success notification was shown
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'basic',
          message: 'PiP mode activated'
        })
      );
      
      // Assert: sendResponse was called with success
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('2. Complete happy path: Close PiP', () => {
    it('should complete full flow: PiP open → message received → PiP closed → success notification', async () => {
      // Arrange: Set up Stremio DOM and simulate PiP already open
      setupStremioDOM();
      global.documentPictureInPicture.window = mockPipWindow;
      
      // Act: Simulate chrome.runtime.onMessage with togglePiP action
      const sendResponse = jest.fn();
      const result = messageListener({ action: 'togglePiP' }, {}, sendResponse);
      
      // Wait for async handler
      expect(result).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Assert: PiP window was closed
      expect(mockPipWindow.close).toHaveBeenCalled();
      
      // Assert: Success notification was shown
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'basic',
          message: 'PiP mode deactivated'
        })
      );
      
      // Assert: sendResponse was called with success
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('3. Error path: No video playing', () => {
    it('should handle empty DOM: message received → container not found → error notification', async () => {
      // Arrange: Empty DOM (no Stremio player)
      document.body.innerHTML = '';
      
      // Act: Simulate chrome.runtime.onMessage with togglePiP action
      const sendResponse = jest.fn();
      const result = messageListener({ action: 'togglePiP' }, {}, sendResponse);
      
      // Wait for async handler
      expect(result).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Assert: Container not found notification was triggered
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'basic',
          message: expect.stringContaining('container')
        })
      );
      
      // Assert: PiP was not opened
      expect(global.documentPictureInPicture.requestWindow).not.toHaveBeenCalled();
      
      // Assert: sendResponse was called with success (error handled internally)
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('4. Error path: API not supported', () => {
    it('should handle missing API: container found → API missing → error notification', async () => {
      // Arrange: Set up Stremio DOM but remove documentPictureInPicture
      setupStremioDOM();
      global.documentPictureInPicture = undefined;
      
      // Act: Simulate chrome.runtime.onMessage with togglePiP action
      const sendResponse = jest.fn();
      const result = messageListener({ action: 'togglePiP' }, {}, sendResponse);
      
      // Wait for async handler
      expect(result).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Assert: API not supported notification was triggered
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'basic',
          message: expect.stringContaining('not supported')
        })
      );
      
      // Assert: sendResponse was called with success (error handled internally)
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('5. Error path: User denies PiP permission', () => {
    it('should handle permission denial: container found → API available → requestWindow rejects → error notification', async () => {
      // Arrange: Set up everything, but requestWindow rejects
      setupStremioDOM();
      global.documentPictureInPicture.requestWindow.mockRejectedValue(
        new Error('User denied permission')
      );
      
      // Act: Simulate chrome.runtime.onMessage with togglePiP action
      const sendResponse = jest.fn();
      const result = messageListener({ action: 'togglePiP' }, {}, sendResponse);
      
      // Wait for async handler
      expect(result).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Assert: Error notification was shown (error caught in try/catch)
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'basic',
          message: expect.stringContaining('Failed to open PiP')
        })
      );
      
      // Assert: sendResponse was called with success (error handled internally in try/catch)
      // The handleTogglePiP catches the error and doesn't throw, so promise resolves
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('6. Full lifecycle: Open → CSS sync → Close → Reopen', () => {
    it('should handle complete lifecycle: open → verify styles → close → reopen', async () => {
      // Arrange: Set up Stremio DOM with styles
      setupStremioDOM();
      const subtitleStyle = document.createElement('style');
      subtitleStyle.textContent = '.subtitle { font-size: 4vmin; text-shadow: 2px 2px 4px black; }';
      document.head.appendChild(subtitleStyle);
      
      // === PHASE 1: Open PiP ===
      const sendResponse1 = jest.fn();
      const result1 = messageListener({ action: 'togglePiP' }, {}, sendResponse1);
      expect(result1).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Assert: PiP opened
      expect(global.documentPictureInPicture.requestWindow).toHaveBeenCalledTimes(1);
      expect(sendResponse1).toHaveBeenCalledWith({ success: true });
      
      // Assert: Styles synced to PiP window
      const syncedStyle = Array.from(mockPipWindow.document.head.children)
        .find(el => el.tagName === 'STYLE');
      expect(syncedStyle).toBeDefined();
      expect(syncedStyle.textContent).toContain('font-size');
      expect(syncedStyle.textContent).toContain('text-shadow');
      
      // === PHASE 2: Close PiP (simulate pagehide) ===
      // Get the pagehide callback
      const pagehideCallback = mockPipWindow.addEventListener.mock.calls
        .find(call => call[0] === 'pagehide')?.[1];
      
      // Simulate pagehide event
      if (pagehideCallback) {
        pagehideCallback();
      }
      
      // Assert: Container restored to original parent
      const container = document.querySelector('[class*="video-tkpQm"]');
      expect(document.body.contains(container)).toBe(true);
      
      // === PHASE 3: Reopen PiP ===
      // Reset mocks for reopen
      global.documentPictureInPicture.requestWindow.mockClear();
      global.chrome.notifications.create.mockClear();
      
      // Create new mock PiP window for reopen
      const newMockPipWindow = createMockPipWindow();
      global.documentPictureInPicture.requestWindow.mockResolvedValue(newMockPipWindow);
      global.documentPictureInPicture.window = null;
      
      const sendResponse2 = jest.fn();
      const result2 = messageListener({ action: 'togglePiP' }, {}, sendResponse2);
      expect(result2).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Assert: PiP reopened successfully
      expect(global.documentPictureInPicture.requestWindow).toHaveBeenCalledTimes(1);
      expect(newMockPipWindow._bodyChildren.includes(container)).toBe(true);
      
      // Assert: Success notification shown again
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: 'PiP mode activated'
        })
      );
      
      expect(sendResponse2).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('Additional E2E scenarios', () => {
    it('should handle unknown message action gracefully', async () => {
      // Arrange
      setupStremioDOM();
      
      // Act: Send message with unknown action
      const sendResponse = jest.fn();
      const result = messageListener({ action: 'unknownAction' }, {}, sendResponse);
      
      // Assert: Handler should not process unknown actions
      // The listener returns undefined for unknown actions (no async response)
      expect(result).toBeUndefined();
      expect(global.documentPictureInPicture.requestWindow).not.toHaveBeenCalled();
    });

    it('should handle multiple rapid toggle requests', async () => {
      // Arrange
      setupStremioDOM();
      
      // Act: Send multiple toggle messages rapidly
      const sendResponse1 = jest.fn();
      const sendResponse2 = jest.fn();
      
      // First toggle opens PiP
      const result1 = messageListener({ action: 'togglePiP' }, {}, sendResponse1);
      expect(result1).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Simulate PiP window being open
      global.documentPictureInPicture.window = mockPipWindow;
      
      // Restore container to document so findVideoContainer can find it
      // (in real browser, the container would still be in PiP window, but for
      // toggle-close detection, only documentPictureInPicture.window matters)
      setupStremioDOM();
      
      // Second toggle closes PiP
      const result2 = messageListener({ action: 'togglePiP' }, {}, sendResponse2);
      expect(result2).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Assert: Both operations completed
      expect(sendResponse1).toHaveBeenCalledWith({ success: true });
      expect(sendResponse2).toHaveBeenCalledWith({ success: true });
      expect(mockPipWindow.close).toHaveBeenCalled();
    });

    it('should preserve video element state during PiP transition', async () => {
      // Arrange: Set up DOM with video element
      setupStremioDOM();
      const video = document.querySelector('video');
      video.currentTime = 120; // Simulate video playing at 2 minutes
      
      // Act: Open PiP
      const sendResponse = jest.fn();
      const result = messageListener({ action: 'togglePiP' }, {}, sendResponse);
      expect(result).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Assert: Video element was moved (not cloned) to PiP window
      const pipVideo = mockPipWindow.document.querySelector('video');
      expect(pipVideo).toBe(video); // Same element reference
      expect(pipVideo.currentTime).toBe(120); // State preserved
    });

    it('should handle CSS sync with external stylesheets', async () => {
      // Arrange: Set up DOM with external stylesheet
      setupStremioDOM();
      
      // Add external stylesheet link
      const externalLink = document.createElement('link');
      externalLink.rel = 'stylesheet';
      externalLink.href = 'https://example.com/styles.css';
      document.head.appendChild(externalLink);
      
      // Mock styleSheets API to include the external stylesheet
      const mockStyleSheet = {
        href: 'https://example.com/styles.css',
        type: 'text/css',
        media: ''
      };
      
      Object.defineProperty(document, 'styleSheets', {
        get: () => [mockStyleSheet],
        configurable: true
      });
      
      // Act: Open PiP
      const sendResponse = jest.fn();
      const result = messageListener({ action: 'togglePiP' }, {}, sendResponse);
      expect(result).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Assert: External stylesheet was copied (check for LINK elements in head)
      const linkElements = Array.from(mockPipWindow.document.head.children)
        .filter(el => el.tagName === 'LINK');
      
      // The css-sync module copies external links to the target document
      expect(linkElements.length).toBeGreaterThan(0);
      expect(linkElements[0].href).toBe('https://example.com/styles.css');
    });
  });
});