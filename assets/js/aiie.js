/* AIIE 2026 — site behaviour. No dependencies. */
(function () {
   "use strict";

   var reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

   /* ------------------------------------------------ preloader + intro
      The overlay is dismissed on window load, with a hard failsafe so a
      stalled image can never leave visitors staring at the loader. */
   var preloader = document.querySelector(".preloader");

   var startIntro = function () {
      document.body.classList.add("is-ready");
      if (preloader) { preloader.classList.add("is-done"); }
   };

   if (preloader && !reduceMotion) {
      var dismissed = false;
      var dismiss = function () {
         if (dismissed) { return; }
         dismissed = true;
         // let the loader breathe for a beat so it doesn't flash on fast loads
         setTimeout(startIntro, 260);
      };
      window.addEventListener("load", dismiss);
      setTimeout(dismiss, 3500);           // failsafe
   } else {
      startIntro();
   }

   /* ------------------------------------------------ sticky header */
   var header = document.querySelector(".site-header");
   if (header) {
      var onScroll = function () {
         header.classList.toggle("is-stuck", window.scrollY > 20);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
   }

   /* ------------------------------------------------ mobile nav */
   var toggle = document.querySelector(".nav__toggle");
   var menu = document.getElementById("nav-menu");
   if (toggle && menu) {
      var setMenu = function (open) {
         menu.classList.toggle("is-open", open);
         toggle.setAttribute("aria-expanded", String(open));
      };
      toggle.addEventListener("click", function () {
         setMenu(!menu.classList.contains("is-open"));
      });
      menu.addEventListener("click", function (e) {
         if (e.target.closest("a")) { setMenu(false); }
      });
      // tapping outside, or Escape, closes it
      document.addEventListener("click", function (e) {
         if (menu.classList.contains("is-open") &&
             !e.target.closest(".nav")) { setMenu(false); }
      });
      document.addEventListener("keydown", function (e) {
         if (e.key === "Escape") { setMenu(false); }
      });
   }

   /* ------------------------------------------------ anchor scroll
      Offset by the sticky header so headings don't hide underneath it. */
   document.addEventListener("click", function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) { return; }
      var id = link.getAttribute("href");
      if (id.length < 2) { return; }

      var target = document.querySelector(id);
      if (!target) { return; }

      e.preventDefault();
      var offset = (header ? header.offsetHeight : 0) + 14;
      var top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
   });

   /* ------------------------------------------------ countdown */
   var clock = document.querySelector("[data-countdown]");
   if (clock) {
      var target = new Date(clock.getAttribute("data-countdown")).getTime();
      var cells = clock.querySelectorAll("b");
      var previous = [];

      var pad = function (n) { return n < 10 ? "0" + n : String(n); };

      var tick = function () {
         var diff = target - Date.now();

         if (diff <= 0) {
            clock.innerHTML = '<li class="is-over"><b>The exhibition is here — welcome to AIIE 2026.</b></li>';
            clock.style.gridTemplateColumns = "1fr";
            clearInterval(timer);
            return;
         }

         var s = Math.floor(diff / 1000);
         var values = [
            Math.floor(s / 86400),        // days
            Math.floor(s / 3600) % 24,    // hours
            Math.floor(s / 60) % 60,      // minutes
            s % 60                        // seconds
         ];

         for (var i = 0; i < cells.length; i++) {
            var next = pad(values[i]);
            if (previous[i] === next) { continue; }
            previous[i] = next;
            cells[i].textContent = next;

            if (!reduceMotion) {
               cells[i].classList.add("is-ticking");
               (function (cell) {
                  setTimeout(function () { cell.classList.remove("is-ticking"); }, 320);
               })(cells[i]);
            }
         }
      };

      tick();
      var timer = setInterval(tick, 1000);
   }

   /* ------------------------------------------------ scroll reveal */
   var revealables = document.querySelectorAll(".reveal, .reveal-group");

   // index children of a group so CSS can cascade them
   document.querySelectorAll(".reveal-group").forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
         child.style.setProperty("--i", i);
      });
   });

   if (revealables.length) {
      if ("IntersectionObserver" in window && !reduceMotion) {
         var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
               if (entry.isIntersecting) {
                  entry.target.classList.add("is-visible");
                  io.unobserve(entry.target);
               }
            });
         }, { threshold: 0.08, rootMargin: "0px 0px -50px 0px" });

         revealables.forEach(function (el) { io.observe(el); });

         // anything already on screen at load shouldn't wait for a scroll
         requestAnimationFrame(function () {
            revealables.forEach(function (el) {
               if (el.getBoundingClientRect().top < window.innerHeight) {
                  el.classList.add("is-visible");
               }
            });
         });

         // Failsafe: in a throttled/background tab the observer can be starved,
         // which would leave content stuck at opacity 0. Never let that persist.
         setTimeout(function () {
            revealables.forEach(function (el) {
               if (el.getBoundingClientRect().top < window.innerHeight * 1.5) {
                  el.classList.add("is-visible");
               }
            });
         }, 2500);
      } else {
         revealables.forEach(function (el) { el.classList.add("is-visible"); });
      }
   }

   /* ------------------------------------------------ hero parallax */
   var shots = document.querySelectorAll(".hero__media figure");
   if (shots.length && !reduceMotion && window.matchMedia("(min-width: 1041px)").matches) {
      var ticking = false;
      window.addEventListener("scroll", function () {
         if (ticking) { return; }
         ticking = true;
         requestAnimationFrame(function () {
            var y = window.scrollY;
            if (y < 900) {
               shots[0].style.translate = "0 " + (y * -0.05).toFixed(1) + "px";
               if (shots[1]) { shots[1].style.translate = "0 " + (y * -0.11).toFixed(1) + "px"; }
            }
            ticking = false;
         });
      }, { passive: true });
   }

   /* ------------------------------------------------ gallery lightbox */
   var lightbox = document.querySelector(".lightbox");
   if (lightbox) {
      var frame = lightbox.querySelector("img");
      var lastFocus = null;

      var closeBox = function () {
         lightbox.classList.remove("is-open");
         document.body.style.overflow = "";
         setTimeout(function () {
            if (!lightbox.classList.contains("is-open")) { frame.removeAttribute("src"); }
         }, 400);
         if (lastFocus) { lastFocus.focus(); }
      };

      document.querySelectorAll(".gallery a").forEach(function (link) {
         link.addEventListener("click", function (e) {
            e.preventDefault();
            lastFocus = link;
            frame.src = link.getAttribute("href");
            frame.alt = link.querySelector("img").alt;
            lightbox.classList.add("is-open");
            document.body.style.overflow = "hidden";
            lightbox.querySelector(".lightbox__close").focus();
         });
      });

      lightbox.addEventListener("click", function (e) {
         if (e.target === lightbox || e.target.closest(".lightbox__close")) { closeBox(); }
      });
      document.addEventListener("keydown", function (e) {
         if (e.key === "Escape" && lightbox.classList.contains("is-open")) { closeBox(); }
      });
   }

   /* ------------------------------------------------ contact form -> email
      This site is static HTML on GitHub Pages, so there is no server to post
      to. Instead the form composes a pre-filled message and hands it to the
      visitor's mail client, addressed to the address in data-mailto.
      To collect submissions server-side instead, point the <form> at a form
      service (Formspree, Web3Forms, ...) and delete this block.            */
   var form = document.querySelector(".form");
   if (form) {
      form.addEventListener("submit", function (e) {
         e.preventDefault();
         if (!form.reportValidity()) { return; }

         var val = function (name) {
            var el = form.elements[name];
            return el ? el.value.trim() : "";
         };

         var to = form.getAttribute("data-mailto") || "wiipa@aiie.us";
         var name = (val("firstName") + " " + val("lastName")).trim();
         var subject = val("subject") || "AIIE 2026 enquiry";

         var body = [
            "Name:  " + name,
            "Email: " + val("email"),
            "",
            val("message"),
            "",
            "—",
            "Sent from wiipa.aiie.us"
         ].join("\r\n");

         window.location.href = "mailto:" + to +
            "?subject=" + encodeURIComponent(subject) +
            "&body=" + encodeURIComponent(body);

         var note = form.querySelector(".form__note");
         if (note) {
            note.textContent = "Opening your email app with the message ready to send. " +
               "If nothing happens, email " + to + " directly.";
            note.style.color = "#6600CC";
         }
      });
   }

   /* ------------------------------------------------ footer year */
   var year = document.querySelector("[data-year]");
   if (year) { year.textContent = new Date().getFullYear(); }
})();
