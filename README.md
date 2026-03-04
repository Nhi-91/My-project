# FocusFlow+

#### Video Demo: <https://youtu.be/sZdP6bqeoDw>

#### Description:

FocusFlow+ is a web-based study timer designed to encourage consistent study habits without relying on a rigid or stressful structure. The project was inspired by the idea that many students struggle not because they are lazy, but because traditional productivity tools do not adapt to how they feel on a given day. FocusFlow+ aims to support users even when they feel tired or unmotivated, while still promoting steady progress.

The application is implemented using Python with Flask for the backend, SQLite for persistent storage, and HTML, CSS, and JavaScript for the frontend. It runs as a local web application and can be executed inside the CS50 Codespace or any standard Flask environment.

### Timer and Interaction Design

The Timer page is the core feature of FocusFlow+. Users select a mood (OK, tired eyes, or feeling down), choose study and break durations, and start a session. The selected mood does not change the timing logic, but it affects the text feedback shown during study and break phases. This design choice keeps the logic simple while still making the interface feel more supportive and personal.

When a user selects a very short study duration (less than 15 minutes), the application displays a custom modal dialog. Instead of blocking the user, the modal explains that short sessions are acceptable but may reduce consistency. The user can either continue or adjust the duration to 15 minutes. A custom modal was chosen over browser alerts to maintain a calm, non-disruptive user experience.

Toast notifications are used throughout the timer to provide feedback such as session start, break start, cycle completion, or early stopping. Toasts were chosen because they do not interrupt the user’s workflow and resemble feedback mechanisms commonly found in real productivity applications.

### Data Persistence and Session History

Each study session is saved to a SQLite database. For every session, the application records the start time, planned study minutes, actual study minutes, break duration, mood, and whether the session was completed or stopped early. If the user stops a session early, the actual study time is calculated from elapsed time and stored accordingly.

This persistent storage allows the application to go beyond a simple timer. It enables the History and Dashboard pages and makes it possible to analyze user behavior over time.

### Long Break Logic and Reset Functionality

FocusFlow+ includes a long break rule inspired by sustainable study workflows. After three completed study cycles, the next break becomes a long break lasting 15 minutes. A visible counter shows progress toward the next long break (0/3, 1/3, or 2/3), making the system predictable and transparent.

The Timer page also includes a Reset Counters button. This resets the long break counter, the number of completed sessions for the current day, and returns the timer to the Ready state. This feature supports daily use and testing without requiring the user to reload the page or clear data manually.

### Adaptive Suggestions

To demonstrate adaptive behavior, FocusFlow+ provides a simple suggestion system based on recent session history. After at least six sessions are recorded, the backend evaluates the user’s completion rate and the ratio between planned and actual study time. If the user often stops early, the app suggests a shorter 15-minute session. If the user consistently completes sessions, it suggests increasing to 25 minutes. This logic is intentionally rule-based to remain transparent and easy to understand.

### Dashboard, History, and File Structure

The Dashboard page summarizes recent progress, including total minutes studied today, completed sessions today, and a seven-day completion rate. It also visualizes study minutes over the last seven days using a bar chart. The History page displays a table of past sessions with filters for completed or stopped sessions.

- app.py defines routes, API endpoints, database initialization, and suggestion logic.
- templates/index.html implements the Timer interface with modal and toast elements.
- templates/dashboard.html displays progress summaries and a weekly chart.
- templates/history.html renders stored session records with filtering.
- static/style.css provides consistent styling across all pages.
- static/timer.js contains the client-side logic for timing, session flow, counters, and UI interactions.

Overall, FocusFlow+ was built as a practical and approachable final project. The goal was not to create the most advanced productivity tool, but to explore how small design decisions, such as adaptive timing, gentle feedback, and visible progress, can make a study tool feel more supportive and realistic. Through this project, I applied concepts from CS50, including backend routing, database persistence, and frontend interaction, while also thinking carefully about usability and user experience. FocusFlow+ represents my understanding of how software can be structured to solve a real, everyday problem in a clear and maintainable way.
