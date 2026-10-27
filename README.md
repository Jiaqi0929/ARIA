# ARIA — Adaptive Real-Time Intelligence Assessment for Emergency Care

**An intelligent patient-monitoring system concept designed to help healthcare staff identify changes in patient condition and prioritise attention.**

ARIA is our project for the Huawei ICT Competition 2026–2027 Innovation Competition. We are exploring how computer vision, patient identification, contactless sensing and intelligent risk assessment could work together to address a common challenge in healthcare: patients may experience changes in their condition between routine nursing observations.

The idea behind ARIA is simple: help nurses understand **who needs attention, where the patient is, and what may be changing in their condition**.

Our goal is not to replace nurses or clinical judgement. It is to provide an additional layer of monitoring that could help staff notice concerning changes earlier and respond more efficiently.

---

## The Problem We Want to Address

In busy emergency departments, observation wards and post-triage waiting areas, nurses often need to oversee many patients at the same time. Although patients receive assessments at appropriate intervals, changes can occur between those checks.

Conventional CCTV mainly provides visual monitoring, while individual patient monitors typically focus on specific measurements. Nurses may still need to identify a patient, locate them, review their condition and decide who needs attention first.

This creates a monitoring gap, particularly in areas where patients are waiting for further care or require continued observation.

ARIA is designed around this gap. Instead of treating patient identity, location, movement and physiological observations as separate pieces of information, the proposed system brings them together to support a clearer picture of each patient's condition.

## Our Proposed Solution

ARIA combines several components into one patient-monitoring workflow.

### 1. Patient Identification and Location

The proposed ARIA smart wristband is intended to associate monitoring information with the correct patient.

Its planned capabilities include:

- RFID/NFC-based patient identification.
- Bluetooth Low Energy (BLE) zone tracking.
- QR-code scanning as a fallback for manual identification.
- Patient location information to help nurses find the right person.

### 2. CCTV and Contactless Monitoring

The proposed contactless multi-sensor pod combines different sensing methods to observe patient activity and condition.

**RGB camera and computer vision**
- Human detection and tracking.
- Movement and activity analysis.
- Posture assessment and potential fall-event detection.
- Patient association and re-identification, subject to appropriate validation and privacy safeguards.

**Thermal sensing**
- Surface-temperature estimation.
- Monitoring temperature trends for potentially concerning changes.

**mmWave radar**
- Micro-movement analysis.
- Respiration-rate estimation.
- Detection of changes in respiration patterns.

These are proposed system capabilities. Their accuracy and suitability for clinical use would need to be validated under realistic hospital conditions.

### 3. Intelligence and Risk Assessment

A central idea in ARIA is to combine observations instead of relying on a single signal.

For example, a change in posture, reduced movement, an unusual respiration pattern or a rising temperature trend may prompt further review. The proposed system would associate relevant observations with a patient and use risk-assessment logic to determine the appropriate alert category.

The intended classifications are:

- **Stable** — no current concern identified by the system.
- **Watch** — a change has been identified and should be monitored or reviewed.
- **Urgent Review** — a potentially serious event requires prompt human assessment.

These categories are intended to support prioritisation, not to provide a medical diagnosis. A real implementation would require clinically appropriate thresholds, testing, validation and human oversight.

### 4. Nurse Dashboard and Response Workflow

The nurse dashboard is the interface through which staff would interact with the monitoring system.

It is intended to bring patient information and alerts into one place, including:

- Patient profiles and current status.
- Prioritised alerts.
- Patient location and floor-map information.
- Observation summaries.
- Alert acknowledgement and reassessment workflows.

The aim is to reduce the effort required to identify which patient needs attention and where that patient is located.

---

## System Architecture

ARIA is designed as a layered system, from patient identification and sensing through to clinical response.

| Layer | Purpose |
|---|---|
| Physical layer | Patient identification and zone tracking through wristbands and BLE. |
| Sensing layer | Contactless observation using RGB cameras, thermal sensing and mmWave radar. |
| Edge AI layer | Local processing and patient association using the proposed Huawei Atlas platform. |
| Cognitive layer | Sensor fusion, risk assessment and alert generation. |
| Cloud layer | Centralised monitoring records, alert history, device connectivity and supporting services. |
| Application layer | Nurse dashboard and clinical response workflow. |

The intended architecture separates sensor collection, analysis, risk assessment and presentation. This would allow each part to be developed and tested independently before being integrated into a complete system.

## Huawei Technology Integration

Our proposed architecture explores the use of Huawei technologies in different parts of the system.

