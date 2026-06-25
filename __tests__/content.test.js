/**
 * @jest-environment jsdom
 *
 * Unit tests for src/content.js orchestrator.
 * Covers all branches of handleTogglePiP() and the chrome.runtime.onMessage
 * listener registration guard.
 *
 * Review Work Final Report, Issue 5: re-include content.js in coverage with
 * dedicated unit tests of the orchestrator's branching logic.
 */

/**
 * Install jest.fn() mocks for every module-global that content.js depends
 * on. Mirrors the manifest-ordered content-script injection pattern: in
 * production, dom-detector / css-sync / pip-manager / pip-controls /
 * notification each expose their functions as script-level globals. Here
 * we replace each with a controllable mock before requiring content.js.
 */
function installDependencyMocks() {
  const mocks = {
    findVideoContainer: jest.fn(),
    copyStylesheets: jest.fn(),
    openPiP: jest.fn(),
    closePiP: jest.fn(),
    hideNativeControls: jest.fn(),
    injectPipControls: jest.fn().mockReturnValue(true),
    showError: jest.fn(),
    showSuccess: jest.fn(),
    notifyApiNotSupported: jest.fn(),
    notifyContainerNotFound: jest.fn()
  };
  Object.assign(global, mocks);
  return mocks;
}

/**
 * Build a fake PiP window that satisfies the orchestrator's expectations:
 * a document, an addEventListener surface, a close() method, dimensions,
 * and an optional _pipControlsCleanup property.
 */
function createFakePipWindow() {
  return {
    document: {
      body: document.createElement('body'),
      head: document.createElement('head'),
      createElement: (tag) => document.createElement(tag),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    },
    addEventListener: jest.fn(),
    close: jest.fn(),
    innerWidth: 800,
    innerHeight: 600,
    outerWidth: 816,
    outerHeight: 638,
    resizeTo: jest.fn()
  };
}

function teardownGlobals() {
  delete global.documentPictureInPicture;
  delete global.findVideoContainer;
  delete global.copyStylesheets;
  delete global.openPiP;
  delete global.closePiP;
  delete global.hideNativeControls;
  delete global.injectPipControls;
  delete global.showError;
  delete global.showSuccess;
  delete global.notifyApiNotSupported;
  delete global.notifyContainerNotFound;
  delete global.chrome;
}

