/**
 * PiP Controls - Custom controls for Document Picture-in-Picture window
 *
 * Provides YouTube-like controls overlay:
 * 1. Hide Stremio's native controls
 * 2. Inject custom controls (play/pause, skip, seek, volume, fit ratio)
 * 3. Auto-hide on inactivity, show on mouse movement
 */

/**
 * Format seconds to MM:SS string
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
  if (isNaN(seconds) || !isFinite(seconds)) {
    return '0:00';
  }
  var hrs = Math.floor(seconds / 3600);
  var mins = Math.floor((seconds % 3600) / 60);
  var secs = Math.floor(seconds % 60);
  var secStr = (secs < 10 ? '0' : '') + secs;
  if (hrs > 0) {
    return hrs + ':' + (mins < 10 ? '0' : '') + mins + ':' + secStr;
  }
  return mins + ':' + secStr;
}

/**
 * Hide Stremio's native controls in the PiP window
 * @param {Document} targetDoc - The PiP window's document
 */
function hideNativeControls(targetDoc) {
  var style = targetDoc.createElement('style');
  style.id = 'pip-hide-native-controls';
  
  var css = '[class*="control-bar-layer"] { display: none !important; }' +
    '[class*="control-bar-container"] { display: none !important; }' +
    '[class*="nav-bar-layer"] { display: none !important; }' +
    '[class*="menu-layer"] { display: none !important; }' +
    'body { margin: 0; padding: 0; overflow: hidden; background: #000; }' +
    'video { width: 100%; height: 100%; object-fit: contain; }';
  
  style.textContent = css;
  targetDoc.head.appendChild(style);
}

/**
 * Inject custom PiP controls into the PiP window
 * @param {Window} pipWindow - The PiP window object
 * @param {HTMLElement} container - The video container element
 */
