"""Tests for tools/derive (unittest, no extra dependencies).

    python3 -I tools/derive/tests/run.py            all tests (takes the shared heavy-job lock)
    python3 -I tools/derive/tests/run.py --fast     skip the synthetic end-to-end derivations

The full Noomi regression (about 100 s on 4 cores) is not a unit test: run
`python3 -I tools/derive/derive_mallow.py --mallow noomi` (exit 0 = byte-identical).
"""
