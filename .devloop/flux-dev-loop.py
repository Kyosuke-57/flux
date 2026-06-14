#!/usr/bin/env python3
"""
Flux Dev Loop — single-cycle runner
====================================
Picks the next pending task → runs opencode → verifies tests → commits → reports.

Designed to be called by a cron job. Each invocation is ONE cycle in a
fresh session, so context limits never apply.

Usage:
  python .devloop/flux-dev-loop.py              # one cycle
  python .devloop/flux-dev-loop.py --add-task <file>  # add task from prompt
  python .devloop/flux-dev-loop.py --status     # show queue status
"""

import json
import os
import subprocess
import sys
import datetime
import re
from collections import Counter
from pathlib import Path

# ── Config ──────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
TASKS_FILE = PROJECT_ROOT / ".devloop" / "tasks" / "queue.json"
LOG_DIR = PROJECT_ROOT / ".devloop" / "logs"
DATA_DIR = PROJECT_ROOT / ".devloop" / "data"
FAILURE_DB = DATA_DIR / "failure_log.json"
MAX_FAILURE_ENTRIES = 100
OPENCODE_PORT = 8575
OPENCODE_URL = f"http://localhost:{OPENCODE_PORT}"
OPENCODE_MODEL = "opencode-go/deepseek-v4-flash"
OPENCODE_CMD = r"C:\Users\きょ\AppData\Roaming\npm\opencode"
OPENCODE_SHELL = r"C:\Program Files\Git\bin\bash.exe"
COMMIT_PREFIX = "[dev-loop]"

os.chdir(str(PROJECT_ROOT))
LOG_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)


# ── Logging ─────────────────────────────────────────────────
def log(msg: str, level: str = "INFO"):
    """Write to loop.log for debugging (no stdout)."""
    ts = datetime.datetime.now().strftime("%H:%M:%S")
    with open(LOG_DIR / "loop.log", "a", encoding="utf-8") as f:
        f.write(f"[{ts}][{level}] {msg}\n")

def user_msg(msg: str):
    """Print user-friendly message to stdout (delivered to Slack)."""
    ts = datetime.datetime.now().strftime("%H:%M")
    print(f"[{ts}] {msg}", flush=True)
    with open(LOG_DIR / "loop.log", "a", encoding="utf-8") as f:
        f.write(f"[USER] {msg}\n")


