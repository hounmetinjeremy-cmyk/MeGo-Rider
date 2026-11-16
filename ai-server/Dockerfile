FROM ollama/ollama:latest

# Petit portier Node devant Ollama (protege par le secret AI_SECRET)
RUN apt-get update && apt-get install -y --no-install-recommends nodejs && rm -rf /var/lib/apt/lists/*
COPY proxy.js /proxy.js

# Ollama n'ecoute qu'en interne ; seul le portier (port 8080) est accessible depuis Internet
ENV OLLAMA_HOST=127.0.0.1:11434
EXPOSE 8080

# Demarre Ollama et le portier, telecharge Qwen 2.5 0.5B (tourne sur CPU), puis reste actif
ENTRYPOINT ["/bin/sh", "-c", "ollama serve & node /proxy.js & sleep 5 && ollama pull qwen2.5:0.5b && wait"]
