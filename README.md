# Whiteboard.app — Client-Side Digital Studio

A polished, responsive, fully interactive client-side whiteboard application for teaching, visual explanations, hand-drawn illustrations, diagramming, brainstorming, and presentations.

Built using zero-dependency Vanilla ES Modules, HTML5 Canvas, SVG, Pointer Events, and IndexedDB for local-first document persistence.

---

## Key Features

- **Natural Freehand Drawing & Sketching:**
  - Pen, Sketch Pencil, and Highlighter tools with stroke smoothing and pressure sensitivity.
- **Complete Visual Toolset:**
  - Geometric shapes (Rectangle, Ellipse, Triangle, Diamond).
  - Connector lines, arrows, and straight lines with custom stroke widths and dashed line styles.
  - Text insertion & Sticky Notes with inline rich overlay editing.
  - Image upload with drag-and-drop, aspect ratio preservation, and IndexedDB blob storage.
- **Infinite Feeling Canvas Workspace:**
  - Smooth pan & zoom towards cursor / touch point (`10%` to `500%`).
  - High-DPI `devicePixelRatio` crisp rendering.
  - Background grid choices: Dot Grid, Ruled Paper, Graph Paper, and Blank.
- **Local-First Persistence & Storage:**
  - IndexedDB storage for saved boards and image assets.
  - Debounced background autosave with real-time status indicators.
  - Boards management modal (create, open, duplicate, rename, delete).
- **Educational Templates Library:**
  - Instant pre-populated templates for Lesson Plans, Mind Maps, Flowcharts, Brainstorming boards, Ruled writing, and Coordinate grids.
- **Export & Import Pipeline:**
  - PNG export with auto-calculated artwork bounding box.
  - Valid SVG vector export with XML escaping and styled text/shapes.
  - Versioned JSON document backup export and safe validation re-import.
- **Accessibility & Shortcuts:**
  - Full keyboard accessibility, dark/light theme switcher, and distraction-free Presentation focus mode.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `V` | Select & Transform tool |
| `H` | Hand / Pan tool |
| `P` | Pen tool |
| `E` | Object Eraser tool |
| `T` | Text tool |
| `R` | Rectangle tool |
| `O` | Ellipse tool |
| `Ctrl + Z` / `Cmd + Z` | Undo action |
| `Ctrl + Y` / `Cmd + Shift + Z` | Redo action |
| `Delete` / `Backspace` | Delete selected objects |
| `Escape` | Cancel operation or clear selection |
| `+` / `-` | Zoom in / Zoom out |
| `0` | Reset zoom to 100% |

---

## Architecture & Code Structure

```text
whiteboard.app/
├── index.html                 # Semantic HTML5 Application Shell
├── README.md                  # Application documentation
├── assets/
│   └── logo.svg              # Vector brand icon
├── css/
│   ├── tokens.css            # CSS custom properties (light & dark theme)
│   ├── layout.css            # Application layout & structural styling
│   ├── components.css        # Buttons, modals, tooltips, toasts
│   ├── canvas.css            # Canvas overlay editors
│   └── responsive.css        # Responsive layouts & print stylesheet
└── js/
    ├── main.js               # Application bootstrap & event wiring
    ├── app/
    │   ├── state.js          # Reactive AppState bus
    │   ├── commands.js       # Command pattern undo/redo history
    │   ├── shortcuts.js      # Global keyboard shortcuts manager
    │   └── notifications.js  # Toast status manager
    ├── canvas/
    │   ├── coordinates.js    # Viewport matrix transform (pan/zoom/DPR)
    │   ├── renderer.js       # High-DPI canvas renderer
    │   ├── hit-testing.js    # Vector precision hit detection
    │   └── selection.js      # Bounding box & handle calculations
    ├── tools/
    │   ├── tool-manager.js   # Pointer events router
    │   ├── pen.js            # Freehand stroke handler
    │   ├── eraser.js         # Object-based eraser
    │   ├── shapes.js         # Geometric shapes & lines handler
    │   ├── text.js           # Text & sticky notes inline editor
    │   └── image.js          # Image insertion & IndexedDB upload
    ├── storage/
    │   ├── database.js       # IndexedDB storage wrapper
    │   └── persistence.js    # Debounced autosave & board management
    ├── documents/
    │   ├── schema.js         # Data model schemas & object factories
    │   ├── export.js         # PNG, SVG & JSON export generators
    │   └── import.js         # Document validation & JSON import
    └── ui/
        ├── toolbar.js        # Tool dock UI controller
        ├── inspector.js      # Contextual properties panel
        ├── boards.js         # Boards manager modal
        └── templates.js      # Educational templates generator
```

---

## How to Run Locally

Because the application uses native ES Modules (`import`/`export`), serving files via `http://` or `https://` is required by standard browser security policy (CORS).

You can run any local static HTTP server without installing build bundlers or dependencies:

### Option 1: Python Static Server (Recommended)
```bash
python3 -m http.server 8080
```
Then open `http://localhost:8080` in your web browser.

### Option 2: Node static server
```bash
npx serve .
```

---

## Deployment

Deploy directly to **GitHub Pages** or any static web host (Vercel, Netlify, Cloudflare Pages) by pointing the web root to the repository root directory. No build step required!