| Technology | Intended role in ARIA |
|---|---|
| Huawei Atlas 200 | Edge AI processing. |
| MindSpore | AI model development and inference. |
| CANN | AI computing and inference acceleration. |
| Huawei IoTDA | Device connectivity and management. |
| Huawei ModelArts | Model training and deployment workflows. |
| Huawei GaussDB | Centralised monitoring records and alert history. |
| Huawei FunctionGraph | Event processing, alert routing and workflow automation. |
| Huawei Cloud OBS | Storage for suitable application assets and data. |

These technologies form the proposed architecture, rather than a claim that every service has already been integrated into the current prototype.

## Current Implementation

We have developed a working frontend prototype of the ARIA nurse dashboard to demonstrate how the application layer could look and behave.

The current prototype includes:

- A patient list with Stable, Watch and Urgent Review statuses.
- Patient profiles with observation summaries.
- A CCTV video demonstration for patient P003.
- Video-driven status changes to demonstrate the alert workflow.
- Separate visual references for Watch and Urgent Review events.
- Alert prioritisation and patient status updates.
- Hospital floor maps with patient locations.
- Route guidance from a nurse station to a patient's location.
- An alert acknowledgement and reassessment workflow.

The dashboard is built with HTML, CSS and JavaScript and can be deployed as a static website for demonstration.

### What the prototype demonstrates

The current implementation demonstrates how patient information could be presented, how a change in status could affect alert priority, and how a nurse could open a patient profile and view location and response information.

For the CCTV demonstration, the video playback position drives the simulated status of P003. This allows us to demonstrate the intended workflow without connecting physical monitoring equipment.

### Current limitations

The prototype is not yet the complete ARIA monitoring system described in our proposed architecture.

At present:

- The CCTV video is a prerecorded demonstration.
- Patient status changes are simulated in the browser.
- Computer vision is not yet connected to the dashboard as a live detection pipeline.
- The proposed wristband, thermal sensor and mmWave radar are not integrated into the working prototype.
- A central backend and persistent database are not yet implemented.
- Multiple dashboards do not yet share live patient updates through a central service.
- The system has not been clinically validated.

We distinguish the current implementation from the proposed system so that the project's progress and remaining development work are clear.

## Technology Stack

**Current dashboard**
- HTML
- CSS
- JavaScript
- GitHub for source-code management
- Render for static website deployment

**Proposed future components**
- Computer vision and AI inference.
- Multi-sensor data processing and fusion.
- Huawei edge computing and cloud services.
- Backend APIs and persistent data storage.
- Real-time alert delivery and shared dashboard updates.

The proposed technologies will be evaluated and integrated as development progresses.

## Future Development

The next stages of ARIA would focus on connecting the dashboard to the intelligence and monitoring layers.

1. **Computer vision integration** — develop and test human detection, tracking, posture analysis and potential fall-event detection.
2. **Patient association** — connect detected observations with the correct patient identity and location.
3. **Sensor integration** — evaluate thermal sensing and mmWave radar for temperature and respiration-related observations.
4. **Risk assessment** — develop and validate logic for combining observations into meaningful alert categories.
5. **Backend and database** — store patient records, alert history and acknowledgement records securely.
6. **Real-time communication** — deliver consistent updates to multiple authorised nurse dashboards.
7. **Huawei Cloud integration** — evaluate suitable services for device management, data processing, storage and event handling.
8. **Testing and validation** — assess detection accuracy, false alarms, reliability, privacy and usability before considering real clinical deployment.

Our development priority is to move from a dashboard demonstration towards an integrated system in which observations, risk assessment and clinical response are connected.

## Intended Application

ARIA is initially designed for hospital environments where patients need observation between routine clinical assessments, including:

- Observation wards.
- Post-triage waiting areas.
- Recovery areas.
- Step-down care and general wards.

The broader aim is to support earlier awareness of potentially concerning changes while helping staff prioritise their attention.

## Privacy, Safety and Clinical Responsibility

Patient monitoring involves sensitive information. A future implementation would need appropriate access controls, secure data handling, retention policies, privacy safeguards and compliance with applicable healthcare requirements.

Computer-generated alerts should be treated as prompts for human review rather than definitive diagnoses. ARIA is intended to complement clinical judgement, not replace professional assessment or emergency procedures.

**ARIA is currently a prototype and research concept. It is not a clinically validated medical device and should not be used to make real patient-care decisions.**

## Project Context

ARIA is being developed for the Huawei ICT Competition 2026–2027 Innovation Competition by our student team, with a focus on exploring how intelligent monitoring and connected systems could help address gaps in patient observation.

We welcome feedback on the system design, dashboard usability, proposed architecture and future development direction.

---

*ARIA — Adaptive Real-Time Intelligence Assessment for Emergency Care.*
