/* ============================================
   Uzzy Tecnologia - JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // === Mobile Menu Toggle ===
  const menuToggle = document.getElementById('mobileMenuToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      mobileMenu.classList.toggle('active');
      document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // === Header Scroll Effect ===
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.style.background = 'rgba(255,255,255,0.95)';
      header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
    } else {
      header.style.background = 'rgba(255,255,255,0.85)';
      header.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)';
    }
  }, { passive: true });

  // === Animated Gradient Background ===
  const gradientContainer = document.getElementById('gradientContainer');
  const gradientBackground = document.getElementById('gradientBackground');

  if (gradientContainer && gradientBackground) {
    // Configuration options from the React component
    const config = {
      startingGap: 125,
      Breathing: false,
      gradientColors: [
        "#0A0A0A",
        "#2979FF",
        "#FF80AB",
        "#FF6D00",
        "#FFD600",
        "#00E676",
        "#3D5AFE"
      ],
      gradientStops: [35, 50, 60, 70, 80, 90, 100],
      animationSpeed: 0.02,
      breathingRange: 5,
      topOffset: 0
    };

    let gradientAnimId = null;
    let width = config.startingGap;
    let directionWidth = 1;

    // Optional: add a fade-in animation similar to Framer Motion's initial/animate
    gradientBackground.style.opacity = '0';
    gradientBackground.style.transform = 'scale(1.5)';
    gradientBackground.style.transition = 'opacity 2s cubic-bezier(0.25, 0.1, 0.25, 1), transform 2s cubic-bezier(0.25, 0.1, 0.25, 1)';

    // Trigger the animation slightly after load
    setTimeout(() => {
      gradientBackground.style.opacity = '1';
      gradientBackground.style.transform = 'scale(1)';
    }, 50);

    const animateGradient = () => {
      if (width >= config.startingGap + config.breathingRange) directionWidth = -1;
      if (width <= config.startingGap - config.breathingRange) directionWidth = 1;

      if (!config.Breathing) directionWidth = 0;
      width += directionWidth * config.animationSpeed;

      const gradientStopsString = config.gradientStops
        .map((stop, index) => `${config.gradientColors[index]} ${stop}%`)
        .join(", ");

      const gradient = `radial-gradient(${width}% ${width + config.topOffset}% at 50% 20%, ${gradientStopsString})`;

      gradientContainer.style.background = gradient;

      gradientAnimId = requestAnimationFrame(animateGradient);
    };

    // Start animation
    gradientAnimId = requestAnimationFrame(animateGradient);

    // Pause when hero not visible to save performance
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
      const gradientObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (!gradientAnimId) gradientAnimId = requestAnimationFrame(animateGradient);
          } else {
            if (gradientAnimId) {
              cancelAnimationFrame(gradientAnimId);
              gradientAnimId = null;
            }
          }
        });
      }, { threshold: 0.1 });
      gradientObserver.observe(heroSection);
    }
  }
  // === Shared Helpers (used by scroll transition + card reveals) ===
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
  const mapRange = (value, inMin, inMax, outMin, outMax) => {
    const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
    return outMin + (outMax - outMin) * t;
  };

  // === Cinematic Scroll Transition ===
  const scrollStage = document.getElementById('scrollStage');
  const heroContentEl = document.getElementById('heroContent');
  const morphTitle = document.getElementById('morphTitle');
  const morphTitleInner = morphTitle ? morphTitle.querySelector('.morph-title-inner') : null;
  const morphHeading = morphTitle ? morphTitle.querySelector('.morph-heading') : null;
  const morphLabel = morphTitle ? morphTitle.querySelector('.morph-label') : null;
  const heroTextReasons = document.getElementById('heroTextReasons');
  const reasonText1 = document.getElementById('reasonText1');
  const reasonText2 = document.getElementById('reasonText2');
  const heroCardsPanel = document.getElementById('heroCardsPanel');
  const heroCardsCarousel = document.getElementById('heroCardsCarousel');
  const heroCardsCounter = document.getElementById('heroCardsCounter');
  const heroCards = heroCardsPanel ? heroCardsPanel.querySelectorAll('.case-card') : [];

  if (scrollStage && heroContentEl && morphTitle && morphTitleInner && heroCardsPanel) {
    const totalCards = heroCards.length;

    // After entrance animations complete, strip them to prevent fill-mode conflicts
    setTimeout(() => {
      heroContentEl.querySelectorAll('.hero-subtitle, .hero-title, .hero-cta').forEach(el => {
        el.style.animation = 'none';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    }, 1500);

    // ─── Lerp-based smooth scroll animation ───
    const lerp = (current, target, factor) => current + (target - current) * factor;
    const LERP_FACTOR = 0.08;

    let cur = {
      contentOpacity: 1, contentScale: 1, contentTranslateY: 0,
      morphOpacity: 0,
      innerTop: 50, innerLeft: 50, innerTx: -50, innerTy: -50,
      headingScale: 1,
      counterOpacity: 0,
      reason1Opacity: 0, reason1TranslateY: 40,
      reason2Opacity: 0, reason2TranslateY: 40,
      panelOpacity: 0, panelTranslateY: 40,
      dimOpacity: 0
    };

    let target = { ...cur };

    function computeTargets() {
      const stageRect = scrollStage.getBoundingClientRect();
      const stageHeight = scrollStage.offsetHeight - window.innerHeight;
      const scrolled = -stageRect.top;
      const progress = clamp(scrolled / stageHeight, 0, 1);

      // ── Navbar-aware final top position (responsive) ──
      const navbarEl = document.getElementById('header');
      const navHeight = navbarEl ? navbarEl.offsetHeight + navbarEl.offsetTop + 24 : 80;
      const finalTopPct = (navHeight / window.innerHeight) * 100;

      // PHASE 1: Hero content fades out
      target.contentOpacity = mapRange(progress, 0.02, 0.15, 1, 0);
      target.contentScale = mapRange(progress, 0, 0.15, 1, 0.85);
      target.contentTranslateY = mapRange(progress, 0, 0.15, 0, -60);

      // PHASE 2: Morph title fades in
      const morphFadeIn = easeOutCubic(mapRange(progress, 0.15, 0.30, 0, 1));
      target.morphOpacity = progress >= 0.15
        ? Math.min(1, morphFadeIn + mapRange(progress, 0.30, 0.35, 0, 1))
        : morphFadeIn;

      // PHASE 2→3: Title morphs from center to just below navbar
      const morphProgress = easeOutCubic(mapRange(progress, 0.30, 0.45, 0, 1));
      target.innerTop = 50 + (finalTopPct - 50) * morphProgress;
      target.innerLeft = 50 + (4 - 50) * morphProgress;
      target.innerTx = -50 * (1 - morphProgress);
      target.innerTy = -50 * (1 - morphProgress);
      target.headingScale = 1 - 0.3 * morphProgress;

      // PHASE 4: Reason 1 (Left) fades in
      const r1FadeIn = easeOutCubic(mapRange(progress, 0.40, 0.50, 0, 1));
      const r1FadeOut = easeOutCubic(mapRange(progress, 0.70, 0.75, 0, 1));
      target.reason1Opacity = clamp(r1FadeIn - r1FadeOut, 0, 1);
      // Slides in from y=40 to y=0 and stays there
      target.reason1TranslateY = mapRange(progress, 0.40, 0.50, 40, 0) - mapRange(progress, 0.70, 0.75, 0, 40);

      // PHASE 5: Reason 2 (Right) fades in
      // Starts a bit after reason 1 is fully in, but reason 1 STAYS
      const r2FadeIn = easeOutCubic(mapRange(progress, 0.55, 0.65, 0, 1));
      const r2FadeOut = easeOutCubic(mapRange(progress, 0.70, 0.75, 0, 1)); // Fades out same time as r1
      target.reason2Opacity = clamp(r2FadeIn - r2FadeOut, 0, 1);
      // Slides in from y=40 to y=0 and stays there
      target.reason2TranslateY = mapRange(progress, 0.55, 0.65, 40, 0) - mapRange(progress, 0.70, 0.75, 0, 40);

      // Counter maps late with cards
      target.counterOpacity = mapRange(progress, 0.75, 0.85, 0, 1);

      // PHASE 6: Cards panel fades in
      target.panelOpacity = easeOutCubic(mapRange(progress, 0.75, 0.85, 0, 1));
      target.panelTranslateY = mapRange(progress, 0.75, 0.85, 40, 0);

      // Shader darkening extended
      target.dimOpacity = mapRange(progress, 0.05, 0.85, 0, 0.6);
    }

    function applyLerp() {
      const f = LERP_FACTOR;

      cur.contentOpacity = lerp(cur.contentOpacity, target.contentOpacity, f);
      cur.contentScale = lerp(cur.contentScale, target.contentScale, f);
      cur.contentTranslateY = lerp(cur.contentTranslateY, target.contentTranslateY, f);
      cur.morphOpacity = lerp(cur.morphOpacity, target.morphOpacity, f);
      cur.innerTop = lerp(cur.innerTop, target.innerTop, f);
      cur.innerLeft = lerp(cur.innerLeft, target.innerLeft, f);
      cur.innerTx = lerp(cur.innerTx, target.innerTx, f);
      cur.innerTy = lerp(cur.innerTy, target.innerTy, f);
      cur.headingScale = lerp(cur.headingScale, target.headingScale, f);
      cur.counterOpacity = lerp(cur.counterOpacity, target.counterOpacity, f);
      cur.reason1Opacity = lerp(cur.reason1Opacity, target.reason1Opacity, f);
      cur.reason1TranslateY = lerp(cur.reason1TranslateY, target.reason1TranslateY, f);
      cur.reason2Opacity = lerp(cur.reason2Opacity, target.reason2Opacity, f);
      cur.reason2TranslateY = lerp(cur.reason2TranslateY, target.reason2TranslateY, f);
      cur.panelOpacity = lerp(cur.panelOpacity, target.panelOpacity, f);
      cur.panelTranslateY = lerp(cur.panelTranslateY, target.panelTranslateY, f);
      cur.dimOpacity = lerp(cur.dimOpacity, target.dimOpacity, f);

      heroContentEl.style.opacity = cur.contentOpacity;
      heroContentEl.style.transform = `scale(${cur.contentScale}) translateY(${cur.contentTranslateY}px)`;
      heroContentEl.style.visibility = cur.contentOpacity <= 0.01 ? 'hidden' : 'visible';

      morphTitle.style.opacity = cur.morphOpacity;

      morphTitleInner.style.top = `${cur.innerTop}%`;
      morphTitleInner.style.left = `${cur.innerLeft}%`;
      morphTitleInner.style.transform = `translate(${cur.innerTx}%, ${cur.innerTy}%)`;

      if (morphHeading) {
        morphHeading.style.transform = `scale(${cur.headingScale})`;
      }

      if (heroCardsCounter) {
        heroCardsCounter.style.opacity = cur.counterOpacity;
      }

      if (reasonText1) {
        reasonText1.style.opacity = cur.reason1Opacity;
        reasonText1.style.transform = `translateY(${cur.reason1TranslateY}px)`;
        reasonText1.style.visibility = cur.reason1Opacity <= 0.01 ? 'hidden' : 'visible';
      }

      if (reasonText2) {
        reasonText2.style.opacity = cur.reason2Opacity;
        reasonText2.style.transform = `translateY(${cur.reason2TranslateY}px)`;
        reasonText2.style.visibility = cur.reason2Opacity <= 0.01 ? 'hidden' : 'visible';
      }

      heroCardsPanel.style.opacity = cur.panelOpacity;
      heroCardsPanel.style.transform = `translateY(${cur.panelTranslateY}px)`;
      heroCardsPanel.style.pointerEvents = cur.panelOpacity > 0.5 ? 'auto' : 'none';

      const heroSection = document.getElementById('heroSection');
      if (heroSection) {
        heroSection.style.setProperty('--dim-opacity', cur.dimOpacity);
      }
    }

    function animationLoop() {
      if (window.innerWidth <= 1024) {
        requestAnimationFrame(animationLoop);
        return; // Bail out on mobile to let native CSS take over
      }

      computeTargets();
      applyLerp();
      requestAnimationFrame(animationLoop);
    }

    if (window.innerWidth > 1024) {
      computeTargets();
      cur = { ...target };
      applyLerp();
    } else {
      // Force initial mobile CSS state (overrides any inline lingering)
      heroCardsPanel.style.opacity = '1';
      heroCardsPanel.style.pointerEvents = 'auto';
      if (reasonText1) {
        reasonText1.style.opacity = '1';
        reasonText1.style.visibility = 'visible';
        reasonText1.style.transform = 'none';
      }
      if (reasonText2) {
        reasonText2.style.opacity = '1';
        reasonText2.style.visibility = 'visible';
        reasonText2.style.transform = 'none';
      }
    }
    requestAnimationFrame(animationLoop);

    // ─── Horizontal Carousel: drag-to-scroll + center card detection ───
    if (heroCardsCarousel && totalCards > 0) {
      // Detect which card is closest to center and highlight it
      function updateCenterCard() {
        if (window.innerWidth <= 1024) {
          // Apply full opacity and native flow and bail out
          heroCards.forEach(card => {
            card.style.setProperty('--card-reveal', '1');
            card.classList.add('card-center'); // just to ensure no weird transforms
          });
          return;
        }

        const wrapperRect = heroCardsCarousel.getBoundingClientRect();
        // Focus point is fixed near the left edge to always highlight the first visible card
        const focusPoint = wrapperRect.left + 180;
        let closestIdx = 0;
        let closestDist = Infinity;

        heroCards.forEach((card, i) => {
          const cardRect = card.getBoundingClientRect();
          // Use the left edge of the card for distance to focus point
          const dist = Math.abs(cardRect.left - focusPoint);
          if (dist < closestDist) {
            closestDist = dist;
            closestIdx = i;
          }

          // Card Horizontal Reveal Logic (fades in as it enters from the right)
          // Adjust threshold so they slowly appear when dragged left
          const revealStart = wrapperRect.right - 20;
          const revealEnd = wrapperRect.right - 250;

          let revealVal = 1;
          if (cardRect.left > revealStart) {
            revealVal = 0;
          } else if (cardRect.left > revealEnd) {
            revealVal = (revealStart - cardRect.left) / (revealStart - revealEnd);
          }

          card.style.setProperty('--card-reveal', revealVal.toString());
        });

        heroCards.forEach((card, i) => {
          if (i === closestIdx) {
            card.classList.add('card-center');
          } else {
            card.classList.remove('card-center');
          }
        });

        // Update counter
        if (heroCardsCounter) {
          heroCardsCounter.textContent = `${String(closestIdx + 1).padStart(2, '0')} / ${String(totalCards).padStart(2, '0')}`;
        }
      }

      // Update on carousel scroll
      heroCardsCarousel.addEventListener('scroll', updateCenterCard, { passive: true });

      // Initialize layout and clear mobile scroll cache
      if (window.innerWidth <= 1024) {
        // iOS aggressive caching resets scroll AFTER execution, so we loop shortly
        let ticks = 0;
        const resetScroll = setInterval(() => {
          heroCardsCarousel.scrollTo({ left: 0, top: 0, behavior: 'auto' });
          ticks++;
          if (ticks > 10) clearInterval(resetScroll);
        }, 50);
      }
      updateCenterCard();

      // Drag-to-scroll
      let isDragging = false;
      let startX = 0;
      let scrollLeftStart = 0;

      heroCardsCarousel.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX - heroCardsCarousel.offsetLeft;
        scrollLeftStart = heroCardsCarousel.scrollLeft;
        heroCardsCarousel.style.scrollBehavior = 'auto';
      });

      heroCardsCarousel.addEventListener('mouseleave', () => {
        isDragging = false;
        heroCardsCarousel.style.scrollBehavior = 'smooth';
      });

      heroCardsCarousel.addEventListener('mouseup', () => {
        isDragging = false;
        heroCardsCarousel.style.scrollBehavior = 'smooth';
      });

      heroCardsCarousel.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - heroCardsCarousel.offsetLeft;
        const walk = (x - startX) * 1.5;
        heroCardsCarousel.scrollLeft = scrollLeftStart - walk;
      });

      // Navigation arrows
      const prevBtn = heroCardsPanel.querySelector('.carousel-nav-prev');
      const nextBtn = heroCardsPanel.querySelector('.carousel-nav-next');
      const cardScrollAmount = 280; // card width + gap

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          heroCardsCarousel.scrollBy({ left: -cardScrollAmount, behavior: 'smooth' });
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          heroCardsCarousel.scrollBy({ left: cardScrollAmount, behavior: 'smooth' });
        });
      }
    }
  }

  // === Services Tabs ===
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const targetContent = document.getElementById(`tab-${target}`);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  // === Cases Carousel Drag ===
  const carousel = document.getElementById('casesCarousel');
  if (carousel) {
    let isDown = false;
    let startX;
    let scrollLeft;

    carousel.addEventListener('mousedown', (e) => {
      isDown = true;
      carousel.style.cursor = 'grabbing';
      startX = e.pageX - carousel.offsetLeft;
      scrollLeft = carousel.scrollLeft;
    });
    carousel.addEventListener('mouseleave', () => { isDown = false; carousel.style.cursor = 'grab'; });
    carousel.addEventListener('mouseup', () => { isDown = false; carousel.style.cursor = 'grab'; });
    carousel.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - carousel.offsetLeft;
      carousel.scrollLeft = scrollLeft - (x - startX) * 1.5;
    });
    carousel.style.cursor = 'grab';
  }

  // === Counter Animation ===
  const counters = document.querySelectorAll('.stat-number');
  let countersAnimated = false;

  function animateCounters() {
    if (countersAnimated) return;
    countersAnimated = true;

    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'));
      const duration = 2000;
      const start = Date.now();

      function updateCounter() {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        counter.textContent = Math.round(target * eased);
        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          counter.textContent = target;
        }
      }
      requestAnimationFrame(updateCounter);
    });
  }

  // === Scroll Reveal ===
  const revealElements = document.querySelectorAll(
    '.section-label, .section-title, .case-card, .service-card, .stat-item, .cta-content, .footer-top, .client-logos'
  );
  revealElements.forEach(el => el.classList.add('reveal'));

  // Also observe elements that already have .reveal class (e.g. About page)
  const allRevealElements = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        if (entry.target.classList.contains('stat-item')) animateCounters();
        observer.unobserve(entry.target);
      }
    });
  }, { root: null, rootMargin: '0px 0px -60px 0px', threshold: 0.1 });

  allRevealElements.forEach(el => observer.observe(el));

  // Staggered reveals
  document.querySelectorAll('.services-grid, .stats-grid, .client-logos, .about-stats-grid, .about-values-grid, .about-approach-timeline, .ai-feature-list').forEach(container => {
    Array.from(container.children).forEach((item, i) => {
      item.style.transitionDelay = `${i * 0.08}s`;
    });
  });

  // === Smooth Scroll ===
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerHeight = header ? header.offsetHeight : 0;
        window.scrollTo({
          top: targetEl.getBoundingClientRect().top + window.scrollY - headerHeight - 20,
          behavior: 'smooth'
        });
      }
    });
  });

  // === Meteors Effect on Service Cards ===
  const serviceCardsMeteors = document.querySelectorAll('.service-card');
  serviceCardsMeteors.forEach(card => {
    // Wrap the card to add the glow behind it
    const wrapper = document.createElement('div');
    wrapper.className = 'relative group w-full h-full';

    // Insert wrapper before card, then move card inside
    card.parentNode.insertBefore(wrapper, card);

    // Create the glow element
    const glow = document.createElement('div');
    // Using Aceternity UI style glow: blue to teal, scaled down, heavily blurred
    glow.className = 'absolute inset-0 h-full w-full bg-gradient-to-r from-blue-500 to-teal-500 transform scale-[0.80] bg-red-500 rounded-full blur-3xl opacity-20 group-hover:opacity-60 transition-opacity duration-500';
    glow.style.zIndex = '0';

    wrapper.appendChild(glow);
    wrapper.appendChild(card);

    card.style.position = 'relative';
    card.style.overflow = 'hidden';
    card.style.zIndex = '1';
    card.style.height = '100%';
    card.style.background = '#0f172a'; // tailwind slate-900 to match demo
    card.style.borderColor = '#1e293b'; // border-slate-800

    // Create a container for the meteors to sit behind the card content
    const meteorsContainer = document.createElement('div');
    meteorsContainer.className = 'absolute inset-0 pointer-events-none z-0';

    // Ensure existing content is above the meteors
    Array.from(card.children).forEach(child => {
      child.style.position = 'relative';
      child.style.zIndex = '1';
    });

    const count = 20;
    for (let i = 0; i < count; i++) {
      const span = document.createElement('span');
      span.className = "animate-meteor-effect absolute top-1/2 left-1/2 h-0.5 w-0.5 rounded-[9999px] bg-slate-500 shadow-[0_0_0_1px_#ffffff10] rotate-[215deg] " +
        "before:content-[''] before:absolute before:top-1/2 before:transform before:-translate-y-[50%] before:w-[50px] before:h-[1px] before:bg-gradient-to-r before:from-[#64748b] before:to-transparent";

      span.style.top = '0px';
      span.style.left = Math.floor(Math.random() * (400 - -400) + -400) + 'px';
      span.style.animationDelay = (Math.random() * (0.8 - 0.2) + 0.2) + 's';
      span.style.animationDuration = Math.floor(Math.random() * (10 - 2) + 2) + 's';

      meteorsContainer.appendChild(span);
    }
    card.insertBefore(meteorsContainer, card.firstChild);
  });

});
