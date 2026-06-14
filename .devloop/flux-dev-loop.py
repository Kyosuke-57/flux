#!/usr/bin/env python3
"""Flux Dev Loop: Autonomous development cycle for the meeting-minutes-app project.

Runs opencode in agentic mode to implement tasks from the project's task list,
reports results, and updates the task tracking file.
When no tasks are pending, auto-generates new tasks by scanning the project.
"""

import subprocess
import sys
import os
import json
import time
import random
import re
import shutil
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent

# On Windows, subprocess.run(["opencode", ...]) fails to resolve .cmd files
# because CreateProcess doesn't search PATHEXT the same way shutil.which does.
# Resolve the full path once at module level.
_OPENCODE_BIN = shutil.which("opencode")
if _OPENCODE_BIN:
    log_open = print  # temporary; real log() is defined below
    log_open(f"[flux] opencode binary resolved: {_OPENCODE_BIN}")
else:
    log_open = print
    log_open("[flux] WARNING: opencode not found in PATH")
_NPX_BIN = shutil.which("npx") or shutil.which("npx.cmd")
QUEUE_FILE = PROJECT_DIR / ".devloop" / "tasks" / "queue.json"
STATE_FILE = PROJECT_DIR / ".devloop" / "state.json"
LOCK_FILE = PROJECT_DIR / ".devloop" / "flux.lock"
LOG_DIR = PROJECT_DIR / ".devloop" / "logs"
DATA_DIR = PROJECT_DIR / ".devloop" / "data"

OPENCODE_HOST = "127.0.0.1"
OPENCODE_PORT = 8575

os.chdir(str(PROJECT_DIR))
os.environ["PYTHONUNBUFFERED"] = "1"

# ---------------------------------------------------------------------------
# Logging & locking
# ---------------------------------------------------------------------------

def log(msg: str):
    """Log a message prefixed with [flux]."""
    print(f"[flux] {msg}")


def acquire_lock() -> bool:
    """Acquire the flux lock file. Returns True if acquired, False if held by another process."""
    try:
        lock = open(LOCK_FILE, "x")
        lock.write(str(os.getpid()))
        lock.close()
        return True
    except FileExistsError:
        age = time.time() - os.path.getmtime(LOCK_FILE)
        if age > 3600:
            log("Stale lock found (>{:.0f}s old), removing...".format(age))
            LOCK_FILE.unlink(missing_ok=True)
            return acquire_lock()
        return False


def release_lock():
    """Release the flux lock file."""
    LOCK_FILE.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# State & queue I/O
# ---------------------------------------------------------------------------

def read_state() -> dict:
    """Read state from the state file."""
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {"cycle": 0, "last_task": None, "consecutive_failures": 0, "skipped_tasks": []}


def write_state(state: dict):
    """Write state to the state file."""
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False))


