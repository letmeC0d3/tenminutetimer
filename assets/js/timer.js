/* ==========================================================================
   TenMinuteTimer.com - Core Timer & Audio Synthesizer
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- Multilingual Dictionary for Timer UI ---
  const textTranslations = {
    en: {
      remaining: 'Remaining',
      timesUp: 'Time\'s Up!',
      title10: '10 Minute Timer - Online Countdown',
      title5: '5 Minute Timer - Online Countdown',
      title15: '15 Minute Timer - Online Countdown',
      playLabel: 'Play Timer',
      pauseLabel: 'Pause Timer'
    },
    es: {
      remaining: 'Restante',
      timesUp: '¡Tiempo agotado!',
      title10: 'Temporizador de 10 Minutos - Cuenta Atrás en Línea',
      title5: 'Temporizador de 5 Minutos - Cuenta Atrás en Línea',
      title15: 'Temporizador de 15 Minutos - Cuenta Atrás en Línea',
      playLabel: 'Iniciar temporizador',
      pauseLabel: 'Pausar temporizador'
    },
    fr: {
      remaining: 'Restant',
      timesUp: 'Temps écoulé !',
      title10: 'Minuteur 10 Minutes - Compte à Rebours en Ligne',
      title5: 'Minuteur 5 Minutes - Compte à Rebours en Ligne',
      title15: 'Minuteur 15 Minutes - Compte à Rebours en Ligne',
      playLabel: 'Démarrer le minuteur',
      pauseLabel: 'Pause'
    },
    de: {
      remaining: 'Verbleibend',
      timesUp: 'Zeit abgelaufen!',
      title10: '10 Minuten Timer - Online-Countdown',
      title5: '5 Minuten Timer - Online-Countdown',
      title15: '15 Minuten Timer - Online-Countdown',
      playLabel: 'Timer starten',
      pauseLabel: 'Timer pausieren'
    },
    pt: {
      remaining: 'Restante',
      timesUp: 'Tempo esgotado!',
      title10: 'Temporizador de 10 Minutos - Contagem Regressiva Online',
      title5: 'Temporizador de 5 Minutos - Contagem Regressiva Online',
      title15: 'Temporizador de 15 Minutos - Contagem Regressiva Online',
      playLabel: 'Iniciar temporizador',
      pauseLabel: 'Pausar temporizador'
    },
    it: {
      remaining: 'Rimanente',
      timesUp: 'Tempo scaduto!',
      title10: 'Timer 10 Minuti - Conto alla Rovescia Online',
      title5: 'Timer 5 Minuti - Conto alla Rovescia Online',
      title15: 'Timer 15 Minuti - Conto alla Rovescia Online',
      playLabel: 'Avvia timer',
      pauseLabel: 'Pausa timer'
    }
  };

  const activeLang = document.documentElement.lang || 'en';
  const langUI = textTranslations[activeLang] || textTranslations.en;

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
  updateFavicon();

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

  // --- Zero-Drift Web Worker with CSP Fallback ---
  let timerWorker = null;
  const workerBlobCode = `
    let intervalId = null;
    self.onmessage = function(e) {
      if (e.data === 'start') {
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(() => self.postMessage('tick'), 250);
      } else if (e.data === 'stop') {
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
      }
    };
  `;

  function initTimerWorker() {
    try {
      const blob = new Blob([workerBlobCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      timerWorker = new Worker(workerUrl);
      timerWorker.onmessage = (e) => {
        if (e.data === 'tick' && isRunning) {
          tick();
        }
      };
    } catch (err) {
      console.warn('Web Worker blocked (possibly by strict CSP); falling back to window.setInterval', err);
      timerWorker = null;
    }
  }

  initTimerWorker();

  // Page Visibility API - Instantly eliminate drift when tab is backgrounded & restored
  document.addEventListener('visibilitychange', () => {
    if (isRunning && endTime) {
      const timeRemaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      timeLeft = timeRemaining;
      updateTimerDisplay();
      updateProgressRing();
      updateTabTitle();
      if (timeLeft <= 0) {
        completeTimer();
      }
    }
  });

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
    
    if (timerWorker) {
      timerWorker.postMessage('start');
    } else {
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(tick, 250);
    }

    timerContainer.classList.add('timer-running');

    btnPlayPause.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
    `;
    btnPlayPause.setAttribute('aria-label', langUI.pauseLabel);

    // Start background music if selected
    playAmbientMusic();
  }

  function pauseTimer() {
    isRunning = false;
    timerContainer.classList.remove('timer-running');
    
    if (timerWorker) {
      timerWorker.postMessage('stop');
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    
    btnPlayPause.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
    `;
    btnPlayPause.setAttribute('aria-label', langUI.playLabel);

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
    timerContainer.classList.remove('timer-running');
    timerLabel.textContent = langUI.remaining;
    
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
    timerContainer.classList.remove('timer-running');
    
    timerLabel.textContent = langUI.timesUp;
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
    if (defaultDuration === 300) return langUI.title5 || '5 Minute Timer';
    if (defaultDuration === 900) return langUI.title15 || '15 Minute Timer';
    if (defaultDuration === 1200) return '20 Minute Timer - Online Countdown';
    if (defaultDuration === 1500) return '25 Minute Pomodoro Timer - Online Countdown';
    if (defaultDuration === 1800) return '30 Minute Timer - Online Countdown';
    return langUI.title10;
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
    else if (track === 'purr') {
      // Synthesize Warm Soothing Cat Purr
      const purrOsc = ctx.createOscillator();
      purrOsc.type = 'sawtooth';
      purrOsc.frequency.setValueAtTime(28, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(110, ctx.currentTime);

      const purrLfo = ctx.createOscillator();
      purrLfo.frequency.setValueAtTime(23, ctx.currentTime); // 23Hz purr vibration
      const purrLfoGain = ctx.createGain();
      purrLfoGain.gain.setValueAtTime(0.5, ctx.currentTime);
      purrLfo.connect(purrLfoGain);

      const purrGain = ctx.createGain();
      purrGain.gain.setValueAtTime(0.65, ctx.currentTime);
      purrLfoGain.connect(purrGain.gain);

      purrOsc.connect(filter);
      filter.connect(purrGain);
      purrGain.connect(ambientMusicVolumeNode);

      purrOsc.start();
      purrLfo.start();

      ambientMusicNode = {
        stop: () => {
          try {
            purrOsc.stop();
            purrLfo.stop();
          } catch(e) {}
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

  // Ambient Sound Chips & Dropdown Bidirectional Synchronization
  const soundChips = document.querySelectorAll('.sound-chip');

  function syncSoundChips(selectedSound) {
    soundChips.forEach(chip => {
      const isSelected = chip.dataset.sound === selectedSound;
      chip.classList.toggle('active', isSelected);
      chip.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });
  }

  soundChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const sound = chip.dataset.sound;
      if (selectMusic) {
        selectMusic.value = sound;
      }
      syncSoundChips(sound);
      if (isRunning) {
        playAmbientMusic();
      }
    });
  });

  selectMusic.addEventListener('change', () => {
    syncSoundChips(selectMusic.value);
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

  // Productivity Hub Preset Load Handlers
  const presetLoadButtons = document.querySelectorAll('.btn-load-preset');
  presetLoadButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const duration = parseInt(btn.dataset.duration);
      const music = btn.dataset.music;
      if (duration && !isNaN(duration)) {
        resetTimer(duration);
        if (music && selectMusic) {
          selectMusic.value = music;
          syncSoundChips(music);
        }
        startTimer();
        updateFavicon();
        const timerWidget = document.getElementById('timer-widget');
        if (timerWidget) {
          timerWidget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  });

  // Quick Navigation Pills (Above Timer) for custom duration clicks
  const quickPillButtons = document.querySelectorAll('.quick-pill[data-time]');
  quickPillButtons.forEach(pill => {
    pill.addEventListener('click', () => {
      const seconds = parseInt(pill.dataset.time);
      if (seconds && !isNaN(seconds)) {
        document.querySelectorAll('.quick-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        resetTimer(seconds);
      }
    });
  });

  // --- Cat Mode Toggle & Initialization ---
  const catModeBtn = document.getElementById('cat-mode-btn');
  const catSceneWrapper = document.getElementById('cat-scene-wrapper');
  const isDefaultCatPage = document.body.dataset.catDefault === 'true';

  if (catModeBtn || catSceneWrapper || isDefaultCatPage) {
    const storedCatMode = isDefaultCatPage ? true : localStorage.getItem('catMode') === 'true';

    function setCatMode(active) {
      if (active) {
        timerContainer.classList.add('cat-mode-active');
        if (catModeBtn) {
          catModeBtn.classList.add('active');
          catModeBtn.setAttribute('aria-pressed', 'true');
          catModeBtn.innerHTML = '<span class="cat-icon">🐱</span> <span class="cat-btn-text">Cat Mode: On</span>';
        }
        localStorage.setItem('catMode', 'true');
      } else {
        timerContainer.classList.remove('cat-mode-active');
        if (catModeBtn) {
          catModeBtn.classList.remove('active');
          catModeBtn.setAttribute('aria-pressed', 'false');
          catModeBtn.innerHTML = '<span class="cat-icon">🐱</span> <span class="cat-btn-text">Cat Mode: Off</span>';
        }
        localStorage.setItem('catMode', 'false');
      }
    }

    if (storedCatMode) {
      setCatMode(true);
    }

    if (catModeBtn) {
      catModeBtn.addEventListener('click', () => {
        const isActive = timerContainer.classList.contains('cat-mode-active');
        setCatMode(!isActive);
        if (!isActive && selectMusic) {
          // Auto-suggest cozy purr audio
          selectMusic.value = 'purr';
          syncSoundChips('purr');
          if (isRunning) {
            playAmbientMusic();
          }
        }
      });
    }
  }

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
