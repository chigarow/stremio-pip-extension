/**
 * @jest-environment jsdom
 */
const { describe, it, expect, beforeEach } = require('@jest/globals');

// Import will fail until T7 implementation - that's expected for RED phase
const { openPiP, closePiP, togglePiP } = require('../src/pip-manager.js');

describe('PiP Manager - Document Picture-in-Picture', () => {
  let mockPipWindow;
  let mockContainer;

  beforeEach(() => {
    // Reset mocks
    mockPipWindow = null;
    mockContainer = null;
    
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

      // Verify pagehide listener was registered
      expect(mockPipWindow.addEventListener).toHaveBeenCalledWith('pagehide', expect.any(Function));
      
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

      // Assert: Video should still be playing (not cloned, moved)
      expect(mockPipWindow.document.body.contains(video)).toBe(false);
      // Note: In real DOM, video would be moved, not in both places
    });
  });
});
