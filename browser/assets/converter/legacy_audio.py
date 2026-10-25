#!/usr/bin/env python3
"""Read original StormPT PCM audio without altering game client files.

Some .wav files replace the first 8 bytes of the RIFF header with
JODOLH\x03\x00, while .bgm files already contain standard RIFF/WAVE.
The conversion is intentionally narrow: only verified PCM WAVE layouts.
Original assets are private and must never be committed to GitHub.
"""
import argparse
import hashlib
import io
import os
import struct
import wave
from pathlib import Path

LEGACY_HEADER = bytes.fromhex("4a4f444f4c480300")
MAX_BYTES = 50 * 1024 * 1024


def decode_legacy_audio(raw: bytes) -> bytes:
    if not isinstance(raw, bytes) or not (44 <= len(raw) <= MAX_BYTES):
        raise ValueError("Unsupported audio length")
    if raw[8:12] != b"WAVE":
        raise ValueError("Not a WAVE container")
    if raw[:8] == LEGACY_HEADER:
        result = b"RIFF" + struct.pack("<I", len(raw) - 8) + raw[8:]
    elif raw[:4] == b"RIFF" and struct.unpack_from("<I", raw, 4)[0] == len(raw) - 8:
        result = raw
    else:
        raise ValueError("Unknown original audio header")
    try:
        with wave.open(io.BytesIO(result), "rb") as f:
            if (f.getcomptype() != "NONE" or f.getnchannels() not in (1, 2)
                    or f.getsampwidth() not in (1, 2)
                    or not (8000 <= f.getframerate() <= 96000)
                    or f.getnframes() <= 0 or f.getnframes() / f.getframerate() > 300):
                raise ValueError("Unsupported PCM parameters")
            f.readframes(f.getnframes())
    except (wave.Error, EOFError) as e:
        raise ValueError("Invalid WAVE PCM structure") from e
    return result


def convert_file(src: Path, dst: Path):
    data = decode_legacy_audio(src.read_bytes())
    if dst.exists():
        if dst.read_bytes() != data:
            raise FileExistsError("Destination differs; never overwrite without review")
    else:
        dst.parent.mkdir(parents=True, exist_ok=True)
        temp = dst.with_name(dst.name + ".tmp-" + str(os.getpid()))
        try:
            with temp.open("xb") as out:
                out.write(data)
                out.flush()
                os.fsync(out.fileno())
            os.link(temp, dst)
        finally:
            temp.unlink(missing_ok=True)
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    print(convert_file(args.source, args.destination))