# ── Failure Database ────────────────────────────────────────
def record_failure(task_id: str, error_type: str, summary: str):
    """Record a failure event for pattern analysis."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    failures = {"entries": [], "counts": {}}
    if FAILURE_DB.exists():
        try:
            failures = json.loads(FAILURE_DB.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, Exception):
            failures = {"entries": [], "counts": {}}

    # Ensure structure
    if "entries" not in failures:
        failures["entries"] = []
    if "counts" not in failures:
        failures["counts"] = {}

    failures["entries"].append({
        "ts": datetime.datetime.now().isoformat(),
        "task_id": task_id,
        "error_type": error_type,
        "summary": summary[:300],
    })

    # Trim oldest entries
    failures["entries"] = failures["entries"][-MAX_FAILURE_ENTRIES:]

    # Update aggregate counts for last 24h
    now = datetime.datetime.now()
    cutoff = now - datetime.timedelta(hours=24)
    fresh_counts = Counter()
    for e in failures["entries"]:
        try:
            ets = datetime.datetime.fromisoformat(e["ts"])
        except (ValueError, TypeError):
            ets = now
        if ets >= cutoff:
            fresh_counts[e.get("error_type", "unknown")] += 1
    failures["counts"] = dict(fresh_counts.most_common())
    failures["last_updated"] = now.isoformat()

    FAILURE_DB.write_text(
        json.dumps(failures, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    log(f"FAILURE DB: [{error_type}] {summary[:80]}")


def get_failure_patterns() -> list:
    """Analyze failure DB and return actionable improvement suggestions."""
    if not FAILURE_DB.exists():
        return []
    try:
        failures = json.loads(FAILURE_DB.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, Exception):
        return []

    entries = failures.get("entries", [])
    now = datetime.datetime.now()
    cutoff = now - datetime.timedelta(hours=24)

    # Group recent entries by type
    recent_types = Counter()
    recent_details = {}
    for e in entries:
        try:
            ts = datetime.datetime.fromisoformat(e["ts"])
        except (ValueError, TypeError):
            ts = now
        if ts >= cutoff:
            etype = e.get("error_type", "unknown")
            recent_types[etype] += 1
            if etype not in recent_details:
                recent_details[etype] = []
            recent_details[etype].append(e.get("summary", ""))

    suggestions = []
    seen_tids = set()

    def make_suggestion(tid: str, label: str, priority: int, prompt: str):
        if tid not in seen_tids:
            seen_tids.add(tid)
            suggestions.append({
                "id": tid,
                "label": label,
                "priority": priority,
                "prompt": prompt,
            })

    for etype, count in recent_types.most_common():
        if count < 3:
            continue

        if etype == "tsc_timeout":
            make_suggestion(
                "fix-tsc-slow-typecheck",
                "[fix] TypeScript type checking keeps timing out",
                2,
                "TypeScript `tsc --noEmit` is timing out frequently. Investigate:\n"
                "- Check for circular dependencies slowing inference\n"
                "- Look at large union/intersection types\n"
                "- Consider tsconfig.json `skipLibCheck: true` if not set\n"
                "- Check for slow `--project references`\n\n"
                "Run `npx tsc --noEmit` and `npx vitest run` after fixing."
            )
        elif etype == "test_failure":
            examples = recent_details[etype][:3]
            make_suggestion(
                "fix-recurring-test-failures",
                "[fix] Tests are failing repeatedly",
                2,
                "Tests have been failing repeatedly. Recent failures:\n"
                + "\n".join(f"- {s[:150]}" for s in examples)
                + "\n\nInvestigate root cause and fix the failing tests. "
                "Run `npx vitest run --reporter=verbose` to identify failures."
            )
        elif etype in ("opencode_timeout", "opencode_error"):
            make_suggestion(
                "fix-opencode-reliability",
                "[fix] opencode is timing out or failing often",
                2,
                "opencode has been failing frequently. Likely causes:\n"
                "- Task prompts may be too large (split into smaller tasks)\n"
                "- opencode server may need restart\n"
                "- Model may be under load\n\n"
                "Check `.devloop/logs/` for recent run logs and fix any issues."
            )

    return suggestions


# ── Queue ───────────────────────────────────────────────────
def load_queue() -> dict:
    if TASKS_FILE.exists():
        try:
            return json.loads(TASKS_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, Exception):
            # Fallback: backup があればそこから読み込む
            backup = TASKS_FILE.with_suffix(".bak")
            if backup.exists():
                try:
                    return json.loads(backup.read_text(encoding="utf-8"))
                except (json.JSONDecodeError, Exception):
                    pass
            # どちらもダメなら初期化（空キュー）
            return {"tasks": [], "$meta": {}}
    return {"tasks": [], "$meta": {}}


def save_queue(queue: dict):
    """Atomic write — 一時ファイルに書き込んでから rename して破損を防ぐ"""
    tmp = TASKS_FILE.with_suffix(".tmp")
    tmp.write_text(
        json.dumps(queue, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    tmp.replace(TASKS_FILE)  # 同一ファイルシステム上でアトミックに置き換え


def get_next_pending(queue: dict) -> dict | None:
    for t in queue["tasks"]:
        if t["status"] == "pending":
            return t
    return None


def mark_task(task: dict, status: str):
    task["status"] = status


# ── Health ───────────────────────────────────────────────────
def is_server_running() -> bool:
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.connect(("127.0.0.1", OPENCODE_PORT))
        return True
    except:
        return False
    finally:
        s.close()


def ensure_server():
    if is_server_running():
        log(f"opencode server running (port {OPENCODE_PORT})")
        return True
    log("Starting opencode server via fallback script...")

    # opencode-fallback.sh を使う（無料枠→従量課金の自動フォールバップ）
    FALLBACK_SCRIPT = r"C:\Users\きょ\mama_care_app\scripts\opencode-fallback.sh"
    proc = subprocess.Popen(
        ["bash", FALLBACK_SCRIPT, str(OPENCODE_PORT), str(PROJECT_ROOT)],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    # スクリプト出力を監視して listening を検出（最大15秒）
    for i in range(30):
        import time
        time.sleep(0.5)
        if proc.poll() is not None:
            # スクリプトが終了しても、サーバーが起動している可能性があるので確認
            time.sleep(1)  # サーバーが落ち着くのを待つ
            if is_server_running():
                log("opencode server started (script exited but server is up)")
                return True
            output = proc.stdout.read() if proc.stdout else ""
            log(f"Fallback script exited early (code {proc.returncode}): {output[-200:]}", "ERROR")
            return False
        if is_server_running():
            log(f"opencode server started via fallback script")
            return True
    log("Failed to start opencode server (fallback timed out)", "ERROR")
    return False


# ── Execute ─────────────────────────────────────────────────
def has_changes() -> bool:
    r = subprocess.run(["git", "diff", "--stat"], capture_output=True, text=True)
    staged = subprocess.run(["git", "diff", "--cached", "--stat"], capture_output=True, text=True)
    untracked = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
    return bool(r.stdout.strip() or staged.stdout.strip() or untracked.stdout.strip())


def run_tests() -> dict:
    log("Running tests...")
    try:
        r = subprocess.run("npx vitest run", capture_output=True, text=True, shell=True, timeout=300)
        return r
    except subprocess.TimeoutExpired as e:
        log("Tests timed out", "ERROR")
        return type("Result", (), {"returncode": -1, "stdout": e.stdout or "", "stderr": (e.stderr or "") + "\n[DEVLOOP] Tests timed out"})()
    except Exception as e:
        log(f"Tests crashed: {e}", "ERROR")
        return type("Result", (), {"returncode": -2, "stdout": "", "stderr": f"[DEVLOOP] Tests error: {e}"})()


def run_opencode(prompt: str) -> dict:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    pf = DATA_DIR / f"prompt_{int(datetime.datetime.now().timestamp())}.txt"
    pf.write_text(prompt, encoding="utf-8")
    log("Running opencode...")
    start = datetime.datetime.now()
    try:
        r = subprocess.run(
            [OPENCODE_SHELL, "-c", f'exec "{OPENCODE_CMD}" run --attach "{OPENCODE_URL}" -m "{OPENCODE_MODEL}" < "{pf}"'],
            capture_output=True, text=True, timeout=1200,
        )
        exit_code = r.returncode
        stdout = r.stdout
        stderr = r.stderr
    except subprocess.TimeoutExpired as e:
        elapsed = (datetime.datetime.now() - start).total_seconds()
        exit_code = -1
        stdout = e.stdout or ""
        stderr = e.stderr or ""
        stderr += f"\n[DEVLOOP] TIMEOUT after {elapsed:.0f}s"
        log(f"opencode timed out after {elapsed:.0f}s", "ERROR")
    except Exception as e:
        elapsed = (datetime.datetime.now() - start).total_seconds()
        exit_code = -2
        stdout = ""
        stderr = f"[DEVLOOP] Unexpected error: {e}"
        log(f"opencode crashed: {e}", "ERROR")
    elapsed = (datetime.datetime.now() - start).total_seconds()
    # Save log
    lf = LOG_DIR / f"run_{int(start.timestamp())}.log"
    lf.write_text(f"# Exit: {exit_code}\n# Elapsed: {elapsed:.1f}s\n# STDOUT:\n{stdout}\n# STDERR:\n{stderr}\n", encoding="utf-8")
    return {"exit": exit_code, "out": stdout, "err": stderr, "elapsed": elapsed}


def git_commit(task: dict):
    subprocess.run(["git", "add", "-A"], capture_output=True)
    r = subprocess.run(
        ["git", "commit", "-m", f"{COMMIT_PREFIX} {task['id']}: {task['label']}"],
        capture_output=True, text=True,
    )
    log(f"Commit: {r.stdout.split(chr(10))[0] if r.stdout else 'done'}")


def git_push():
    """Push current branch to origin."""
    r = subprocess.run(
        ["git", "push", "origin", "HEAD"],
        capture_output=True, text=True, timeout=60,
    )
    if r.returncode == 0:
        log(f"Push: {r.stdout.split(chr(10))[0] if r.stdout else 'done'}")
    else:
        log(f"Push failed: {r.stderr.strip()[:200]}", "ERROR")


# ── Task auto-generation ───────────────────────────────────
MAX_TASKS_PER_CYCLE = 8

def auto_generate(queue: dict) -> int:
    log("Analyzing codebase for new tasks...")
    added = 0
    existing_ids = {t["id"] for t in queue["tasks"]}

    def add_if_new(tid: str, label: str, prompt: str, priority: int = 2):
        nonlocal added
        if added >= MAX_TASKS_PER_CYCLE:
            return
        if tid in existing_ids:
            return
        queue["tasks"].append({
            "id": tid,
            "label": label,
            "status": "pending", "retries": 0, "max_retries": 2,
            "prompt": prompt,
        })
        existing_ids.add(tid)
        added += 1
        log(f"  + {tid}: {label[:60]}")

    skip_dirs = {"node_modules", ".next", ".git", ".expo"}
    search_roots = [
        p for p in [PROJECT_ROOT / "src", PROJECT_ROOT / "app"]
        if p.is_dir()
    ]

    # ── TIER 1: NEW FEATURES (highest priority) ────────────
    # ── 1a. Feature gap: missing CRUD screens for services ──
    tab_screens = set()
    tabs_dir = PROJECT_ROOT / "app" / "(tabs)"
    if tabs_dir.is_dir():
        for d in tabs_dir.iterdir():
            if d.is_dir() and not d.name.startswith("_"):
                tab_screens.add(d.name)
    for f in sorted((PROJECT_ROOT / "src" / "services").glob("*.ts")):
        svc = f.stem
        if svc == "index":
            continue
        screen_names = {svc, svc.replace("-", ""), svc + "s"}
        if not any(s in tab_screens for s in screen_names):
            try:
                content = f.read_text(encoding="utf-8", errors="ignore")
                is_major = len(content) > 1500 and ("export" in content)
            except Exception:
                is_major = False
            if is_major:
                add_if_new(
                    f"feat-{svc}-screen",
                    f"[feature] Create {svc} management screen",
                    f"Create a new screen at `app/(tabs)/{svc}/` for managing {svc} data.\n\nRead existing screens (e.g. app/(tabs)/minutes/) as reference pattern.\nImplement: list view, create form, edit, delete.\n\nRun `npx vitest run` and `npx tsc --noEmit`.",
                    priority=1
                )

    # ── 1b. Feature enhancements for existing screens ──────
    screen_features = {
        "search": ("Search/filter bar", "Add a search bar at the top to filter items by name or content."),
        "sort": ("Sort options", "Add sort controls (by date, name, status) with ascending/descending toggle."),
        "pull-refresh": ("Pull-to-refresh", "Add RefreshControl to the FlatList so users can pull down to refresh data."),
        "empty-state": ("Better empty state", "Enhance the empty state with an illustration, description, and CTA button."),
    }
    for screen_dir in sorted(tab_screens):
        screen_path = tabs_dir / screen_dir
        screen_files = set()
        for ext in ("*.tsx", "*.ts"):
            for p in screen_path.rglob(ext):
                screen_files.add(p.name)
        screen_content = ""
        for sf in screen_files:
            try:
                screen_content += (screen_path / sf).read_text(encoding="utf-8", errors="ignore")
            except Exception:
                pass
        for feat_key, (feat_label, feat_desc) in screen_features.items():
            tid = f"enh-{screen_dir}-{feat_key}"
            if tid in existing_ids:
                continue
            # Check if already implemented
            if feat_key == "search" and ("search" in screen_content.lower() or "filter" in screen_content.lower()):
                continue
            if feat_key == "sort" and "sort" in screen_content.lower():
                continue
            if feat_key == "pull-refresh" and "RefreshControl" in screen_content:
                continue
            if feat_key == "empty-state" and ("empty" in screen_content.lower() or "no data" in screen_content.lower()):
                continue
            add_if_new(
                tid,
                f"[enhance] {screen_dir}: {feat_label}",
                f"Enhance the `{screen_dir}` screen: {feat_desc}\n\nLook at the current code in `app/(tabs)/{screen_dir}/`, implement the enhancement. Run `npx vitest run`.",
                priority=1
            )

    # ── 1c. Cross-cutting new feature suggestions ──────────
    new_features = [
        ("fav-favorites", "Favorites/bookmarks", "Allow users to bookmark important items and view them in a dedicated 'Favorites' section."),
        ("cal-calendar-view", "Calendar view for minutes", "Add a calendar tab to browse minutes by date with a month-at-a-glance view."),
        ("exp-export-pdf", "Export to PDF/text", "Add an export button that generates PDF or text file from meeting minutes and shares it."),
        ("dash-dashboard", "Dashboard with stats", "Create a dashboard tab showing usage stats, recent activity, and quick actions."),
        ("hist-history-tab", "Recent history view", "Add a chronological history view showing recent minute edits, transcriptions, and uploads."),
        ("search-global", "Global search across data", "Implement a global search screen that searches across all data types (minutes, transcriptions, recordings)."),
    ]
    # Only suggest features whose screen doesn't exist yet
    existing_feat_ids = {t["id"].split("-")[1] for t in queue["tasks"] if t["id"].startswith("feat-")}
    existing_screen_keywords = {s.replace("-", "").lower() for s in tab_screens}
    for nf_id, nf_label, nf_prompt_template in new_features:
        prefix = nf_id.split("-")[0]
        if nf_id not in existing_ids and prefix not in existing_feat_ids:
            # Check if a similar screen already exists
            keyword = nf_id.split("-", 1)[1].replace("-", "").lower()
            if keyword not in existing_screen_keywords:
                add_if_new(
                    nf_id,
                    f"[new feature] {nf_label}",
                    f"Implement a new feature: {nf_label}\n\n{nf_prompt_template}\n\nStudy existing screens (e.g. app/(tabs)/minutes/) for patterns. Add a new tab if appropriate or add to existing navigation.\n\nRun `npx vitest run` and `npx tsc --noEmit`.",
                    priority=1
                )

    # ── TIER 2: TESTING ────────────────────────────────────
    # ── 2a. Untested service functions ─────────────────────
    for f in sorted((PROJECT_ROOT / "src" / "services").glob("*.ts")):
        svc = f.stem
        if svc == "index":
            continue
        try:
            content = f.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        # Find exported functions
        funcs = re.findall(r"export\s+(?:async\s+)?function\s+(\w+)", content)
        # Find matching test file
        test_files = list(PROJECT_ROOT.glob(f"src/__tests__/{svc}.test.*"))
        tested_funcs = set()
        for tf in test_files:
            try:
                tc = tf.read_text(encoding="utf-8", errors="ignore")
                tested_funcs.update(re.findall(r"(?:describe|it|test)\([\"'](\w+)", tc))
            except Exception:
                pass
        untested = [fn for fn in funcs if fn not in tested_funcs]
        if untested:
            add_if_new(
                f"test-{svc}-coverage",
                f"[test] Increase {svc} test coverage ({len(untested)} untested functions)",
                f"Add missing unit tests for these functions in `src/services/{svc}.ts`: {', '.join(untested)}\n\nRead the file and add tests to `src/__tests__/{svc}.test.ts`. Mock external dependencies. Run `npx vitest run`.",
                priority=2
            )

    # ── 2b. Screens without test files ─────────────────────
    for screen_dir in sorted(tab_screens):
        test_in_screen = list((tabs_dir / screen_dir).rglob("__tests__/*.test.*"))
        if not test_in_screen:
            add_if_new(
                f"test-{screen_dir}-screen",
                f"[test] Add tests for {screen_dir} screen",
                f"Create unit tests for the `{screen_dir}` screen at `app/(tabs)/{screen_dir}/__tests__/`.\n\nRead the screen files, test rendering and main interactions. Follow patterns from other screen tests. Run `npx vitest run`.",
                priority=2
            )

    # ── TIER 3: CODE QUALITY ───────────────────────────────
    # ── 3a. `any` type cleanup ─────────────────────────────
    any_count = 0
    for root_dir in search_roots:
        for ext in ("*.ts", "*.tsx"):
            try:
                files = list(root_dir.rglob(ext))
            except (FileNotFoundError, OSError):
                continue
            for f in sorted(files):
                if any(x in f.parts for x in skip_dirs) or ".test." in f.name:
                    continue
                try:
                    content = f.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue
                # Count `any` type annotations (not comments)
                any_matches = re.findall(r":\s*any\b", content)
                if any_matches:
                    any_count += len(any_matches)
    if any_count > 0:
        add_if_new(
            "refactor-any-types",
            f"[quality] Replace {any_count} `any` types with specific types",
            f"Found {any_count} `any` type annotations in the codebase.\n\nScan `src/` and `app/` for `: any` patterns and replace with proper TypeScript types/interfaces. Prioritize service files first.\n\nRun `npx vitest run` and `npx tsc --noEmit`.",
            priority=3
        )

    # ── 3b. Error handling gaps ────────────────────────────
    for root_dir in search_roots:
        for ext in ("*.ts",):
            try:
                files = list(root_dir.rglob(ext))
            except (FileNotFoundError, OSError):
                continue
            for f in sorted(files):
                if any(x in f.parts for x in skip_dirs) or ".test." in f.name:
                    continue
                try:
                    content = f.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue
                # Find async functions without try-catch
                async_funcs = re.findall(r"(?:export\s+)?async\s+function\s+(\w+)", content)
                for fn in async_funcs:
                    # Find the function body using a simple heuristic
                    pattern = rf"(?:export\s+)?async\s+function\s+{fn}\s*\([^)]*\)\s*{{"
                    m = re.search(pattern, content)
                    if m:
                        start = m.end()
                        # Get the function body (up to 500 chars)
                        body = content[start:start+500]
                        if "try" not in body and "catch" not in body:
                            add_if_new(
                                f"fix-{f.stem}-{fn}-error-handling",
                                f"[fix] Add error handling to {f.stem}.{fn}()",
                                f"Function `{fn}()` in `{f.relative_to(PROJECT_ROOT)}` is async but lacks try-catch error handling.\n\nRead the file, add proper error handling with meaningful error messages. Run `npx vitest run`.",
                                priority=3
                            )

    # ── 3c. Console.log cleanup ────────────────────────────
    console_count = 0
    for root_dir in search_roots:
        for ext in ("*.ts", "*.tsx"):
            try:
                files = list(root_dir.rglob(ext))
            except (FileNotFoundError, OSError):
                continue
            for f in sorted(files):
                if any(x in f.parts for x in skip_dirs) or ".test." in f.name:
                    continue
                try:
                    content = f.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue
                logs = re.findall(r"console\.(?:log|warn|error)\(", content)
                console_count += len(logs)
    if console_count > 0:
        add_if_new(
            "refactor-console-logs",
            f"[quality] Review {console_count} console.log/warn/error calls",
            f"Found {console_count} console.log/warn/error calls in production code.\n\nReview each one. Replace debug logs with proper logging or remove them. Keep only meaningful error logging.\n\nRun `npx vitest run`.",
            priority=3
        )

    # ── 3d. TODO/FIXME/HACK/BUG scanning ───────────────────
    for root_dir in search_roots:
        for ext in ("*.ts", "*.tsx"):
            try:
                files = list(root_dir.rglob(ext))
            except (FileNotFoundError, OSError):
                continue
            for f in sorted(files):
                if any(x in f.parts for x in skip_dirs):
                    continue
                try:
                    content = f.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue
                for mtch in re.finditer(r"(TODO|FIXME|HACK|BUG|XXX)\s*[:-]?\s*(.+)", content):
                    tag, desc = mtch.group(1), mtch.group(2).strip()
                    add_if_new(
                        f"todo-{f.stem}-{tag.lower()}",
                        f"[{tag}] {f.relative_to(PROJECT_ROOT)}: {desc[:80]}",
                        f"Address the {tag} in `{f.relative_to(PROJECT_ROOT)}`:\n{desc}\n\nRead the file, implement the fix. Run `npx vitest run`.",
                        priority=3
                    )

    # ── 3e. TypeScript compilation errors ──────────────────
    try:
        tsc_result = subprocess.run(
            ["npx", "tsc", "--noEmit"],
            capture_output=True, text=True, shell=True, timeout=300
        )
        if tsc_result.returncode != 0:
            tsc_seen = set()
            for line in tsc_result.stdout.splitlines() + tsc_result.stderr.splitlines():
                line = line.strip()
                m = re.match(r'^(.+?):\s*error\s+(TS\d+)\s*:\s*(.+)$', line, re.IGNORECASE)
                if not m:
                    m = re.match(r'^(.+?)\((\d+),\d+\):\s*error\s+(TS\d+)\s*:\s*(.+)$', line)
                if m:
                    path_part = m.group(1).replace("\\", "/")
                    # Extract TS error code from correct group
                    if m.lastindex == 3:  # pattern 1: path: error TSxxx: msg
                        err_code = m.group(2)
                    elif m.lastindex == 4:  # pattern 2: path(line,col): error TSxxx: msg
                        err_code = m.group(3)
                    else:
                        err_code = m.group(m.lastindex)  # fallback
                    msg = m.group(m.lastindex)
                    # Normalise TS error code
                    if not err_code.startswith("TS"):
                        err_code = "TS" + err_code
                    tid = f"tsc-{err_code.lower()}"
                    if tid not in existing_ids and err_code not in tsc_seen:
                        tsc_seen.add(err_code)
                        add_if_new(
                            tid,
                            f"[fix] TS error {err_code} in {path_part}",
                            f"Fix the TypeScript error in `{path_part}`:\n{err_code}: {msg}\n\nRead the file, fix the error. Run `npx vitest run` and `npx tsc --noEmit` to verify.",
                            priority=3
                        )
    except subprocess.TimeoutExpired:
        log("tsc --noEmit timed out, skipping", "WARN")
        record_failure("auto_tsc", "tsc_timeout", "tsc --noEmit timed out during auto_generate (timeout=300s)")
    except FileNotFoundError:
        log("npx not found, skipping tsc check", "WARN")

    # ── TIER 4: REFACTORING (lowest priority) ─────────────
    # ── 4a. Long functions ─────────────────────────────────
    for root_dir in [PROJECT_ROOT / "src" / "services"]:
        if not root_dir.is_dir():
            continue
        for f in sorted(root_dir.glob("*.ts")):
            try:
                content = f.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            # Simple heuristic: find function definitions and estimate their length
            func_starts = list(re.finditer(r"(?:export\s+)?(?:async\s+)?function\s+(\w+)", content))
            for i, m in enumerate(func_starts):
                fn_name = m.group(1)
                fn_start = m.start()
                fn_end = func_starts[i + 1].start() if i + 1 < len(func_starts) else len(content)
                fn_lines = content[fn_start:fn_end].count("\n")
                if fn_lines > 60:
                    add_if_new(
                        f"refactor-{f.stem}-{fn_name}-split",
                        f"[refactor] {f.stem}.{fn_name}() is {fn_lines} lines, consider splitting",
                        f"Function `{fn_name}()` in `{f.relative_to(PROJECT_ROOT)}` is {fn_lines} lines long.\n\nRead the file, break it into smaller helper functions. Keep the public API unchanged. Run `npx vitest run`.",
                        priority=4
                    )

    # ── Failure-based improvement tasks ──────────────────────
    for s in get_failure_patterns():
        add_if_new(s["id"], s["label"], s["prompt"], priority=s["priority"])

    if added:
        save_queue(queue)
        log(f"Auto-generated {added} task(s)")
    return added


# ── Parse test output ──────────────────────────────────────
def parse_tests(out: str) -> dict:
    # Strip ANSI escape codes
    ansi_clean = re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', out)
    files = re.search(r"Test Files\s+(\d+) passed", ansi_clean)
    tests = re.search(r"Tests\s+(\d+) passed", ansi_clean)
    failed = re.search(r"Tests\s+\d+ failed", ansi_clean)
    return {
        "files": int(files.group(1)) if files else 0,
        "tests": int(tests.group(1)) if tests else 0,
        "failed": bool(failed) or False,
    }


def cleanup_logs():
    """Keep log directory tidy — trim old run logs and loop.log."""
    KEEP_RUN_LOGS = 20
    LOOP_LOG_MAX_LINES = 200

    # ── Run logs ──
    run_logs = sorted(LOG_DIR.glob("run_*.log"), key=lambda p: p.stat().st_mtime, reverse=True)
    for old in run_logs[KEEP_RUN_LOGS:]:
        try:
            old.unlink()
        except OSError:
            pass

    # ── loop.log ──
    lp = LOG_DIR / "loop.log"
    if lp.exists():
        try:
            lines = lp.read_text(encoding="utf-8").splitlines()
            if len(lines) > LOOP_LOG_MAX_LINES:
                lp.write_text("\n".join(lines[-LOOP_LOG_MAX_LINES:]) + "\n", encoding="utf-8")
        except OSError:
            pass


# ── Single cycle ────────────────────────────────────────────
def run_one_cycle() -> str:
    """
    Run a single dev cycle. Returns a human-readable summary string.
    """
    cleanup_logs()  # Tidy up logs at the start of each cycle
    try:
        # Crash recovery
        queue = load_queue()
        recovered = []
        for t in queue["tasks"]:
            if t["status"] == "running":
                t["status"] = "pending"
                log(f"Crash recovery: {t['id']} reset to pending")
                recovered.append(t['id'])
        save_queue(queue)
        if recovered:
            user_msg(f"⚠️ 前回のタスク（{', '.join(recovered[:2])}）が途中で止まってたからリセットしたよ")

        if not ensure_server():
            user_msg("💥 opencodeサーバー起動できなかった…")
            return "ERROR: opencode server could not be started"

        queue = load_queue()
        task = get_next_pending(queue)
        if task is None:
            # Try auto-generate
            user_msg("🤔 今のタスク全部終わったから、新しいタスク探してみるね")
            added = auto_generate(queue)
            if added == 0:
                user_msg("✨ やることも増やすこともないみたい。また30分後に見に来るね〜")
                return "NO_WORK: no pending tasks, no new tasks auto-generated"
            queue = load_queue()
            task = get_next_pending(queue)
            if task is None:
                user_msg("✨ 新しいタスク見つからなかった。また後で〜")
                return "NO_WORK: auto-generation found nothing"

        tid = task["id"]
        log(f">> Starting: {task['label']} ({tid})")
        # Extract screen/label from task label like "[enhance] auth: Search/filter bar"
        label = task["label"].split(":")[-1].strip() if ":" in task["label"] else task["label"]
        user_msg(f"🤖 {label}やっていくよ！")
        mark_task(task, "running")
        save_queue(queue)

        # Run opencode
        r = run_opencode(task["prompt"])

        # Record opencode failures
        if r["exit"] == -1:
            record_failure(task["id"], "opencode_timeout",
                           f"opencode timed out after {r['elapsed']:.0f}s: {task['label']}")
        elif r["exit"] != 0:
            record_failure(task["id"], "opencode_error",
                           f"opencode exited code {r['exit']} ({r['elapsed']:.0f}s): {r['err'][:150]}")

        changes = has_changes()
        if not changes and r["exit"] == 0:
            log("opencode exited 0 but made no changes — may be a no-op")

        # Test
        tr = run_tests()
        tp = parse_tests(tr.stdout + tr.stderr)
        tests_ran = tp["tests"] > 0 or tp["files"] > 0
        tests_ok = tr.returncode == 0 and not tp["failed"]

        if changes and tests_ok and tests_ran:
            log(f"SUCCESS: {tp['tests']} tests, {r['elapsed']:.1f}s")
            mark_task(task, "completed")
            git_commit(task)
            git_push()
            save_queue(queue)
            # Get next pending task for the message
            next_q = load_queue()
            next_task = get_next_pending(next_q)
            next_msg = f" ⏩ 次は{next_task['label'].split(':')[-1].strip()}" if next_task else ""
            user_msg(f"✅ {label}できたよ！（{r['elapsed']:.0f}s / {tp['tests']}tests）{next_msg}")
            return f"DONE ({r['elapsed']:.1f}s, {tp['tests']} tests): {task['label']}"
        elif changes and tests_ok and not tests_ran:
            log("Changes made but 0 tests ran — treating as failure", "WARN")
            record_failure(task["id"], "test_failure",
                           f"0 tests ran after opencode: {task['label']}")
            task["retries"] += 1
        else:
            err_detail = tr.stderr.strip()[:200] if tr.stderr else f"exit {tr.returncode}"
            record_failure(task["id"], "test_failure",
                           f"Tests failed ({err_detail}): {task['label']}")
            task["retries"] += 1

        remaining = task.get("max_retries", 2) - task["retries"]
        if remaining > 0:
            log(f"FAIL, retrying ({remaining} left)", "ERROR")
            mark_task(task, "pending")
            save_queue(queue)
            user_msg(f"🤔 テスト通らなかった… リトライするね（残り{remaining}回）")
            return f"RETRY ({remaining} left): {task['label']}"
        else:
            log(f"FAIL, max retries reached — skipping", "ERROR")
            mark_task(task, "skipped")
            save_queue(queue)
            user_msg(f"😅 {label}は何度試してもダメだったからスキップするね")
            return f"SKIPPED (max retries): {task['label']}"
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        log(f"UNEXPECTED CRASH: {e}\n{tb}", "CRITICAL")
        user_msg("💥 なんか予期しないエラーで落ちちゃった…")
        return f"CRASHED: {e}"


def status_text() -> str:
    queue = load_queue()
    lines = [f"Flux Dev Loop — {datetime.datetime.now().strftime('%H:%M')}"]
    lines.append(f"Tasks: {len(queue['tasks'])} total")
    for t in queue["tasks"]:
        icon = {"pending": "○", "running": "▶", "completed": "✓", "skipped": "✗"}.get(t["status"], "?")
        lines.append(f"  {icon} {t['id']}: {t['label']} ({t['status']})")
    return "\n".join(lines)


JOB_ID = "3b28ebec163e"


def self_trigger(schedule_str: str = "every 1m"):
    """Update cron schedule to a relative interval (e.g. 'every 1m', 'every 30m')."""
    try:
        r = subprocess.run(
            ["hermes", "cron", "edit", JOB_ID, "--schedule", schedule_str],
            capture_output=True, text=True, timeout=15,
        )
        if r.returncode == 0:
            log(f"Self-trigger: schedule → {schedule_str}")
        else:
            log(f"Self-trigger failed: {r.stderr.strip()[:200]}", "ERROR")
    except Exception as e:
        log(f"Self-trigger exception: {e}", "ERROR")


# ── CLI ──────────────────────────────────────────────────────
if __name__ == "__main__":
    if "--status" in sys.argv:
        print(status_text())
        sys.exit(0)

    if "--add-task" in sys.argv:
        idx = sys.argv.index("--add-task") + 1
        if idx >= len(sys.argv):
            print("ERROR: --add-task requires a file path")
            sys.exit(1)
        path = Path(sys.argv[idx])
        if not path.exists():
            print(f"ERROR: file not found: {path}")
            sys.exit(1)
        queue = load_queue()
        prompt = path.read_text(encoding="utf-8")
        tid = f"manual-{path.stem}"
        if any(t["id"] == tid for t in queue["tasks"]):
            print(f"Task {tid} already exists")
        else:
            queue["tasks"].append({
                "id": tid,
                "label": path.stem.replace("-", " ").title(),
                "status": "pending", "retries": 0, "max_retries": 2,
                "prompt": prompt,
            })
            save_queue(queue)
            print(f"Added: {tid}")
        sys.exit(0)

    # Default: run one cycle
    # Crash recovery FIRST — reset any stuck "running" tasks before skip check
    q = load_queue()
    recovered = []
    for t in q["tasks"]:
        if t["status"] == "running":
            t["status"] = "pending"
            t["retries"] = 0
            log(f"Crash recovery: {t['id'][:50]} reset to pending")
            recovered.append(t["id"])
    if recovered:
        save_queue(q)
        user_msg(f"⚠️ 前回のタスクが途中で止まってたからリセットしたよ")
        q = load_queue()  # reload after save

    # Skip if a previous cycle is still in progress (task marked "running") — only if recovery didn't work
    if any(t["status"] == "running" for t in q["tasks"]):
        log("Previous task still running — skipping this tick (recovery ineffective)", "WARN")
        user_msg("⏳ まだ前のタスクやってるみたい。次のtickでまた確認するね")
        sys.exit(0)

    result = run_one_cycle()

    has_work = result and not result.startswith("NO_WORK")
    if has_work:
        self_trigger("every 3m")   # fast loop (opencode takes ~2min, so 3m avoids overlap)
    else:
        self_trigger("every 30m")  # slow polling when idle

    # Report — summary already sent by user_msg in run_one_cycle
    log(f"Cycle result: {result}")
