import os
import re
import time
import json
import pathlib
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

API_BASE = "https://api.pokemontcg.io/v2"
API_KEY = os.environ.get("POKEMONTCG_API_KEY", "").strip()

OUT_ROOT = "/mnt/c/Users/Derek/OneDrive/Desktop/Masteraset/imports/images/pokemon"

# Start with Base Set only. Later set to None for all sets.
SET_IDS = ["base1"]

# Download small first (fast). Change to "large" later if you want both.
IMAGE_SIZE = "small"  # "small" or "large"

MAX_WORKERS = 8
TIMEOUT_SECONDS = 120
RETRIES = 6
PAGE_SIZE = 100  # smaller pages reduce timeouts

def headers():
  h = {"User-Agent": "MasteraSet-ImageDownloader/1.2"}
  if API_KEY:
    h["X-Api-Key"] = API_KEY
  return h

def safe_name(s: str) -> str:
  s = (s or "").strip().lower()
  s = re.sub(r"[^a-z0-9._-]+", "_", s)
  s = re.sub(r"_+", "_", s)
  return s[:180] if s else "unknown"

def ensure_dir(p: str):
  pathlib.Path(p).mkdir(parents=True, exist_ok=True)

def api_get(url: str):
  last_err = None
  for attempt in range(RETRIES):
    try:
      req = urllib.request.Request(url, headers=headers())
      with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
        raw = resp.read()
      return json.loads(raw.decode("utf-8"))
    except Exception as e:
      last_err = e
      sleep_s = min(2 ** attempt, 20) + (attempt * 0.2)
      print(f"API retry {attempt+1}/{RETRIES}: {e} (sleep {sleep_s:.1f}s)")
      time.sleep(sleep_s)
  raise last_err

def download_file(url: str, out_path: str):
  if os.path.exists(out_path) and os.path.getsize(out_path) > 10_000:
    return ("skip", out_path)

  ensure_dir(os.path.dirname(out_path))

  last_err = None
  for attempt in range(RETRIES):
    try:
      req = urllib.request.Request(url, headers=headers())
      with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
        data = resp.read()
      with open(out_path, "wb") as f:
        f.write(data)
      return ("ok", out_path)
    except Exception as e:
      last_err = e
      sleep_s = min(2 ** attempt, 20) + (attempt * 0.2)
      time.sleep(sleep_s)

  return ("fail", f"{out_path} :: {last_err}")

def list_cards_for_set(set_id: str):
  cards = []
  page = 1
  while True:
    q = urllib.parse.quote(f"set.id:{set_id}")
    url = f"{API_BASE}/cards?q={q}&page={page}&pageSize={PAGE_SIZE}&orderBy=number"
    data = api_get(url)
    chunk = data.get("data", []) or []
    if not chunk:
      break
    cards.extend(chunk)
    if len(chunk) < PAGE_SIZE:
      break
    page += 1
    time.sleep(0.25)
  return cards

def main():
  if not API_KEY:
    print("ERROR: POKEMONTCG_API_KEY is not set.")
    return

  ensure_dir(OUT_ROOT)

  set_ids = SET_IDS
  print(f"Sets to process: {len(set_ids)}")
  print(f"Image size: {IMAGE_SIZE}")

  tasks = []

  for set_id in set_ids:
    print(f"\n=== Fetching cards for set: {set_id} ===")
    try:
      cards = list_cards_for_set(set_id)
    except Exception as e:
      print(f"ERROR fetching cards for {set_id}: {e}")
      continue

    print(f"Cards found: {len(cards)}")

    set_dir = os.path.join(OUT_ROOT, safe_name(set_id), IMAGE_SIZE)
    ensure_dir(set_dir)

    for c in cards:
      images = c.get("images") or {}
      img_url = images.get(IMAGE_SIZE) or images.get("small") or images.get("large")
      if not img_url:
        continue

      number = (c.get("number") or "").strip()
      name = (c.get("name") or "card").strip()
      cid = (c.get("id") or "").strip()

      ext = os.path.splitext(urllib.parse.urlparse(img_url).path)[1].lower()
      if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        ext = ".jpg"

      # Keep it predictable for sorting:
      # 072_devolution_spray_base1-72.jpg
      num_part = number.zfill(3) if number.isdigit() else safe_name(number)
      file_name = f"{num_part}_{safe_name(name)}_{safe_name(cid)}{ext}"
      out_path = os.path.join(set_dir, file_name)

      tasks.append((img_url, out_path))

  print(f"\nTotal images queued: {len(tasks)}")
  ok = skip = fail = 0

  with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
    future_map = {ex.submit(download_file, url, path): (url, path) for (url, path) in tasks}
    for fut in as_completed(future_map):
      status, outp = fut.result()
      if status == "ok":
        ok += 1
      elif status == "skip":
        skip += 1
      else:
        fail += 1
        print(f"FAIL: {outp}")

  print("\n=== Done ===")
  print(f"Downloaded: {ok}")
  print(f"Skipped: {skip}")
  print(f"Failed: {fail}")
  print(f"Output folder: {OUT_ROOT}")

if __name__ == "__main__":
  main()
