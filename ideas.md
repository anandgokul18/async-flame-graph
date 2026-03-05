# Async Flame Graph Viewer - Design Brainstorm

<response>
<idea>
## Idea 1: "Observatory" — Dark Data Console

**Design Movement**: Inspired by NASA mission control dashboards and Bloomberg terminal aesthetics — dense, information-rich, dark interfaces designed for extended analytical sessions.

**Core Principles**:
1. Information density without clutter — every pixel serves a purpose
2. Dark-first design to reduce eye strain during long profiling sessions
3. Monospaced precision — data alignment matters in performance tooling
4. Contextual progressive disclosure — details emerge on interaction

**Color Philosophy**: Deep charcoal base (#0D1117) with electric cyan (#00D4FF) as the primary accent for active elements, warm amber (#FFB020) for warnings/hot paths, and cool gray (#8B949E) for secondary text. The palette evokes the feeling of monitoring live systems — clinical yet alive.

**Layout Paradigm**: Full-width horizontal split — JSON input panel slides in from the left as a collapsible drawer. The flame graph occupies the full viewport width. A bottom dock holds the timeline ruler and controls. No wasted margins.

**Signature Elements**:
1. Glowing edge highlights on hot code paths that pulse subtly
2. A real-time "heat ruler" timeline bar at the bottom showing time density
3. Frosted glass panels for overlays and tooltips

**Interaction Philosophy**: Keyboard-first with mouse augmentation. Hover reveals depth, click locks focus. Escape always returns to overview. Everything feels like operating an instrument.

**Animation**: Smooth 200ms ease-out transitions for panel reveals. Flame bars grow from left-to-right on initial render like a loading sequence. Tooltip fade-in at 100ms. No bouncing or playful motion — everything is purposeful.

**Typography System**: JetBrains Mono for all data/code values. Inter for UI labels and headings at 600 weight. Strict size hierarchy: 11px data, 13px labels, 16px section headers, 24px page title.
</idea>
<probability>0.08</probability>
<text>A dark, dense analytical console inspired by mission control interfaces — built for serious performance analysis with keyboard-first interactions and information-rich layouts.</text>
</response>

<response>
<idea>
## Idea 2: "Strata" — Geological Layering

**Design Movement**: Inspired by Edward Tufte's data visualization principles crossed with geological survey maps — where layers of earth tell a story of time and pressure, flame graph layers tell a story of execution and concurrency.

**Core Principles**:
1. Warm earth tones that naturally encode depth (deeper = warmer)
2. Clean separation between data and chrome — the visualization IS the interface
3. Generous whitespace around controls, zero whitespace in the graph itself
4. Paper-like texture that makes data feel tangible

**Color Philosophy**: Off-white canvas (#FAFAF7) background with a warm stone palette for the flame bars — sandstone (#E8D5B7), terracotta (#C4725A), deep clay (#8B4513), and obsidian (#2C1810) for the hottest paths. Teal (#2A7F7F) as the sole accent for interactive elements. The warmth makes long analysis sessions comfortable.

**Layout Paradigm**: Asymmetric two-column — narrow left column (280px) holds JSON input, Hz config, and a minimap overview. The right 75% is the flame graph canvas with a floating toolbar. The input area uses a code-editor style with line numbers.

**Signature Elements**:
1. Contour-line borders between parallel execution lanes (like topographic maps)
2. A "geological cross-section" minimap showing the full trace compressed
3. Subtle paper grain texture on the background

**Interaction Philosophy**: Direct manipulation — drag to pan, scroll to zoom, click to drill. The graph responds like a physical map you're exploring. Double-click to "excavate" deeper into a span.

**Animation**: Slow, organic transitions (300ms ease-in-out). Layers slide apart when expanding parallel tasks like geological strata separating. Zoom animations feel like moving through physical space.

**Typography System**: Source Serif 4 for headings (scholarly authority). IBM Plex Mono for code/data values. Source Sans 3 for UI text. Warm gray (#4A4540) text color instead of pure black.
</idea>
<probability>0.06</probability>
<text>A warm, Tufte-inspired analytical interface using geological metaphors — earth tones encode execution depth, and parallel tasks separate like geological strata.</text>
</response>

<response>
<idea>
## Idea 3: "Neon Grid" — Retro-Future Terminal

**Design Movement**: Synthwave/cyberpunk terminal aesthetic — think Tron meets modern DevTools. A bold, high-contrast interface that makes performance analysis feel like piloting a spacecraft.

**Core Principles**:
1. Pure black background with neon-bright data visualization
2. Grid-based precision with visible alignment guides
3. Monochromatic UI chrome with polychromatic data
4. Scanline and CRT-inspired texture effects for atmosphere

**Color Philosophy**: True black (#000000) base. Neon magenta (#FF00FF) for hot paths, electric blue (#00BFFF) for cold paths, neon green (#00FF41) for async/parallel indicators, and phosphor amber (#FFD700) for selected elements. The palette is deliberately extreme — performance data should scream, not whisper.

**Layout Paradigm**: Full-bleed single-column with a retractable command palette at the top (like VS Code's Cmd+P). The flame graph fills the screen edge-to-edge. Controls live in a floating HUD overlay that auto-hides.

**Signature Elements**:
1. Subtle scanline overlay on the background (2px repeating gradient)
2. Neon glow effects (box-shadow) on active/hovered flame bars
3. A "power meter" style Hz indicator with animated fill

**Interaction Philosophy**: Command-palette driven. Type to search, arrow keys to navigate. The interface rewards power users who learn the shortcuts. Mouse works but keyboard is faster.

**Animation**: Sharp, snappy 150ms transitions. Elements appear with a slight "power-on" flicker effect. Glow intensifies on hover. The Hz meter pulses rhythmically.

**Typography System**: Fira Code for everything code-related. Orbitron for the title/branding (space-age feel). System UI for form labels. All caps for section headers with wide letter-spacing.
</idea>
<probability>0.04</probability>
<text>A bold synthwave terminal aesthetic with neon colors on pure black — makes performance analysis feel like operating a futuristic spacecraft with command-palette-driven interactions.</text>
</response>
