
from pathlib import Path
import math
import cv2
from ultralytics import YOLO


# =========================================================
# 1. SETTINGS
# =========================================================

VIDEO_PATH = Path("videos/fall_demo.mp4")
OUTPUT_DIR = Path("runs/aria")
OUTPUT_PATH = OUTPUT_DIR / "tracking_test.avi"

GREEN = (0, 255, 0)
YELLOW = (0, 255, 255)
RED = (0, 0, 255)
CYAN = (255, 255, 0)

PERSON_CONF = 0.38
POSE_CONF = 0.05
IMAGE_SIZE = 960

FALL_CONFIRM_SECONDS = 0.8
OCCLUSION_GRACE_SECONDS = 5.0
HISTORY_SECONDS = 5.0

# COCO keypoint indices
LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_HIP, RIGHT_HIP = 11, 12

SKELETON = [
    (5, 6), (5, 7), (7, 9), (6, 8), (8, 10),
    (5, 11), (6, 12), (11, 12),
    (11, 13), (13, 15), (12, 14), (14, 16),
]


# =========================================================
# 2. LOAD MODELS
# =========================================================

person_model = YOLO("yolo26n.pt")
pose_model = YOLO("yolo26n-pose.pt")


# =========================================================
# 3. BOX GEOMETRY
# =========================================================

def features(box):
    x1, y1, x2, y2 = map(float, box)
    w = max(1.0, x2 - x1)
    h = max(1.0, y2 - y1)

    return {
        "x1": x1, "y1": y1, "x2": x2, "y2": y2,
        "cx": (x1 + x2) / 2,
        "cy": (y1 + y2) / 2,
        "w": w, "h": h,
    }


def box_iou(box_a, box_b):
    a, b = features(box_a), features(box_b)

    x1 = max(a["x1"], b["x1"])
    y1 = max(a["y1"], b["y1"])
    x2 = min(a["x2"], b["x2"])
    y2 = min(a["y2"], b["y2"])

    intersection = max(0, x2 - x1) * max(0, y2 - y1)
    union = a["w"] * a["h"] + b["w"] * b["h"] - intersection

    return intersection / union if union > 0 else 0.0


def is_duplicate_box(box_a, box_b):
    a = features(box_a)
    b = features(box_b)

    x1 = max(a["x1"], b["x1"])
    y1 = max(a["y1"], b["y1"])
    x2 = min(a["x2"], b["x2"])
    y2 = min(a["y2"], b["y2"])

    intersection = max(0, x2 - x1) * max(0, y2 - y1)

    area_a = a["w"] * a["h"]
    area_b = b["w"] * b["h"]
    smaller_area = min(area_a, area_b)

    if smaller_area <= 0:
        return False

    overlap_of_smaller = intersection / smaller_area

    return overlap_of_smaller >= 0.80


# =========================================================
# 4. RECOVER AN OLD ARIA ID
# =========================================================

def match_old_identity(
    box,
    frame_no,
    history,
    max_missed,
    unavailable_ids=None,
):
    """
    Experimental recovery of a previous P-number after a tracker
    ID switch. Allows significant box changes during a fall.
    """

    if unavailable_ids is None:
        unavailable_ids = set()

    current = features(box)
    candidates = []

    for person_id, old in history.items():
        if person_id in unavailable_ids:
            continue

        missed = frame_no - old["frame"]

        if missed <= 0 or missed > max_missed:
            continue

        previous = old["features"]

        dx = abs(current["cx"] - previous["cx"]) / previous["w"]
        dy = abs(current["cy"] - previous["cy"]) / previous["h"]

        wr = current["w"] / previous["w"]
        hr = current["h"] / previous["h"]

        # Permit posture changes, but reject extreme size differences.
        if not (0.20 <= wr <= 5.0):
            continue

        if not (0.20 <= hr <= 5.0):
            continue

        if dx > 4.0 or dy > 4.0:
            continue

        score = (
            dx
            + dy
            + abs(math.log(wr))
            + abs(math.log(hr))
        )

        candidates.append((score, person_id))

    candidates.sort(key=lambda item: item[0])

    if not candidates or candidates[0][0] >= 4.0:
        return None

    # Avoid a confident assignment when two candidates look similar.
    if (
        len(candidates) > 1
        and candidates[1][0] - candidates[0][0] < 0.20
    ):
        return None

    return candidates[0][1]


