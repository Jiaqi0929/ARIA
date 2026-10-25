# ARIA Nurse Dashboard — Local Source Code

This package contains the current published dashboard (version 4), with its logo,
patient list, simulated observations, alert demo, three-floor maps, lift/stair routes,
and acknowledgement/reassessment actions.

## Run on Windows — no installation required

1. Right-click ARIA_Nurse_Dashboard_Source.zip and choose Extract All.
2. Open the extracted ARIA_Nurse_Dashboard folder.
3. Double-click index.html to open the dashboard in your browser.
   You can also double-click START_ARIA.bat.
4. Select Run alert demo, then View alert & location. Use Acknowledge Alert and
   Reassessment completed to demonstrate the response workflow.

Keep index.html, styles.css, app.js, and aria-logo.png together in this folder.
Extract the ZIP before opening the website; do not run it inside the ZIP viewer.

No npm install, Node.js, database, API key, login, or backend is needed.
The dashboard works offline using fallback fonts. An internet connection loads
its original Google Fonts and gives the closest match to the hosted appearance.

## Optional: run through localhost

If Python is already installed, open PowerShell in this folder and run:

    py -m http.server 8000 --bind 127.0.0.1

Then open http://127.0.0.1:8000/index.html in your browser.
If your Python command is python instead of py, use python in the command above.
Press Ctrl+C in PowerShell to stop the server.

## Files and editing

- index.html — page structure, headings, and popup layout.
- styles.css — blue theme, typography, colours, and responsive layout.
- app.js — sample patients, simulated readings and alerts, floor maps,
  shortest-route calculation, and response actions.
- aria-logo.png — your ARIA logo.
- START_ARIA.bat — opens index.html with the default Windows browser.

Open the folder in your code editor, edit the files, save, and refresh the browser.
Local changes do not update the hosted website automatically.

## Current implementation

This is a frontend demonstration. Readings, patient-match confidence, and events
are simulated. The route graph uses an example layout with three floors and
48 seats per floor. This package does not include CCTV/video processing, a trained
AI model, live BLE tracking, real patient data, or a Huawei Cloud backend.
Refreshing the page resets the demonstration state. These integrations can be
added separately when developing the full ARIA system.

## Source reference

Hosted website: https://aria-nurse-dashboard.neilboo005.chatgpt.site
Site version: 4
Source commit: 221c1e99aed09d055da530700a8e165f017d972c
Export date: 25 October 2026

The four website files are unchanged from the retrieved source. The README and
Windows launcher were added only to make this local copy easier to use.


## CCTV demo update
- Original ARIA layout, patient detail dialog, alert workflow, and three-floor corridor routing are retained.
- All 12 profiles P001–P012 are present. P001–P004 are set as male and P005–P012 as female for this prototype dataset.
- `hospital_cctv.avi` is the exact uploaded file renamed as requested. `hospital_cctv.mp4` is a browser-friendly H.264 copy used by the player because many browsers do not play AVI directly.
- `p003-fall-down.png` is the supplied P003 fall-down reference image. It appears beside the video and in P003's detail dialog.
- On video playback, P003 changes to Watch at 00:04 and Urgent Review at 00:06. The same alert card updates from yellow to red, so Watch count returns to 0 and Urgent Review becomes 1.
- Pausing holds the video time and current status; the final alert stays visible when playback ends. Use Restart video & reset alert to clear the event sequence.
- All readings and confidence values are simulated demo values. The timed alerts are configured events, not AI-confirmed fall detections or clinical measurements.


## Revision: patient status and data consistency
- Gender assignments: P001, P002, P003, P004 and P011 are male; P005, P006, P007, P008, P009, P010 and P012 are female.
- The P003 side panel stays hidden during Stable (video 00:00–00:03), appears during Watch (00:04–00:05), and appears during Urgent Review (00:06 through the end).
- The video is centered and wider while P003 is Stable. When Watch/Urgent Review activates, the video moves to the left and P003 details appear on the right.
- Heart rate, respiration, temperature, posture, movement and status are read from the same P003 patient object for the patient card, side panel and detail dialog.
- Run alert demo now targets P003 and updates the shared P003 data according to the selected scenario. Values are prototype demonstration readings, not clinical sensor readings.
- Seeking to another time follows that time interval. Pausing holds the current interval; the last alert remains after the video ends.


## Distinct P003 alert images
- `p003-watch.png` uses the supplied Watch-stage image and is shown only during Watch (00:04–00:05).
- `p003-fall-down.png` uses the supplied fall-down image and is shown only during Urgent Review (00:06 to the end).
- Both images are hidden while P003 is Stable.