describe('content.js orchestrator — handleTogglePiP branches', () => {
  let mocks;
  let handleTogglePiP;
  let fakePipWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    fakePipWindow = createFakePipWindow();
    mocks = installDependencyMocks();

    // Default: PiP API present, no PiP window open.
    global.documentPictureInPicture = {
      requestWindow: jest.fn().mockResolvedValue(fakePipWindow),
      window: null
    };

    // Chrome API is present in jsdom by default after jest-webextension-mock,
    // but we install a fresh jest.fn for addListener so we can assert calls.
    global.chrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn()
        }
      }
    };

    handleTogglePiP = require('../src/content.js').handleTogglePiP;
  });

  afterEach(() => {
    teardownGlobals();
  });

  describe('container not found', () => {
    it('returns early, calls notifyContainerNotFound, and does not open PiP', async () => {
      mocks.findVideoContainer.mockReturnValue(null);

      await handleTogglePiP();

      expect(mocks.notifyContainerNotFound).toHaveBeenCalledTimes(1);
      expect(mocks.openPiP).not.toHaveBeenCalled();
      expect(mocks.showSuccess).not.toHaveBeenCalled();
      expect(mocks.showError).not.toHaveBeenCalled();
      expect(mocks.notifyApiNotSupported).not.toHaveBeenCalled();
    });
  });

  describe('API not supported', () => {
    it('calls notifyApiNotSupported when documentPictureInPicture is undefined', async () => {
      const fakeContainer = document.createElement('div');
      mocks.findVideoContainer.mockReturnValue(fakeContainer);
      global.documentPictureInPicture = undefined;

      await handleTogglePiP();

      expect(mocks.notifyApiNotSupported).toHaveBeenCalledTimes(1);
      expect(mocks.openPiP).not.toHaveBeenCalled();
      expect(mocks.showSuccess).not.toHaveBeenCalled();
      expect(mocks.showError).not.toHaveBeenCalled();
      expect(mocks.notifyContainerNotFound).not.toHaveBeenCalled();
    });
  });

  describe('close path', () => {
    it('invokes _pipControlsCleanup, calls closePiP, and shows "PiP mode deactivated" when cleanup is present', async () => {
      const fakeContainer = document.createElement('div');
      const cleanup = jest.fn();
      fakePipWindow._pipControlsCleanup = cleanup;
      global.documentPictureInPicture.window = fakePipWindow;
      mocks.findVideoContainer.mockReturnValue(fakeContainer);

      await handleTogglePiP();

      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(mocks.closePiP).toHaveBeenCalledTimes(1);
      expect(mocks.showSuccess).toHaveBeenCalledWith('PiP mode deactivated');
      expect(mocks.showError).not.toHaveBeenCalled();
      expect(mocks.notifyContainerNotFound).not.toHaveBeenCalled();
      expect(mocks.notifyApiNotSupported).not.toHaveBeenCalled();
    });

    it('skips cleanup but still closes and shows "PiP mode deactivated" when window has no _pipControlsCleanup', async () => {
      const fakeContainer = document.createElement('div');
      // fakePipWindow._pipControlsCleanup is intentionally undefined here.
      global.documentPictureInPicture.window = fakePipWindow;
      mocks.findVideoContainer.mockReturnValue(fakeContainer);

      await handleTogglePiP();

      expect(mocks.closePiP).toHaveBeenCalledTimes(1);
      expect(mocks.showSuccess).toHaveBeenCalledWith('PiP mode deactivated');
      expect(mocks.showError).not.toHaveBeenCalled();
      expect(mocks.notifyApiNotSupported).not.toHaveBeenCalled();
    });
  });

  describe('happy open path', () => {
    it('opens PiP, syncs CSS, hides native controls, injects controls, and shows "PiP mode activated"', async () => {
      const fakeContainer = document.createElement('div');
      mocks.findVideoContainer.mockReturnValue(fakeContainer);
      mocks.openPiP.mockResolvedValue(fakePipWindow);
      mocks.injectPipControls.mockReturnValue(true);

      await handleTogglePiP();

      expect(mocks.openPiP).toHaveBeenCalledWith(fakeContainer);
      expect(mocks.copyStylesheets).toHaveBeenCalledWith(fakePipWindow.document);
      expect(mocks.hideNativeControls).toHaveBeenCalledWith(fakePipWindow.document);
      expect(mocks.injectPipControls).toHaveBeenCalledWith(fakePipWindow, fakeContainer);
      expect(mocks.showSuccess).toHaveBeenCalledWith('PiP mode activated');
      expect(mocks.showError).not.toHaveBeenCalled();
      expect(mocks.notifyApiNotSupported).not.toHaveBeenCalled();
      expect(mocks.notifyContainerNotFound).not.toHaveBeenCalled();
    });
  });

  describe('injectPipControls failure', () => {
    it('shows error, closes PiP, and does NOT show success when controls fail to inject', async () => {
      const fakeContainer = document.createElement('div');
      mocks.findVideoContainer.mockReturnValue(fakeContainer);
      mocks.openPiP.mockResolvedValue(fakePipWindow);
      mocks.injectPipControls.mockReturnValue(false);

      await handleTogglePiP();

      expect(mocks.injectPipControls).toHaveBeenCalledWith(fakePipWindow, fakeContainer);
      expect(mocks.showError).toHaveBeenCalledWith('Could not find video element in PiP window');
      expect(mocks.closePiP).toHaveBeenCalledTimes(1);
      expect(mocks.showSuccess).not.toHaveBeenCalled();
      expect(mocks.notifyApiNotSupported).not.toHaveBeenCalled();
      expect(mocks.notifyContainerNotFound).not.toHaveBeenCalled();
    });
  });
  describe('openPiP rejection', () => {
    it('shows error with the original message when openPiP throws', async () => {
      const fakeContainer = document.createElement('div');
      mocks.findVideoContainer.mockReturnValue(fakeContainer);
      mocks.openPiP.mockRejectedValue(new Error('user denied'));

      await handleTogglePiP();

      expect(mocks.showError).toHaveBeenCalledWith('Failed to open PiP: user denied');
      expect(mocks.copyStylesheets).not.toHaveBeenCalled();
      expect(mocks.hideNativeControls).not.toHaveBeenCalled();
      expect(mocks.injectPipControls).not.toHaveBeenCalled();
      expect(mocks.showSuccess).not.toHaveBeenCalled();
      expect(mocks.notifyApiNotSupported).not.toHaveBeenCalled();
      expect(mocks.notifyContainerNotFound).not.toHaveBeenCalled();
    });
  });

  describe('benign race-guard rejections', () => {
    // When the user rapid-double-clicks the toolbar icon, pip-manager.js throws
    // 'PiP open already in progress' from its in-flight guard. That's user
    // impatience, not a real failure — it must NOT surface as an error notification.
    it('silently swallows "PiP open already in progress" without calling showError', async () => {
      const fakeContainer = document.createElement('div');
      mocks.findVideoContainer.mockReturnValue(fakeContainer);
      mocks.openPiP.mockRejectedValue(new Error('PiP open already in progress'));

      // The promise must resolve (not reject) so the listener's .then() branch
      // fires and sendResponse({success:true}) reaches background.js.
      await expect(handleTogglePiP()).resolves.toBeUndefined();

      expect(mocks.showError).not.toHaveBeenCalled();
      // The normal success path was never reached either, so showSuccess stays quiet.
      expect(mocks.showSuccess).not.toHaveBeenCalled();
      expect(mocks.copyStylesheets).not.toHaveBeenCalled();
      expect(mocks.hideNativeControls).not.toHaveBeenCalled();
      expect(mocks.injectPipControls).not.toHaveBeenCalled();
    });

    it('also swallows "PiP close already in progress" (defensive: same guard pattern as open)', async () => {
      const fakeContainer = document.createElement('div');
      mocks.findVideoContainer.mockReturnValue(fakeContainer);
      mocks.openPiP.mockRejectedValue(new Error('PiP close already in progress'));

      await expect(handleTogglePiP()).resolves.toBeUndefined();

      expect(mocks.showError).not.toHaveBeenCalled();
      expect(mocks.showSuccess).not.toHaveBeenCalled();
    });

    it('forwards "PiP open already in progress" to the listener as sendResponse({success:true})', async () => {
      // Set up a fresh addListener mock for this test only. jest.resetModules()
      // ensures the next require re-runs content.js's top-level listener registration.
      jest.resetModules();
      const addListenerMock = jest.fn();
      global.chrome = { runtime: { onMessage: { addListener: addListenerMock } } };
      require('../src/content.js');
      const listener = addListenerMock.mock.calls[0][0];

      const fakeContainer = document.createElement('div');
      mocks.findVideoContainer.mockReturnValue(fakeContainer);
      mocks.openPiP.mockRejectedValue(new Error('PiP open already in progress'));

      const sendResponse = jest.fn();
      const result = listener({ action: 'togglePiP' }, {}, sendResponse);
      expect(result).toBe(true); // keep channel open for async response

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Because handleTogglePiP resolved (not rejected), the listener calls
      // sendResponse({success:true}) — the orchestrator stays confident the
      // PiP toggle is in progress and the user sees no error notification.
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
      expect(mocks.showError).not.toHaveBeenCalled();
    });
  });
});

