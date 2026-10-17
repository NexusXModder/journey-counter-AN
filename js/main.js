/* ==========================================================================
   Our Journey Tracker — main.js
   1. Existing behaviour (kept as-is): protection handlers, drawer, counter, milestone
   2. Presentation: opening sequence, hero light, 3D clock, tilt, reveals, dust
   ========================================================================== */
(function () {
    'use strict';

    var root = document.documentElement;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
    var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

    /* ======================================================================
       1. EXISTING BEHAVIOUR
       ====================================================================== */

    // Disable Right Click & Inspect Shortcuts (unchanged from the original page)
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && (e.key === 'c' || e.key === 'u' || e.key === 's')) {
            e.preventDefault();
        }
    });

    var drawer = $('#navDrawer');
    var backdrop = $('#backdrop');
    var menuBtn = $('#menuBtn');

    function setMenu(open) {
        drawer.classList.toggle('open', open);
        backdrop.classList.toggle('active', open);
        drawer.setAttribute('aria-hidden', String(!open));
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');

        // Removes the tip bubble permanently only when the menu is used
        var bubble = $('#tipBubble');
        if (bubble) bubble.remove();

        if (open) {
            var first = drawer.querySelector('a');
            if (first) first.focus({ preventScroll: true });
        }
    }

    // Kept as a global for compatibility with the original inline handlers
    window.toggleMenu = function () { setMenu(!drawer.classList.contains('open')); };

    menuBtn.addEventListener('click', window.toggleMenu);
    backdrop.addEventListener('click', window.toggleMenu);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && drawer.classList.contains('open')) {
            setMenu(false);
            menuBtn.focus();
        }
    });
    drawer.addEventListener('click', function (e) {
        var a = e.target.closest('a');
        if (a && a.getAttribute('href').charAt(0) === '#') setMenu(false);
    });

    // ---------- Journey counter (original logic, unchanged) ----------
    var START_DATE = new Date('2025-02-25T00:00:00+06:00');

    var elements = {
        years: $('#years .counter-number'),
        months: $('#months .counter-number'),
        days: $('#days .counter-number'),
        hours: $('#hours .counter-number'),
        minutes: $('#minutes .counter-number'),
        seconds: $('#seconds .counter-number')
    };

    var summaryElements = {
        days: $('#daysTogether'),
        totalTime: $('#totalTime')
    };

    var milestoneElements = {
        title: $('#milestoneTitle'),
        date: $('#milestoneDate'),
        days: $('#milestoneDays'),
        hours: $('#milestoneHours'),
        minutes: $('#milestoneMinutes'),
        seconds: $('#milestoneSeconds')
    };

    function pad(number) {
        return number < 10 ? '0' + number : number.toString();
    }

    function calculateDuration(start, end) {
        var years = end.getFullYear() - start.getFullYear();
        var months = end.getMonth() - start.getMonth();
        var days = end.getDate() - start.getDate();
        var hours = end.getHours() - start.getHours();
        var minutes = end.getMinutes() - start.getMinutes();
        var seconds = end.getSeconds() - start.getSeconds();

        if (seconds < 0) {
            seconds += 60;
            minutes--;
        }

        if (minutes < 0) {
            minutes += 60;
            hours--;
        }

        if (hours < 0) {
            hours += 24;
            days--;
        }

        if (days < 0) {
            months--;
            var previousMonthDays = new Date(
                end.getFullYear(),
                end.getMonth(),
                0
            ).getDate();
            days += previousMonthDays;
        }

        if (months < 0) {
            months += 12;
            years--;
        }

        return {
            years: years,
            months: months,
            days: days,
            hours: hours,
            minutes: minutes,
            seconds: seconds
        };
    }

    // Presentation helper: only touches the DOM when the value changes and
    // gives the digits a short soft roll-in (skipped for reduced motion).
    function setText(el, value) {
        if (el.textContent === value) return;
        el.textContent = value;
        if (reducedMotion.matches || !el.animate) return;
        el.animate(
            [
                { opacity: 0.2, transform: 'translateY(35%)' },
                { opacity: 1, transform: 'translateY(0)' }
            ],
            { duration: 380, easing: 'cubic-bezier(.22,.8,.24,1)' }
        );
    }

    var clockDays = $('#clockDays');
    var totalDaysTogether = 0;

    function updateCounter() {
        var now = new Date();

        if (now < START_DATE) {
            setText(elements.years, '00');
            setText(elements.months, '00');
            setText(elements.days, '00');
            setText(elements.hours, '00');
            setText(elements.minutes, '00');
            setText(elements.seconds, '00');

            summaryElements.days.textContent = '0 Days Together';
            summaryElements.totalTime.textContent = '0 Hours • 0 Minutes';
            totalDaysTogether = 0;
            clockDays.textContent = '0';
            return;
        }

        var duration = calculateDuration(START_DATE, now);

        setText(elements.years, pad(duration.years));
        setText(elements.months, pad(duration.months));
        setText(elements.days, pad(duration.days));
        setText(elements.hours, pad(duration.hours));
        setText(elements.minutes, pad(duration.minutes));
        setText(elements.seconds, pad(duration.seconds));

        var elapsedMilliseconds = now.getTime() - START_DATE.getTime();
        var totalMinutes = Math.floor(elapsedMilliseconds / 60000);
        var totalHours = Math.floor(elapsedMilliseconds / 3600000);
        var totalDays = Math.floor(elapsedMilliseconds / 86400000);

        summaryElements.days.textContent = totalDays.toLocaleString() + ' Days Together';
        summaryElements.totalTime.textContent = totalHours.toLocaleString() + ' Hours • ' + totalMinutes.toLocaleString() + ' Minutes';

        totalDaysTogether = totalDays;
        var cd = totalDays.toLocaleString();
        if (clockDays.textContent !== cd) clockDays.textContent = cd;
    }

    function getNextAnniversary(now) {
        var year = now.getFullYear();
        var anniversary = new Date(year, 1, 25, 0, 0, 0, 0);

        if (anniversary <= now) {
            year++;
            anniversary = new Date(year, 1, 25, 0, 0, 0, 0);
        }

        return anniversary;
    }

    function getOrdinal(number) {
        if (number % 100 >= 11 && number % 100 <= 13) {
            return number + 'th';
        }
        if (number % 10 === 1) {
            return number + 'st';
        }
        if (number % 10 === 2) {
            return number + 'nd';
        }
        if (number % 10 === 3) {
            return number + 'rd';
        }
        return number + 'th';
    }

    // Presentation only: progress between the previous milestone (or the start
    // date) and the next anniversary, drawn as the ring around the days-left number.
    var milestoneCard = $('.milestone');
    var milestonePct = $('#milestonePct');
    var lastPct = -1;

    function updateProgress(now, next) {
        var prev = new Date(next.getFullYear() - 1, 1, 25, 0, 0, 0, 0);
        if (prev < START_DATE) prev = START_DATE;
        var p = (now.getTime() - prev.getTime()) / (next.getTime() - prev.getTime());
        p = clamp(p, 0, 1);
        var pct = Math.floor(p * 100);
        if (pct === lastPct) return;
        lastPct = pct;
        milestoneCard.style.setProperty('--p', p.toFixed(4));
        milestonePct.textContent = pct + '%';
    }

    function updateMilestone() {
        var now = new Date();
        var milestone = getNextAnniversary(now);
        var anniversaryNumber = milestone.getFullYear() - START_DATE.getFullYear();

        milestoneElements.title.textContent = 'Our ' + getOrdinal(anniversaryNumber) + ' Anniversary';
        milestoneElements.date.textContent = milestone.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        var difference = milestone.getTime() - now.getTime();
        var totalSeconds = Math.floor(difference / 1000);
        var days = Math.floor(totalSeconds / 86400);
        var hours = Math.floor((totalSeconds % 86400) / 3600);
        var minutes = Math.floor((totalSeconds % 3600) / 60);
        var seconds = totalSeconds % 60;

        setText(milestoneElements.days, pad(days));
        setText(milestoneElements.hours, pad(hours));
        setText(milestoneElements.minutes, pad(minutes));
        setText(milestoneElements.seconds, pad(seconds));

        updateProgress(now, milestone);
    }

    // Text running around the clock's floating ring. Built from plain HTML characters
    // (SVG text is re-laid-out every frame while the 3D scene moves, which made scrolling heavy).
    var ringChars = $('#ringChars');
    var lastRing = '';
    function updateRingText() {
        var now = new Date();
        var date = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        var phrase = date + ' \u2665 ' + totalDaysTogether.toLocaleString() + ' days together \u2665 ';
        if (phrase === lastRing) return;
        lastRing = phrase;
        var reps = Math.max(1, Math.round(156 / phrase.length));
        var text = '';
        for (var i = 0; i < reps; i++) text += phrase;
        var step = 360 / text.length, frag = document.createDocumentFragment();
        for (var j = 0; j < text.length; j++) {
            if (text.charAt(j) === ' ') continue;
            var sp = document.createElement('span');
            sp.textContent = text.charAt(j);
            sp.style.transform = 'rotate(' + (j * step).toFixed(3) + 'deg) translateY(-240px)';
            frag.appendChild(sp);
        }
        ringChars.textContent = '';
        ringChars.appendChild(frag);
    }

    function updateEverything() {
        updateCounter();
        updateMilestone();
        updateRingText();
    }

    // Tick on the second boundary (no drift) and rest while the tab is hidden.
    var tickTimer = null;
    function tick() {
        updateEverything();
        tickTimer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    }
    function startTicking() { if (tickTimer === null) tick(); }
    function stopTicking() { clearTimeout(tickTimer); tickTimer = null; }

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) stopTicking(); else { stopTicking(); startTicking(); }
    });
    startTicking();

    /* ======================================================================
       2. PRESENTATION
       ====================================================================== */

    // ---------- Opening sequence → .ready (starts the hero choreography) ----------
    (function () {
        var intro = $('#intro');
        var seen = false;
        try { seen = sessionStorage.getItem('introSeen') === '1'; } catch (e) {}
        var done = false;
        function ready() { if (!done) { done = true; root.classList.add('ready'); } }

        if (!intro || seen || reducedMotion.matches) {
            if (intro) intro.classList.add('skip');
            ready();
            return;
        }
        try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}

        function open() {
            intro.classList.add('go');
            setTimeout(ready, 450);
            setTimeout(function () { intro.classList.add('skip'); }, 1300);
        }
        var t = setTimeout(open, 2500);
        intro.addEventListener('click', function () { clearTimeout(t); open(); }, { once: true });
        setTimeout(ready, 5000); // failsafe
    })();

    // ---------- Scroll reveals ----------
    var revealEls = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        var revealIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    revealIO.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        revealEls.forEach(function (el) { revealIO.observe(el); });
    } else {
        revealEls.forEach(function (el) { el.classList.add('in'); });
    }

    // ---------- Scroll: tip bubble steps aside, hero eases out ----------
    var hero = $('.hero');
    var scrollTicking = false;
    var heroH = hero.offsetHeight, lastSp = -1, tipAway = null;
    window.addEventListener('resize', function () { heroH = hero.offsetHeight; });
    function onScrollFrame() {
        scrollTicking = false;
        var y = window.scrollY;
        var away = y > 140;
        if (away !== tipAway) {
            tipAway = away;
            var bubble = $('#tipBubble');
            if (bubble) bubble.classList.toggle('away', away);
        }
        // hero eases out only while it is on screen; once past it the value is parked at 1
        if (!reducedMotion.matches) {
            var sp = clamp(y / (heroH * 0.85), 0, 1);
            if (sp !== lastSp) { lastSp = sp; hero.style.setProperty('--sp', sp.toFixed(3)); }
        }
    }
    window.addEventListener('scroll', function () {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(onScrollFrame);
    }, { passive: true });

    // ---------- Hero: pointer / device-tilt light ----------
    var heroTarget = { x: 0, y: 0 }, heroCur = { x: 0, y: 0 };
    var rafHero = 0;
    var heroVisible = true;

    function pumpHero() {
        heroCur.x += (heroTarget.x - heroCur.x) * 0.1;
        heroCur.y += (heroTarget.y - heroCur.y) * 0.1;
        hero.style.setProperty('--rx', heroCur.x.toFixed(3));
        hero.style.setProperty('--ry', heroCur.y.toFixed(3));
        if (Math.abs(heroTarget.x - heroCur.x) + Math.abs(heroTarget.y - heroCur.y) > 0.002 && heroVisible) {
            rafHero = requestAnimationFrame(pumpHero);
        } else {
            rafHero = 0;
        }
    }
    function aimHero(x, y) {
        heroTarget.x = clamp(x, -1, 1);
        heroTarget.y = clamp(y, -1, 1);
        if (!rafHero && !reducedMotion.matches) rafHero = requestAnimationFrame(pumpHero);
    }
    hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        aimHero(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { aimHero(0, 0); });

    // Phone tilt (shared by the hero and the clock)
    var tilt = { x: 0, y: 0, on: false };
    window.addEventListener('deviceorientation', function (e) {
        if (e.gamma == null || e.beta == null) return;
        tilt.on = true;
        tilt.x = clamp(e.gamma / 30, -1, 1);
        tilt.y = clamp((e.beta - 50) / 40, -1, 1);
        if (heroVisible) aimHero(tilt.x, tilt.y);
    }, { passive: true });

    // ======================================================================
    // 3D CLOCK
    // ======================================================================
    var clockStage = $('#clockStage');
    var hands = $('#hands');

    // ticks and numerals
    (function () {
        var ticks = $('#ticks'), nums = $('#numerals'), i, el;
        var frag = document.createDocumentFragment();
        for (i = 0; i < 60; i++) {
            el = document.createElement('i');
            el.className = i % 5 === 0 ? 'tick hr' : 'tick';
            el.style.setProperty('--i', i);
            frag.appendChild(el);
        }
        ticks.appendChild(frag);
        frag = document.createDocumentFragment();
        for (i = 1; i <= 12; i++) {
            el = document.createElement('span');
            el.className = 'num';
            el.textContent = i;
            el.style.setProperty('--i', i);
            frag.appendChild(el);
        }
        nums.appendChild(frag);
    })();

    function fitClock() {
        var w = clockStage.parentElement.clientWidth - 24;
        var s = clamp(w / 560, 0.5, 1);
        clockStage.style.setProperty('--s', s.toFixed(3));
    }
    fitClock();
    if ('ResizeObserver' in window) new ResizeObserver(fitClock).observe(clockStage.parentElement);
    else window.addEventListener('resize', fitClock);

    var ck = { tx: 0, ty: 0, x: 0, y: 0, p: 0, visible: false, raf: 0, scrolling: false, frame: 0, lastRx: 1e9, lastRy: 1e9 };
    var tiltEl = $('#cTilt'), sheen = $('#sheen');
    // Hands are moved with one inline transform each (no CSS-variable writes, which would
    // force a style recalculation of the whole 3D scene on every frame).
    var handEls = {
        hour: [$('.h-hour'), 8, 0, 0], min: [$('.h-min'), 13, 0, 0], sec: [$('.h-sec'), 18, 0, 0],
        sHour: [$('.hs-hour'), 2, 9, 12], sMin: [$('.hs-min'), 2, 9, 12], sSec: [$('.hs-sec'), 2, 9, 12]
    };
    function place(h, deg) {
        h[0].style.transform = (h[2] || h[3] ? 'translate(' + h[2] + 'px,' + h[3] + 'px) ' : '') + 'translateZ(' + h[1] + 'px) rotate(' + deg + 'deg)';
    }

    clockStage.addEventListener('pointermove', function (e) {
        var r = clockStage.getBoundingClientRect();
        ck.tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
        ck.ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    }, { passive: true });
    clockStage.addEventListener('pointerleave', function () { ck.tx = 0; ck.ty = 0; });

    function setHands(date) {
        var s = date.getSeconds() + date.getMilliseconds() / 1000;
        var m = date.getMinutes() + s / 60;
        var h = (date.getHours() % 12) + m / 60;
        var sa = (s * 6).toFixed(1), ma = (m * 6).toFixed(2), ha = (h * 30).toFixed(2);
        place(handEls.sec, sa); place(handEls.sSec, sa);
        place(handEls.min, ma); place(handEls.sMin, ma);
        place(handEls.hour, ha); place(handEls.sHour, ha);
    }

    // scroll progress is measured once per scroll frame, not once per animation frame
    var scrollIdleT = 0;
    function measureClock() {
        var r = clockStage.getBoundingClientRect();
        var vh = window.innerHeight;
        ck.p = clamp((vh * 0.98 - r.top) / (vh * 0.78), 0, 1);
    }
    window.addEventListener('scroll', function () {
        ck.scrolling = true;
        clearTimeout(scrollIdleT);
        scrollIdleT = setTimeout(function () { ck.scrolling = false; }, 140);
        if (ck.visible) measureClock();
    }, { passive: true });

    function clockFrame() {
        ck.frame++;
        // while the page is being scrolled the clock runs at half rate, leaving the main thread free
        if (ck.scrolling && (ck.frame & 1)) { ck.raf = ck.visible ? requestAnimationFrame(clockFrame) : 0; return; }

        var rise = 1 - Math.pow(1 - ck.p, 3);
        var aimX = ck.tx, aimY = ck.ty;
        if (tilt.on && !finePointer.matches) { aimX = tilt.x; aimY = tilt.y; }
        ck.x += (aimX - ck.x) * 0.09;
        ck.y += (aimY - ck.y) * 0.09;

        var rx = 20 + (1 - rise) * 58 - ck.y * 12;
        var ry = ck.x * 28 + (1 - rise) * -24;
        if (Math.abs(rx - ck.lastRx) > 0.02 || Math.abs(ry - ck.lastRy) > 0.02) {
            ck.lastRx = rx; ck.lastRy = ry;
            tiltEl.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
            sheen.style.transform = 'translate(' + (ck.x * -90).toFixed(1) + 'px,' + (ck.y * -50).toFixed(1) + 'px)';
        }

        setHands(new Date());
        ck.raf = ck.visible ? requestAnimationFrame(clockFrame) : 0;
    }

    if (reducedMotion.matches) {
        tiltEl.style.transform = 'rotateX(22deg) rotateY(0deg)';
        setHands(new Date());
        setInterval(function () { setHands(new Date()); }, 1000);
    } else if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            ck.visible = entries[0].isIntersecting;
            clockStage.classList.toggle('paused', !ck.visible);
            if (ck.visible) { measureClock(); if (!ck.raf) ck.raf = requestAnimationFrame(clockFrame); }
        }, { rootMargin: '10% 0px' }).observe(clockStage);
    } else {
        ck.visible = true;
        measureClock();
        ck.raf = requestAnimationFrame(clockFrame);
    }

    // ---------- Tilt + light on tiles and cards (mouse / pen only) ----------
    function bindTilt(sel, tiltAmt) {
        document.querySelectorAll(sel).forEach(function (el) {
            el.addEventListener('pointermove', function (e) {
                if (!finePointer.matches) return;
                var r = el.getBoundingClientRect();
                var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
                el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
                el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
                if (tiltAmt) {
                    el.style.setProperty('--tx', ((0.5 - py) * tiltAmt).toFixed(2) + 'deg');
                    el.style.setProperty('--ty', ((px - 0.5) * tiltAmt * 1.2).toFixed(2) + 'deg');
                    el.classList.add('tilting');
                }
            });
            el.addEventListener('pointerleave', function () {
                el.style.setProperty('--tx', '0deg');
                el.style.setProperty('--ty', '0deg');
                el.classList.remove('tilting');
            });
        });
    }
    bindTilt('.unit', 14);
    bindTilt('.card', 0);

    // ---------- Dust & stars canvas ----------
    var canvas = $('#dust');
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (ctx) {
        var parts = [], W = 0, H = 0, dpr = 1, rafDust = 0, last = 0;
        var lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 4) <= 2;
        var COLORS = ['255,166,210', '205,189,255', '255,255,255', '255,95,174'];

        function seed() {
            var rect = canvas.getBoundingClientRect();
            W = Math.max(1, rect.width); H = Math.max(1, rect.height);
            dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 1.5);
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            var count = Math.round(Math.min(lowEnd ? 38 : 70, (W * H) / 14000));
            parts = [];
            for (var i = 0; i < count; i++) {
                var depth = Math.random();
                parts.push({
                    x: Math.random() * W, y: Math.random() * H,
                    r: 0.4 + depth * 1.5, v: 4 + depth * 14,
                    sway: Math.random() * Math.PI * 2, a: 0.25 + depth * 0.55,
                    tw: Math.random() * Math.PI * 2,
                    c: COLORS[(Math.random() * COLORS.length) | 0]
                });
            }
        }

        function draw(t, dt) {
            ctx.clearRect(0, 0, W, H);
            for (var i = 0; i < parts.length; i++) {
                var p = parts[i];
                if (dt) {
                    p.y -= p.v * dt;
                    p.x += Math.sin(t / 2600 + p.sway) * 6 * dt;
                    if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
                }
                var tw = 0.6 + 0.4 * Math.sin(t / 900 + p.tw);
                ctx.fillStyle = 'rgba(' + p.c + ',' + (p.a * tw).toFixed(3) + ')';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, 6.2832);
                ctx.fill();
            }
        }

        function loop(t) {
            var dt = Math.min(0.05, (t - last) / 1000);
            last = t;
            draw(t, dt);
            rafDust = requestAnimationFrame(loop);
        }
        function runDust() {
            if (rafDust || reducedMotion.matches || document.hidden || !heroVisible) return;
            last = performance.now();
            rafDust = requestAnimationFrame(loop);
        }
        function stopDust() { cancelAnimationFrame(rafDust); rafDust = 0; }

        seed();
        draw(0, 0);
        if (!reducedMotion.matches) runDust();

        var resizeT;
        window.addEventListener('resize', function () {
            clearTimeout(resizeT);
            resizeT = setTimeout(function () { seed(); draw(performance.now(), 0); }, 200);
        });
        document.addEventListener('visibilitychange', function () { document.hidden ? stopDust() : runDust(); });
        if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', function () {
            if (reducedMotion.matches) { stopDust(); draw(0, 0); } else runDust();
        });

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                heroVisible = entries[0].isIntersecting;
                hero.classList.toggle('paused', !heroVisible);
                if (heroVisible) runDust(); else stopDust();
            }, { threshold: 0 }).observe(hero);
        }
    }
})();
