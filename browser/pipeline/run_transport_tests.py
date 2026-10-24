from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parents[1]
files=[str(p.relative_to(root)) for p in sorted((root/'transport/test').glob('*.test.mjs'))]
if not files:raise RuntimeError('No transport tests found')
sys.exit(subprocess.call(['node','--test',*files],cwd=root))