describe('content.js orchestrator — chrome.runtime.onMessage listener guard', () => {
  let mocks;
  let fakePipWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    fakePipWindow = createFakePipWindow();
    mocks = installDependencyMocks();
    global.documentPictureInPicture = {
      requestWindow: jest.fn().mockResolvedValue(fakePipWindow),
      window: null
    };
  });

  afterEach(() => {
    teardownGlobals();
  });

  it('registers the message listener when chrome.runtime.onMessage is available', () => {
    const addListenerMock = jest.fn();
    global.chrome = { runtime: { onMessage: { addListener: addListenerMock } } };

    require('../src/content.js');

    expect(addListenerMock).toHaveBeenCalledTimes(1);
    expect(typeof addListenerMock.mock.calls[0][0]).toBe('function');
  });

  it('does not throw and skips registration when chrome is undefined', () => {
    delete global.chrome;

    expect(() => require('../src/content.js')).not.toThrow();
  });

  it('does not throw and skips registration when chrome.runtime is undefined', () => {
    global.chrome = {};

    expect(() => require('../src/content.js')).not.toThrow();
  });

  it('does not throw and skips registration when chrome.runtime.onMessage is undefined', () => {
    global.chrome = { runtime: {} };

    expect(() => require('../src/content.js')).not.toThrow();
  });

  it('forwards listener dispatch errors to sendResponse when handleTogglePiP rejects', async () => {
    // Set up chrome.runtime.onMessage so the listener gets registered.
    const addListenerMock = jest.fn();
    global.chrome = { runtime: { onMessage: { addListener: addListenerMock } } };
    require('../src/content.js');
    const listener = addListenerMock.mock.calls[0][0];

    // findVideoContainer runs outside the try/catch in handleTogglePiP, so a
    // synchronous throw escapes the async function and the listener's
    // .catch() is what surfaces the failure to background.js.
    const crash = new Error('container detection crashed');
    mocks.findVideoContainer.mockImplementation(() => { throw crash; });

    const sendResponse = jest.fn();
    const result = listener({ action: 'togglePiP' }, {}, sendResponse);

    expect(result).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: 'container detection crashed'
    });
  });
});
