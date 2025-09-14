# Walking with Doom

A Three.js experience where you walk between light and dark sides, experiencing progressively intense popup messages.

## How to Run

1. **Simple Python Server (no install needed):**
   ```bash
   python3 -m http.server 8080
   # Or use the start script:
   ./start.sh
   ```
   Then open http://localhost:8080

2. **Or use Vite for better development experience:**
   ```bash
   npm install
   npm run dev
   ```

## Controls
- **WASD** - Move around
- **Mouse** - Look around
- **Click** - Lock pointer for movement

## Audio Files Needed
Place these files in the `public` folder:
- `ambient1.mp3` - Background music for the light side
- `gentle_river_flowing-#2-1757658386707.mp3` - River sound with proximity sensing
- `fire_burning-#1-1757658444170.mp3` - Fire sound with proximity sensing
- `offchance.wav` - Loops on the rooftop scene

The game works without these files but is enhanced with them. Static noise on the dark side is generated procedurally.

## Features
- **Room Layout**: 40x20 unit room divided by a wall with door and window
- **Dark Side**: Concrete floor, debris, trash fires, animated rats, muck pools
- **Light Side**: Grass floor, trees (pine/oak), birds, bees, rabbits, flowing river
- **Popup System**: Messages from popups.txt appear as you move away from center
- **3D Signs**: Ground signs appear showing the popup messages
- **Spatial Audio**: 
  - Static noise on dark side (generated)
  - Proximity-based river and fire sounds
  - Ambient music that fades based on position
- **Visual Effects**: Fog that changes based on your position
- **Boundaries**: Chain-link fence (dark) and wooden fence (light)

## Easter Eggs & Extras
- **"Take Me Back" Button**: Red button with skull on dark side wall - teleports to rooftop
- **Rooftop Scene**: Industrial skyscraper roof with rain, skyline, and "HE WASN'T ALL WRONG" text
- **Graffiti**: 
  - "the chase, the halt, the hint, the fault"
  - Kazakhstan dollar text on light side wall
- **Voxel Objects**: Ropes, hammers, Xbox console, TV with animated static
- **Return Button**: Green button on rooftop to return to main scene

## Troubleshooting
- If popups don't appear, check browser console for loading errors
- Popups appear as you move away from the center doorway toward either side
- Button interactions require pointer lock (click first)
# Walking-with-doom