def load_queue() -> dict:
    """Load the task queue. Returns default dict if file missing/malformed."""
    if QUEUE_FILE.exists():
        try:
            return json.loads(QUEUE_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            backup = QUEUE_FILE.with_suffix(".bak")
            if backup.exists():
                try:
                    return json.loads(backup.read_text(encoding="utf-8"))
                except (json.JSONDecodeError, OSError):
                    pass
    return {"tasks": [], "$meta": {
        "created": time.strftime("%Y-%m-%dT%H:%M:%S+09:00"),
        "generator": "flux-dev-loop",
        "description": "Flux project autonomous development loop task queue",
    }}


def save_queue(queue: dict):
    """Atomically save the task queue to disk."""
    QUEUE_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = QUEUE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(queue, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(QUEUE_FILE)


def read_tasks() -> list:
    """Read the task list. Returns [] if file missing or malformed."""
    queue = load_queue()
    return queue.get("tasks", [])


def add_if_new(queue: dict, task: dict):
    """Add a task to the queue if no existing task has the same id."""
    existing_ids = {t["id"] for t in queue["tasks"]}
    if task["id"] not in existing_ids:
        queue["tasks"].append(task)
        return True
    return False


# ---------------------------------------------------------------------------
# Opencode server management
# ---------------------------------------------------------------------------

def is_opencode_running() -> bool:
    """Check if the opencode server process is listening on the expected port."""
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.settimeout(3)
        s.connect((OPENCODE_HOST, OPENCODE_PORT))
        s.close()
        return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False
    finally:
        try:
            s.close()
        except Exception:
            pass


def start_opencode_server():
    """Start the opencode server in the background on port 8575."""
    log("Starting opencode server on port 8575...")
    cmd = [_OPENCODE_BIN, "serve", "--port", str(OPENCODE_PORT), "--hostname", OPENCODE_HOST]
    logfile = open(PROJECT_DIR / ".devloop" / "opencode-server.log", "w")
    proc = subprocess.Popen(
        cmd,
        cwd=str(PROJECT_DIR),
        stdout=logfile,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
    )
    log(f"opencode server started (PID {proc.pid})")
    for _ in range(10):
        time.sleep(1)
        if is_opencode_running():
            log("opencode server is ready.")
            return proc
    log("Warning: opencode server did not become ready within 10s, continuing anyway...")


def pick_task(tasks: list, state: dict) -> dict | None:
    """Pick the next task to work on based on priority and state."""
    skipped = set(state.get("skipped_tasks", []))
    available = [t for t in tasks if t.get("status") == "pending" and t.get("id") not in skipped]
    if not available:
        available = [t for t in tasks if t.get("status") == "backlog" and t.get("id") not in skipped]
    if not available:
        return None
    priority_order = {"high": 0, "medium": 1, "low": 2, "critical": -1}
    available.sort(key=lambda t: (priority_order.get(t.get("priority", "medium"), 99), tasks.index(t)))
    return available[0]


# ---------------------------------------------------------------------------
# Opencode execution
# ---------------------------------------------------------------------------

def run_opencode(task_id: str, task_title: str, task_description: str) -> tuple[bool, str]:
    """Run opencode on a specific task and return (success, output)."""
    prompt = f"""Implement the following task for the meeting-minutes-app project:

Task ID: {task_id}
Title: {task_title}
Description: {task_description}

Please write the necessary code, tests, and documentation. Follow the project's existing conventions.
Commit your changes when done. Report what you did.
"""
    log(f"Running opencode for task {task_id}: {task_title}")
    try:
        result = subprocess.run(
            [_OPENCODE_BIN, "run", "-m", prompt],
            cwd=str(PROJECT_DIR),
            capture_output=True,
            text=True,
            timeout=600,
        )
        output = result.stdout + result.stderr
        success = result.returncode == 0
        return success, output
    except subprocess.TimeoutExpired:
        return False, f"TIMEOUT: Task {task_id} timed out after 10 minutes."
    except FileNotFoundError:
        return False, "ERROR: opencode command not found. Is it installed?"
    except Exception as e:
        return False, f"ERROR running opencode: {e}"


def run_opencode_via_server(task_id: str, task_title: str, task_description: str) -> tuple[bool, str]:
    """Run opencode by connecting to the running server with --attach.
    Falls back to run_opencode() if server is unavailable.
    """
    prompt = f"""Implement task {task_id}: {task_title}

{task_description}

Write the code, test it, and commit. Report what was done."""
    log(f"Running task {task_id} via opencode server (attach :{OPENCODE_PORT})...")

    prompt_file = PROJECT_DIR / ".devloop" / "prompts" / f"task-{task_id}.md"
    prompt_file.parent.mkdir(parents=True, exist_ok=True)
    prompt_file.write_text(prompt, encoding="utf-8")

    server_url = f"http://{OPENCODE_HOST}:{OPENCODE_PORT}"
    password = os.environ.get("OPENCODE_SERVER_PASSWORD", "flux-dev")
    model = os.environ.get("OPENCODE_MODEL", "opencode-go/deepseek-v4-flash")

    try:
        result = subprocess.run(
            [
                _OPENCODE_BIN, "run",
                "--attach", server_url,
                "-p", password,
                "-m", model,
                "--dangerously-skip-permissions",
                task_title,
                "-f", str(prompt_file),
            ],
            cwd=str(PROJECT_DIR),
            capture_output=True,
            text=True,
            timeout=600,
        )
        output = result.stdout + result.stderr
        success = result.returncode == 0
        return success, output
    except subprocess.TimeoutExpired:
        return False, f"TIMEOUT: Task {task_id} timed out after 10 minutes."
    except FileNotFoundError:
        return False, "ERROR: opencode command not found."
    except Exception as e:
        log(f"Server-based execution failed ({e}), falling back to direct mode...")
        return run_opencode(task_id, task_title, task_description)


# ---------------------------------------------------------------------------
# Auto-generate tasks
# ---------------------------------------------------------------------------

def scan_for_untested_services() -> list[dict]:
    """Find services that don't have corresponding test files."""
    new_tasks = []
    svc_dir = PROJECT_DIR / "src" / "services"
    test_dir = PROJECT_DIR / "src" / "__tests__"
    if not svc_dir.is_dir():
        return new_tasks

    try:
        tested = set()
        if test_dir.is_dir():
            for f in test_dir.iterdir():
                if f.suffix in (".ts", ".tsx") and f.stem.endswith(".test"):
                    tested.add(f.stem.replace(".test", ""))

        for f in sorted(svc_dir.iterdir()):
            if f.suffix not in (".ts", ".tsx") or f.stem == "index":
                continue
            svc_name = f.stem
            if svc_name in tested:
                continue
            new_tasks.append({
                "id": f"svc-{svc_name}-test",
                "label": f"Add unit tests for {svc_name} service",
                "status": "pending",
                "retries": 0,
                "max_retries": 2,
                "priority": "medium",
                "prompt": (
                    f"Create a vitest test file at `src/__tests__/{svc_name}.test.ts` "
                    f"for `src/services/{svc_name}.ts`.\n\n"
                    "Read the file first. Test exports.\n"
                    "Mock @supabase/supabase-js, @react-native-async-storage/async-storage, "
                    "react-native-url-polyfill/auto.\n\n"
                    "Do NOT modify any other files.\n\n"
                    "Run `npx vitest run` to confirm tests pass."
                ),
            })
    except (OSError, Exception):
        pass
    return new_tasks


def scan_for_ts_errors() -> list[dict]:
    """Run npx tsc --noEmit (quick, with timeout) and parse errors."""
    new_tasks = []
    try:
        start = time.time()
        result = subprocess.run(
            [_NPX_BIN, "tsc", "--noEmit"],
            cwd=str(PROJECT_DIR),
            capture_output=True,
            text=True,
            timeout=60,
        )
        elapsed = time.time() - start
        log(f"tsc --noEmit finished in {elapsed:.1f}s")
        if result.returncode == 0:
            return new_tasks

        for line in result.stdout.splitlines():
            m = re.match(r'^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s(.+)', line)
            if m:
                filepath = m.group(1).strip()
                # Skip node_modules
                if "node_modules" in filepath:
                    continue
                err_code = m.group(4)
                err_msg = m.group(5)
                # Truncate very long error messages for the task id
                safe_id_suffix = err_code
                new_tasks.append({
                    "id": f"tsc-{safe_id_suffix}-{Path(filepath).stem}",
                    "label": f"[fix] TS error {err_code} in {filepath}",
                    "status": "pending",
                    "retries": 0,
                    "max_retries": 2,
                    "priority": "high",
                    "prompt": (
                        f"Fix the TypeScript error in `{filepath}`:\n"
                        f"{err_code}: {err_msg}\n\n"
                        "Read the file, fix the error. "
                        "Run `npx vitest run` and `npx tsc --noEmit` to verify."
                    ),
                })
    except subprocess.TimeoutExpired:
        log("tsc --noEmit timed out (60s), skipping TS error scan")
    except (FileNotFoundError, OSError, Exception) as e:
        log(f"tsc scan failed: {e}")
    return new_tasks


def scan_for_todos() -> list[dict]:
    """Find TODO/FIXME/HACK comments in source code."""
    new_tasks = []
    search_roots = [
        p for p in [PROJECT_DIR / "src", PROJECT_DIR / "app"]
        if p.is_dir()
    ]
    todo_pattern = re.compile(r'(?:TODO|FIXME|HACK)\b(.+)$', re.MULTILINE | re.IGNORECASE)

    for root_dir in search_roots:
        for ext in ("*.ts", "*.tsx"):
            try:
                files = list(root_dir.rglob(ext))
            except (FileNotFoundError, OSError):
                continue
            for fpath in sorted(files):
                if "node_modules" in str(fpath):
                    continue
                try:
                    content = fpath.read_text(encoding="utf-8")
                except Exception:
                    continue
                for m in todo_pattern.finditer(content):
                    text = m.group(1).strip()
                    if not text:
                        text = "(no description)"
                    # Shorten for task id
                    short = re.sub(r'[^\w\s]', '', text)[:40].strip().replace(' ', '-')
                    new_tasks.append({
                        "id": f"todo-{fpath.stem}-{short[:30]}",
                        "label": f"[TODO] {fpath}: {text[:80]}",
                        "status": "pending",
                        "retries": 0,
                        "max_retries": 2,
                        "priority": "medium",
                        "prompt": (
                            f"Address the TODO in `{fpath}`:\n{text}\n\n"
                            "Read the file, implement the fix. Run `npx vitest run`."
                        ),
                    })
    return new_tasks


def scan_for_long_functions() -> list[dict]:
    """Find functions longer than 60 lines in service files.
    Uses brace-matching to measure actual function body.
    """
    new_tasks = []
    svc_dir = PROJECT_DIR / "src" / "services"
    if not svc_dir.is_dir():
        return new_tasks

    func_pattern = re.compile(r'(?:export\s+)?(?:async\s+)?function\s+(\w+)')

    for fpath in sorted(svc_dir.iterdir()):
        if fpath.suffix not in (".ts", ".tsx"):
            continue
        try:
            content = fpath.read_text(encoding="utf-8")
        except Exception:
            continue

        for m in func_pattern.finditer(content):
            fn_name = m.group(1)
            brace_start = content.find("{", m.end())
            if brace_start == -1:
                continue
            # Brace matching for actual body
            depth = 1
            pos = brace_start + 1
            while depth > 0 and pos < len(content):
                c = content[pos]
                if c == "{":
                    depth += 1
                elif c == "}":
                    depth -= 1
                pos += 1
            if depth != 0:
                continue
            fn_lines = content[m.start():pos].count("\n")
            if fn_lines > 60:
                svc_name = fpath.stem
                new_tasks.append({
                    "id": f"refactor-{svc_name}-{fn_name}-split",
                    "label": f"[refactor] {svc_name}.{fn_name}() is {fn_lines} lines, consider splitting",
                    "status": "pending",
                    "retries": 0,
                    "max_retries": 2,
                    "priority": "low",
                    "prompt": (
                        f"Function `{fn_name}()` in `src/services/{svc_name}.ts` "
                        f"is {fn_lines} lines long.\n\n"
                        "Read the file, break it into smaller helper functions. "
                        "Keep the public API unchanged. Run `npx vitest run`."
                    ),
                })
    return new_tasks


def auto_generate_tasks(queue: dict) -> int:
    """Scan the project and add newly discovered tasks to the queue.
    Returns the number of new tasks added.
    """
    log("Auto-generating tasks from project scan...")
    added = 0

    generators = [
        ("untested services", scan_for_untested_services),
        ("TypeScript errors", scan_for_ts_errors),
        ("TODO/FIXME comments", scan_for_todos),
        ("long functions (>60 lines)", scan_for_long_functions),
    ]

    for label, gen_fn in generators:
        try:
            tasks = gen_fn()
            log(f"  {label}: {len(tasks)} candidate(s)")
            for t in tasks:
                if add_if_new(queue, t):
                    added += 1
        except Exception as e:
            log(f"  {label} scan failed: {e}")

    if added > 0:
        save_queue(queue)
        log(f"Added {added} new task(s) to queue.")
    else:
        log("No new tasks discovered — all up to date.")
    return added


def generate_report(success: bool, task: dict, output: str, cycle: int) -> str:
    """Generate a human-readable report of the cycle."""
    status = "✅ SUCCESS" if success else "❌ FAILED"
    lines = [
        f"🔄 **Flux Dev Loop - Cycle {cycle}**",
        f"",
        f"Task: **{task.get('id', 'N/A')}**: {task.get('title', 'N/A')}",
        f"Status: {status}",
        f"",
    ]
    if output.strip():
        clean = re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', output)
        clean = clean.strip()
        if len(clean) > 2000:
            lines.append("**Output (truncated):**")
            lines.append("```")
            lines.append(clean[:2000])
            lines.append("```")
            lines.append(f"... ({len(clean) - 2000} more chars)")
        else:
            lines.append("**Output:**")
            lines.append("```")
            lines.append(clean)
            lines.append("```")
    else:
        lines.append("*No output from opencode.*")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    log("Flux Dev Loop starting...")

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not acquire_lock():
        log("Another flux process is already running. Exiting.")
        return "[SILENT]"

    try:
        state = read_state()
        state["cycle"] = state.get("cycle", 0) + 1
        log(f"Cycle #{state['cycle']}")

        # Crash recovery: reset running → pending
        queue = load_queue()
        recovered = 0
        for t in queue["tasks"]:
            if t.get("status") == "running":
                t["status"] = "pending"
                recovered += 1
        if recovered:
            log(f"Crash recovery: reset {recovered} running task(s) to pending")
            save_queue(queue)

        tasks = queue.get("tasks", [])

        # --- Auto-generate if no pending tasks ---
        pending_count = sum(1 for t in tasks if t.get("status") == "pending")
        if pending_count == 0:
            log("No pending tasks. Running auto-generate...")
            added = auto_generate_tasks(queue)
            queue = load_queue()  # reload
            tasks = queue.get("tasks", [])
            pending_count = sum(1 for t in tasks if t.get("status") == "pending")
            if pending_count == 0:
                report = (
                    "🔄 **Flux Dev Loop**\n\n"
                    "No pending tasks, and auto-generate found nothing new.\n"
                    f"All {len(tasks)} tasks completed or skipped. Nothing to do."
                )
                print(report)
                state["consecutive_failures"] = 0
                write_state(state)
                return
            log(f"Auto-generate added {added} new task(s), now {pending_count} pending.")

        # Check / start opencode server
        server_proc = None
        if not is_opencode_running():
            log("opencode server not running, starting it...")
            server_proc = start_opencode_server()
        else:
            log("opencode server is already running on port 8575.")

        # Pick a task
        task = pick_task(tasks, state)
        if task is None:
            report = "🔄 **Flux Dev Loop**\n\nAll tasks completed or skipped. Nothing to do."
            print(report)
            return

        log(f"Picked task: {task.get('id', 'N/A')} - {task.get('title', 'N/A')}")

        # Mark as running in queue
        task["status"] = "running"
        save_queue(queue)

        # Run the task
        task_title = task.get("title") or task.get("label", "")
        task_desc = task.get("description") or task.get("prompt", "")
        success, output = run_opencode_via_server(
            task.get("id", ""),
            task_title,
            task_desc,
        )

        # Update task status
        if success:
            task["status"] = "completed"
            state["consecutive_failures"] = 0
        else:
            task["retries"] = task.get("retries", 0) + 1
            if task["retries"] >= task.get("max_retries", 2):
                task["status"] = "skipped"
                skipped = state.get("skipped_tasks", [])
                if task["id"] not in skipped:
                    skipped.append(task["id"])
                    state["skipped_tasks"] = skipped
                log(f"Task {task['id']} skipped (max retries reached)")
            else:
                task["status"] = "pending"
                state["consecutive_failures"] = state.get("consecutive_failures", 0) + 1

        save_queue(queue)

        # Update state
        state["last_task"] = task.get("id")

        # Generate and print report
        report = generate_report(success, task, output, state["cycle"])
        print(report)

        write_state(state)
        log(f"State saved (success={success}, failures={state.get('consecutive_failures', 0)})")

    finally:
        release_lock()
        log("Flux Dev Loop finished.")


if __name__ == "__main__":
    result = main()
    if result:
        print(result)
