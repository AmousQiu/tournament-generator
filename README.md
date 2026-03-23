# Tournament Generator

A beautiful, interactive web app for generating and managing tournament brackets for home games with friends (2-32 players). Supports Single Elimination, Double Elimination, Round Robin, and Swiss System formats.

## Features

- **Modern, responsive design** - Works on desktop, tablet, and mobile
- **Multiple tournament formats**:
  - Single Elimination (traditional bracket)
  - Double Elimination (2-loss elimination)
  - Round Robin (everyone plays everyone)
  - Swiss System (pairings based on performance)
- **Real-time score tracking** - Click on matches to enter scores
- **Automatic advancement** - Winners advance to next rounds automatically
- **Standings tracking** - For Round Robin and Swiss formats
- **Export/Import** - Save and load tournaments as JSON files
- **Bye handling** - Automatically handles non-power-of-2 player counts
- **Local hosting** - Runs entirely in your browser, no server needed

## How to Use

### Option 1: Direct File Access (Simplest)
1. Download or clone this repository
2. Open `index.html` in your web browser
3. Use the interface to set up your tournament

### Option 2: Local HTTP Server (Recommended for best compatibility)
1. Navigate to the tournament-generator directory in your terminal
2. Run: `python3 -m http.server 8000`
3. Open your browser to `http://localhost:8000`

### Setting Up a Tournament
1. Enter the number of players (2-32)
2. Click "Generate Fields" to create player name inputs
3. Enter player names
4. Select tournament type from the dropdown
5. Click "Generate Tournament"
6. Click on matches to enter scores
7. Watch as the bracket updates automatically!
8. Use Export to save your tournament for later
9. Use Import to load a previously saved tournament

## Tournament Types Explained

### Single Elimination
- Classic bracket format
- Lose once and you're out
- Winners advance to next round
- Byes given to top seeds when player count isn't a power of 2

### Double Elimination
- Players are eliminated after 2 losses
- Players with 0 or 1 loss continue to play
- New rounds generated as needed based on loss counts
- Final standings based on loss count then performance

### Round Robin
- Every player plays every other player once
- Points: Win=3, Draw=1, Loss=0
- Standings show Wins/Draws/Losses, Goals For/Against, Points
- Tiebreakers: Goal difference, then goals scored

### Swiss System
- Players paired with similar records each round
- Avoids rematches when possible
- Points: Win=1, Draw=0.5, Loss=0
- Number of rounds: ceil(log2(players)) + 1
- Standings update after each round

## Technical Details

- Built with vanilla HTML5, CSS3, and JavaScript
- No frameworks or dependencies required
- All data stored in browser memory (use Export/Import to persist)
- Responsive design works on all screen sizes
- Accessible color scheme and touch-friendly controls

## Customization

Feel free to modify:
- `styles.css` - Change colors, fonts, spacing
- `app.js` - Adjust tournament logic or scoring rules
- `index.html` - Modify structure or add features

## Browser Support

Works in all modern browsers:
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Android Chrome)

## Development

To run a development server with auto-reload (if you have Node.js):
```bash
npm install -g live-server
live-server
```

Or use Python's built-in server:
```bash
python3 -m http.server 8000
```

Enjoy your home tournaments!