/* ==========================================================================
   TenMinuteTimer.com - Global Web Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // --- Theme Toggler (Light / Dark Mode) ---
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const storedTheme = localStorage.getItem('theme') || 'dark'; // Dark mode default
  
  // Set initial theme
  document.documentElement.setAttribute('data-theme', storedTheme);
  updateThemeIcon(storedTheme);
  
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeIcon(newTheme);
    });
  }

  function updateThemeIcon(theme) {
    if (!themeToggleBtn) return;
    
    if (theme === 'light') {
      // Sun Icon for Light Mode
      themeToggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
        </svg>
      `;
      themeToggleBtn.setAttribute('aria-label', 'Toggle Dark Mode');
    } else {
      // Moon Icon for Dark Mode
      themeToggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.3 22h-.1c-5.5 0-10-4.5-10-10C2.2 6.8 6.2 2.5 11.5 2c.5-.1 1 .3 1 .8s-.3.9-.8 1c-4.1.6-7.2 4.1-7.2 8.3 0 4.7 3.8 8.5 8.5 8.5 4.1 0 7.6-3 8.3-7.2.1-.5.6-.8 1-.8s.9.5.8 1c-.5 5.3-4.8 9.4-10.7 9.4z"/>
        </svg>
      `;
      themeToggleBtn.setAttribute('aria-label', 'Toggle Light Mode');
    }
  }

  // --- Mobile Hamburger Menu Navigation ---
  const menuBtn = document.getElementById('menu-btn');
  const navLinks = document.getElementById('nav-links');

  if (menuBtn && navLinks) {
    // Dynamically create navigation background overlay
    const overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    document.body.appendChild(overlay);

    const closeMenu = () => {
      navLinks.classList.remove('open');
      overlay.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.innerHTML = `
        <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      `;
    };

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinks.classList.toggle('open');
      overlay.classList.toggle('open');
      const isOpen = navLinks.classList.contains('open');
      menuBtn.setAttribute('aria-expanded', isOpen);
      
      // Update hamburger icon to close state (X)
      if (isOpen) {
        menuBtn.innerHTML = `
          <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        `;
      } else {
        closeMenu();
      }
    });

    // Close menu when clicking the overlay
    overlay.addEventListener('click', closeMenu);

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (navLinks.classList.contains('open') && !navLinks.contains(e.target) && e.target !== menuBtn) {
        closeMenu();
      }
    });
  }

  // --- FAQ Accordions ---
  const faqQuestions = document.querySelectorAll('.faq-question');
  
  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const item = question.parentElement;
      const isActive = item.classList.contains('active');
      
      // Close all items
      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('active');
        i.querySelector('.faq-answer').style.maxHeight = null;
      });
      
      // Toggle current item
      if (!isActive) {
        item.classList.add('active');
        const answer = item.querySelector('.faq-answer');
        // Set height dynamically based on scrollHeight for smooth transition
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  // --- Contact Form Submission Handler ---
  const contactForm = document.getElementById('contact-form');
  const formFeedback = document.getElementById('form-feedback');

  if (contactForm && formFeedback) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Basic client-side check
      const name = document.getElementById('form-name').value.trim();
      const email = document.getElementById('form-email').value.trim();
      const message = document.getElementById('form-message').value.trim();
      
      if (!name || !email || !message) {
        alert('Please fill out all fields.');
        return;
      }
      
      // Disable form buttons to prevent double-submit
      const submitBtn = contactForm.querySelector('.btn-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      // Simulate network request (to be connected to endpoint later as per user comments)
      setTimeout(() => {
        // Show success message
        formFeedback.className = 'form-feedback success';
        formFeedback.textContent = `Thank you, ${name}! Your message has been sent successfully. We will get back to you soon.`;
        formFeedback.style.display = 'block';
        
        // Reset form fields
        contactForm.reset();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
        
        // Scroll feedback message into view
        formFeedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Hide success alert after 8 seconds
        setTimeout(() => {
          formFeedback.style.display = 'none';
        }, 8000);
      }, 1200);
    });
  }
});
