from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parents[1]
files=[str(p.relative_to(root)) for p in sorted((root/'client/qa').glob('test-*.mjs')) if 'node:test' in p.read_text()]
if not files:raise RuntimeError('No frontend unit tests found')
sys.exit(subprocess.call(['node','--test',*files],cwd=root))
