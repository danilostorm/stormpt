import importlib.util
import io
import struct
import tempfile
import unittest
import wave
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "converter" / "legacy_audio.py"
spec = importlib.util.spec_from_file_location("legacy_audio", SRC)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def make_wave():
    b = io.BytesIO()
    with wave.open(b, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(1)
        w.setframerate(22050)
        w.writeframes(bytes([128, 127] * 2205))
    return b.getvalue()


class LegacyAudioTests(unittest.TestCase):
    def test_original_riff_unchanged(self):
        raw = make_wave()
        self.assertEqual(mod.decode_legacy_audio(raw), raw)

    def test_legacy_header_restores_only_eight_bytes(self):
        raw = make_wave()
        encrypted = mod.LEGACY_HEADER + raw[8:]
        self.assertEqual(mod.decode_legacy_audio(encrypted), raw)

    def test_unknown_header_rejected(self):
        raw = make_wave()
        with self.assertRaises(ValueError):
            mod.decode_legacy_audio(b"XXXXXXXX" + raw[8:])

    def test_corrupt_wave_rejected(self):
        with self.assertRaises(ValueError):
            mod.decode_legacy_audio(b"RIFF" + struct.pack("<I", 50) + b"WAVE" + bytes(46))

    def test_bad_size_rejected(self):
        raw = make_wave()
        with self.assertRaises(ValueError):
            mod.decode_legacy_audio(raw[:4] + bytes(4) + raw[8:])

    def test_atomic_write_no_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "src.bgm"
            target = Path(temp) / "dst.wav"
            raw = make_wave()
            source.write_bytes(raw)
            self.assertEqual(mod.convert_file(source, target)["bytes"], len(raw))
            self.assertEqual(target.read_bytes(), raw)
            mod.convert_file(source, target)
            target.write_bytes(b"other")
            with self.assertRaises(FileExistsError):
                mod.convert_file(source, target)
            self.assertEqual(target.read_bytes(), b"other")


if __name__ == "__main__":
    unittest.main()
