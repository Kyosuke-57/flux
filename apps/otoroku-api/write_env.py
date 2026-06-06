"""Write env.local for otoroku-api using sourced env vars."""
import os
import subprocess
import sys

# Source the .env file and get the keys
result = subprocess.run(
    'source /c/Users/きょ/meeting-minutes-app/.env 2>/dev/null && '
    'echo "AK=$EXPO_PUBLIC_SUPABASE_ANON_KEY" && '
    'echo "SK=$SUPABASE_SERVICE_ROLE_KEY"',
    shell=True, capture_output=True, text=True, executable='/usr/bin/bash'
)

anon_key = ""
service_key = ""
for line in result.stdout.strip().split("\n"):
    if line.startswith("AK="):
        anon_key = line[3:]
    elif line.startswith("SK="):
        service_key = line[3:]

if not anon_key or not service_key:
    print("ERROR: Could not source env vars")
    sys.exit(1)

path = "C:/Users/きょ/meeting-minutes-app/apps/otoroku-api/.env.local"
with open(path, "w", newline="\n") as f:
    f.write("# Supabase (otoroku project: noagjjelimffuxsinvph)\n")
    f.write("NEXT_PUBLIC_SUPABASE_URL=https://noagjjelimffuxsinvph.supabase.co\n")
    f.write(f"NEXT_PUBLIC_SUPABASE_ANON_KEY={anon_key}\n")
    f.write(f"SUPABASE_SERVICE_ROLE_KEY={service_key}\n")
    f.write("\n")
    f.write("# R2 (Cloudflare) - set your account info\n")
    f.write("R2_ACCOUNT_ID=\n")
    f.write("R2_ACCESS_KEY_ID=\n")
    f.write("R2_SECRET_ACCESS_KEY=***\n")
    f.write("R2_BUCKET_NAME=otoroku-audio\n")
    f.write("\n")
    f.write("# Groq Whisper - set your API key\n")
    f.write("GROQ_API_KEY=***\n")
    f.write("\n")
    f.write("# OpenCode Go (transcript refinement) - set your API key\n")
    f.write("OPENCODE_GO_API_KEY=***\n")

print(f"Written {path}")
print(f"anon_key len={len(anon_key)}, service_key len={len(service_key)}")
