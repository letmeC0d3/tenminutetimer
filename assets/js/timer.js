/* ==========================================================================
   TenMinuteTimer.com - Core Timer & Audio Synthesizer
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const timerContainer = document.querySelector('.timer-card');
  const timerDigits = document.getElementById('timer-digits');
  const timerLabel = document.getElementById('timer-label');
  const progressRing = document.getElementById('timer-progress-ring');
  
  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnReset = document.getElementById('btn-reset');
  const btnCustomToggle = document.getElementById('btn-custom-toggle');
  
  const selectAlarm = document.getElementById('select-alarm');
  const selectMusic = document.getElementById('select-music');
  const btnTestAlarm = document.getElementById('btn-test-alarm');
  
  const volumeSlider = document.getElementById('volume-slider');
  const presetButtons = document.querySelectorAll('.preset-btn');
  
  const customDrawer = document.getElementById('custom-drawer');
  const customMinInput = document.getElementById('custom-min');
  const customSecInput = document.getElementById('custom-sec');
  const btnCustomStart = document.getElementById('btn-custom-start');

  // --- SVG Circular Progress Configuration ---
  const radius = progressRing.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
  progressRing.style.strokeDashoffset = 0; // Starts full

  // --- Timer State variables ---
  let defaultDuration = parseInt(document.querySelector('main').dataset.defaultTime) || 600; // default (10m = 600s)
  let totalTime = defaultDuration;
  let timeLeft = defaultDuration;
  let isRunning = false;
  let timerInterval = null;
  let endTime = null;
  let isAlarmActive = false;

  // --- Web Audio API Nodes ---
  let audioCtx = null;
  let ambientMusicNode = null; // Holds active synth node or sequencer interval
  let ambientMusicVolumeNode = null;
  let alarmInterval = null;
  let synthSequencerId = null; // sequencer ID for Lofi Synth chords

  // Initialize display
  updateTimerDisplay();

  // --- Core Timer Logic ---
  
  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function tick() {
    if (!isRunning) return;
    
    const timeRemaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    timeLeft = timeRemaining;
    
    updateTimerDisplay();
    updateProgressRing();
    updateTabTitle();

    if (timeLeft <= 0) {
      completeTimer();
    }
  }

  function startTimer() {
    getAudioContext();
    isRunning = true;
    endTime = Date.now() + timeLeft * 1000;
    
    timerInterval = setInterval(tick, 100);
    btnPlayPause.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
    `;
    btnPlayPause.setAttribute('aria-label', 'Pause Timer');

    // Start background music if selected
    playAmbientMusic();
  }

  function pauseTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    
    btnPlayPause.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
    `;
    btnPlayPause.setAttribute('aria-label', 'Play Timer');

    // Pause background music
    stopAmbientMusic();
  }

  function resetTimer(newDuration = totalTime) {
    pauseTimer();
    stopAlarm();
    totalTime = newDuration;
    timeLeft = newDuration;
    
    // Clear active classes
    timerContainer.classList.remove('alarm-active');
    timerLabel.textContent = 'Remaining';
    
    updateTimerDisplay();
    updateProgressRing();
    resetTabTitle();
    
    // Reset favicon to normal
    updateFavicon(false);
  }

  function completeTimer() {
    pauseTimer();
    stopAmbientMusic();
    triggerAlarm();
    
    timerLabel.textContent = 'Time\'s Up!';
    timerContainer.classList.add('alarm-active');
    updateFavicon(true);
  }

  function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    timerDigits.textContent = `${formattedMinutes}:${formattedSeconds}`;
  }

  function updateProgressRing() {
    // Progress drains as time decreases
    const progress = timeLeft / totalTime;
    const offset = circumference * (1 - progress);
    progressRing.style.strokeDashoffset = offset;
  }

  function updateTabTitle() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const pageName = getPageTitleBase();
    document.title = `[${timeStr}] ${pageName}`;
  }

  function resetTabTitle() {
    document.title = getPageTitleBase();
  }

  function getPageTitleBase() {
    if (defaultDuration === 300) return '5 Minute Timer - Online Countdown';
    if (defaultDuration === 900) return '15 Minute Timer - Online Countdown';
    return '10 Minute Timer - Online Countdown';
  }

  // Draw dynamic colored dot on SVG favicon to show running/alarm state
  function updateFavicon(isAlarm = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    // Draw clock circle
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, 2 * Math.PI);
    ctx.fillStyle = '#070913';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = isAlarm ? '#f43f5e' : '#8b5cf6';
    ctx.stroke();

    // Draw hands
    ctx.beginPath();
    ctx.moveTo(16, 16);
    ctx.lineTo(16, 8);
    ctx.moveTo(16, 16);
    ctx.lineTo(22, 16);
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw status indicator
    if (isRunning || isAlarm) {
      ctx.beginPath();
      ctx.arc(26, 6, 6, 0, 2 * Math.PI);
      ctx.fillStyle = isAlarm ? '#f43f5e' : '#06b6d4';
      ctx.fill();
    }

    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = canvas.toDataURL('image/x-icon');
    document.getElementsByTagName('head')[0].appendChild(link);
  }

  // --- Web Audio API Sound Generators ---

  // Generate White Noise Buffer (Shared by Rain and Ocean)
  let noiseBufferCache = null;
  function getNoiseBuffer() {
    const ctx = getAudioContext();
    if (noiseBufferCache) return noiseBufferCache;

    const bufferSize = 4 * ctx.sampleRate; // 4 seconds of noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noiseBufferCache = buffer;
    return noiseBufferCache;
  }

  // Synthesize Alarm Alerters
  function triggerAlarm() {
    isAlarmActive = true;
    const alarmType = selectAlarm.value;
    const volume = parseFloat(volumeSlider.value);
    
    if (alarmType === 'none') return;
    
    playAlarmSequence(alarmType, volume);
  }

  function stopAlarm() {
    isAlarmActive = false;
    if (alarmInterval) {
      clearInterval(alarmInterval);
      alarmInterval = null;
    }
  }

  function playAlarmSequence(type, volume) {
    if (!isAlarmActive) return;
    
    // Play immediately
    synthesizeAlarm(type, volume);
    
    // Set repeating sequence depending on alarm type
    let intervalTime = 1500;
    if (type === 'beep') intervalTime = 1000;
    if (type === 'bell') intervalTime = 5000;
    if (type === 'woodblock') intervalTime = 800;

    alarmInterval = setInterval(() => {
      if (isAlarmActive) {
        synthesizeAlarm(type, volume);
      } else {
        clearInterval(alarmInterval);
      }
    }, intervalTime);
  }

  function synthesizeAlarm(type, volume) {
    const ctx = getAudioContext();
    const dest = ctx.destination;
    
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, ctx.currentTime);
    masterGain.connect(dest);

    if (type === 'beep') {
      // Double Beep
      const playBeep = (timeOffset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime + timeOffset);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + timeOffset);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + timeOffset + 0.02);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + timeOffset + 0.15);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + timeOffset + 0.2);
        
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.22);
      };
      
      playBeep(0);
      playBeep(0.25);
    } 
    else if (type === 'chime') {
      // Warm Major Chord Chime
      const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const now = ctx.currentTime;
      
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        
        gain.gain.setValueAtTime(0, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.05 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 1.8);
        
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 2.0);
      });
    } 
    else if (type === 'bell') {
      // Meditative Temple Bell
      const now = ctx.currentTime;
      const baseFreq = 220; // A3
      const partials = [1, 2.01, 3.02, 4.2, 5.38]; // Ringing overtones
      
      partials.forEach((multiplier, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * multiplier, now);
        
        // Detune slightly for lush shimmer
        osc.detune.setValueAtTime((idx * 2) - 4, now);
        
        const vol = 0.2 / partials.length;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.03);
        // Slowly decay over 4.5 seconds
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);
        
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.start(now);
        osc.stop(now + 4.8);
      });
    } 
    else if (type === 'woodblock') {
      // Woodblock click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const now = ctx.currentTime;
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, now);
      
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.Q.setValueAtTime(5, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 0.1);
    }
  }

  // Synthesize Background Music
  function playAmbientMusic() {
    const track = selectMusic.value;
    const volume = parseFloat(volumeSlider.value);
    
    // Stop anything playing
    stopAmbientMusic();
    
    if (track === 'none' || !isRunning) return;
    
    const ctx = getAudioContext();
    
    // Music volume node
    ambientMusicVolumeNode = ctx.createGain();
    // Reduce background ambient music level compared to alarms
    ambientMusicVolumeNode.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
    ambientMusicVolumeNode.connect(ctx.destination);
    
    if (track === 'rain') {
      const noise = ctx.createBufferSource();
      noise.buffer = getNoiseBuffer();
      noise.loop = true;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, ctx.currentTime);
      
      noise.connect(filter);
      filter.connect(ambientMusicVolumeNode);
      noise.start();
      
      ambientMusicNode = noise;
    } 
    else if (track === 'ocean') {
      const noise = ctx.createBufferSource();
      noise.buffer = getNoiseBuffer();
      noise.loop = true;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);
      
      const waveGain = ctx.createGain();
      waveGain.gain.setValueAtTime(0.3, ctx.currentTime);
      
      // LFO modulator for wave swells
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.08, ctx.currentTime); // 12.5s cycle
      
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.25, ctx.currentTime);
      
      lfo.connect(lfoGain);
      lfoGain.connect(waveGain.gain);
      
      noise.connect(filter);
      filter.connect(waveGain);
      waveGain.connect(ambientMusicVolumeNode);
      
      lfo.start();
      noise.start();
      
      // Store all nodes to stop them later
      ambientMusicNode = {
        stop: () => {
          try { noise.stop(); } catch(e){}
          try { lfo.stop(); } catch(e){}
        }
      };
    } 
    else if (track === 'drone') {
      const now = ctx.currentTime;
      
      // Focus drone - detuned multi-oscillator hum
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(110, now); // A2
      osc1.detune.setValueAtTime(-5, now);
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(110.5, now);
      osc2.detune.setValueAtTime(5, now);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, now);
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(ambientMusicVolumeNode);
      
      osc1.start();
      osc2.start();
      
      ambientMusicNode = {
        stop: () => {
          try { osc1.stop(); } catch(e){}
          try { osc2.stop(); } catch(e){}
        }
      };
    } 
    else if (track === 'synth') {
      // Lofi Synth Chord Progression sequencer
      const synthChords = [
        [130.81, 164.81, 196.00, 261.63], // C Maj: C3, E3, G3, C4
        [174.61, 220.00, 261.63, 349.23], // F Maj: F3, A3, C4, F4
        [220.00, 261.63, 329.63, 440.00], // A Min: A3, C4, E4, A4
        [196.00, 246.94, 293.66, 392.00]  // G Maj: G3, B3, D4, G4
      ];
      let chordIndex = 0;
      
      const playChord = () => {
        const now = ctx.currentTime;
        const frequencies = synthChords[chordIndex];
        const activeOscillators = [];
        
        frequencies.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          
          // Slow attack (2s) and slow decay (2s)
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.04, now + 2.0);
          gainNode.gain.setValueAtTime(0.04, now + 3.8);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 5.8);
          
          osc.connect(gainNode);
          gainNode.connect(ambientMusicVolumeNode);
          
          osc.start(now);
          osc.stop(now + 6.0);
          activeOscillators.push(osc);
        });
        
        chordIndex = (chordIndex + 1) % synthChords.length;
        return activeOscillators;
      };
      
      // Play first chord immediately
      playChord();
      
      // Sequence every 6 seconds
      synthSequencerId = setInterval(playChord, 6000);
      
      ambientMusicNode = {
        stop: () => {
          clearInterval(synthSequencerId);
          synthSequencerId = null;
        }
      };
    }
  }

  function stopAmbientMusic() {
    if (synthSequencerId) {
      clearInterval(synthSequencerId);
      synthSequencerId = null;
    }
    if (ambientMusicNode) {
      try {
        ambientMusicNode.stop();
      } catch(e) {}
      ambientMusicNode = null;
    }
    if (ambientMusicVolumeNode) {
      try {
        ambientMusicVolumeNode.disconnect();
      } catch(e) {}
      ambientMusicVolumeNode = null;
    }
  }

  function updateAmbientVolume() {
    const vol = parseFloat(volumeSlider.value);
    if (ambientMusicVolumeNode) {
      ambientMusicVolumeNode.gain.setValueAtTime(vol * 0.4, getAudioContext().currentTime);
    }
  }

  // --- UI Event Handlers ---

  // Play / Pause button
  btnPlayPause.addEventListener('click', () => {
    if (isAlarmActive) {
      // If alarm is ringing, clicking center button resets/dismisses it
      resetTimer();
    } else if (isRunning) {
      pauseTimer();
      updateFavicon();
    } else {
      startTimer();
      updateFavicon();
    }
  });

  // Reset button
  btnReset.addEventListener('click', () => {
    resetTimer();
  });

  // Test Alarm Sound Button
  btnTestAlarm.addEventListener('click', () => {
    getAudioContext();
    const type = selectAlarm.value;
    const volume = parseFloat(volumeSlider.value);
    
    if (type === 'none') return;
    
    // Play a single instance of the alarm
    synthesizeAlarm(type, volume);
  });

  // Background Music change selector
  selectMusic.addEventListener('change', () => {
    if (isRunning) {
      playAmbientMusic();
    }
  });

  // Volume slider event
  volumeSlider.addEventListener('input', () => {
    updateAmbientVolume();
  });

  // Preset Buttons Click
  presetButtons.forEach(button => {
    button.addEventListener('click', () => {
      presetButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      const value = button.dataset.time;
      
      if (value === 'custom') {
        // Toggle custom input drawer
        customDrawer.classList.toggle('open');
      } else {
        customDrawer.classList.remove('open');
        const seconds = parseInt(value);
        resetTimer(seconds);
      }
    });
  });

  // Custom Time start button
  btnCustomStart.addEventListener('click', () => {
    let minutes = parseInt(customMinInput.value) || 0;
    let seconds = parseInt(customSecInput.value) || 0;
    
    // Normalize
    const totalSeconds = (minutes * 60) + seconds;
    
    if (totalSeconds > 0) {
      customDrawer.classList.remove('open');
      resetTimer(totalSeconds);
      startTimer();
      updateFavicon();
    }
  });

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    
    if (e.code === 'Space') {
      e.preventDefault();
      btnPlayPause.click();
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      btnReset.click();
    }
  });
});
