/**
 * @jest-environment jsdom
 */
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// Will be available after pip-controls.js is created
const { hideNativeControls, injectPipControls } = require('../src/pip-controls.js');

describe('PiP Controls', () => {
  let mockPipWindow;
  let mockVideo;
  let mockContainer;
  let mockPipDoc;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Create a mock video element
    mockVideo = document.createElement('video');
    Object.defineProperty(mockVideo, 'videoWidth', { value: 1920, writable: true });
    Object.defineProperty(mockVideo, 'videoHeight', { value: 1080, writable: true });
    Object.defineProperty(mockVideo, 'duration', { value: 3600, writable: true });
    Object.defineProperty(mockVideo, 'currentTime', { value: 120, writable: true, configurable: true });
    Object.defineProperty(mockVideo, 'volume', { value: 1, writable: true, configurable: true });
    Object.defineProperty(mockVideo, 'muted', { value: false, writable: true, configurable: true });
    Object.defineProperty(mockVideo, 'paused', { value: true, writable: true, configurable: true });
    mockVideo.play = jest.fn().mockResolvedValue(undefined);
    mockVideo.pause = jest.fn();

    // Create mock container with video inside
    mockContainer = document.createElement('div');
    mockContainer.appendChild(mockVideo);

    // Create mock PiP document
    mockPipDoc = document.implementation.createHTMLDocument('PiP');

    // Create mock PiP window
    mockPipWindow = {
      document: mockPipDoc,
      innerWidth: 800,
      innerHeight: 600,
      outerWidth: 816,
      outerHeight: 638,
      resizeTo: jest.fn(),
      addEventListener: jest.fn()
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('hideNativeControls()', () => {
    it('should inject a style element into target document head', () => {
      hideNativeControls(mockPipDoc);

      const styles = mockPipDoc.querySelectorAll('style');
      expect(styles.length).toBeGreaterThanOrEqual(1);
    });

    it('should hide control-bar-layer', () => {
      hideNativeControls(mockPipDoc);

      const styleEl = mockPipDoc.querySelector('style');
      expect(styleEl.textContent).toContain('control-bar-layer');
      expect(styleEl.textContent).toContain('display: none');
    });

    it('should hide control-bar-container', () => {
      hideNativeControls(mockPipDoc);

      const styleEl = mockPipDoc.querySelector('style');
      expect(styleEl.textContent).toContain('control-bar-container');
    });

    it('should hide nav-bar-layer', () => {
      hideNativeControls(mockPipDoc);

      const styleEl = mockPipDoc.querySelector('style');
      expect(styleEl.textContent).toContain('nav-bar-layer');
    });

    it('should hide menu-layer', () => {
      hideNativeControls(mockPipDoc);

      const styleEl = mockPipDoc.querySelector('style');
      expect(styleEl.textContent).toContain('menu-layer');
    });

    it('should set body margin/padding to 0 and background to black', () => {
      hideNativeControls(mockPipDoc);

      const styleEl = mockPipDoc.querySelector('style');
      expect(styleEl.textContent).toContain('margin: 0');
      expect(styleEl.textContent).toContain('padding: 0');
      expect(styleEl.textContent).toContain('background: #000');
    });

    it('should set video to fill container', () => {
      hideNativeControls(mockPipDoc);

      const styleEl = mockPipDoc.querySelector('style');
      expect(styleEl.textContent).toContain('object-fit: contain');
    });
  });

  describe('injectPipControls()', () => {
    it('should create controls overlay in PiP document body', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const controls = mockPipDoc.querySelector('[data-pip-controls]');
      expect(controls).not.toBeNull();
    });

    it('should contain a play/pause button', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const playBtn = mockPipDoc.querySelector('[data-pip-play]');
      expect(playBtn).not.toBeNull();
    });

    it('should contain skip backward button (-15s)', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const skipBackBtn = mockPipDoc.querySelector('[data-pip-skip-back]');
      expect(skipBackBtn).not.toBeNull();
    });

    it('should contain skip forward button (+15s)', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const skipFwdBtn = mockPipDoc.querySelector('[data-pip-skip-forward]');
      expect(skipFwdBtn).not.toBeNull();
    });

    it('should contain a progress/seek bar', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const progressBar = mockPipDoc.querySelector('[data-pip-progress]');
      expect(progressBar).not.toBeNull();
    });

    it('should contain a timer display', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const timer = mockPipDoc.querySelector('[data-pip-timer]');
      expect(timer).not.toBeNull();
    });

    it('should contain a volume button', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const volBtn = mockPipDoc.querySelector('[data-pip-volume]');
      expect(volBtn).not.toBeNull();
    });

    it('should contain a volume slider', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const volSlider = mockPipDoc.querySelector('[data-pip-volume-slider]');
      expect(volSlider).not.toBeNull();
    });

    it('should contain a fit-ratio button', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const fitBtn = mockPipDoc.querySelector('[data-pip-fit-ratio]');
      expect(fitBtn).not.toBeNull();
    });

    it('should inject a style element for controls CSS', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const styles = mockPipDoc.querySelectorAll('style');
      expect(styles.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Play/Pause functionality', () => {
    it('should call video.play() when play button clicked and video is paused', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const playBtn = mockPipDoc.querySelector('[data-pip-play]');
      playBtn.click();

      expect(mockVideo.play).toHaveBeenCalled();
    });

    it('should call video.pause() when play button clicked and video is playing', () => {
      Object.defineProperty(mockVideo, 'paused', { value: false, writable: true });
      injectPipControls(mockPipWindow, mockContainer);

      const playBtn = mockPipDoc.querySelector('[data-pip-play]');
      playBtn.click();

      expect(mockVideo.pause).toHaveBeenCalled();
    });
  });

  describe('Skip functionality', () => {
    it('should skip backward 15 seconds', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const skipBackBtn = mockPipDoc.querySelector('[data-pip-skip-back]');
      skipBackBtn.click();

      expect(mockVideo.currentTime).toBe(105); // 120 - 15
    });

    it('should skip forward 15 seconds', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const skipFwdBtn = mockPipDoc.querySelector('[data-pip-skip-forward]');
      skipFwdBtn.click();

      expect(mockVideo.currentTime).toBe(135); // 120 + 15
    });

    it('should not skip below 0', () => {
      Object.defineProperty(mockVideo, 'currentTime', { value: 5, writable: true, configurable: true });
      injectPipControls(mockPipWindow, mockContainer);

      const skipBackBtn = mockPipDoc.querySelector('[data-pip-skip-back]');
      skipBackBtn.click();

      expect(mockVideo.currentTime).toBe(0);
    });
  });

  describe('Fit Ratio functionality', () => {
    it('should call resizeTo when fit-ratio button is clicked', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const fitBtn = mockPipDoc.querySelector('[data-pip-fit-ratio]');
      fitBtn.click();

      expect(mockPipWindow.resizeTo).toHaveBeenCalled();
    });

    it('should shrink width when window is too wide for video ratio', () => {
      // Video is 16:9 (1.777), window is 800x600 (1.333) — actually too tall
      // Make window too wide: 1200x600 = 2.0 ratio vs 1.777
      mockPipWindow.innerWidth = 1200;
      mockPipWindow.innerHeight = 600;
      mockPipWindow.outerWidth = 1216;
      mockPipWindow.outerHeight = 638;

      injectPipControls(mockPipWindow, mockContainer);

      const fitBtn = mockPipDoc.querySelector('[data-pip-fit-ratio]');
      fitBtn.click();

      // Should shrink width: 600 * (1920/1080) = 1067
      const call = mockPipWindow.resizeTo.mock.calls[0];
      // New width should be less than 1216
      expect(call[0]).toBeLessThan(1216);
      expect(call[1]).toBe(638); // height unchanged
    });

    it('should shrink height when window is too tall for video ratio', () => {
      // Video is 16:9 (1.777), window is 800x600 (1.333) — too tall
      mockPipWindow.innerWidth = 800;
      mockPipWindow.innerHeight = 600;
      mockPipWindow.outerWidth = 816;
      mockPipWindow.outerHeight = 638;

      injectPipControls(mockPipWindow, mockContainer);

      const fitBtn = mockPipDoc.querySelector('[data-pip-fit-ratio]');
      fitBtn.click();

      // Should shrink height: 800 / (1920/1080) = 450
      const call = mockPipWindow.resizeTo.mock.calls[0];
      expect(call[0]).toBe(816); // width unchanged
      expect(call[1]).toBeLessThan(638); // height shrunk
    });
  });

  describe('Timer formatting', () => {
    it('should display formatted time in timer element', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const timer = mockPipDoc.querySelector('[data-pip-timer]');
      // currentTime=120 (0:02:00), duration=3600 (1:00:00) — forceHours since duration >= 3600
      expect(timer.textContent).toContain('0:02:00');
      expect(timer.textContent).toContain('1:00:00');
    });
  });

  describe('Volume controls', () => {
    it('should toggle mute when volume button is clicked', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const volBtn = mockPipDoc.querySelector('[data-pip-volume]');
      volBtn.click();

      expect(mockVideo.muted).toBe(true);
    });
  });

  describe('Controls visibility', () => {
    it('should show controls initially via startHideTimer', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const controls = mockPipDoc.querySelector('[data-pip-controls]');
      expect(controls.classList.contains('visible')).toBe(true);
    });

    it('should hide controls after 3 seconds of inactivity', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const controls = mockPipDoc.querySelector('[data-pip-controls]');
      expect(controls.classList.contains('visible')).toBe(true);

      jest.advanceTimersByTime(3000);

      expect(controls.classList.contains('visible')).toBe(false);
    });

    it('should show controls on mousemove', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const controls = mockPipDoc.querySelector('[data-pip-controls]');
      jest.advanceTimersByTime(3000);
      expect(controls.classList.contains('visible')).toBe(false);

      mockPipDoc.dispatchEvent(new Event('mousemove'));
      expect(controls.classList.contains('visible')).toBe(true);
    });

    it('should hide controls on mouseleave', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const controls = mockPipDoc.querySelector('[data-pip-controls]');
      expect(controls.classList.contains('visible')).toBe(true);

      mockPipDoc.dispatchEvent(new Event('mouseleave'));
      expect(controls.classList.contains('visible')).toBe(false);
    });
  });

  describe('Progress bar seeking', () => {
    it('should seek video when progress bar is changed', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const progress = mockPipDoc.querySelector('[data-pip-progress]');
      progress.value = '50';
      progress.dispatchEvent(new Event('input'));

      // 50% of 3600 = 1800
      expect(mockVideo.currentTime).toBe(1800);
    });
  });

  describe('Volume slider', () => {
    it('should set volume when slider is changed', () => {
      injectPipControls(mockPipWindow, mockContainer);

      const volSlider = mockPipDoc.querySelector('[data-pip-volume-slider]');
      volSlider.value = '0.5';
      volSlider.dispatchEvent(new Event('input'));

      expect(mockVideo.volume).toBe(0.5);
      expect(mockVideo.muted).toBe(false);
    });
  });

  describe('Video event listeners', () => {
    it('should update progress and timer on timeupdate', () => {
      injectPipControls(mockPipWindow, mockContainer);

      Object.defineProperty(mockVideo, 'currentTime', { value: 1800, writable: true, configurable: true });
      mockVideo.dispatchEvent(new Event('timeupdate'));

      const timer = mockPipDoc.querySelector('[data-pip-timer]');
      expect(timer.textContent).toContain('30:00');

      const progress = mockPipDoc.querySelector('[data-pip-progress]');
      expect(parseFloat(progress.value)).toBeCloseTo(50, 0);
    });

    it('should update play button icon on play event', () => {
      injectPipControls(mockPipWindow, mockContainer);

      mockVideo.dispatchEvent(new Event('play'));
      const playBtn = mockPipDoc.querySelector('[data-pip-play]');
      expect(playBtn.textContent).toBe('\u23F8');
    });

    it('should update play button icon on pause event', () => {
      Object.defineProperty(mockVideo, 'paused', { value: false, writable: true });
      injectPipControls(mockPipWindow, mockContainer);

      mockVideo.dispatchEvent(new Event('pause'));
      const playBtn = mockPipDoc.querySelector('[data-pip-play]');
      expect(playBtn.textContent).toBe('\u25B6');
    });

    it('should update volume icon on volumechange when muted', () => {
      injectPipControls(mockPipWindow, mockContainer);

      Object.defineProperty(mockVideo, 'muted', { value: true, writable: true, configurable: true });
      mockVideo.dispatchEvent(new Event('volumechange'));

      const volBtn = mockPipDoc.querySelector('[data-pip-volume]');
      expect(volBtn.textContent).toBe('\u{1F507}');
    });

    it('should update volume icon on volumechange when unmuted', () => {
      Object.defineProperty(mockVideo, 'muted', { value: true, writable: true, configurable: true });
      injectPipControls(mockPipWindow, mockContainer);

      Object.defineProperty(mockVideo, 'muted', { value: false, writable: true, configurable: true });
      Object.defineProperty(mockVideo, 'volume', { value: 0.8, writable: true, configurable: true });
      mockVideo.dispatchEvent(new Event('volumechange'));

      const volBtn = mockPipDoc.querySelector('[data-pip-volume]');
      expect(volBtn.textContent).toBe('\u{1F50A}');
    });
  });

  describe('Edge cases', () => {
    it('should return early if no video element in container', () => {
      const emptyContainer = document.createElement('div');
      injectPipControls(mockPipWindow, emptyContainer);

      const controls = mockPipDoc.querySelector('[data-pip-controls]');
      expect(controls).toBeNull();
    });

    it('should not resize if video dimensions are 0', () => {
      Object.defineProperty(mockVideo, 'videoWidth', { value: 0, writable: true });
      Object.defineProperty(mockVideo, 'videoHeight', { value: 0, writable: true });
      injectPipControls(mockPipWindow, mockContainer);

      const fitBtn = mockPipDoc.querySelector('[data-pip-fit-ratio]');
      fitBtn.click();

      expect(mockPipWindow.resizeTo).not.toHaveBeenCalled();
    });

    it('should handle loadedmetadata event', () => {
      injectPipControls(mockPipWindow, mockContainer);

      mockVideo.dispatchEvent(new Event('loadedmetadata'));

      const progress = mockPipDoc.querySelector('[data-pip-progress]');
      expect(progress.max).toBe('100');
    });

    it('should not skip forward past duration', () => {
      Object.defineProperty(mockVideo, 'currentTime', { value: 3595, writable: true, configurable: true });
      Object.defineProperty(mockVideo, 'duration', { value: 3600, writable: true });
      injectPipControls(mockPipWindow, mockContainer);

      const skipFwdBtn = mockPipDoc.querySelector('[data-pip-skip-forward]');
      skipFwdBtn.click();

      expect(mockVideo.currentTime).toBe(3600);
    });

    it('should not resize when ratio already matches', () => {
      // 16:9 video, window is exactly 16:9
      mockPipWindow.innerWidth = 1600;
      mockPipWindow.innerHeight = 900;
      injectPipControls(mockPipWindow, mockContainer);

      const fitBtn = mockPipDoc.querySelector('[data-pip-fit-ratio]');
      fitBtn.click();

      // Should not resize since ratio matches
      expect(mockPipWindow.resizeTo).not.toHaveBeenCalled();
    });
  });
});
