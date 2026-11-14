'use strict';
/* ARIA demo add-ons: early-warning replay + three-witness decision.
   Driven by app.js through window.ariaAddons.onStage(stage) and onTime(seconds).
   All values are a simulated demo scenario. Breathing thresholds follow NEWS2. */
(() => {
  // ---------- scenario data (simulated) ----------
  // Breathing for P003, one reading per minute, T-30 .. T-0. Watch at T-25 (22/min) and fall at T-0 (28/min) match app.js.
  const RR = [17,18,17,18,19,22,22,22,22,23,23,22,23,23,24,23,24,24,24,24,25,25,25,26,25,26,26,27,27,27,28];
  const TP = RR.map((_, i) => Math.round((36.6 + 0.3 * i / 30) * 10) / 10); // 36.6 -> 36.9 (normal range)
  const REST = Array.from({ length: 31 }, (_, i) => [18,17,18,19,18,17][i % 6]);  // P001 resting: steady around his 18/min baseline
  const N = 30, WATCH_I = 5, REMIND_I = 20;
  const news = r => r <= 8 ? 3 : r <= 11 ? 1 : r <= 20 ? 0 : r <= 24 ? 2 : 3;
  const tlabel = i => i >= N ? 'T−0' : `T−${N - i} min`;

  const WIT = {
    watch: {
      who: 'P003 · Wei Ming Tan · Zone A, Seat 1',
      rows: [
        ['Camera', 'posture', 'Seated, moving less', 'pose model', 'wait', '… watching'],
        ['mmWave radar', 'breathing', 'Breathing 18 → 22/min, rising', 'NEWS2 score 2', 'yes', '✓ changed'],
        ['Thermal', 'presence', 'Warm body in seat, 36.7 °C', 'normal', 'wait', '— normal'],
        ['Wristband + face', 'who & where', 'P003 Wei Ming Tan · Zone A, Seat 1', 'face match 98% + wristband in zone', 'id', '✓ identity']],
      dec: ['watch', '▲ WATCH', 'Breathing only. Nurse prompted to check within 30 min.']
    },
    urgent: {
      who: 'P003 · Wei Ming Tan · Zone A, Seat 1',
      rows: [
        ['Camera', 'posture', 'Fallen posture: lying on the floor', 'pose model · 0:06', 'yes', '✓ agrees'],
        ['mmWave radar', 'breathing', 'Breathing 18 → 28/min, rising', '+10/min from baseline · NEWS2 3', 'yes', '✓ agrees'],
        ['Thermal', 'presence', 'Warm body on the floor, 36.9 °C', 'confirms a person, not an object', 'yes', '✓ agrees'],
        ['Wristband + face', 'who & where', 'P003 Wei Ming Tan · Zone A, Seat 1', 'face match 98% + wristband in zone', 'id', '✓ identity']],
      dec: ['urgent', '■ URGENT REVIEW', 'All witnesses agree. Nurse routed to Zone A, Seat 1.']
    },
    rest: {
      who: 'P001 · Daniel Rahman · Zone B, Seat 19',
      rows: [
        ['Camera', 'posture', 'Lying across the seats', 'pose model', 'yes', '✓ unusual posture'],
        ['mmWave radar', 'breathing', 'Breathing about 18/min, steady', 'no change from baseline · NEWS2 0', 'no', '— normal'],
        ['Thermal', 'presence', 'Warm body on the seats, 36.4 °C', 'person present', 'no', '— normal'],
        ['Wristband + face', 'who & where', 'P001 Daniel Rahman · Zone B, Seat 19', 'face match 97% + wristband in zone', 'id', '✓ identity']],
      dec: ['ok', '● NO ALERT', 'Posture only, breathing steady: likely resting. Logged and watched.']
    }
  };

  // ---------- small SVG line chart ----------
  const NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function chart(data, upto, { w, h, compact = false, events = true, y0 = 10, y1 = 32 }) {
    const m = compact ? { l: 2, r: 2, t: 2, b: 2 } : { l: 30, r: 10, t: 16, b: 22 };
    const X = i => m.l + (w - m.l - m.r) * i / N, Y = v => m.t + (h - m.t - m.b) * (1 - (v - y0) / (y1 - y0));
    const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, class: 'aa-svg', role: 'img',
      'aria-label': `Breathing rate ${data[0]} to ${data[upto]} breaths per minute, ${tlabel(0)} to ${tlabel(upto)}` });
    const bands = [[12, 20, 'aa-band-ok', 'Normal 12–20'], [20.5, 24.5, 'aa-band-watch', 'Score 2'], [24.5, y1, 'aa-band-crit', 'Score 3']];
    bands.forEach(([lo, hi, cls, lab]) => {
      const yt = Y(Math.min(hi, y1)), yb = Y(lo);
      svgEl('rect', { x: m.l, y: yt, width: w - m.l - m.r, height: yb - yt, class: cls }, svg);
      if (!compact) { const t = svgEl('text', { x: w - m.r - 4, y: yb - 4, 'text-anchor': 'end', class: 'aa-bandlab ' + cls + '-ink' }, svg); t.textContent = lab; }
    });
    if (!compact) {
      [12, 20, 28].forEach(v => { const t = svgEl('text', { x: m.l - 5, y: Y(v) + 4, 'text-anchor': 'end', class: 'aa-tick' }, svg); t.textContent = v; });
      [0, 10, 20, 30].forEach(i => { const t = svgEl('text', { x: X(i), y: h - 6, 'text-anchor': 'middle', class: 'aa-tick' }, svg); t.textContent = i === 30 ? 'T−0' : `−${30 - i} min`; });
      if (events) [[WATCH_I, 'Watch', 'watch'], [REMIND_I, 'Reminder', 'watch'], [N, 'Fall', 'crit']].forEach(([i, lab, k]) => {
        if (i > upto) return;
        svgEl('line', { x1: X(i), x2: X(i), y1: m.t, y2: h - m.b, class: 'aa-ev aa-ev-' + k }, svg);
        const t = svgEl('text', { x: X(i) + (i === N ? -4 : 4), y: m.t - 4, 'text-anchor': i === N ? 'end' : 'start', class: 'aa-evlab' }, svg); t.textContent = lab;
      });
    }
    const pts = data.slice(0, upto + 1).map((v, i) => `${X(i)},${Y(v)}`).join(' ');
    if (upto > 0) svgEl('polyline', { points: pts, class: 'aa-line' + (compact ? ' aa-line-thin' : '') }, svg);
    svgEl('circle', { cx: X(upto), cy: Y(data[upto]), r: compact ? 2.5 : 4.5, class: 'aa-end' }, svg);
    if (!compact) {  // hover readings
      for (let i = 0; i <= upto; i++) {
        const r = svgEl('rect', { x: X(i) - (w - m.l - m.r) / N / 2, y: m.t, width: (w - m.l - m.r) / N, height: h - m.t - m.b, class: 'aa-hit' }, svg);
        svgEl('title', {}, r).textContent = `${tlabel(i)}: ${data[i]} breaths/min · NEWS2 score ${news(data[i])}`;
      }
    }
    return svg;
  }

  // ---------- build the strip ----------
  const $ = id => document.getElementById(id);
  const strip = document.createElement('section');
  strip.className = 'aa-strip'; strip.id = 'aa-strip'; strip.hidden = true;
  strip.setAttribute('aria-label', 'ARIA reasoning: early warning and three-witness decision');
  strip.innerHTML = `
    <div class="aa-col">
      <div class="aa-head"><small>EARLY WARNING · REPLAY OF THE LAST 30 MIN</small><span class="aa-clock" id="aa-clock"></span></div>
      <div class="aa-banner" id="aa-banner"></div>
      <div class="aa-chart" id="aa-chart"></div>
      <ol class="aa-ladder" id="aa-ladder">
        <li data-at="${WATCH_I}"><span>T−25 min</span><b>▲ Watch</b><em>Breathing 22/min, out of normal range. Nurse prompted.</em></li>
        <li data-at="${REMIND_I}"><span>T−10 min</span><b>▲ Reminder</b><em>Not yet checked. 25/min, NEWS2 score 3.</em></li>
        <li data-at="${N}"><span>T−0</span><b>■ Urgent review</b><em>Fall detected. All witnesses agree.</em></li>
      </ol>
      <p class="aa-note">Simulated scenario data · breathing thresholds follow NEWS2 · temperature stays normal, so it isn't a trigger here.</p>
    </div>
    <div class="aa-col">
      <div class="aa-head"><small>THREE WITNESSES · ONE DECISION</small><span class="aa-who" id="aa-who"></span></div>
      <div class="aa-rows" id="aa-rows"></div>
      <div class="aa-decision" id="aa-dec"></div>
      <p class="aa-note">Urgent review only when posture <b>and</b> breathing both change, and identity is confirmed. Posture alone is logged, not alarmed.</p>
    </div>`;
  const card = document.querySelector('.cctv-card'), bottom = card && card.querySelector('.cctv-bottom');
  if (bottom) bottom.after(strip); else if (card) card.appendChild(strip);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mode = 'stable', timers = [], lastIdx = -1;
  const routeBtn = () => $('p003-open-details');

  function drawTrend(idx, data = RR, rest = false) {
    const box = $('aa-chart'); box.innerHTML = ''; box.appendChild(chart(data, idx, { w: 560, h: 170, events: !rest }));
    $('aa-clock').textContent = rest ? 'Last 30 min · steady' : 'Replay ' + tlabel(idx);
    strip.querySelectorAll('#aa-ladder li').forEach(li => li.classList.toggle('on', !rest && idx >= +li.dataset.at));
    $('aa-ladder').hidden = rest;
    const b = $('aa-banner');
    if (rest) { b.className = 'aa-banner ok'; b.innerHTML = '<strong>Mr Rahman: breathing steady at about 18/min.</strong> Inside the normal range the whole time.'; }
    else { b.className = 'aa-banner'; b.innerHTML = '<strong>ARIA flagged Watch 25 minutes before the fall.</strong> Breathing left the normal range at T−25 min.'; }
    lastIdx = idx;
  }
  function renderWitness(key, animate) {
    timers.forEach(clearTimeout); timers = [];
    const s = WIT[key];
    $('aa-who').textContent = s.who;
    $('aa-rows').innerHTML = s.rows.map(r => `<div class="aa-row"><div class="aa-src"><b>${r[0]}</b><span>${r[1]}</span></div><div class="aa-saw">${r[2]}<small>${r[3]}</small></div><span class="aa-mark aa-${r[4]}">${r[5]}</span></div>`).join('');
    const d = $('aa-dec'); d.className = 'aa-decision aa-dec-' + s.dec[0]; d.innerHTML = `<strong>${s.dec[1]}</strong><span>${s.dec[2]}</span>`;
    const rows = [...strip.querySelectorAll('.aa-row')];
    const done = () => { d.classList.add('on'); if (key === 'urgent' && routeBtn()) routeBtn().hidden = false; };
    if (key === 'urgent' && routeBtn()) routeBtn().hidden = true;
    if (!animate || reduce) { rows.forEach(r => r.classList.add('on')); done(); return; }
    rows.forEach((r, k) => timers.push(setTimeout(() => r.classList.add('on'), 400 * (k + 1))));
    timers.push(setTimeout(done, 400 * rows.length + 300));
  }

  // ---------- side rails + video overlay (fill the CCTV card on wide screens) ----------
  const main = card && card.querySelector('.cctv-main'), frame = card && card.querySelector('.cctv-video-frame');
  const SENSORS = [
    ['Camera', '12 people tracked'], ['mmWave radar', 'breathing for 12'], ['Thermal', '12 warm bodies'],
    ['Wristbands', '12 / 12 connected'], ['Atlas edge AI', 'analysing · 0.2 s delay']];
  // Minutes since each patient's last nurse check (simulated). Mr Tan is the longest: the monitoring gap.
  const CHECKS = [['P003','Wei Ming Tan','A·1',118],['P004','Raj Kumar','C·31',96],['P001','Daniel Rahman','B·19',84],['P011','Arjun Patel','C·33',71],
    ['P006','Nur Aisyah Hassan','C·32',63],['P002','John Lim','A·2',55],['P009','Amira Abdullah','A·3',47],['P008','Grace Wong','D·44',39],
    ['P012','Hana Ibrahim','D·45',31],['P005','Sarah Lim','B·20',24],['P010','Chloe Chen','B·21',18],['P007','Priya Nair','D·43',9]];
  const t0 = Date.now();
  const fmtMin = m => m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
  let sensorRail, gapRail, overlay;
  if (main && frame) {
    sensorRail = document.createElement('aside');
    sensorRail.className = 'aa-rail aa-sensors';
    sensorRail.setAttribute('aria-label', 'ARIA sensor status');
    sensorRail.innerHTML = `<div class="aa-rail-head"><small>SENSORS</small><b>All witnesses online</b></div>
      <ul>${SENSORS.map(([n, d]) => `<li><i class="aa-dot"></i><span><b>${n}</b><em>${d}</em></span></li>`).join('')}</ul>
      <div class="aa-fused"><b>3 sensors fused</b><span>on the Huawei Atlas inside the hospital. Video never leaves the room.</span></div>
      <p class="aa-sim">Simulated demo values</p>`;
    gapRail = document.createElement('aside');
    gapRail.className = 'aa-rail aa-gap';
    gapRail.setAttribute('aria-label', 'Time since each patient’s last nurse check');
    gapRail.innerHTML = `<div class="aa-rail-head"><small>THE MONITORING GAP</small><b>Time since last nurse check</b></div>
      <ul id="aa-gap-list"></ul>
      <div class="aa-watching"><i class="aa-dot"></i><span><b>ARIA: watching all 12 continuously</b><em>between every check</em></span></div>`;
    main.insertBefore(sensorRail, frame);
    frame.after(gapRail);
    overlay = document.createElement('div');
    overlay.className = 'aa-overlay';
    overlay.innerHTML = `<span class="aa-chip"><i class="aa-dot"></i>ARIA analysing</span><span class="aa-chip aa-stats" id="aa-stats"></span>`;
    frame.appendChild(overlay);
  }
  function renderGap() {
    const list = $('aa-gap-list'); if (!list) return;
    const extra = Math.floor((Date.now() - t0) / 60000);  // bars keep growing while the page is open
    list.innerHTML = CHECKS.map(([id, name, seat, m]) => {
      const mm = m + extra, pct = Math.min(100, mm / 120 * 100);
      return `<li class="${mm >= 90 ? 'long' : ''}"><span class="aa-gn"><b>${name}</b><em>${seat}</em></span><span class="aa-gt">${fmtMin(mm)}</span><span class="aa-gb"><i style="width:${pct}%"></i></span></li>`;
    }).join('');
  }
  function renderStats(stage) {
    const s = $('aa-stats'); if (!s) return;
    const alertTxt = stage === 'urgent' ? '1 urgent alert' : stage === 'watch' ? '1 watch alert' : '0 alerts';
    s.textContent = `12 tracked · 3 sensors fused · ${alertTxt}`;
    s.classList.toggle('warn', stage === 'watch'); s.classList.toggle('crit', stage === 'urgent');
  }
  renderGap(); renderStats('stable'); setInterval(renderGap, 30000);

  // ---------- public API used by app.js ----------
  window.ariaAddons = {
    onStage(stage) {
      if (stage === mode) return;
      if (stage !== 'stable' || mode !== 'rest') renderStats(stage);
      mode = stage;
      if (stage === 'stable') { timers.forEach(clearTimeout); timers = []; strip.hidden = true; if (routeBtn()) routeBtn().hidden = false; lastIdx = -1; return; }
      strip.hidden = false;
      if (stage === 'watch') { drawTrend(WATCH_I); renderWitness('watch', true); }
      if (stage === 'urgent') { drawTrend(N); renderWitness('urgent', true); }
    },
    onTime(t) {  // smooth replay between the Watch (0:04) and Urgent (0:06) marks
      if (mode !== 'watch') return;
      const idx = Math.max(WATCH_I, Math.min(N - 1, Math.round(WATCH_I + (t - 4) / 2 * (N - WATCH_I))));
      if (idx !== lastIdx) drawTrend(idx);
    },
    falseAlarm() {  // workflow-demo option: resting patient, no alert
      mode = 'rest'; strip.hidden = false; drawTrend(N, REST, true); renderWitness('rest', true);
      strip.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    },
    reset() { mode = 'x'; this.onStage('stable'); renderStats('stable'); },
    cardSpark(p) {  // sparkline for P003's patient card
      if (p.id !== 'P003' || p.status === 'stable' || mode === 'rest') return '';
      const idx = p.status === 'urgent' ? N : Math.max(WATCH_I, lastIdx);
      return `<span class="aa-spark" title="Breathing, last 30 min (normal band shaded)">${chart(RR, idx, { w: 90, h: 26, compact: true }).outerHTML}</span>`;
    },
    dialogTrend(p) {  // full chart inside the patient details dialog
      if (p.id !== 'P003' || p.status === 'stable') return '';
      const idx = p.status === 'urgent' ? N : Math.max(WATCH_I, lastIdx);
      return `<div class="aa-dialog-trend"><span>Breathing · last 30 min</span>${chart(RR, idx, { w: 360, h: 150 }).outerHTML}<small>Watch raised at T−25 min · NEWS2 thresholds</small></div>`;
    }
  };
})();
