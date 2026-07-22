/* ============================================================
   GOWER SUN — interactions
   - The living "string" signature (damped standing-wave canvas)
   - GSAP hero load sequence + scroll reveals + collage parallax
   - Nav scroll state
   Respects prefers-reduced-motion throughout.
   ============================================================ */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) document.documentElement.classList.add("no-anim");

  /* ---------- Nav scroll state ---------- */
  const nav = document.querySelector(".nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ============================================================
     THE STRING — a plucked/bowed violin string rendered as a
     damped standing wave. Excited on load and by scroll velocity.
     ============================================================ */
  class StringField {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.amp = 0;            // current excitation amplitude
      this.phase = 0;
      this.t = 0;
      this.modes = [1, 2, 3];  // harmonics
      const css = getComputedStyle(document.documentElement);
      this.color = css.getPropertyValue("--cyan").trim() || "#FF2E88";
      this.color2 = css.getPropertyValue("--electric").trim() || "#B14BFF";
      this.resize();
      window.addEventListener("resize", () => this.resize());
      this.awake = false;
      this.loop = this.loop.bind(this);
      this.drawResting();     // paint the string once, at rest
    }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      this.w = r.width; this.h = r.height;
      this.canvas.width = this.w * this.dpr;
      this.canvas.height = this.h * this.dpr;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (!this.awake) this.drawResting();
    }
    pluck(strength) {
      this.amp = Math.min(this.amp + strength, 46);
      if (!this.awake) { this.awake = true; requestAnimationFrame(this.loop); }
    }
    drawResting() {
      // A still string: one crisp line so the signature is present even before interaction.
      const { ctx, w, h } = this;
      if (!w) return;
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
      ctx.strokeStyle = this.color; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5;
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    loop() {
      const { ctx, w, h } = this;
      ctx.clearRect(0, 0, w, h);
      this.t += 0.016;
      this.amp *= 0.955;             // damping toward rest
      const mid = h / 2;

      // magenta -> violet -> magenta neon gradient across the string
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, this.color2);
      grad.addColorStop(0.5, this.color);
      grad.addColorStop(1, this.color2);

      // glow underlay + crisp line
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const u = x / w;                 // 0..1 across string
          const envelope = Math.sin(Math.PI * u); // pinned ends
          let y = 0;
          for (const m of this.modes) {
            y += Math.sin(Math.PI * m * u) *
                 Math.sin(this.t * (2 + m * 0.9) + m) / m;
          }
          const disp = envelope * this.amp * y;
          const py = mid + disp;
          x === 0 ? ctx.moveTo(x, py) : ctx.lineTo(x, py);
        }
        if (pass === 0) {
          ctx.strokeStyle = grad;
          ctx.globalAlpha = 0.20;
          ctx.lineWidth = 7;
          ctx.shadowBlur = 22; ctx.shadowColor = this.color;
        } else {
          ctx.strokeStyle = grad;
          ctx.globalAlpha = 0.95;
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Sleep once the string has effectively come to rest (frees the CPU + lets the page idle).
      if (this.amp < 0.15) { this.awake = false; this.drawResting(); return; }
      requestAnimationFrame(this.loop);
    }
  }

  const stringCanvas = document.getElementById("string-hero");
  let stringField = null;
  if (stringCanvas && !reduceMotion) {
    stringField = new StringField(stringCanvas);
    // pluck on load
    setTimeout(() => stringField.pluck(30), 500);
    // excite on scroll velocity
    let lastY = window.scrollY, ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const dy = Math.abs(window.scrollY - lastY);
        lastY = window.scrollY;
        if (dy > 4) stringField.pluck(Math.min(dy * 0.25, 10));
        ticking = false;
      });
    }, { passive: true });
    // pluck on nav hover for playfulness
    document.querySelectorAll(".nav__link").forEach((l) =>
      l.addEventListener("mouseenter", () => stringField.pluck(8)));
  }

  /* ============================================================
     GSAP — load sequence + scroll reveals + parallax
     ============================================================ */
  const hasGSAP = typeof window.gsap !== "undefined";

  // Safety net: if GSAP is unavailable (offline / CDN blocked) or motion is
  // reduced, make every reveal element visible immediately so no content is lost.
  if (!hasGSAP || reduceMotion) {
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
  }

  if (hasGSAP && !reduceMotion) {
    const { gsap } = window;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

    // Hero load sequence
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.from(".nav", { y: -30, opacity: 0, duration: 0.8 })
      .from(".hero__eyebrow > *", { y: 18, opacity: 0, stagger: 0.08, duration: 0.7 }, "-=0.3")
      .from(".hero__title .line > span", { yPercent: 115, duration: 1.1, stagger: 0.09 }, "-=0.4")
      .from(".hero__meta > *", { y: 20, opacity: 0, stagger: 0.1, duration: 0.7 }, "-=0.5")
      .from(".scroll-cue", { opacity: 0, duration: 0.8 }, "-=0.3")
      .from(".hero__bg img", { opacity: 0, scale: 1.14, duration: 1.8, ease: "power2.out" }, 0);

    // Slow Ken-Burns parallax on the studio backdrop
    gsap.to(".hero__bg img", {
      yPercent: 8, scale: 1.08, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });

    // Generic scroll reveals
    gsap.utils.toArray("[data-reveal]").forEach((el) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
    });

    // Staggered release grid (fade-in only — vertical drift is handled by the
    // row parallax below so the two don't fight over translateY)
    gsap.utils.toArray(".work-grid").forEach((grid) => {
      gsap.from(grid.querySelectorAll(".release"), {
        opacity: 0, duration: 0.7, stagger: 0.06, ease: "power3.out",
        scrollTrigger: { trigger: grid, start: "top 80%" },
      });
    });

    // Selected-work scroll motion: columns 1 & 3 drift up, column 2 drifts down.
    // Column is derived from the live column count so it stays correct on resize.
    gsap.utils.toArray(".work-grid").forEach((grid) => {
      const tiles = gsap.utils.toArray(grid.querySelectorAll(".release"));
      const colsOf = () =>
        getComputedStyle(grid).gridTemplateColumns.split(" ").length || 3;
      tiles.forEach((tile) => {
        // even columns (1st, 3rd, …) rise; odd column (2nd) sinks
        const dir = () => (tiles.indexOf(tile) % colsOf() % 2 === 0 ? 1 : -1);
        gsap.fromTo(
          tile,
          { yPercent: () => 18 * dir() },
          {
            yPercent: () => -18 * dir(),
            ease: "none",
            scrollTrigger: {
              trigger: grid,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              invalidateOnRefresh: true,
            },
          }
        );
      });
    });

    // Draw the string dividers
    gsap.utils.toArray(".divider-string path").forEach((path) => {
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(path, {
        strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut",
        scrollTrigger: { trigger: path, start: "top 90%" },
      });
    });
  }

  /* ============================================================
     Reduced motion: pause the looping video, show its poster.
     ============================================================ */
  if (reduceMotion) {
    document.querySelectorAll("video.player__video").forEach((v) => {
      v.removeAttribute("autoplay");
      v.pause();
    });
  }

  /* ============================================================
     Contact — human check that reveals the email (anti-scraping)
     ============================================================ */
  (function contactGate() {
    const form = document.getElementById("gate-form");
    if (!form) return;

    const address = ["projects", "@", "gowersun", ".", "com"].join("");
    // Harder check: a × b + c
    const a = Math.floor(Math.random() * 7) + 3;  // 3..9
    const b = Math.floor(Math.random() * 4) + 2;  // 2..5
    const c = Math.floor(Math.random() * 8) + 2;  // 2..9
    const solution = a * b + c;
    const numA = document.getElementById("num-a");
    const numB = document.getElementById("num-b");
    const numC = document.getElementById("num-c");
    if (numA) numA.textContent = a;
    if (numB) numB.textContent = b;
    if (numC) numC.textContent = c;

    const input = document.getElementById("answer");
    const hint = document.getElementById("gate-hint");
    const challenge = document.getElementById("challenge");
    const reveal = document.getElementById("reveal");
    let attempts = 0;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = parseInt((input.value || "").trim(), 10);
      if (val === solution) {
        const link = document.getElementById("email-link");
        link.textContent = address;
        link.href = "mailto:" + address;
        challenge.style.display = "none";
        reveal.classList.add("is-open");
      } else {
        attempts++;
        hint.textContent = attempts >= 2
          ? "Still not right — it's " + a + " × " + b + " + " + c + " = " + solution + "."
          : "That's not the answer. Try again.";
        hint.classList.add("is-error");
        input.focus();
        input.select();
      }
    });

    const copyBtn = document.getElementById("copy-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const done = () => {
          copyBtn.textContent = "Copied ✓";
          setTimeout(() => { copyBtn.textContent = "Copy"; }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(address).then(done).catch(done);
        } else { done(); }
      });
    }
  })();

  /* ============================================================
     Contact form. Works with no backend by opening the visitor's
     email app. To enable true in-page submission, set ENDPOINT to
     a Formspree / Web3Forms URL — the JSON POST is already wired.
     ============================================================ */
  (function contactForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;
    const note = document.getElementById("cform-note");
    const TO = ["projects", "@", "gowersun", ".", "com"].join("");
    const ENDPOINT = ""; // e.g. "https://formspree.io/f/xxxxxx"

    const val = (id) => (document.getElementById(id).value || "").trim();
    const emailOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

    function openMailto(name, email, subject, message) {
      const subj = subject || ("Website enquiry from " + name);
      const body = "Name: " + name + "\nEmail: " + email + "\n\n" + message;
      window.location.href =
        "mailto:" + TO + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(body);
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = val("cf-name"), email = val("cf-email");
      const subject = val("cf-subject"), message = val("cf-message");
      note.classList.remove("is-error", "is-ok");

      if (!name || !email || !message) {
        note.textContent = "Please fill in your name, email, and message.";
        note.classList.add("is-error"); return;
      }
      if (!emailOk(email)) {
        note.textContent = "That email address doesn't look right.";
        note.classList.add("is-error"); return;
      }

      if (ENDPOINT) {
        try {
          note.textContent = "Sending…";
          const res = await fetch(ENDPOINT, {
            method: "POST",
            headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, subject, message }),
          });
          if (!res.ok) throw new Error("bad status");
          form.reset();
          note.textContent = "Thanks — your message is on its way.";
          note.classList.add("is-ok");
        } catch (err) {
          note.textContent = "Couldn't send just now — opening your email app instead…";
          openMailto(name, email, subject, message);
        }
        return;
      }

      openMailto(name, email, subject, message);
      note.textContent = "Opening your email app to send your message…";
      note.classList.add("is-ok");
    });
  })();
})();
