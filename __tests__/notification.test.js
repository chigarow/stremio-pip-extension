/**
 * @jest-environment jsdom
 */
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

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
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should relay success notification via chrome.runtime.sendMessage with a callback', () => {
      // Arrange: mock sendMessage to immediately invoke its callback with a success response
      const successMessage = 'Operation completed successfully';
      global.chrome.runtime.sendMessage.mockImplementation(function(message, callback) {
        if (typeof callback === 'function') {
          callback({ success: true, notificationId: 'test-id' });
        }
      });

      // Act
      showSuccess(successMessage);

      // Assert: first sendMessage has correct payload, no autoDismiss field (implicit in showSuccess)
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        {
          action: 'notify',
          kind: 'success',
          message: successMessage
        },
        expect.any(Function)
      );
    });

    it('should NOT include autoDismiss in the success payload (autoDismiss is now implicit in showSuccess)', () => {
      // Arrange
      global.chrome.runtime.sendMessage.mockImplementation(function(message, callback) {
        if (typeof callback === 'function') {
          callback({ success: true, notificationId: 'test-id' });
        }
      });

      // Act
      showSuccess('Test success');

      // Assert: first sendMessage payload does NOT have autoDismiss field
      const firstCall = global.chrome.runtime.sendMessage.mock.calls[0][0];
      expect(firstCall).not.toHaveProperty('autoDismiss');
    });

    it('should send clearNotification via a second sendMessage call after 3000ms', () => {
      // Arrange: mock sendMessage to invoke callback with a success response
      global.chrome.runtime.sendMessage.mockImplementation(function(message, callback) {
        if (typeof callback === 'function') {
          callback({ success: true, notificationId: 'test-id' });
        }
      });

      // Act
      showSuccess('PiP mode activated');

      // Assert: only one sendMessage call so far (the initial notify)
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);

      // Act: advance fake timers by 3000ms
      jest.advanceTimersByTime(3000);

      // Assert: second sendMessage call has clearNotification payload with correct id
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
      expect(global.chrome.runtime.sendMessage).toHaveBeenNthCalledWith(2, {
        action: 'clearNotification',
        notificationId: 'test-id'
      });
    });

    it('should NOT schedule a clearNotification if the notify response is missing a notificationId', () => {
      // Arrange: notify response without a notificationId (failure path)
      global.chrome.runtime.sendMessage.mockImplementation(function(message, callback) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'API not available' });
        }
      });

      // Act
      showSuccess('Should not auto-dismiss');

      // Act: advance fake timers past the auto-dismiss window
      jest.advanceTimersByTime(5000);

      // Assert: only the initial notify call, no clearNotification
      expect(global.chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
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
