/**
 * @jest-environment jsdom
 */
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const path = require('path');
const fs = require('fs');

describe('Background service worker', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('CONTENT_SCRIPTS fallback list', () => {
    it('should match manifest.json content_scripts.js exactly (no drift)', () => {
      const manifestPath = path.resolve(__dirname, '..', 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const manifestScripts = manifest.content_scripts[0].js;

      // Reload background.js after mock setup so addListener doesn't throw
      const { CONTENT_SCRIPTS } = require('../background.js');

      expect(CONTENT_SCRIPTS).toEqual(manifestScripts);
    });

    it('should include src/pip-controls.js (regression guard)', () => {
      const { CONTENT_SCRIPTS } = require('../background.js');
      expect(CONTENT_SCRIPTS).toContain('src/pip-controls.js');
    });

    it('should preserve manifest load order (dom-detector first, content last)', () => {
      const { CONTENT_SCRIPTS } = require('../background.js');
      expect(CONTENT_SCRIPTS[0]).toBe('src/dom-detector.js');
      expect(CONTENT_SCRIPTS[CONTENT_SCRIPTS.length - 1]).toBe('src/content.js');
    });
  });

  describe('handleNotificationRequest()', () => {
    let handleNotificationRequest;

    beforeEach(() => {
      jest.useFakeTimers();

      // Set up chrome.notifications mock
      global.chrome = {
        ...global.chrome,
        notifications: {
          create: jest.fn((id, options, callback) => {
            if (callback) callback(id);
          }),
          clear: jest.fn()
        },
        action: {
          onClicked: { addListener: jest.fn() }
        },
        tabs: { sendMessage: jest.fn() },
        scripting: { executeScript: jest.fn() }
      };

      // Import handleNotificationRequest
      const bg = require('../background.js');
      handleNotificationRequest = bg.handleNotificationRequest;
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create a basic notification with correct title and message for error kind', () => {
      // Act
      const result = handleNotificationRequest({
        kind: 'error',
        message: 'Something went wrong',
        autoDismiss: false
      });

      // Assert
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringMatching(/^error-/),
        expect.objectContaining({
          type: 'basic',
          iconUrl: expect.stringContaining('.png'),
          title: 'Stremio PiP',
          message: 'Something went wrong'
        })
      );
    });

    it('should create a basic notification with correct title and message for success kind', () => {
      // Act
      const result = handleNotificationRequest({
        kind: 'success',
        message: 'PiP mode activated',
        autoDismiss: true
      });

      // Assert
      expect(global.chrome.notifications.create).toHaveBeenCalledWith(
        expect.stringMatching(/^success-/),
        expect.objectContaining({
          type: 'basic',
          iconUrl: expect.stringContaining('.png'),
          title: 'Stremio PiP',
          message: 'PiP mode activated'
        })
      );
    });

    it('should return {success:true, notificationId} on success', () => {
      // Act
      const result = handleNotificationRequest({
        kind: 'error',
        message: 'Test error',
        autoDismiss: false
      });

      // Assert
      expect(result).toEqual({
        success: true,
        notificationId: expect.stringMatching(/^error-/)
      });
    });
    it('should NOT schedule chrome.notifications.clear (autoDismiss is now handled by content script, not the worker)', () => {
      // The MV3 service worker may be terminated after sendResponse returns, so any
      // setTimeout scheduled here is unreliable. The content script owns the
      // 3s timer now and sends a separate 'clearNotification' message when ready.
      handleNotificationRequest({
        kind: 'success',
        message: 'Auto dismiss test',
        autoDismiss: true
      });

      // Act: Advance timers past the auto-dismiss window
      jest.advanceTimersByTime(5000);

      // Assert: clear was never called from the worker
      expect(global.chrome.notifications.clear).not.toHaveBeenCalled();
    });

    it('should still NOT call chrome.notifications.clear for error notifications', () => {
      handleNotificationRequest({
        kind: 'error',
        message: 'Persistent error',
        autoDismiss: false
      });

      // Act: Advance timers past the auto-dismiss window
      jest.advanceTimersByTime(5000);

      // Assert: clear was never called
      expect(global.chrome.notifications.clear).not.toHaveBeenCalled();
    });

    it('should return {success:false, error} when chrome.notifications is missing', () => {
      // Arrange: Remove chrome.notifications
      global.chrome.notifications = undefined;

      // Act
      const result = handleNotificationRequest({
        kind: 'error',
        message: 'Test error',
        autoDismiss: false
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('notifications')
      });
    });

    it('should use notificationId format <kind>-<timestamp>', () => {
      // Act
      const result = handleNotificationRequest({
        kind: 'error',
        message: 'Test',
        autoDismiss: false
      });

      // Assert
      expect(result.notificationId).toMatch(/^error-\d+$/);
    });
  });

  describe('clearNotification action via message listener', () => {
    // Capture the listener registered by background.js so we can invoke it directly.
    let registeredListener;

    function captureListenerAndRequireBackground() {
      const addListenerMock = jest.fn((fn) => { registeredListener = fn; });
      global.chrome = {
        ...global.chrome,
        runtime: { onMessage: { addListener: addListenerMock } }
      };
      // Fresh require after resetting modules so the listener is registered against
      // the captured addListener mock.
      jest.resetModules();
      require('../background.js');
      return addListenerMock;
    }

    it('should call chrome.notifications.clear with the notificationId and return {success:true}', () => {
      // Arrange
      const addListenerMock = captureListenerAndRequireBackground();
      expect(addListenerMock).toHaveBeenCalledTimes(1);
      expect(typeof registeredListener).toBe('function');

      const sendResponse = jest.fn();
      const result = registeredListener(
        { action: 'clearNotification', notificationId: 'test-id' },
        {},
        sendResponse
      );

      // Assert
      expect(global.chrome.notifications.clear).toHaveBeenCalledWith('test-id');
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
      // Synchronous response: listener returns false (channel does not need to stay open).
      expect(result).toBe(false);
    });

    it('should still respond with {success:true} even if the notificationId has already expired', () => {
      // Arrange
      captureListenerAndRequireBackground();
      const sendResponse = jest.fn();

      // Act
      registeredListener(
        { action: 'clearNotification', notificationId: 'expired-id' },
        {},
        sendResponse
      );

      // Assert: clear is still called (chrome.notifications.clear is a no-op for unknown ids),
      // and the response is success so the content script does not retry.
      expect(global.chrome.notifications.clear).toHaveBeenCalledWith('expired-id');
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });
});
