import subprocess

cwd = "/Users/surfin/love Minnie 图片库项目"

def run_cmd(args):
    print(f"Running: {' '.join(args)}")
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    print("STDOUT:", result.stdout)
    print("STDERR:", result.stderr)
    return result.returncode

# Add all changes
run_cmd(['git', 'add', '.'])

# Commit
run_cmd(['git', 'commit', '-m', 'Major redesign: Rothko + Dieter Rams inspired dark premium aesthetic'])

# Push
run_cmd(['git', 'push', 'origin', 'main'])
