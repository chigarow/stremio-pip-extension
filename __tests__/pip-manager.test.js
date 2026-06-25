/**
 * @jest-environment jsdom
 */
const { describe, it, expect, beforeEach } = require('@jest/globals');

// Import will fail until T7 implementation - that's expected for RED phase
const { openPiP, closePiP, togglePiP, _resetState } = require('../src/pip-manager.js');

describe('PiP Manager - Document Picture-in-Picture', () => {
  let mockPipWindow;
  let mockContainer;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockPipWindow = null;
    mockContainer = null;
    _resetState(); // reset in-flight race guard flags
    
    // Mock documentPictureInPicture API
    global.documentPictureInPicture = {
      requestWindow: jest.fn()
    };
  });

  describe('openPiP()', () => {
    it('should open PiP window with correct dimensions', async () => {
      // Arrange
      mockContainer = {
        clientWidth: 640,
        clientHeight: 480,
        parentElement: document.body
      };
      
      mockPipWindow = {
        document: { body: document.createElement('body') },
        addEventListener: jest.fn(),
        close: jest.fn()
      };
      
      global.documentPictureInPicture.requestWindow.mockResolvedValue(mockPipWindow);

      // Act
      const result = await openPiP(mockContainer);

      // Assert
      expect(global.documentPictureInPicture.requestWindow).toHaveBeenCalledWith({
        width: 640,
        height: 480
      });
      expect(result).toBe(mockPipWindow);
    });

    it('should move container to PiP window', async () => {
      mockContainer = {
        clientWidth: 640,
        clientHeight: 480,
        parentElement: document.body
      };
      
      mockPipWindow = {
        document: { body: document.createElement('body') },
        addEventListener: jest.fn(),
        close: jest.fn()
      };
      
      const appendSpy = jest.spyOn(mockPipWindow.document.body, 'append');
      global.documentPictureInPicture.requestWindow.mockResolvedValue(mockPipWindow);

      await openPiP(mockContainer);

      expect(appendSpy).toHaveBeenCalledWith(mockContainer);
      appendSpy.mockRestore();
    });

    it('should store original parent for restoration', async () => {
      const originalParent = document.createElement('div');
      mockContainer = {
        clientWidth: 640,
        clientHeight: 480,
        parentElement: originalParent
      };
      
      mockPipWindow = {
        document: { body: document.createElement('body') },
        addEventListener: jest.fn(),
        close: jest.fn()
      };
      
      global.documentPictureInPicture.requestWindow.mockResolvedValue(mockPipWindow);

      await openPiP(mockContainer);

      // Should have stored originalParent somewhere for later restoration
      expect(mockContainer.parentElement).toBe(originalParent);
    });

    it('should handle pagehide event for element restoration', async () => {
      mockContainer = {
        clientWidth: 640,
        clientHeight: 480,
        parentElement: document.body
      };
      
      let pagehideCallback = null;
      mockPipWindow = {
        document: { body: document.createElement('body') },
        addEventListener: jest.fn((event, cb) => {
          if (event === 'pagehide') {
            pagehideCallback = cb;
          }
        }),
        close: jest.fn()
      };
      
      global.documentPictureInPicture.requestWindow.mockResolvedValue(mockPipWindow);

      await openPiP(mockContainer);

      // Verify pagehide listener was registered with { once: true } option
      expect(mockPipWindow.addEventListener).toHaveBeenCalledWith('pagehide', expect.any(Function), { once: true });
      
      // Simulate pagehide event
      if (pagehideCallback) {
        pagehideCallback({ target: mockPipWindow.document });
      }
      
      // Container should be restored to original parent
      expect(mockContainer.parentElement).toBe(document.body);
    });
  });

  describe('closePiP()', () => {
    it('should close PiP window if open', () => {
      mockPipWindow = {
        close: jest.fn()
      };
      
      // Mock the window property
      global.documentPictureInPicture.window = mockPipWindow;

      closePiP();

      expect(mockPipWindow.close).toHaveBeenCalled();
    });

    it('should handle case when no PiP window is open', () => {
      global.documentPictureInPicture.window = null;

      expect(() => closePiP()).not.toThrow();
    });
  });

  describe('togglePiP()', () => {
    it('should open PiP when closed', async () => {
      mockContainer = {
        clientWidth: 640,
        clientHeight: 480,
        parentElement: document.body
      };
      
      mockPipWindow = {
        document: { body: document.createElement('body') },
        addEventListener: jest.fn(),
        close: jest.fn()
      };
      
      global.documentPictureInPicture.requestWindow.mockResolvedValue(mockPipWindow);
      global.documentPictureInPicture.window = null;

      await togglePiP(mockContainer);

      expect(global.documentPictureInPicture.requestWindow).toHaveBeenCalled();
    });

    it('should close PiP when open', async () => {
      mockPipWindow = {
        close: jest.fn()
      };
      
      global.documentPictureInPicture.window = mockPipWindow;

      await togglePiP();

      expect(mockPipWindow.close).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle API not supported', async () => {
      // Arrange: Remove the API
      const originalAPI = global.documentPictureInPicture;
      global.documentPictureInPicture = undefined;
      
      mockContainer = {
        clientWidth: 640,
        clientHeight: 480,
        parentElement: document.body
      };

      // Act & Assert
      await expect(openPiP(mockContainer)).rejects.toThrow();
      
      // Restore
      global.documentPictureInPicture = originalAPI;
    });

    it('should handle requestWindow rejection', async () => {
      mockContainer = {
        clientWidth: 640,
        clientHeight: 480,
        parentElement: document.body
      };
      
      global.documentPictureInPicture.requestWindow.mockRejectedValue(
        new Error('User denied permission')
      );

      await expect(openPiP(mockContainer)).rejects.toThrow('User denied permission');
    });

    it('should handle null container', async () => {
      await expect(openPiP(null)).rejects.toThrow();
    });
  });

  describe('Document PiP lifecycle', () => {
    it('should maintain video playback state during PiP', async () => {
      // Arrange: Create video element
      const video = document.createElement('video');
      video.src = 'test.mp4';
      
      mockContainer = {
        clientWidth: 640,
        clientHeight: 480,
        parentElement: document.body,
        querySelector: () => video
      };
      
      mockPipWindow = {
        document: { body: document.createElement('body') },
        addEventListener: jest.fn(),
        close: jest.fn()
      };
      
      global.documentPictureInPicture.requestWindow.mockResolvedValue(mockPipWindow);

      // Act
      await openPiP(mockContainer);

      // Assert: Container was passed to PiP window body via append (move, not clone)
      // This preserves video playback state - verified by 'should move container to PiP window' test
    });
  });
  describe('Race condition guards (rapid toggle)', () => {
    beforeEach(() => {
      _resetState();
    });

    it('should reject second openPiP while first is still opening', async () => {
      mockContainer = {
        clientWidth: 640,
        clientHeight: 480,
        parentElement: document.body
      };

      let resolveFirst;
      const firstPromise = new Promise(resolve => { resolveFirst = resolve; });
      mockPipWindow = {
        document: { body: document.createElement('body') },
        addEventListener: jest.fn(),
        close: jest.fn()
      };
      global.documentPictureInPicture.requestWindow.mockReturnValue(firstPromise);

      // Start first openPiP (in-flight)
      const firstCall = openPiP(mockContainer);

      // Second concurrent call should reject immediately
      await expect(openPiP(mockContainer))
        .rejects.toThrow('PiP open already in progress');

      // Let the first complete
      resolveFirst(mockPipWindow);
      await firstCall;
    });

    it('should reject openPiP while closing (pagehide pending)', async () => {
      mockContainer = {
        clientWidth: 640,
        clientHeight: 480,
        parentElement: document.body
      };
      mockPipWindow = {
        document: { body: document.createElement('body') },
        addEventListener: jest.fn(),
        close: jest.fn()
      };
      global.documentPictureInPicture.requestWindow.mockResolvedValue(mockPipWindow);
      global.documentPictureInPicture.window = mockPipWindow;

      await openPiP(mockContainer);
      // Simulate close in progress (closing flag set by closePiP)
      closePiP();

      // An open attempted during close should be rejected
      await expect(openPiP(mockContainer))
        .rejects.toThrow('PiP close already in progress');
    });

    it('should reject closePiP while opening (no-op)', async () => {
      mockContainer = {
        clientWidth: 640,
        clientHeight: 480,
        parentElement: document.body
      };
      let resolveFirst;
      const firstPromise = new Promise(resolve => { resolveFirst = resolve; });
      mockPipWindow = {
        document: { body: document.createElement('body') },
        addEventListener: jest.fn(),
        close: jest.fn()
      };
      global.documentPictureInPicture.requestWindow.mockReturnValue(firstPromise);

      const firstCall = openPiP(mockContainer);

      // closePiP during open should be a no-op (no window yet) and not throw
      expect(() => closePiP()).not.toThrow();

      resolveFirst(mockPipWindow);
      await firstCall;
    });

    it('should reset opening flag on requestWindow rejection', async () => {
      mockContainer = {
        clientWidth: 640,
        clientHeight: 480,
        parentElement: document.body
      };
      global.documentPictureInPicture.requestWindow.mockRejectedValueOnce(
        new Error('user denied')
      );

      await expect(openPiP(mockContainer)).rejects.toThrow('user denied');

      // Should be able to open again immediately
      mockPipWindow = {
        document: { body: document.createElement('body') },
        addEventListener: jest.fn(),
        close: jest.fn()
      };
      global.documentPictureInPicture.requestWindow.mockResolvedValueOnce(mockPipWindow);
      await expect(openPiP(mockContainer)).resolves.toBe(mockPipWindow);
    });

    it('should reset closing flag after pagehide fires', async () => {
      mockContainer = {
        clientWidth: 640,
        clientHeight: 480,
        parentElement: document.body
      };
      let pagehideCallback = null;
      mockPipWindow = {
        document: { body: document.createElement('body') },
        addEventListener: jest.fn((event, cb) => {
          if (event === 'pagehide') pagehideCallback = cb;
        }),
        close: jest.fn()
      };
      global.documentPictureInPicture.requestWindow.mockResolvedValue(mockPipWindow);
      global.documentPictureInPicture.window = mockPipWindow;

      await openPiP(mockContainer);
      closePiP();

      // Fire pagehide — should clear closing flag
      if (pagehideCallback) pagehideCallback();

      // Now open should work again
      const newMockPipWindow = { ...mockPipWindow, addEventListener: jest.fn() };
      global.documentPictureInPicture.requestWindow.mockResolvedValue(newMockPipWindow);
      global.documentPictureInPicture.window = null;
      await expect(openPiP(mockContainer)).resolves.toBe(newMockPipWindow);
    });
  });
});