function injectPipControls(pipWindow, container) {
  var pipDoc = pipWindow.document;
  var video = container.querySelector('video');
  
  if (!video) {
    return;
  }
  
  // Inject controls styles
  var controlsStyle = pipDoc.createElement('style');
  controlsStyle.id = 'pip-controls-styles';
  
  var controlsCss = '.pip-controls {' +
    'position: fixed;' +
    'bottom: 0;' +
    'left: 0;' +
    'right: 0;' +
    'background: linear-gradient(transparent, rgba(0,0,0,0.85));' +
    'padding: 8px 12px;' +
    'z-index: 9999;' +
    'transition: opacity 0.3s;' +
    'display: flex;' +
    'align-items: center;' +
    'gap: 8px;' +
    'opacity: 0;' +
    '}' +
    '.pip-controls.visible { opacity: 1; }' +
    '.pip-btn {' +
    'background: none;' +
    'border: none;' +
    'color: white;' +
    'cursor: pointer;' +
    'font-size: 18px;' +
    'padding: 4px 8px;' +
    'opacity: 0.9;' +
    'transition: opacity 0.2s;' +
    '}' +
    '.pip-btn:hover { opacity: 1; }' +
    '.pip-progress {' +
    '-webkit-appearance: none;' +
    'appearance: none;' +
    'width: 100%;' +
    'height: 4px;' +
    'background: rgba(255,255,255,0.3);' +
    'border-radius: 2px;' +
    'cursor: pointer;' +
    'flex-grow: 1;' +
    'min-width: 60px;' +
    '}' +
    '.pip-progress::-webkit-slider-runnable-track {' +
    'height: 4px;' +
    'background: rgba(255,255,255,0.3);' +
    'border-radius: 2px;' +
    '}' +
    '.pip-progress::-webkit-slider-thumb {' +
    '-webkit-appearance: none;' +
    'appearance: none;' +
    'width: 12px;' +
    'height: 12px;' +
    'background: #ff0000;' +
    'border-radius: 50%;' +
    'margin-top: -4px;' +
    'cursor: pointer;' +
    '}' +
    '.pip-progress::-moz-range-track {' +
    'height: 4px;' +
    'background: rgba(255,255,255,0.3);' +
    'border-radius: 2px;' +
    '}' +
    '.pip-progress::-moz-range-thumb {' +
    'width: 12px;' +
    'height: 12px;' +
    'background: #ff0000;' +
    'border-radius: 50%;' +
    'border: none;' +
    'cursor: pointer;' +
    '}' +
    '.pip-timer {' +
    'color: white;' +
    'font-size: 12px;' +
    'font-family: monospace;' +
    'white-space: nowrap;' +
    'min-width: 80px;' +
    'text-align: center;' +
    '}' +
    '.pip-volume-container {' +
    'display: flex;' +
    'align-items: center;' +
    'gap: 4px;' +
    '}' +
    '.pip-volume-slider {' +
    '-webkit-appearance: none;' +
    'appearance: none;' +
    'width: 60px;' +
    'height: 4px;' +
    'background: rgba(255,255,255,0.3);' +
    'border-radius: 2px;' +
    'cursor: pointer;' +
    '}' +
    '.pip-volume-slider::-webkit-slider-runnable-track {' +
    'height: 4px;' +
    'background: rgba(255,255,255,0.3);' +
    'border-radius: 2px;' +
    '}' +
    '.pip-volume-slider::-webkit-slider-thumb {' +
    '-webkit-appearance: none;' +
    'appearance: none;' +
    'width: 10px;' +
    'height: 10px;' +
    'background: white;' +
    'border-radius: 50%;' +
    'margin-top: -3px;' +
    'cursor: pointer;' +
    '}' +
    '.pip-volume-slider::-moz-range-track {' +
    'height: 4px;' +
    'background: rgba(255,255,255,0.3);' +
    'border-radius: 2px;' +
    '}' +
    '.pip-volume-slider::-moz-range-thumb {' +
    'width: 10px;' +
    'height: 10px;' +
    'background: white;' +
    'border-radius: 50%;' +
    'border: none;' +
    'cursor: pointer;' +
    '}' +
    '.pip-fit-btn {' +
    'background: none;' +
    'border: 1px solid rgba(255,255,255,0.3);' +
    'border-radius: 4px;' +
    'color: white;' +
    'cursor: pointer;' +
    'font-size: 16px;' +
    'padding: 4px 8px;' +
    'opacity: 0.9;' +
    'transition: opacity 0.2s;' +
    'margin-left: auto;' +
    '}' +
    '.pip-fit-btn:hover { opacity: 1; }';
  
  controlsStyle.textContent = controlsCss;
  pipDoc.head.appendChild(controlsStyle);
  
  // Create controls container
  var controls = pipDoc.createElement('div');
  controls.className = 'pip-controls';
  controls.setAttribute('data-pip-controls', 'true');

  // Play/Pause button
  var playBtn = pipDoc.createElement('button');
  playBtn.className = 'pip-btn';
  playBtn.id = 'pip-play-btn';
  playBtn.setAttribute('data-pip-play', 'true');
  playBtn.textContent = video.paused ? '\u25B6' : '\u23F8';
  playBtn.title = 'Play / Pause';
  playBtn.addEventListener('click', function() {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  });
  controls.appendChild(playBtn);
  
  // Skip -15s button
  var skipBackBtn = pipDoc.createElement('button');
  skipBackBtn.className = 'pip-btn';
  skipBackBtn.setAttribute('data-pip-skip-back', 'true');
  skipBackBtn.textContent = '\u23EA';
  skipBackBtn.title = 'Back 15s';
  skipBackBtn.addEventListener('click', function() {
    video.currentTime = Math.max(0, video.currentTime - 15);
  });
  controls.appendChild(skipBackBtn);
  
  // Skip +15s button
  var skipForwardBtn = pipDoc.createElement('button');
  skipForwardBtn.className = 'pip-btn';
  skipForwardBtn.setAttribute('data-pip-skip-forward', 'true');
  skipForwardBtn.textContent = '\u23E9';
  skipForwardBtn.title = 'Forward 15s';
  skipForwardBtn.addEventListener('click', function() {
    video.currentTime = Math.min(video.duration || 0, video.currentTime + 15);
  });
  controls.appendChild(skipForwardBtn);
  
  // Progress bar
  var progress = pipDoc.createElement('input');
  progress.type = 'range';
  progress.className = 'pip-progress';
  progress.setAttribute('data-pip-progress', 'true');
  progress.min = '0';
  progress.max = '100';
  progress.value = video.duration ? String((video.currentTime / video.duration) * 100) : '0';
  progress.step = '0.1';
  progress.addEventListener('input', function() {
    if (video.duration) {
      video.currentTime = (parseFloat(progress.value) / 100) * video.duration;
    }
  });
  controls.appendChild(progress);
  
  // Timer display
  var timer = pipDoc.createElement('span');
  timer.className = 'pip-timer';
  timer.setAttribute('data-pip-timer', 'true');
  timer.textContent = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
  controls.appendChild(timer);
  
  // Volume container
  var volumeContainer = pipDoc.createElement('div');
  volumeContainer.className = 'pip-volume-container';
  
  // Volume button
  var volumeBtn = pipDoc.createElement('button');
  volumeBtn.className = 'pip-btn';
  volumeBtn.id = 'pip-volume-btn';
  volumeBtn.setAttribute('data-pip-volume', 'true');
  volumeBtn.textContent = video.muted || video.volume === 0 ? '\u{1F507}' : '\u{1F50A}';
  volumeBtn.title = 'Mute / Unmute';
  volumeBtn.addEventListener('click', function() {
    video.muted = !video.muted;
  });
  volumeContainer.appendChild(volumeBtn);
  
  // Volume slider
  var volumeSlider = pipDoc.createElement('input');
  volumeSlider.type = 'range';
  volumeSlider.className = 'pip-volume-slider';
  volumeSlider.setAttribute('data-pip-volume-slider', 'true');
  volumeSlider.min = '0';
  volumeSlider.max = '1';
  volumeSlider.value = video.muted ? '0' : String(video.volume);
  volumeSlider.step = '0.05';
  volumeSlider.addEventListener('input', function() {
    video.volume = parseFloat(volumeSlider.value);
    video.muted = false;
  });
  volumeContainer.appendChild(volumeSlider);
  
  controls.appendChild(volumeContainer);
  
  // Fit Ratio button
  var fitBtn = pipDoc.createElement('button');
  fitBtn.className = 'pip-fit-btn';
  fitBtn.setAttribute('data-pip-fit-ratio', 'true');
  fitBtn.textContent = '\u25F1';
  fitBtn.title = 'Fit to Ratio';
  fitBtn.addEventListener('click', function() {
    var videoWidth = video.videoWidth;
    var videoHeight = video.videoHeight;
    
    if (!videoWidth || !videoHeight) {
      return;
    }
    
    var aspectRatio = videoWidth / videoHeight;
    var innerW = pipWindow.innerWidth;
    var innerH = pipWindow.innerHeight;
    var chromeW = pipWindow.outerWidth - innerW;
    var chromeH = pipWindow.outerHeight - innerH;
    var currentRatio = innerW / innerH;
    
    try {
      if (currentRatio > aspectRatio) {
        // Too wide - adjust width
        var newInnerW = Math.round(innerH * aspectRatio);
        pipWindow.resizeTo(newInnerW + chromeW, innerH + chromeH);
      } else if (currentRatio < aspectRatio) {
        // Too tall - adjust height
        var newInnerH = Math.round(innerW / aspectRatio);
        pipWindow.resizeTo(innerW + chromeW, newInnerH + chromeH);
      }
    } catch (e) {
      // resizeTo may fail on some Chromium variants
    }
  });
  controls.appendChild(fitBtn);
  
  // Append controls to PiP document body
  pipDoc.body.appendChild(controls);
  
  // Auto-hide timer
  var hideTimer = null;
  
  function showControls() {
    controls.classList.add('visible');
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }
  
  function hideControls() {
    controls.classList.remove('visible');
  }
  
  function startHideTimer() {
    showControls();
    hideTimer = setTimeout(function() {
      hideControls();
      hideTimer = null;
    }, 3000);
  }
  
  // Named handlers for cleanup
  function onMouseMove() {
    startHideTimer();
  }
  
  function onMouseLeave() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    hideControls();
  }
  
  function onTimeUpdate() {
    var duration = video.duration;
    var currentTime = video.currentTime;
    
    if (duration && !isNaN(duration) && isFinite(duration)) {
      progress.value = String((currentTime / duration) * 100);
    } else {
      progress.value = '0';
    }
    
    timer.textContent = formatTime(currentTime) + ' / ' + formatTime(duration);
  }
  
  function onPlay() {
    playBtn.textContent = '\u23F8';
  }
  
  function onPause() {
    playBtn.textContent = '\u25B6';
  }
  
  function onVolumeChange() {
    if (video.muted || video.volume === 0) {
      volumeBtn.textContent = '\u{1F507}';
      volumeSlider.value = '0';
    } else {
      volumeBtn.textContent = '\u{1F50A}';
      volumeSlider.value = String(video.volume);
    }
  }
  
  function onLoadedMetadata() {
    if (video.duration) {
      progress.max = '100';
    }
  }
  
  // Attach event listeners
  pipDoc.addEventListener('mousemove', onMouseMove);
  pipDoc.addEventListener('mouseleave', onMouseLeave);
  video.addEventListener('timeupdate', onTimeUpdate);
  video.addEventListener('play', onPlay);
  video.addEventListener('pause', onPause);
  video.addEventListener('volumechange', onVolumeChange);
  video.addEventListener('loadedmetadata', onLoadedMetadata);
  
  // Cleanup function — removes all listeners and clears timers
  function cleanup() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    pipDoc.removeEventListener('mousemove', onMouseMove);
    pipDoc.removeEventListener('mouseleave', onMouseLeave);
    video.removeEventListener('timeupdate', onTimeUpdate);
    video.removeEventListener('play', onPlay);
    video.removeEventListener('pause', onPause);
    video.removeEventListener('volumechange', onVolumeChange);
    video.removeEventListener('loadedmetadata', onLoadedMetadata);
  }
  
  // Store cleanup on pipWindow for external access
  pipWindow._pipControlsCleanup = cleanup;
  
  // Show controls initially for a few seconds
  startHideTimer();
}
// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hideNativeControls, injectPipControls };
}