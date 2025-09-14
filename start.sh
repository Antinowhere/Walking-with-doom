#!/bin/bash

echo "Starting Walking with Doom..."
echo "Opening http://localhost:8080 in your browser..."

# Try to open in browser (works on macOS)
if command -v open &> /dev/null; then
    (sleep 2 && open http://localhost:8080) &
fi

# Start Python server
python3 -m http.server 8080