# =========================================================
# 5. MATCH POSES TO PERSON BOXES
# =========================================================

def match_poses(person_boxes, pose_result):
    matches = {}

    if pose_result.boxes is None or pose_result.keypoints is None:
        return matches

    pose_boxes = pose_result.boxes.xyxy.cpu().tolist()
    keypoints = pose_result.keypoints.data.cpu().numpy()

    candidates = []

    for person_index, person_box in enumerate(person_boxes):
        p = features(person_box)

        for pose_index, pose_box in enumerate(pose_boxes):
            q = features(pose_box)

            centre_inside = (
                p["x1"] <= q["cx"] <= p["x2"]
                and p["y1"] <= q["cy"] <= p["y2"]
            )

            overlap = box_iou(person_box, pose_box)

            if centre_inside or overlap >= 0.15:
                score = overlap + (0.25 if centre_inside else 0)
                candidates.append((score, person_index, pose_index))

    # One-to-one matching: each pose is assigned at most once.
    candidates.sort(reverse=True)

    used_people = set()
    used_poses = set()

    for score, person_index, pose_index in candidates:
        if person_index in used_people or pose_index in used_poses:
            continue

        matches[person_index] = {
            "points": keypoints[pose_index],
            "box": pose_boxes[pose_index],
            "score": score,
        }

        used_people.add(person_index)
        used_poses.add(pose_index)

    return matches


def draw_skeleton(frame, points):
    for a, b in SKELETON:
        if points[a][2] >= POSE_CONF and points[b][2] >= POSE_CONF:
            pa = (int(points[a][0]), int(points[a][1]))
            pb = (int(points[b][0]), int(points[b][1]))
            cv2.line(frame, pa, pb, CYAN, 2)

    for x, y, confidence in points:
        if confidence >= POSE_CONF:
            cv2.circle(frame, (int(x), int(y)), 3, RED, -1)


def midpoint(points, a, b):
    if points[a][2] < POSE_CONF or points[b][2] < POSE_CONF:
        return None

    return (
        (float(points[a][0]) + float(points[b][0])) / 2,
        (float(points[a][1]) + float(points[b][1])) / 2,
    )


def get_pose_features(points):
    shoulders = midpoint(points, LEFT_SHOULDER, RIGHT_SHOULDER)
    hips = midpoint(points, LEFT_HIP, RIGHT_HIP)

    if shoulders is None or hips is None:
        return None

    dx = hips[0] - shoulders[0]
    dy = hips[1] - shoulders[1]

    angle = abs(math.degrees(math.atan2(dx, dy)))

    return {
        "torso_angle": angle,
        "hip_y": hips[1],
    }


# =========================================================
# 6. FALL STATE
# =========================================================



def new_state():
    return {
        "status": "Stable",
        "previous_angle": None,
        "previous_hip_y": None,
        "candidate_since": None,
        "last_seen": None,
        "last_pose_time": None,
        "fall_candidate": False,
        "upright_since": None,
        "watch_until": None,
        "movement_history": [],
    }

