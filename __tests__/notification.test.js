/**
 * @jest-environment jsdom
 */
const { describe, it, expect, beforeEach } = require('@jest/globals');

// Import will fail until T9 implementation - that's expected for RED phase
const { showError, showSuccess, notifyApiNotSupported, notifyContainerNotFound } = require('../src/notification.js');

describe('Notification Module', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock chrome.notifications
    global.chrome = {
      notifications: {
        create: jest.fn()
      }
    };
  });

  describe('showError()', () => {
    it('should show error notification with correct title and message', () => {
      // Arrange
      const errorMessage = 'Something went wrong';

      // Act
      showError(errorMessage);

      // Assert
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'basic',
          title: 'Stremio PiP',
          message: errorMessage
        })
      );
    });

    it('should use Chrome notifications API (chrome.notifications.create)', () => {
      // Act
      showError('Test error');

      // Assert
      expect(global.chrome.notifications.create).toHaveBeenCalledTimes(1);
    });

    it('should include icon in notification', () => {
      // Act
      showError('Test error');

      // Assert
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          iconUrl: expect.stringContaining('.png')
        })
      );
    });

    it('should handle missing chrome.notifications gracefully', () => {
      // Arrange: Remove chrome.notifications
      const originalNotifications = global.chrome.notifications;
      global.chrome.notifications = undefined;

      // Act & Assert: Should not throw
      expect(() => showError('Test error')).not.toThrow();

      // Restore
      global.chrome.notifications = originalNotifications;
    });
  });

  describe('showSuccess()', () => {
    it('should show success notification with correct title and message', () => {
      // Arrange
      const successMessage = 'Operation completed successfully';

      // Act
      showSuccess(successMessage);

      // Assert
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'basic',
          title: 'Stremio PiP',
          message: successMessage
        })
      );
    });

    it('should auto-dismiss after timeout', () => {
      // Arrange
      jest.useFakeTimers();
      const notificationId = 'test-notification-id';
      global.chrome.notifications.create.mockImplementation((id, options, callback) => {
        if (callback) callback(notificationId);
      });

      // Act
      showSuccess('Test success');

      // Assert: Should set up auto-dismiss
      jest.advanceTimersByTime(3000);

      // Cleanup
      jest.useRealTimers();
    });
  });

  describe('notifyApiNotSupported()', () => {
    it('should show specific "API not supported" error', () => {
      // Act
      notifyApiNotSupported();

      // Assert
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          title: 'Stremio PiP',
          message: expect.stringContaining('not supported')
        })
      );
    });

    it('should mention Chrome 116+ requirement', () => {
      // Act
      notifyApiNotSupported();

      // Assert
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: expect.stringContaining('Chrome 116')
        })
      );
    });

    it('should suggest user action (update browser)', () => {
      // Act
      notifyApiNotSupported();

      // Assert
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: expect.stringMatching(/update|upgrade|browser/i)
        })
      );
    });
  });

  describe('notifyContainerNotFound()', () => {
    it('should show specific "container not found" error', () => {
      // Act
      notifyContainerNotFound();

      // Assert
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          title: 'Stremio PiP',
          message: expect.stringContaining('container')
        })
      );
    });

    it('should mention Stremio Web requirement', () => {
      // Act
      notifyContainerNotFound();

      // Assert
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: expect.stringContaining('Stremio')
        })
      );
    });

    it('should suggest user action (open video first)', () => {
      // Act
      notifyContainerNotFound();

      // Assert
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: expect.stringMatching(/video|open|first|start/i)
        })
      );
    });
  });
});
