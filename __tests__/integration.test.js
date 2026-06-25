/**
 * @jest-environment jsdom
 */
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// Import all modules for integration testing
const { findVideoContainer } = require('../src/dom-detector.js');
const { copyStylesheets } = require('../src/css-sync.js');
const { openPiP, closePiP, togglePiP, _resetState } = require('../src/pip-manager.js');
const { showError, showSuccess, notifyApiNotSupported, notifyContainerNotFound } = require('../src/notification.js');

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
 * Helper function to create mock PiP window
 */
function createMockPipWindow() {
  const pipBody = document.createElement('body');
  const pipHead = document.createElement('head');
  const pipDoc = {
    body: pipBody,
    head: pipHead,
    createElement: (tag) => document.createElement(tag),
    querySelector: (selector) => null
  };
  
  return {
    document: pipDoc,
    addEventListener: jest.fn(),
    close: jest.fn()
  };
}

describe('Integration Tests - Module Interactions', () => {
  let mockPipWindow;
  let consoleWarnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    _resetState(); // reset in-flight race guard flags
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    
    // Mock documentPictureInPicture API
    mockPipWindow = createMockPipWindow();
    global.documentPictureInPicture = {
      requestWindow: jest.fn().mockResolvedValue(mockPipWindow),
      window: null
    };
    
    // Mock chrome.runtime.sendMessage (notification relay to background.js)
    global.chrome = {
      runtime: {
        sendMessage: jest.fn()
      }
    };
    
    // Spy on console.warn for fallback notification tests
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('1. DOM detector → PiP manager flow', () => {
    it('should find container and pass it to openPiP successfully', async () => {
      // Arrange: Set up Stremio-like DOM
      setupStremioDOM();
      
      // Act: Find container using dom-detector
      const container = findVideoContainer();
      expect(container).not.toBeNull();
      
      // Act: Pass container to pip-manager
      const pipWindow = await openPiP(container);
      
      // Assert: PiP window was requested with container dimensions
      expect(global.documentPictureInPicture.requestWindow).toHaveBeenCalledWith({
        width: expect.any(Number),
        height: expect.any(Number)
      });
      
      // Assert: Container was moved to PiP window
      expect(mockPipWindow.document.body.contains(container)).toBe(true);
    });

    it('should handle realistic Stremio DOM structure with nested containers', async () => {
      // Arrange: More complex Stremio structure
      const playerContainer = document.createElement('div');
      playerContainer.className = 'player-container-wIELK overlayHidden-gyJIy';
      
      const layer = document.createElement('div');
      layer.className = 'layer-qaLDW video-container-v9_vA';
      layer.style.position = 'relative';
      
      const videoContainer = document.createElement('div');
      videoContainer.className = 'video-tkpQm';
      videoContainer.style.position = 'relative';
      
      const subtitleOverlay = document.createElement('div');
      subtitleOverlay.style.cssText = 'position: absolute; z-index: 1; text-align: center;';
      subtitleOverlay.textContent = 'Subtitle text';
      
      const video = document.createElement('video');
      video.className = 'noselect';
      video.src = 'test.mp4';
      
      videoContainer.appendChild(subtitleOverlay);
      videoContainer.appendChild(video);
      layer.appendChild(videoContainer);
      playerContainer.appendChild(layer);
      document.body.appendChild(playerContainer);
      
      // Act
      const container = findVideoContainer();
      const pipWindow = await openPiP(container);
      
      // Assert
      expect(container).toBe(videoContainer);
      expect(pipWindow).toBe(mockPipWindow);
    });
  });

  describe('2. CSS sync → PiP window integration', () => {
    it('should copy stylesheets to PiP window document', async () => {
      // Arrange: Add stylesheets to source document
      const inlineStyle = document.createElement('style');
      inlineStyle.textContent = '.subtitle { font-size: 4vmin; color: white; }';
      document.head.appendChild(inlineStyle);
      
      const externalLink = document.createElement('link');
      externalLink.rel = 'stylesheet';
      externalLink.href = 'https://example.com/styles.css';
      document.head.appendChild(externalLink);
      
      // Act: Copy stylesheets to PiP window document
      copyStylesheets(mockPipWindow.document);
      
      // Assert: Styles were copied to target document
      expect(mockPipWindow.document.head.children.length).toBeGreaterThan(0);
      
      // Verify inline style was copied
      const styleElements = Array.from(mockPipWindow.document.head.children)
        .filter(el => el.tagName === 'STYLE');
      expect(styleElements.length).toBeGreaterThan(0);
      
      // Verify external link was copied
      const linkElements = Array.from(mockPipWindow.document.head.children)
        .filter(el => el.tagName === 'LINK');
      expect(linkElements.length).toBeGreaterThan(0);
    });

    it('should preserve subtitle styling when syncing to PiP window', () => {
      // Arrange: Add Stremio-like subtitle styles
      const subtitleStyle = document.createElement('style');
      subtitleStyle.textContent = `
        [class*="video-"] div[style*="position: absolute"] {
          font-size: 4vmin;
          text-shadow: 2px 2px 4px black;
          color: white;
        }
      `;
      document.head.appendChild(subtitleStyle);
      
      // Act
      copyStylesheets(mockPipWindow.document);
      
      // Assert: Subtitle styles are present in target
      const copiedStyle = Array.from(mockPipWindow.document.head.children)
        .find(el => el.tagName === 'STYLE' && el.textContent.includes('font-size'));
      expect(copiedStyle).toBeDefined();
      expect(copiedStyle.textContent).toContain('text-shadow');
    });

    it('should handle full PiP workflow with CSS sync', async () => {
      // Arrange
      setupStremioDOM();
      const style = document.createElement('style');
      style.textContent = '.video-tkpQm { position: relative; }';
      document.head.appendChild(style);
      
      // Act: Full workflow
      const container = findVideoContainer();
      const pipWindow = await openPiP(container);
      copyStylesheets(pipWindow.document);
      
      // Assert: Both container and styles are in PiP window
      expect(pipWindow.document.body.contains(container)).toBe(true);
      expect(pipWindow.document.head.children.length).toBeGreaterThan(0);
    });
  });

  describe('3. Error handling → Notifications', () => {
    it('should call notifyApiNotSupported when PiP API is unavailable', () => {
      // Arrange: Remove PiP API
      global.documentPictureInPicture = undefined;
      
      // Act
      notifyApiNotSupported();
      
      // Assert: Error notification was relayed via sendMessage
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'notify',
          kind: 'error',
          message: expect.stringContaining('not supported'),
          autoDismiss: false
        })
      );
    });

    it('should call notifyContainerNotFound when container is missing', () => {
      // Arrange: Empty DOM (no container)
      document.body.innerHTML = '';
      
      // Act
      notifyContainerNotFound();
      
      // Assert: Error notification was relayed via sendMessage
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'notify',
          kind: 'error',
          message: expect.stringContaining('container'),
          autoDismiss: false
        })
      );
    });

    it('should use console.warn fallback when chrome.runtime.sendMessage unavailable', () => {
      // Arrange: Remove chrome API entirely
      global.chrome = undefined;
      
      // Act
      showError('Test error message');
      
      // Assert: Falls back to console.warn
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Stremio PiP: cannot relay notification:',
        'Test error message'
      );
    });

    it('should propagate PiP failure and allow notification', async () => {
      // Arrange: Set up container but mock API failure
      setupStremioDOM();
      global.documentPictureInPicture.requestWindow.mockRejectedValue(
        new Error('User denied permission')
      );
      
      const container = findVideoContainer();
      
      // Act & Assert: PiP should fail
      await expect(openPiP(container)).rejects.toThrow('User denied permission');
      
      // In real usage, caller would call showError() after catching
      showError('Failed to open PiP window');
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalled();
    });
  });

  describe('4. Full togglePiP workflow', () => {
    it('should open PiP when togglePiP is called with container', async () => {
      // Arrange
      setupStremioDOM();
      global.documentPictureInPicture.window = null;
      
      // Act
      const container = findVideoContainer();
      await togglePiP(container);
      
      // Assert: PiP was opened
      expect(global.documentPictureInPicture.requestWindow).toHaveBeenCalled();
    });

    it('should close PiP when togglePiP is called while PiP is open', async () => {
      // Arrange: Simulate PiP window being open
      global.documentPictureInPicture.window = mockPipWindow;
      
      // Act
      await togglePiP();
      
      // Assert: PiP was closed
      expect(mockPipWindow.close).toHaveBeenCalled();
    });

    it('should handle complete open → close cycle', async () => {
      // Arrange
      setupStremioDOM();
      global.documentPictureInPicture.window = null;
      
      // Act: Open PiP
      const container = findVideoContainer();
      await togglePiP(container);
      
      // Assert: PiP opened
      expect(global.documentPictureInPicture.requestWindow).toHaveBeenCalledTimes(1);
      
      // Simulate PiP window being open
      global.documentPictureInPicture.window = mockPipWindow;
      
      // Act: Close PiP
      await togglePiP();
      
      // Assert: PiP closed
      expect(mockPipWindow.close).toHaveBeenCalled();
    });

    it('should throw error when trying to open PiP without container', async () => {
      // Arrange: No PiP window open, no container provided
      global.documentPictureInPicture.window = null;
      
      // Act & Assert
      await expect(togglePiP()).rejects.toThrow('Container is required to open PiP');
    });
  });

  describe('5. Module error propagation', () => {
    it('should propagate null container from dom-detector to pip-manager', async () => {
      // Arrange: Empty DOM
      document.body.innerHTML = '';
      
      // Act: dom-detector returns null
      const container = findVideoContainer();
      expect(container).toBeNull();
      
      // Act & Assert: pip-manager throws when given null
      await expect(openPiP(container)).rejects.toThrow('Container is required');
    });

    it('should handle API not supported error in full workflow', async () => {
      // Arrange: Remove PiP API
      global.documentPictureInPicture = undefined;
      setupStremioDOM();
      
      // Act: Find container
      const container = findVideoContainer();
      expect(container).not.toBeNull();
      
      // Act & Assert: PiP fails due to missing API
      await expect(openPiP(container)).rejects.toThrow('Document Picture-in-Picture API not supported');
      
      // Caller would use notifyApiNotSupported()
      notifyApiNotSupported();
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalled();
    });

    it('should restore container to original parent on PiP failure', async () => {
      // Arrange
      setupStremioDOM();
      const originalParent = document.createElement('div');
      document.body.appendChild(originalParent);
      
      const container = findVideoContainer();
      originalParent.appendChild(container);
      
      // Mock failure
      global.documentPictureInPicture.requestWindow.mockRejectedValue(
        new Error('Failed to open')
      );
      
      // Act
      try {
        await openPiP(container);
      } catch (e) {
        // Expected error
      }
      
      // Assert: Container should still be in original parent after failure
      // Note: The module resets originalParent on failure, but container
      // remains where it was (not moved yet since requestWindow failed first)
      expect(originalParent.contains(container)).toBe(true);
    });
  });

  describe('6. Complete integration scenarios', () => {
    it('should handle full user workflow: find container → open PiP → sync styles', async () => {
      // Arrange: Complete Stremio setup with styles
      setupStremioDOM();
      
      const subtitleStyle = document.createElement('style');
      subtitleStyle.textContent = `
        .subtitle-overlay {
          font-size: 4vmin;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
          color: white;
        }
      `;
      document.head.appendChild(subtitleStyle);
      
      // Act: Complete workflow
      const container = findVideoContainer();
      expect(container).not.toBeNull();
      
      const pipWindow = await openPiP(container);
      copyStylesheets(pipWindow.document);
      
      // Assert: Everything is in PiP window
      expect(pipWindow.document.body.contains(container)).toBe(true);
      expect(pipWindow.document.head.children.length).toBeGreaterThan(0);
      
      // Verify subtitle styles are synced
      const syncedStyle = Array.from(pipWindow.document.head.children)
        .find(el => el.tagName === 'STYLE');
      expect(syncedStyle?.textContent).toContain('font-size');
    });

    it('should handle pagehide event and restore elements', async () => {
      // Arrange
      setupStremioDOM();
      const container = findVideoContainer();
      const originalParent = container.parentElement;
      
      // Act: Open PiP
      await openPiP(container);
      
      // Verify container moved to PiP
      expect(mockPipWindow.document.body.contains(container)).toBe(true);
      
      // Simulate pagehide event
      const pagehideCallback = mockPipWindow.addEventListener.mock.calls
        .find(call => call[0] === 'pagehide')?.[1];
      
      if (pagehideCallback) {
        pagehideCallback();
      }
      
      // Assert: Container restored to original parent
      expect(originalParent.contains(container)).toBe(true);
    });

    it('should handle success notification after successful PiP open', async () => {
      // Arrange
      setupStremioDOM();
      
      // Act
      const container = findVideoContainer();
      await openPiP(container);
      
      // Caller would show success notification
      showSuccess('PiP mode activated');
      
      // Assert: Success notification relayed via sendMessage. autoDismiss is now
      // implicit in showSuccess (the content script schedules the 3s clear via a
      // callback), so it is not in the payload anymore.
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'notify',
          kind: 'success',
          message: 'PiP mode activated'
        }),
        expect.any(Function)
      );
    });
  });
});
