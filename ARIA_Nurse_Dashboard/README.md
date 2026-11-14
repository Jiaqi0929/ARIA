# ARIA nurse dashboard: offline copy with demo add-ons

A copy of the live prototype (aria-wn0k.onrender.com) that runs without internet and adds two things to the demo:

1. **Early-warning replay.** At 0:04, Mr Tan (P003) goes to Watch because his breathing left the normal range. A chart replays his last 30 minutes (17 → 28 breaths/min) through NEWS2 zones, with the steps Watch (T−25) → Reminder (T−10) → Urgent (T−0).
2. **Three witnesses.** At 0:06, the camera, radar, thermal and wristband + face rows tick in one by one, then **URGENT REVIEW**. "View patient profile & route" only appears after the decision.

3. **Fuller CCTV box on wide screens (1400 px and up, e.g. a full-screen projector).**
   - Left rail **Sensors**: camera, radar, thermal, wristbands and Atlas edge AI, each with a pulsing "online" dot.
   - Right rail **The monitoring gap**: time since each patient's last nurse check (Mr Tan longest at 1 h 58 min), plus "ARIA: watching all 12 continuously". It hands over to Mr Tan's preview when the alert fires.
   - Video overlay: "● ARIA analysing" and "12 tracked · 3 sensors fused · 0 alerts", which turns amber at Watch and red at Urgent.
   - On laptop-width screens the rails hide, and the overlay stays.

Also new in the Workflow demo dropdown: **"False-alarm check: resting patient (P001)"**. Mr Rahman lies across the seats with steady breathing, and ARIA raises **no alert**.

All values are a simulated demo scenario.

## How to run it at the venue (no internet)

1. Copy this whole folder to the presenting laptop.
2. Double-click `index.html`. It opens in Chrome or Edge. Video seeking and everything else works from the file directly.
3. Press play on the CCTV video. Pause at 0:06 if you want time to talk through the witnesses.

Fonts fall back to Arial offline, which is fine.

## Demo click order (about 2 minutes)

0. Before pressing play (full screen): point left, *"three sensors and the wristbands, all online, fused on the Atlas in the room"*, then right, *"Mr Tan was last checked almost two hours ago. That's the monitoring gap. ARIA watches all 12 in between."*
1. Play the CCTV. At **0:04**: point at the Watch banner and the rising breathing line. *"ARIA saw it coming, 25 minutes before the fall."*
2. At **0:06** (pause): the witness rows tick in. *"Camera, radar and thermal all agree, and the wristband confirms it's Mr Tan. That's when ARIA alerts."*
3. Click **View patient profile & route**, then **Acknowledge Alert**, then **Reassessment completed**.
4. Optional: **Reset demo**, choose **False-alarm check**, click **Run alert demo**. *"A camera alone would alarm here too. ARIA doesn't, because his breathing is normal."*

## What changed in the code

New files:
- `aria-addons.js`: the add-ons (data, chart, witness panel). Exposes `window.ariaAddons`.
- `aria-addons.css`: styles, all prefixed `aa-` so they don't clash with `styles.css`.

`index.html`:
- loads `aria-addons.css` and `aria-addons.js` (before `app.js`)
- demo panel text: "John Doe" → "Mr Tan (P003)"
- new dropdown option `false-alarm`

`app.js` (each change marked with an `ARIA add-on` comment):
- `updateP003()`: Watch reason is now "Breathing above normal range (22/min)" instead of "Unusual movement detected"; calls `ariaAddons.onStage(stage)` at the end.
- `sync()`: calls `ariaAddons.onTime(t)` so the trend replays smoothly between 0:04 and 0:06.
- `renderPatients()`: sparkline under Mr Tan's respiration value.
- `renderDialog()`: breathing chart at the bottom of the details column.
- `runDemo()`: accepts `false-alarm`.

The untouched originals are in `original/`. To update the live site, upload `index.html`, `app.js`, `aria-addons.js` and `aria-addons.css` to the onrender project.

## Still for the team to decide

- **Heart rate** (92 → 108 bpm) is still shown, as before. Decide its source (e.g. "radar estimate") or remove it, so it doesn't contradict "the wristband doesn't measure heartbeat".
- **Patient in the scenario videos** looks younger than Mr Tan (72). Either change his age in `app.js` (`initialPatients`, P003) or leave it.
