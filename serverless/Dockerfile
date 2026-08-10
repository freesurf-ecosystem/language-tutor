# FreeSurf Language Tutor — consolidated STT + LLM + TTS
# Multi-stage build: download LLM separately, mount as volume at runtime.
# Final image is ~5GB (runtime deps only), LLM lives on host volume.

# Stage 1: LLM downloader (run once to populate your local volume)
FROM nvidia/cuda:12.4.0-runtime-ubuntu22.04 AS downloader

ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y --no-install-recommends software-properties-common \
    && add-apt-repository -y ppa:deadsnakes/ppa \
    && DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y --no-install-recommends \
    python3.12 python3.12-venv python3.12-dev git curl \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.12 1 \
    && python3 -m ensurepip --upgrade \
    && python3 -m pip install --upgrade pip

RUN pip install huggingface_hub[hf_transfer]

RUN python3 -c "from huggingface_hub import snapshot_download; snapshot_download('Qwen/Qwen2.5-3B-Instruct', cache_dir='/models')"

# Stage 2: Runtime — no LLM baked in
FROM nvidia/cuda:12.4.0-runtime-ubuntu22.04

ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y --no-install-recommends software-properties-common \
    && add-apt-repository -y ppa:deadsnakes/ppa \
    && DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y --no-install-recommends \
    python3.12 python3.12-venv python3.12-dev git curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.12 1 \
    && python3 -m ensurepip --upgrade \
    && python3 -m pip install --upgrade pip

# PyTorch with CUDA 12.4
RUN pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu124

# STT + LLM + TTS deps
RUN pip install faster-whisper transformers accelerate bitsandbytes \
    kokoro>=0.8.4 misaki[en] soundfile numpy \
    langdetect runpod

# Pre-download small models only (Whisper, Kokoro) — LLM is volume mounted
RUN python3 -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8'); print('Whisper cached')"
RUN python3 -c "from kokoro import KPipeline; KPipeline(lang_code='a'); print('Kokoro cached')"

COPY handler.py /handler.py

# Expect /models to be mounted at runtime
ENV HF_HOME=/models

CMD ["python3", "-u", "/handler.py"]