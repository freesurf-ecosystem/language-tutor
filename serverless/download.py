import os, sys
from huggingface_hub import snapshot_download

token = os.environ.get("HF_TOKEN")
model_id = "Qwen/Qwen2.5-3B-Instruct"
cache_dir = "/models/hub"

print(f"Downloading {model_id} to {cache_dir}", flush=True)
print(f"HF_TOKEN {'set' if token else 'NOT SET'}", flush=True)

snapshot_download(
    model_id,
    token=token,
    cache_dir=cache_dir,
    tqdm_class=None,
)

print(f"Download complete: {model_id}", flush=True)

import glob
files = glob.glob(f"{cache_dir}/**", recursive=True)
print(f"Total files downloaded: {len(files)}", flush=True)
