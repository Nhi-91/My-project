import os
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "focusflow.db")


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at TEXT NOT NULL,
            planned_minutes INTEGER NOT NULL,
            actual_minutes INTEGER NOT NULL,
            break_minutes INTEGER NOT NULL,
            mood TEXT NOT NULL,
            completed INTEGER NOT NULL DEFAULT 0
        );
        """
    )
    conn.commit()
    conn.close()


def parse_dt(dt_str: str) -> datetime:
    if "T" in dt_str:
        return datetime.fromisoformat(dt_str)
    return datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")


@app.route("/")
def index():
    init_db()
    return render_template("index.html")


@app.route("/history")
def history():
    init_db()
    status = (request.args.get("status") or "all").strip().lower()
    limit = request.args.get("limit") or "50"

    try:
        limit_n = max(10, min(int(limit), 200))
    except ValueError:
        limit_n = 50

    where = ""
    if status == "completed":
        where = "WHERE completed = 1"
    elif status == "stopped":
        where = "WHERE completed = 0"

    conn = get_db_connection()
    rows = conn.execute(
        f"""
        SELECT id, started_at, planned_minutes, actual_minutes, break_minutes, mood, completed
        FROM sessions
        {where}
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit_n,),
    ).fetchall()
    conn.close()

    formatted = []
    for r in rows:
        dt = parse_dt(r["started_at"])
        formatted.append(
            {
                "id": r["id"],
                "started_at": dt.strftime("%Y-%m-%d %H:%M:%S"),
                "planned": r["planned_minutes"],
                "actual": r["actual_minutes"],
                "break": r["break_minutes"],
                "mood": r["mood"],
                "completed": bool(r["completed"]),
            }
        )

    return render_template("history.html", rows=formatted, status=status, limit=limit_n)


@app.route("/dashboard")
def dashboard():
    init_db()
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT started_at, actual_minutes, completed
        FROM sessions
        ORDER BY id DESC
        LIMIT 1000
        """
    ).fetchall()
    conn.close()

    now = datetime.now()
    today = now.date()
    start_7 = today - timedelta(days=6)

    total_minutes_today = 0
    completed_today = 0

    minutes_by_day = {start_7 + timedelta(days=i): 0 for i in range(7)}
    total_7 = 0
    completed_7 = 0

    for r in rows:
        dt = parse_dt(r["started_at"])
        d = dt.date()

        if d == today:
            total_minutes_today += int(r["actual_minutes"])
            if int(r["completed"]) == 1:
                completed_today += 1

        if start_7 <= d <= today:
            minutes_by_day[d] += int(r["actual_minutes"])
            total_7 += 1
            if int(r["completed"]) == 1:
                completed_7 += 1

    completion_rate_7 = 0
    if total_7 > 0:
        completion_rate_7 = round((completed_7 / total_7) * 100)

    labels = [(start_7 + timedelta(days=i)).strftime("%a") for i in range(7)]
    values = [minutes_by_day[start_7 + timedelta(days=i)] for i in range(7)]

    return render_template(
        "dashboard.html",
        total_minutes_today=total_minutes_today,
        completed_today=completed_today,
        completion_rate_7=completion_rate_7,
        labels=labels,
        values=values,
        today=today.strftime("%Y-%m-%d"),
    )


@app.route("/api/sessions", methods=["POST"])
def create_session():
    data = request.get_json(force=True)

    mood = (data.get("mood") or "ok").strip().lower()
    planned_minutes = int(data.get("planned_minutes", 20))
    break_minutes = int(data.get("break_minutes", 5))
    actual_minutes = int(data.get("actual_minutes", planned_minutes))
    completed = 1 if bool(data.get("completed", True)) else 0

    if mood not in {"ok", "tired_eyes", "down"}:
        mood = "ok"

    planned_minutes = max(5, min(planned_minutes, 60))
    break_minutes = max(3, min(break_minutes, 20))
    actual_minutes = max(0, min(actual_minutes, planned_minutes))

    conn = get_db_connection()
    conn.execute(
        """
        INSERT INTO sessions (started_at, planned_minutes, actual_minutes, break_minutes, mood, completed)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            datetime.now().isoformat(timespec="seconds"),
            planned_minutes,
            actual_minutes,
            break_minutes,
            mood,
            completed,
        ),
    )
    conn.commit()
    conn.close()

    return jsonify({"status": "ok"}), 201


@app.route("/api/suggestions", methods=["GET"])
def suggestions():
    init_db()
    conn = get_db_connection()
    rows = conn.execute(
        """
        SELECT planned_minutes, actual_minutes, completed
        FROM sessions
        ORDER BY id DESC
        LIMIT 20
        """
    ).fetchall()
    conn.close()

    suggested_study = 20
    suggested_break = 5

    if len(rows) >= 6:
        total = len(rows)
        completed_count = sum(1 for r in rows if r["completed"] == 1)
        completion_rate = completed_count / total

        avg_actual = sum(r["actual_minutes"] for r in rows) / total
        avg_planned = sum(r["planned_minutes"] for r in rows) / total
        drop_ratio = 0 if avg_planned == 0 else (avg_actual / avg_planned)

        if completion_rate < 0.6 or drop_ratio < 0.75:
            suggested_study = 15
            suggested_break = 5
        elif completion_rate > 0.85 and drop_ratio > 0.95:
            suggested_study = 25
            suggested_break = 5

    return jsonify({"suggested_study": suggested_study, "suggested_break": suggested_break})


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