def update_status(person_id, pose_info, timestamp, states):
    if person_id not in states:
        states[person_id] = new_state()

    state = states[person_id]
    state.setdefault("upright_since", None)
    state.setdefault("watch_until", None)
    state["last_seen"] = timestamp

    # Keep the current alert briefly if pose keypoints disappear.
    if pose_info is None:
        if state["status"] == "Urgent Review":
            return state["status"]

        if state["last_pose_time"] is not None:
            missing_time = timestamp - state["last_pose_time"]
            if missing_time <= OCCLUSION_GRACE_SECONDS:
                return state["status"]

        state["fall_candidate"] = False
        state["candidate_since"] = None
        state["status"] = "Stable"
        return state["status"]

    angle = pose_info["torso_angle"]
    hip_y = pose_info["hip_y"]

    previous_angle = state["previous_angle"]
    previous_hip_y = state["previous_hip_y"]

    # Keep urgent alerts until the person is upright for 2 seconds.
    if state["status"] == "Urgent Review":
        if angle < 35:
            if state["upright_since"] is None:
                state["upright_since"] = timestamp
            elif timestamp - state["upright_since"] >= 2.0:
                state["status"] = "Stable"
                state["fall_candidate"] = False
                state["candidate_since"] = None
                state["watch_until"] = None
                state["upright_since"] = None
        else:
            state["upright_since"] = None

        state["previous_angle"] = angle
        state["previous_hip_y"] = hip_y
        state["last_pose_time"] = timestamp
        return state["status"]

    
    # Detect rapid movement using the previous frame.
    sudden_angle_change = (
        previous_angle is not None
        and angle - previous_angle >= 20
    )

    hip_moved_down = (
        previous_hip_y is not None
        and hip_y - previous_hip_y >= 25
    )

    # Also check movement over time to catch gradual posture changes.
    history = state.setdefault("movement_history", [])

    history.append((timestamp, angle, hip_y))

    # Keep only the most recent five seconds of measurements.
    history[:] = [
        sample for sample in history
        if timestamp - sample[0] <= HISTORY_SECONDS
    ]

    # Find a measurement from at least half a second ago.
    older_samples = [
        sample for sample in history
        if timestamp - sample[0] >= 0.5
    ]

    gradual_angle_change = False
    gradual_hip_movement = False

    if older_samples:
        old_time, old_angle, old_hip_y = older_samples[-1]

        gradual_angle_change = (
            angle - old_angle >= 15
        )

        gradual_hip_movement = (
            hip_y - old_hip_y >= 35
        )

    movement_detected = (
        sudden_angle_change
        or hip_moved_down
        or gradual_angle_change
        or gradual_hip_movement
    )

    if movement_detected:
        state["watch_until"] = timestamp + 12.0

    # A sustained, strongly horizontal posture can trigger urgent review.
    if angle >= 70:
        state["fall_candidate"] = True

        if state["candidate_since"] is None:
            state["candidate_since"] = timestamp

        if timestamp - state["candidate_since"] >= FALL_CONFIRM_SECONDS:
            state["status"] = "Urgent Review"
        else:
            state["status"] = "Watch"

    else:
        # Reset the urgent timer when the horizontal posture is no longer present.
        state["fall_candidate"] = False
        state["candidate_since"] = None

        # A static sitting posture alone should not keep the person yellow.
        if (
            movement_detected
            or (
                state["watch_until"] is not None
                and timestamp <= state["watch_until"]
            )
        ):
            state["status"] = "Watch"
        else:
            state["status"] = "Stable"

        # Clear the movement warning once the person returns upright.
        if angle < 35:
            state["watch_until"] = None

    state["previous_angle"] = angle
    state["previous_hip_y"] = hip_y
    state["last_pose_time"] = timestamp

    return state["status"]

# =========================================================
# 7. VIDEO SETUP
# =========================================================

if not VIDEO_PATH.exists():
    raise FileNotFoundError(f"Video not found: {VIDEO_PATH.resolve()}")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

cap = cv2.VideoCapture(str(VIDEO_PATH))

if not cap.isOpened():
    raise RuntimeError(f"Cannot open video: {VIDEO_PATH.resolve()}")

fps = cap.get(cv2.CAP_PROP_FPS)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

if fps <= 0:
    fps = 25.0

writer = cv2.VideoWriter(
    str(OUTPUT_PATH),
    cv2.VideoWriter_fourcc(*"MJPG"),
    fps,
    (width, height),
)

if not writer.isOpened():
    cap.release()
    raise RuntimeError(f"Cannot create output: {OUTPUT_PATH.resolve()}")


# =========================================================
# 8. MAIN LOOP
# =========================================================

frame_no = 0
next_person_number = 1

# Tracker ID -> permanent ARIA display number for this run.
display_ids = {}

# Latest known position of each ARIA person.
track_history = {}

# Fall state is keyed by ARIA person number, not tracker ID.
fall_states = {}

MAX_MISSED_FRAMES = int(fps * OCCLUSION_GRACE_SECONDS)

