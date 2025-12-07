import os
import subprocess
import shutil

cwd = "/Users/surfin/love Minnie 图片库项目"
remote_url = "git@github.com:coriaxu/surfin-case-library.git"

def run_cmd(args):
    print(f"Running: {' '.join(args)}")
    try:
        result = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
        print("STDOUT:", result.stdout)
        print("STDERR:", result.stderr)
        return result.returncode
    except Exception as e:
        print("Error:", e)
        return -1

print("Initializing new git repo...")

# 1. Initialize new repo explicitly in this directory
# This will create .git inside "love Minnie..." and mask the parent .git
run_cmd(['git', 'init'])

# 2. Add remote
run_cmd(['git', 'remote', 'add', 'origin', remote_url])

# 3. Add all files
run_cmd(['git', 'add', '.'])

# 4. Commit
run_cmd(['git', 'commit', '-m', 'Initial commit for Minnie Gallery'])

# 5. Force push (we want to overwrite the messy remote)
run_cmd(['git', 'push', '-f', 'origin', 'main'])
