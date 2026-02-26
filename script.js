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

  // === WebGL Shader Hero ===
  const shaderCanvas = document.getElementById('shaderCanvas');
  if (shaderCanvas) {
    const gl = shaderCanvas.getContext('webgl2');
    if (gl) {
      // Shader source
      const vertexSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

      const fragmentSrc = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
uniform vec2 touch;
uniform vec2 move;
uniform int pointerCount;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)
float rnd(vec2 p) {
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}
float noise(in vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  float a=rnd(i), b=rnd(i+vec2(1,0)), c=rnd(i+vec2(0,1)), d=rnd(i+1.);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p) {
  float t=.0, a=1.; mat2 m=mat2(1.,-.5,.2,1.2);
  for (int i=0; i<5; i++) { t+=a*noise(p); p*=2.*m; a*=.5; }
  return t;
}
float clouds(vec2 p) {
  float d=1., t=.0;
  for (float i=.0; i<3.; i++) {
    float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);
    t=mix(t,d,a); d=a; p*=2./(i+1.);
  }
  return t;
}
void main(void) {
  vec2 uv=(FC-.5*R)/MN, st=uv*vec2(2,1);
  vec3 col=vec3(0);
  float bg=clouds(vec2(st.x+T*.5,-st.y));
  uv*=1.-.3*(sin(T*.2)*.5+.5);
  for (float i=1.; i<12.; i++) {
    uv+=.1*cos(i*vec2(.1+.01*i, .8)+i*i+T*.5+.1*uv.x);
    vec2 p=uv;
    float d=length(p);
    col+=.00125/d*(cos(sin(i)*vec3(1,2,3))+1.);
    float b=noise(i+p+bg*1.731);
    col+=.002*b/length(max(p,vec2(b*p.x*.02,p.y)));
    col=mix(col,vec3(bg*.25,bg*.137,bg*.05),d);
  }
  O=vec4(col,1);
}`;

      // State
      let program = null;
      let vs = null;
      let fs = null;
      let buffer = null;
      let dpr = Math.max(1, 0.5 * window.devicePixelRatio);
      let mouseCoords = [0, 0];
      let mouseMove = [0, 0];
      let pointerCount = 0;
      let pointerCoords = [0, 0];
      let shaderAnimId = null;

      function compileShader(shader, source) {
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error('Shader error:', gl.getShaderInfoLog(shader));
        }
      }

      function setupShader() {
        vs = gl.createShader(gl.VERTEX_SHADER);
        fs = gl.createShader(gl.FRAGMENT_SHADER);
        compileShader(vs, vertexSrc);
        compileShader(fs, fragmentSrc);
        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          console.error(gl.getProgramInfoLog(program));
        }

        const vertices = [-1, 1, -1, -1, 1, 1, 1, -1];
        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        const position = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

        program._resolution = gl.getUniformLocation(program, 'resolution');
        program._time = gl.getUniformLocation(program, 'time');
        program._touch = gl.getUniformLocation(program, 'touch');
        program._move = gl.getUniformLocation(program, 'move');
        program._pointerCount = gl.getUniformLocation(program, 'pointerCount');
      }

      function resizeCanvas() {
        dpr = Math.max(1, 0.5 * window.devicePixelRatio);
        shaderCanvas.width = shaderCanvas.offsetWidth * dpr;
        shaderCanvas.height = shaderCanvas.offsetHeight * dpr;
        gl.viewport(0, 0, shaderCanvas.width, shaderCanvas.height);
      }

      function renderShader(now) {
        if (!program || gl.getProgramParameter(program, gl.DELETE_STATUS)) return;
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.uniform2f(program._resolution, shaderCanvas.width, shaderCanvas.height);
        gl.uniform1f(program._time, now * 1e-3);
        gl.uniform2f(program._touch, ...mouseCoords);
        gl.uniform2f(program._move, ...mouseMove);
        gl.uniform1i(program._pointerCount, pointerCount);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        shaderAnimId = requestAnimationFrame(renderShader);
      }

      // Pointer tracking
      const mapCoords = (x, y) => [x * dpr, shaderCanvas.height - y * dpr];
      let pointerActive = false;

      shaderCanvas.addEventListener('pointerdown', (e) => {
        pointerActive = true;
        pointerCount = 1;
        mouseCoords = mapCoords(e.clientX, e.clientY);
      });
      shaderCanvas.addEventListener('pointerup', () => {
        pointerActive = false;
        pointerCount = 0;
      });
      shaderCanvas.addEventListener('pointerleave', () => {
        pointerActive = false;
        pointerCount = 0;
      });
      shaderCanvas.addEventListener('pointermove', (e) => {
        if (!pointerActive) return;
        mouseCoords = mapCoords(e.clientX, e.clientY);
        mouseMove = [mouseMove[0] + e.movementX, mouseMove[1] + e.movementY];
      });

      // Init
      setupShader();
      resizeCanvas();
      renderShader(0);
      window.addEventListener('resize', resizeCanvas);

      // Pause when hero not visible
      const heroSection = document.querySelector('.hero');
      if (heroSection) {
        const shaderObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              if (!shaderAnimId) renderShader(performance.now());
            } else {
              if (shaderAnimId) {
                cancelAnimationFrame(shaderAnimId);
                shaderAnimId = null;
              }
            }
          });
        }, { threshold: 0.1 });
        shaderObserver.observe(heroSection);
      }
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
      const morphProgress = easeOutCubic(mapRange(progress, 0.30, 0.55, 0, 1));
      target.innerTop = 50 + (finalTopPct - 50) * morphProgress;
      target.innerLeft = 50 + (4 - 50) * morphProgress;
      target.innerTx = -50 * (1 - morphProgress);
      target.innerTy = -50 * (1 - morphProgress);
      target.headingScale = 1 - 0.3 * morphProgress;

      // Counter
      target.counterOpacity = mapRange(progress, 0.45, 0.55, 0, 1);

      // PHASE 3: Cards panel fades in
      target.panelOpacity = easeOutCubic(mapRange(progress, 0.50, 0.63, 0, 1));
      target.panelTranslateY = mapRange(progress, 0.50, 0.63, 40, 0);

      // Shader darkening
      target.dimOpacity = mapRange(progress, 0.05, 0.55, 0, 0.6);
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
