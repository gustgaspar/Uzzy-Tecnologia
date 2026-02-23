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
    let ticking = false;
    let lastActiveCard = -1;
    const totalCards = heroCards.length;

    // After entrance animations complete, strip them to prevent fill-mode conflicts
    setTimeout(() => {
      heroContentEl.querySelectorAll('.hero-subtitle, .hero-title, .hero-cta').forEach(el => {
        el.style.animation = 'none';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    }, 1500);

    // Set initial card styles
    heroCards.forEach((card, i) => {
      card.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.5s ease';
      if (i > 0) {
        card.style.opacity = '0.35';
        card.style.transform = 'scale(0.92)';
      }
    });

    function updateScrollTransition() {
      const stageRect = scrollStage.getBoundingClientRect();
      const stageHeight = scrollStage.offsetHeight - window.innerHeight;
      const scrolled = -stageRect.top;
      const progress = clamp(scrolled / stageHeight, 0, 1);

      // ─── PHASE 1 (0 → 0.10): Hero content fades out ───
      const contentOpacity = mapRange(progress, 0.02, 0.10, 1, 0);
      const contentScale = mapRange(progress, 0, 0.10, 1, 0.85);
      const contentTranslateY = mapRange(progress, 0, 0.10, 0, -60);
      heroContentEl.style.opacity = contentOpacity;
      heroContentEl.style.transform = `scale(${contentScale}) translateY(${contentTranslateY}px)`;
      heroContentEl.style.visibility = contentOpacity <= 0 ? 'hidden' : 'visible';

      // ─── PHASE 2 (0.10 → 0.22): Morph title fades in centered ───
      const morphFadeIn = easeOutCubic(mapRange(progress, 0.10, 0.20, 0, 1));
      morphTitle.style.opacity = progress >= 0.10 ? Math.max(morphFadeIn, mapRange(progress, 0.20, 1, 1, 1)) : morphFadeIn;
      // Keep morph title visible from Phase 2 onward (never fades out)
      if (progress >= 0.10) {
        morphTitle.style.opacity = Math.min(1, morphFadeIn + mapRange(progress, 0.20, 0.22, 0, 1));
      }

      // ─── PHASE 2→3 (0.20 → 0.35): Title morphs from center to top-left ───
      const morphProgress = easeOutCubic(mapRange(progress, 0.20, 0.35, 0, 1));

      // Position interpolation: center → top-left
      // Target position: top: ~15%, left: ~4% (padded from edge)
      const topStart = 50;
      const topEnd = 18;
      const leftStart = 50;
      const leftEnd = 4;
      const currentTop = topStart + (topEnd - topStart) * morphProgress;
      const currentLeft = leftStart + (leftEnd - leftStart) * morphProgress;

      // Transform: from translate(-50%, -50%) to translate(0, 0)
      const translateXPct = -50 * (1 - morphProgress);
      const translateYPct = -50 * (1 - morphProgress);

      // Scale: heading gets smaller when moving to top-left
      const headingScale = 1 - 0.3 * morphProgress; // 1 → 0.7

      morphTitleInner.style.top = `${currentTop}%`;
      morphTitleInner.style.left = `${currentLeft}%`;
      morphTitleInner.style.transform = `translate(${translateXPct}%, ${translateYPct}%)`;

      // Scale the heading text
      if (morphHeading) {
        morphHeading.style.transform = `scale(${headingScale})`;
        morphHeading.style.textAlign = morphProgress > 0.5 ? 'left' : 'center';
      }

      // Label also aligns left
      if (morphLabel) {
        morphLabel.style.textAlign = morphProgress > 0.5 ? 'left' : 'center';
      }

      // Counter fades in during morph
      if (heroCardsCounter) {
        heroCardsCounter.style.opacity = mapRange(progress, 0.28, 0.35, 0, 1);
      }

      // ─── PHASE 3 (0.30 → 0.40): Cards panel fades in from below ───
      const panelOpacity = easeOutCubic(mapRange(progress, 0.30, 0.40, 0, 1));
      const panelTranslateY = mapRange(progress, 0.30, 0.40, 40, 0);
      heroCardsPanel.style.opacity = panelOpacity;
      heroCardsPanel.style.transform = `translateY(${panelTranslateY}px)`;
      heroCardsPanel.style.pointerEvents = panelOpacity > 0.5 ? 'auto' : 'none';

      // ─── PHASE 4 (0.40 → 1.0): Cards cycle one by one ───
      if (progress >= 0.40 && totalCards > 0) {
        const cardProgress = mapRange(progress, 0.40, 0.95, 0, 1);
        const activeIndex = Math.min(
          Math.floor(cardProgress * totalCards),
          totalCards - 1
        );

        if (activeIndex !== lastActiveCard) {
          lastActiveCard = activeIndex;

          // Update counter
          if (heroCardsCounter) {
            heroCardsCounter.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(totalCards).padStart(2, '0')}`;
          }

          // Auto-scroll carousel to center active card
          const activeCard = heroCards[activeIndex];
          const cardLeft = activeCard.offsetLeft;
          const cardWidth = activeCard.offsetWidth;
          const wrapperWidth = heroCardsCarousel.offsetWidth;
          const scrollTarget = cardLeft - (wrapperWidth / 2) + (cardWidth / 2);
          heroCardsCarousel.scrollTo({ left: scrollTarget, behavior: 'smooth' });

          // Highlight active, dim others
          heroCards.forEach((card, i) => {
            if (i === activeIndex) {
              card.style.opacity = '1';
              card.style.transform = 'scale(1)';
            } else {
              card.style.opacity = '0.35';
              card.style.transform = 'scale(0.92)';
            }
          });
        }
      }

      // ─── Shader darkening (continuous) ───
      const dimOpacity = mapRange(progress, 0.05, 0.35, 0, 0.6);
      const heroSection = document.getElementById('heroSection');
      if (heroSection) {
        heroSection.style.setProperty('--dim-opacity', dimOpacity);
      }

      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollTransition);
        ticking = true;
      }
    }, { passive: true });

    // Initial call
    updateScrollTransition();
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

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        if (entry.target.classList.contains('stat-item')) animateCounters();
        observer.unobserve(entry.target);
      }
    });
  }, { root: null, rootMargin: '0px 0px -60px 0px', threshold: 0.1 });

  revealElements.forEach(el => observer.observe(el));

  // Staggered reveals
  document.querySelectorAll('.services-grid, .stats-grid, .client-logos').forEach(container => {
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

  // === AI FAB ===
  const aiFab = document.getElementById('aiFab');
  if (aiFab) {
    aiFab.addEventListener('click', () => {
      aiFab.style.transform = 'scale(0.95)';
      setTimeout(() => {
        aiFab.style.transform = '';
        alert('🤖 IA Uzzy: Como posso ajudar você hoje?');
      }, 150);
    });
  }

});
