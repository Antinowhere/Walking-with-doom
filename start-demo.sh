#!/bin/bash

echo "Starting Walking with Doom Demo..."
echo ""
echo "=== QUICK FIXES APPLIED ==="
echo "✓ Text labels now face correct directions"
echo "✓ Fence segments properly aligned"
echo "✓ Static sound fixed on dark side"
echo ""
echo "=== NEW FEATURES ADDED ==="
echo "✓ 'TAKE ME BACK' button with skull near spawn"
echo "✓ Rooftop scene with rain and skyline"
echo "✓ Graffiti easter eggs on walls"
echo "✓ Voxel objects: ropes, tools, Xbox, TV with static"
echo "✓ Proximity-based audio for river and fire"
echo ""
echo "=== AUDIO FILES (optional) ==="
echo "Place in public/ folder:"
echo "• ambient1.mp3"
echo "• gentle_river_flowing-#2-1757658386707.mp3"
echo "• fire_burning-#1-1757658444170.mp3"
echo "• offchance.wav"
echo ""
echo "Opening http://localhost:8080 in your browser..."

# Try to open in browser (works on macOS)
if command -v open &> /dev/null; then
    (sleep 2 && open http://localhost:8080) &
fi

# Start Python server
python3 -m http.server 8080
