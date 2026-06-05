import sys
import json
import base64
import asyncio
import re
from edge_tts import Communicate

def _to_edge_pitch(pitch):
    if not pitch:
        return "+0Hz"
    m = re.match(r"^([+-]?\d+)\s*st$", pitch)
    if m:
        hz = int(m.group(1)) * 12
        return f"{'+' if hz >= 0 else ''}{hz}Hz"
    if re.match(r"^[+-]\d+Hz$", pitch):
        return pitch
    return "+0Hz"

def _to_edge_rate(rate):
    if rate:
        if not rate.startswith("+") and not rate.startswith("-"):
            return f"+{rate}"
        return rate
    return "+0%"

async def generate(config):
    mode = config.get("mode", "single")
    audio = bytearray()

    if mode == "single":
        c = Communicate(
            config.get("text", ""),
            voice=config.get("voice", "es-AR-ElenaNeural"),
            rate=_to_edge_rate(config.get("rate", "+0%")),
            pitch=_to_edge_pitch(config.get("pitch", "")),
        )
        async for chunk in c.stream():
            if chunk["type"] == "audio":
                audio.extend(chunk["data"])
    else:
        for seg in config.get("segments", []):
            c = Communicate(
                seg.get("text", ""),
                voice=seg.get("voice", "es-AR-ElenaNeural"),
                rate=_to_edge_rate(seg.get("rate", "+0%")),
                pitch=_to_edge_pitch(seg.get("pitch", "")),
            )
            async for chunk in c.stream():
                if chunk["type"] == "audio":
                    audio.extend(chunk["data"])

    return base64.b64encode(bytes(audio)).decode("utf-8")

if __name__ == "__main__":
    cfg = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    result = asyncio.run(generate(cfg))
    sys.stdout.buffer.write(result.encode("utf-8"))
