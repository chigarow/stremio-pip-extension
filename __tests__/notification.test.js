/**
 * @jest-environment jsdom
 */
const { describe, it, expect, beforeEach } = require('@jest/globals');

const { showError, showSuccess, notifyApiNotSupported, notifyContainerNotFound } = require('../src/notification.js');

describe('Notification Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock chrome.runtime.sendMessage (the relay to background.js)
    global.chrome = {
      runtime: {
        sendMessage: jest.fn()
      }
    };
  });

  describe('showError()', () => {
    it('should relay error notification via chrome.runtime.sendMessage', () => {
      // Arrange
      const errorMessage = 'Something went wrong';

      // Act
      showError(errorMessage);

      // Assert
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'notify',
          kind: 'error',
          message: errorMessage,
          autoDismiss: false
        })
      );
    });

    it('should call sendMessage exactly once', () => {
      // Act
      showError('Test error');

      // Assert
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('should set autoDismiss to false for errors', () => {
      // Act
      showError('Test error');

      // Assert
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ autoDismiss: false })
      );
    });

    it('should handle missing chrome.runtime.sendMessage gracefully', () => {
      // Arrange: Remove chrome entirely
      const originalChrome = global.chrome;
      global.chrome = undefined;

      // Act & Assert: Should not throw, should fall back to console.warn
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      expect(() => showError('Test error')).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        'Stremio PiP: cannot relay notification:',
        'Test error'
      );
      warnSpy.mockRestore();

      // Restore
      global.chrome = originalChrome;
    });
  });

  describe('showSuccess()', () => {
    it('should relay success notification via chrome.runtime.sendMessage', () => {
      // Arrange
      const successMessage = 'Operation completed successfully';

      // Act
      showSuccess(successMessage);

      // Assert
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'notify',
          kind: 'success',
          message: successMessage,
          autoDismiss: true
        })
      );
    });

    it('should set autoDismiss to true for success notifications', () => {
      // Act
      showSuccess('Test success');

      // Assert
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ autoDismiss: true })
      );
    });
  });

  describe('notifyApiNotSupported()', () => {
    it('should send specific "API not supported" error via sendMessage', () => {
      // Act
      notifyApiNotSupported();

      // Assert
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'notify',
          kind: 'error',
          message: expect.stringContaining('not supported'),
          autoDismiss: false
        })
      );
    });

    it('should mention Chrome 116+ requirement', () => {
      // Act
      notifyApiNotSupported();

      // Assert
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Chrome 116')
        })
      );
    });

    it('should suggest user action (update browser)', () => {
      // Act
      notifyApiNotSupported();

      // Assert
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/update|upgrade|browser/i)
        })
      );
    });
  });

  describe('notifyContainerNotFound()', () => {
    it('should send specific "container not found" error via sendMessage', () => {
      // Act
      notifyContainerNotFound();

      // Assert
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'notify',
          kind: 'error',
          message: expect.stringContaining('container'),
          autoDismiss: false
        })
      );
    });

    it('should mention Stremio Web requirement', () => {
      // Act
      notifyContainerNotFound();

      // Assert
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Stremio')
        })
      );
    });

    it('should suggest user action (open video first)', () => {
      // Act
      notifyContainerNotFound();

      // Assert
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/video|open|first|start/i)
        })
      );
    });
  });
});
