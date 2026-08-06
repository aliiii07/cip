# Root conftest so pytest puts the repo root on sys.path, making the
# top-level `api/` package importable in tests. The installed package only
# covers src/ (cip); api/ is run from the repo root (see api/main.py).
