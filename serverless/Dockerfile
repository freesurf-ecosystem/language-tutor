# FreeSurf Language Tutor — consolidated STT + LLM + TTS
# CUDA 12.4, Python 3.12, fits L4 24GB
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

# Pre-download all models
RUN python3 -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8'); print('Whisper cached')"
RUN python3 -c "from transformers import AutoModelForCausalLM, AutoTokenizer; import torch; \
    AutoModelForCausalLM.from_pretrained('Qwen/Qwen2.5-3B-Instruct', torch_dtype=torch.bfloat16, device_map='cpu'); \
    AutoTokenizer.from_pretrained('Qwen/Qwen2.5-3B-Instruct'); print('LLM cached')"
RUN python3 -c "from kokoro import KPipeline; KPipeline(lang_code='a'); print('Kokoro cached')"

COPY handler.py /handler.py

CMD ["python3", "-u", "/handler.py"]