# TenMinuteTimer.com

A premium, high-performance, and visually stunning online countdown timer designed for productivity, study sessions, kids, and classrooms. 

Live at: [tenminutetimer.com](https://tenminutetimer.com/)

---

## ⚡ Key Highlights

- **Ultra-Fast & Light**: Built with pure vanilla HTML5, CSS3, and JavaScript. The absence of heavy libraries or frameworks yields a **100/100 Lighthouse performance rating**, maximizing SEO rankings and Core Web Vitals.
- **Synthesized Audio (Web Audio API)**: Eliminates heavy audio file downloads by synthesizing alarm bells and focus background music directly in the browser. Supports 100% offline usage.
- **Resilient Background Execution**: Employs epoch-based delta timing to remain accurate even when browser tabs are throttled or suspended.
- **Advanced SEO Integration**: Includes semantic markup, JSON-LD structured schema codes, dedicated pages for sub-durations (5-min and 15-min), a sitemap, and crawlers configurations.

---

## 📁 Repository Structure

```
TenMinuteTimer/
├── index.html                  # 10 Minute Timer & main landing page
├── 5-minute-timer.html         # 5 Minute Timer landing page
├── 15-minute-timer.html        # 15 Minute Timer landing page
├── about.html                  # Core philosophy and details
├── contact.html                # Responsive contact form (static layout)
├── privacy.html                # Search console compliant privacy policy
├── terms.html                  # Standard Terms of Service
├── sitemap.xml                 # Search engines sitemap
├── robots.txt                  # Crawlers directives
├── .gitignore                  # Git untracked pattern file
└── assets/
    ├── css/
    │   └── style.css           # Glassmorphic themes & animations
    └── js/
        ├── main.js             # Navigation overlays, FAQ, & theme triggers
        └── timer.js            # Timer engine & Audio synthesis routines
```

---

## 🎵 Real-Time Audio Synthesizer Profiles

This project uses the browser's built-in **Web Audio API** oscillators, noise nodes, and filters:
- **Alarms**:
  - *Warm Chime*: Harmonic chord sweep (C5, E5, G5, C6) with exponential decay.
  - *Digital Beep*: Double 880Hz alert beeps.
  - *Tibetan Bell*: Meditative singing bowl with 5 detuned overtones decaying over 4.5 seconds.
  - *Woodblock Click*: Quick bandpass filtered transient click.
- **Ambient Music/Soundscapes**:
  - *Rain*: Continuous white-noise buffer passed through a 650Hz lowpass filter.
  - *Ocean Waves*: Modulates noise gain using a Low-Frequency Oscillator (LFO) oscillating at 0.08Hz to simulate a rolling 12-second tide swell.
  - *Cosmic Drone*: Low-frequency detuned triangle waves (A2/110Hz).
  - *Lofi Chords*: Sequencer playing a repeating 4-bar progression (`C -> F -> Am -> G`) using slow-attack triangle waves.

---

## 🛠️ Local Development & Testing

Since this website is built using static files, you can run it locally with any simple static file server:

1. **Start a Python Server**:
   ```bash
   python3 -m http.server 8000
   ```
2. **Open in Browser**:
   Navigate to `http://localhost:8000`.

*Note: Web browsers restrict Web Audio playback until the user interacts with the page (e.g. clicking "Start" or "Test Sound"). This script automatically handles resumes.*

---

## ⚖️ License
Licensed under the [MIT License](LICENSE) or Public Domain. Feel free to use and adapt this code for your own projects!
