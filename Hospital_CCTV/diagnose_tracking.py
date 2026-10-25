
from pathlib import Path
import csv
import math
import cv2
from ultralytics import YOLO

VIDEO_PATH = Path("videos/fall_demo.mp4")
OUTPUT_DIR = Path("runs/aria")
CSV_PATH = OUTPUT_DIR / "tracking_diagnostics.csv"

PERSON_CONF = 0.38
POSE_CONF = 0.25
IMAGE_SIZE = 960

LEFT_SHOULDER, RIGHT_SHOULDER = 5, 6
LEFT_HIP, RIGHT_HIP = 11, 12

if not VIDEO_PATH.exists():
    raise FileNotFoundError(
        f"Video not found: {VIDEO_PATH.resolve()}"
    )

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

person_model = YOLO("yolo26n.pt")
pose_model = YOLO("yolo26n-pose.pt")

previous = {}

columns = [
    "frame", "timestamp", "track_id", "person_confidence",
    "x1", "y1", "x2", "y2",
    "pose_found", "pose_match_iou",
    "shoulder_confidence", "hip_confidence",
    "torso_angle", "hip_x", "hip_y",
    "hip_delta_y", "hip_speed_pixels_per_second",
]

cap = cv2.VideoCapture(str(VIDEO_PATH))
if not cap.isOpened():
    raise RuntimeError(f"Cannot open {VIDEO_PATH.resolve()}")

fps = cap.get(cv2.CAP_PROP_FPS)
if not fps or fps <= 0:
    fps = 25.0

def midpoint(points, a, b):
    if points[a][2] < POSE_CONF or points[b][2] < POSE_CONF:
        return None
    return (
        (float(points[a][0]) + float(points[b][0])) / 2,
        (float(points[a][1]) + float(points[b][1])) / 2,
    )

def box_iou(a, b):
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    intersection = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    area_a = max(0, ax2-ax1) * max(0, ay2-ay1)
    area_b = max(0, bx2-bx1) * max(0, by2-by1)
    union = area_a + area_b - intersection
    return intersection / union if union else 0.0

def pose_features(points):
    shoulders = midpoint(points, LEFT_SHOULDER, RIGHT_SHOULDER)
    hips = midpoint(points, LEFT_HIP, RIGHT_HIP)

    if shoulders is None or hips is None:
        return None

    dx = hips[0] - shoulders[0]
    dy = hips[1] - shoulders[1]
    angle = abs(math.degrees(math.atan2(dx, dy)))

    shoulder_conf = min(points[5][2], points[6][2])
    hip_conf = min(points[11][2], points[12][2])

    return {
        "angle": angle,
        "hip_x": hips[0],
        "hip_y": hips[1],
        "shoulder_conf": float(shoulder_conf),
        "hip_conf": float(hip_conf),
    }

try:
    with CSV_PATH.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=columns)
        writer.writeheader()

        frame_no = 0

        while True:
            ok, frame = cap.read()
            if not ok:
                break

            frame_no += 1
            timestamp = frame_no / fps

            people = person_model.track(
                source=frame,
                tracker="botsort_aria.yaml",
                classes=[0],
                conf=PERSON_CONF,
                iou=0.50,
                imgsz=IMAGE_SIZE,
                persist=True,
                verbose=False,
            )[0]

            poses = pose_model.predict(
                source=frame,
                conf=0.05,
                imgsz=1280,
                verbose=False,
            )[0]

            person_boxes = (
                people.boxes.xyxy.cpu().tolist()
                if people.boxes is not None and len(people.boxes)
                else []
            )
            confidences = (
                people.boxes.conf.cpu().tolist()
                if people.boxes is not None and len(people.boxes)
                else []
            )
            ids = (
                people.boxes.id.int().cpu().tolist()
                if people.boxes is not None
                and len(people.boxes)
                and people.boxes.id is not None
                else [None] * len(person_boxes)
            )

            pose_boxes = (
                poses.boxes.xyxy.cpu().tolist()
                if poses.boxes is not None and poses.keypoints is not None
                else []
            )
            keypoints = (
                poses.keypoints.data.cpu().numpy()
                if poses.boxes is not None and poses.keypoints is not None
                else []
            )

            for person_box, track_id, person_conf in zip(
                person_boxes, ids, confidences
            ):
                best_iou = 0.0
                best_points = None

                for pose_box, points in zip(pose_boxes, keypoints):
                    overlap = box_iou(person_box, pose_box)
                    if overlap > best_iou:
                        best_iou = overlap
                        best_points = points

                # Require some overlap to avoid matching a different person.
                if best_iou < 0.10:
                    best_points = None

                info = (
                    pose_features(best_points)
                    if best_points is not None else None
                )

                key = track_id if track_id is not None else (
                    round((person_box[0] + person_box[2]) / 2),
                    round((person_box[1] + person_box[3]) / 2),
                )

                old = previous.get(key, {})
                hip_delta_y = ""
                hip_speed = ""

                if info is not None and "hip_y" in old:
                    dt = timestamp - old["timestamp"]
                    if dt > 0:
                        hip_delta_y = info["hip_y"] - old["hip_y"]
                        hip_speed = hip_delta_y / dt

                if info is not None:
                    previous[key] = {
                        "hip_y": info["hip_y"],
                        "timestamp": timestamp,
                    }

                x1, y1, x2, y2 = person_box

                writer.writerow({
                    "frame": frame_no,
                    "timestamp": round(timestamp, 3),
                    "track_id": track_id,
                    "person_confidence": round(float(person_conf), 3),
                    "x1": round(x1, 2),
                    "y1": round(y1, 2),
                    "x2": round(x2, 2),
                    "y2": round(y2, 2),
                    "pose_found": info is not None,
                    "pose_match_iou": round(best_iou, 3),
                    "shoulder_confidence": (
                        round(info["shoulder_conf"], 3) if info else ""
                    ),
                    "hip_confidence": (
                        round(info["hip_conf"], 3) if info else ""
                    ),
                    "torso_angle": (
                        round(info["angle"], 2) if info else ""
                    ),
                    "hip_x": round(info["hip_x"], 2) if info else "",
                    "hip_y": round(info["hip_y"], 2) if info else "",
                    "hip_delta_y": (
                        round(hip_delta_y, 2) if hip_delta_y != "" else ""
                    ),
                    "hip_speed_pixels_per_second": (
                        round(hip_speed, 2) if hip_speed != "" else ""
                    ),
                })

finally:
    cap.release()

print(f"Diagnostics saved to: {CSV_PATH.resolve()}")
