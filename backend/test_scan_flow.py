"""
QuickScan 2.0 — Full End-to-End Test
=====================================
Tests the complete attendance flow via API calls:
  1. Teacher registers → creates session → generates QR
  2. Student registers → gets enrolled → submits QR scan
  3. Teacher checks attendance register → exports Excel
  4. Audit ledger verified

Run:  cd backend && uv run python test_scan_flow.py
"""

import httpx
import json
import uuid
import sys
from datetime import datetime, timezone, timedelta

BASE = "http://localhost:8000"
client = httpx.Client(base_url=BASE, timeout=15)

# Unique emails for this test run
RUN_ID = uuid.uuid4().hex[:6]
TEACHER_EMAIL = f"teacher_{RUN_ID}@test.edu"
STUDENT_EMAIL = f"student_{RUN_ID}@test.edu"
TEACHER_HWID = f"TEST-TEACHER-{RUN_ID}"
STUDENT_HWID = f"TEST-STUDENT-{RUN_ID}"

passed = 0
failed = 0


def check(label: str, condition: bool, detail: str = ""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✅ {label}")
    else:
        failed += 1
        print(f"  ❌ {label} — {detail}")


def header(title: str):
    print(f"\n{'═'*60}")
    print(f"  {title}")
    print(f"{'═'*60}")


# ──────────────────────────────────────────────
# STEP 1: Register a teacher
# ──────────────────────────────────────────────
header("STEP 1 — Register Teacher")
r = client.post("/auth/register", json={
    "full_name": "Prof. TestBot",
    "email": TEACHER_EMAIL,
    "password": "securepass123",
    "role": "teacher",
    "hardware_id": TEACHER_HWID,
})
check("Teacher registration", r.status_code == 200, f"status={r.status_code} body={r.text}")
teacher_token = r.json().get("access_token", "")
check("Got teacher token", bool(teacher_token))

# Verify /auth/me
r = client.get("/auth/me", headers={"Authorization": f"Bearer {teacher_token}"})
check("Teacher /auth/me returns profile", r.status_code == 200 and r.json()["role"] == "teacher", r.text)

# ──────────────────────────────────────────────
# STEP 2: Register a student
# ──────────────────────────────────────────────
header("STEP 2 — Register Student")
r = client.post("/auth/register", json={
    "full_name": "Stu Dent",
    "email": STUDENT_EMAIL,
    "password": "securepass456",
    "role": "student",
    "hardware_id": STUDENT_HWID,
})
check("Student registration", r.status_code == 200, f"status={r.status_code} body={r.text}")
student_token = r.json().get("access_token", "")
check("Got student token", bool(student_token))

# Verify student profile
r = client.get("/auth/me", headers={"Authorization": f"Bearer {student_token}"})
check("Student /auth/me returns profile", r.status_code == 200 and r.json()["role"] == "student", r.text)
check("Student has device_id bound", r.json().get("device_id") == STUDENT_HWID, r.text)

# ──────────────────────────────────────────────
# STEP 3: Teacher creates a session (with geofence)
# ──────────────────────────────────────────────
header("STEP 3 — Create Session")
now = datetime.now(timezone.utc)
r = client.post("/sessions", json={
    "name": f"Test Session {RUN_ID}",
    "start_time": (now - timedelta(minutes=10)).isoformat(),
    "end_time": (now + timedelta(hours=2)).isoformat(),
    "latitude": 28.6139,
    "longitude": 77.2090,
    "radius_meters": 500,  # 500m radius — generous for testing
}, headers={"Authorization": f"Bearer {teacher_token}"})
check("Session created", r.status_code == 200, f"status={r.status_code} body={r.text}")
session_id = r.json().get("id", "")
check("Got session ID", bool(session_id), r.text)
print(f"     Session ID: {session_id}")

# ──────────────────────────────────────────────
# STEP 4: Teacher enrolls the student
# ──────────────────────────────────────────────
header("STEP 4 — Enroll Student")
r = client.post(f"/sessions/{session_id}/enroll", json={
    "student_email": STUDENT_EMAIL,
}, headers={"Authorization": f"Bearer {teacher_token}"})
check("Student enrolled", r.status_code == 200, f"status={r.status_code} body={r.text}")

# ──────────────────────────────────────────────
# STEP 5: Teacher generates QR code
# ──────────────────────────────────────────────
header("STEP 5 — Generate QR Token")
r = client.get(f"/sessions/{session_id}/qr", headers={"Authorization": f"Bearer {teacher_token}"})
check("QR generated", r.status_code == 200, f"status={r.status_code} body={r.text}")
qr_payload = r.json()
check("QR has session_id", qr_payload.get("session_id") == session_id)
check("QR has hmac signature", bool(qr_payload.get("hmac_signature")))
check("QR has timestamp", bool(qr_payload.get("timestamp")))
print(f"     QR payload: {json.dumps(qr_payload, indent=2)}")

# ──────────────────────────────────────────────
# STEP 6: Student submits attendance scan
# ──────────────────────────────────────────────
header("STEP 6 — Student Scans QR (Submit Attendance)")
r = client.post("/attendance/scan", json={
    "session_id": qr_payload["session_id"],
    "qr_timestamp": qr_payload["timestamp"],
    "hmac_signature": qr_payload["hmac_signature"],
    "student_lat": 28.6140,     # ~11m from session center
    "student_lon": 77.2091,
    "hardware_id": STUDENT_HWID,
}, headers={"Authorization": f"Bearer {student_token}"})
check("Scan accepted", r.status_code == 200, f"status={r.status_code} body={r.text}")
if r.status_code == 200:
    scan_response = r.json()
    check(f"Status = '{scan_response.get('status')}'", scan_response.get("status") == "Present")
    print(f"     Scan response: {json.dumps(scan_response, indent=2)}")

# ──────────────────────────────────────────────
# STEP 7: Duplicate scan should be rejected
# ──────────────────────────────────────────────
header("STEP 7 — Duplicate Scan (should fail)")
# Get a fresh QR first
r2 = client.get(f"/sessions/{session_id}/qr", headers={"Authorization": f"Bearer {teacher_token}"})
qr2 = r2.json()
r = client.post("/attendance/scan", json={
    "session_id": qr2["session_id"],
    "qr_timestamp": qr2["timestamp"],
    "hmac_signature": qr2["hmac_signature"],
    "student_lat": 28.6140,
    "student_lon": 77.2091,
    "hardware_id": STUDENT_HWID,
}, headers={"Authorization": f"Bearer {student_token}"})
check("Duplicate rejected", r.status_code in [400, 409], f"status={r.status_code} body={r.text}")

# ──────────────────────────────────────────────
# STEP 8: Teacher views attendance register
# ──────────────────────────────────────────────
header("STEP 8 — Attendance Register")
r = client.get(f"/sessions/{session_id}/attendance", headers={"Authorization": f"Bearer {teacher_token}"})
check("Attendance register loaded", r.status_code == 200, f"status={r.status_code} body={r.text}")
if r.status_code == 200:
    reg = r.json()
    check(f"Total enrolled = {reg['total_enrolled']}", reg["total_enrolled"] == 1)
    check(f"Total present = {reg['total_present']}", reg["total_present"] == 1)
    check(f"Total absent = {reg['total_absent']}", reg["total_absent"] == 0)
    if reg["register"]:
        student_row = reg["register"][0]
        check(f"Student name = '{student_row['full_name']}'", student_row["full_name"] == "Stu Dent")
        check(f"Device ID = '{student_row['device_id']}'", student_row["device_id"] == STUDENT_HWID)
        check(f"Status = '{student_row['status']}'", student_row["status"] == "Present")
        check("Has scan time", student_row["scan_time"] is not None)
        check("Has GPS coords", student_row["scan_lat"] is not None)
        print(f"     Register row: {json.dumps(student_row, indent=2)}")

# ──────────────────────────────────────────────
# STEP 9: Analytics
# ──────────────────────────────────────────────
header("STEP 9 — Session Analytics")
r = client.get(f"/sessions/{session_id}/analytics", headers={"Authorization": f"Bearer {teacher_token}"})
check("Analytics loaded", r.status_code == 200, f"status={r.status_code} body={r.text}")
if r.status_code == 200:
    stats = r.json()
    check(f"Attendance rate = {stats['attendance_rate']}%", stats["attendance_rate"] == 100.0)
    check("Geofence data present", stats["geofence"] is not None)

# ──────────────────────────────────────────────
# STEP 10: Excel export
# ──────────────────────────────────────────────
header("STEP 10 — Excel Export")
r = client.get(f"/sessions/{session_id}/attendance/export", headers={"Authorization": f"Bearer {teacher_token}"})
check("Excel download", r.status_code == 200, f"status={r.status_code}")
check("Content-Type is xlsx", "spreadsheet" in r.headers.get("content-type", ""), r.headers.get("content-type", ""))
check(f"File size = {len(r.content)} bytes", len(r.content) > 500)

# ──────────────────────────────────────────────
# STEP 11: Audit Ledger
# ──────────────────────────────────────────────
header("STEP 11 — Audit Ledger")
r = client.get("/audit/ledger?limit=10", headers={"Authorization": f"Bearer {teacher_token}"})
check("Ledger loaded", r.status_code == 200, f"status={r.status_code} body={r.text}")
if r.status_code == 200:
    ledger = r.json()
    check(f"Total events = {ledger['total']}", ledger["total"] >= 2)  # At least the QR generations
    check("Has entries", len(ledger["entries"]) > 0)

# ──────────────────────────────────────────────
# STEP 12: Device lock — wrong device should fail
# ──────────────────────────────────────────────
header("STEP 12 — Device Lock (wrong hardware_id)")
r = client.post("/auth/login", json={
    "email": STUDENT_EMAIL,
    "password": "securepass456",
    "hardware_id": "WRONG-DEVICE-ID",
})
check("Login from wrong device rejected", r.status_code == 403, f"status={r.status_code} body={r.text}")


# ═══════════════════════════════════════════════
# RESULTS
# ═══════════════════════════════════════════════
header("TEST RESULTS")
total = passed + failed
print(f"\n  {passed}/{total} passed  •  {failed} failed\n")
if failed == 0:
    print("  🎉 ALL TESTS PASSED — Full scan flow is working!\n")
else:
    print("  ⚠️  Some tests failed. Check the output above.\n")
    sys.exit(1)
