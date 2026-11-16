FROM ollama/ollama:latest

# Ollama ecoute sur toutes les interfaces : necessaire pour que le reseau PRIVE de Fly (plateforme-ia-backend.internal) puisse l'atteindre
ENV OLLAMA_HOST=0.0.0.0:11434
EXPOSE 11434

# Demarre le serveur, telecharge le modele (Qwen 2.5 0.5B, tourne sur CPU) puis reste actif
ENTRYPOINT ["/bin/sh", "-c", "ollama serve & sleep 5 && ollama pull qwen2.5:0.5b && wait"]