try:
    while True:
        ok, frame = cap.read()

        if not ok:
            break

        frame_no += 1
        timestamp = frame_no / fps

        tracked = person_model.track(
            source=frame,
            tracker="botsort_aria.yaml",
            classes=[0],
            conf=PERSON_CONF,
            iou=0.45,
            imgsz=IMAGE_SIZE,
            persist=True,
            verbose=False,
        )[0]

        posed = pose_model.predict(
            source=frame,
            conf=0.05,
            imgsz=1280,
            verbose=False,
        )[0]

        output = frame.copy()
        boxes = tracked.boxes


        if boxes is not None and len(boxes) > 0:
            person_boxes = boxes.xyxy.cpu().tolist()
            confidences = boxes.conf.cpu().tolist()

            tracker_ids = (
                boxes.id.int().cpu().tolist()
                if boxes.id is not None
                else None
            )

            # Suppress highly overlapping duplicate detections.
            # Keep the box with the higher confidence.
            keep_indices = []

            for i in sorted(
                range(len(person_boxes)),
                key=lambda j: confidences[j],
                reverse=True,
            ):
                duplicate = any(
                    is_duplicate_box(person_boxes[i], person_boxes[j])
                    for j in keep_indices
                )

                if not duplicate:
                    keep_indices.append(i)

            person_boxes = [person_boxes[i] for i in keep_indices]
            confidences = [confidences[i] for i in keep_indices]

            if tracker_ids is not None:
                tracker_ids = [tracker_ids[i] for i in keep_indices]

            pose_matches = match_poses(person_boxes, posed)

            # Keep the existing ARIA identity-processing code here.
            # ARIA identities already visible in this frame must not
            # be assigned again to a different tracker.
            active_display_ids = set()

            if tracker_ids is not None:
                for tid in tracker_ids:
                    if tid in display_ids:
                        active_display_ids.add(display_ids[tid])

            for i, person_box in enumerate(person_boxes):
                x1, y1, x2, y2 = map(int, person_box)

                # Enlarge the displayed box by 8% on each side.
                box_w = x2 - x1
                box_h = y2 - y1

                pad_x = int(box_w * 0.08)
                pad_y = int(box_h * 0.08)

                x1 = max(0, x1 - pad_x)
                y1 = max(0, y1 - pad_y)
                x2 = min(width - 1, x2 + pad_x)
                y2 = min(height - 1, y2 + pad_y)

                if tracker_ids is None:
                    colour = YELLOW
                    label = f"Person {confidences[i]:.2f}"

                    cv2.rectangle(
                        output, (x1, y1), (x2, y2), colour, 2
                    )
                    cv2.putText(
                        output, label, (x1, max(20, y1 - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, colour, 2,
                    )
                    continue

                tracker_id = tracker_ids[i]

                if tracker_id not in display_ids:
                    recovered_id = match_old_identity(
                        person_box,
                        frame_no,
                        track_history,
                        MAX_MISSED_FRAMES,
                        unavailable_ids=active_display_ids,
                    )

                    if recovered_id is not None:
                        display_ids[tracker_id] = recovered_id
                        active_display_ids.add(recovered_id)

                        print(
                            f"Frame {frame_no}: recovered "
                            f"P{recovered_id:03d} under tracker "
                            f"ID {tracker_id}"
                        )
                    else:
                        display_ids[tracker_id] = next_person_number
                        active_display_ids.add(next_person_number)

                        print(
                            f"Frame {frame_no}: new identity "
                            f"P{next_person_number:03d}, "
                            f"tracker ID {tracker_id}"
                        )

                        next_person_number += 1

                person_id = display_ids[tracker_id]

                # Update history for future identity recovery.
                track_history[person_id] = {
                    "features": features(person_box),
                    "frame": frame_no,
                }

                pose_match = pose_matches.get(i)
                pose_info = None

                if pose_match is not None:
                    points = pose_match["points"]
                    draw_skeleton(output, points)
                    pose_info = get_pose_features(points)

                status = update_status(
                    person_id,
                    pose_info,
                    timestamp,
                    fall_states,
                )

                colour = {
                    "Stable": GREEN,
                    "Watch": YELLOW,
                    "Urgent Review": RED,
                }[status]

                label = f"P{person_id:03d} | {status}"

                cv2.rectangle(
                    output, (x1, y1), (x2, y2), colour, 2
                )
                cv2.putText(
                    output,
                    label,
                    (x1, max(20, y1 - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    colour,
                    2,
                )

        writer.write(output)

        if frame_no % 30 == 0:
            print(f"Processed {frame_no} frames")

finally:
    cap.release()
    writer.release()

print(f"\nProcessed frames: {frame_no}")
print(f"Output video: {OUTPUT_PATH.resolve()}")
print("Review the output and console identity-recovery messages.")
