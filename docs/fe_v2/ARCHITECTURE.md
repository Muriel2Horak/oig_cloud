# OIG FE V2 - Architecture

Tento dokument definuje architekturu FE v2.

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Home Assistant                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   V1 Panel      │  │   V2 Panel      │  │   Backend API   │  │
│  │   (iframe)      │  │   (custom)      │  │   (/api/oig_*)  │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                │                                 │
│                    ┌───────────▼───────────┐                    │
│                    │   hass object         │                    │
│                    │   (states, auth)      │                    │
│                    └───────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Technology Stack

### 2.1 Core
- **Language:** TypeScript 5.x (strict mode)
- **Build:** Vite 5.x
- **Runtime:** Modern browsers (ES2022+), HA Companion apps

### 2.2 UI
- **Framework:** Lit 3.x (Web Components)
- **Charts:** Chart.js 4.x + plugins (zoom, datalabels, annotation)
- **Styling:** CSS Custom Properties + CSS Modules

### 2.3 State Management
- **Local State:** Lit reactive properties
- **HA State:** Direct `hass` subscription
- **Cache:** In-memory with TTL

### 2.4 Testing
- **Unit:** Vitest
- **E2E:** Playwright
- **Visual:** Playwright screenshots

## 3. Module Structure

```
src/
├── core/
│   ├── bootstrap.ts          # App initialization
│   ├── lifecycle.ts          # Mount/unmount handling
│   ├── errors.ts             # Error boundaries & reporting
│   └── logger.ts             # Structured logging
│
├── data/
│   ├── ha-client.ts          # hass access wrapper
│   ├── api.ts                # REST API client
│   ├── entity-store.ts       # State subscription manager
│   └── query-cache.ts        # Request dedup & caching
│
├── ui/
│   ├── components/           # Reusable components
│   │   ├── button.ts
│   │   ├── card.ts
│   │   ├── dialog.ts
│   │   ├── tooltip.ts
│   │   └── ...
│   │
│   ├── features/             # Feature modules
│   │   ├── flow/             # Energy flow visualization
│   │   ├── pricing/          # Pricing tab & charts
│   │   ├── timeline/         # Timeline dialog
│   │   ├── control-panel/    # Control panel
│   │   ├── tiles/            # Custom tiles
│   │   ├── boiler/           # Boiler tab
│   │   ├── analytics/        # Stats & analytics
│   │   ├── shield/           # Shield queue
│   │   └── chmu/             # CHMU warnings
│   │
│   └── layout/               # Layout system
│       ├── shell.ts          # Main shell
│       ├── tabs.ts           # Tab navigation
│       ├── grid.ts           # Responsive grid
│       └── edit-mode.ts      # Layout editing
│
├── utils/
│   ├── format.ts             # Number/date formatting
│   ├── colors.ts             # Color utilities
│   ├── dom.ts                # DOM helpers
│   └── motion.ts             # Animation helpers
│
└── main.ts                   # Entry point
```

## 4. Data Flow

### 4.1 State Updates (Real-time)
```
HA WebSocket (state_changed)
        │
        ▼
  entity-store.ts
        │
        ├─► UI Components (reactive update)
        │
        └─► query-cache.ts (invalidate)
```

### 4.2 REST API Calls
```
UI Component
        │
        ▼
   api.ts
        │
        ├─► query-cache.ts (check cache)
        │       │
        │       ├─► HIT: return cached
        │       │
        │       └─► MISS: fetch
        │
        ▼
  fetchWithAuth (Bearer token)
        │
        ▼
  HA Backend (/api/oig_cloud/*)
        │
        ▼
  Response → Cache → Component
```

### 4.3 Request Lifecycle
```
┌─────────────────────────────────────────────┐
│                Request State                 │
├─────────────────────────────────────────────┤
│  IDLE ─► PENDING ─► SUCCESS ─► COMPLETED    │
│                 │                             │
│                 └─► ERROR ─► RETRY ─► ...    │
└─────────────────────────────────────────────┘
```

## 5. Component Architecture

### 5.1 Base Component
```typescript
// Base class for all V2 components
export abstract class OigComponent extends LitElement {
  // Lifecycle hooks
  protected onMount(): void {}
  protected onUnmount(): void {}
  protected onError(error: Error): void {}
  
  // Hass access
  protected get hass(): Hass | null;
  protected subscribeEntity(entityId: string): void;
  protected unsubscribeEntity(entityId: string): void;
}
```

### 5.2 Feature Module Pattern
```typescript
// Each feature is self-contained
export class PricingFeature {
  // State
  private data: PricingData | null = null;
  private loading = false;
  private error: Error | null = null;
  
  // Public API
  public async load(): Promise<void>;
  public render(): TemplateResult;
  public destroy(): void;
  
  // Event handlers
  private onChartZoom(range: TimeRange): void;
  private onCardClick(block: PriceBlock): void;
}
```

## 6. Rendering Pipeline

### 6.1 Initial Render
```
main.ts
    │
    ├─► bootstrap()
    │       │
    │       ├─► initLogger()
    │       ├─► initErrorHandling()
    │       └─► initHass()
    │
    ├─► render Shell
    │       │
    │       ├─► Header
    │       ├─► Tabs
    │       └─► TabContent
    │
    └─► lifecycle.mount()
```

### 6.2 Tab Content Lazy Loading
```
Tab Switch
    │
    ├─► Check if feature loaded
    │       │
    │       ├─► NO: loadFeature()
    │       │
    │       └─► YES: showFeature()
    │
    └─► Update URL state
```

## 7. Flow Visualization Architecture

### 7.1 Components
```
FlowFeature
    │
    ├─► FlowCanvas (SVG container)
    │       │
    │       ├─► ConnectionLayer (lines)
    │       └─► ParticleLayer (animated particles)
    │
    ├─► FlowNodes[]
    │       │
    │       ├─► SolarNode
    │       ├─► BatteryNode
    │       ├─► InverterNode
    │       ├─► GridNode
    │       └─→ HouseNode
    │
    └─► FlowController
            │
            ├─► Position calculations
            ├─► Animation scheduling
            └─► Performance management
```

### 7.2 Particle System
```typescript
interface ParticleConfig {
  from: Point;
  to: Point;
  color: string;
  speed: number;      // ms for full path
  size: number;       // px
  opacity: number;    // 0-1
  count: number;      // particles per flow
}

class ParticleEngine {
  private flows: Map<string, FlowConfig>;
  private animationId: number | null;
  
  public startFlow(key: string, config: ParticleConfig): void;
  public stopFlow(key: string): void;
  public stopAll(): void;
  public updatePositions(nodes: Map<string, Point>): void;
}
```

## 8. Chart System Architecture

### 8.1 Chart Manager
```typescript
class ChartManager {
  private charts: Map<string, Chart>;
  
  public createChart(id: string, config: ChartConfig): Chart;
  public destroyChart(id: string): void;
  public updateData(id: string, data: ChartData): void;
  public zoomToRange(id: string, start: Date, end: Date): void;
  public resetZoom(id: string): void;
}
```

### 8.2 Zoom State Management
```typescript
interface ZoomState {
  chartId: string;
  start: Date;
  end: Date;
  level: 'full' | 'day' | 'hour';
}
```

## 9. Error Handling

### 9.1 Error Boundaries
```typescript
class ErrorBoundary {
  public catch(error: Error, component: string): void;
  public renderFallback(): TemplateResult;
}

// Global error handler
window.addEventListener('error', (e) => {
  logger.error('Uncaught error', e);
  errorBoundary.catch(e.error, 'global');
});
```

### 9.2 Error Display
- Graceful degradation
- User-friendly messages
- Retry buttons for recoverable errors
- Telemetry for debugging

## 10. Performance Optimizations

### 10.1 Lazy Loading
- Tab content on demand
- Heavy components async
- Code splitting per feature

### 10.2 Rendering
- Virtual scrolling for lists
- Debounced resize handlers
- Throttled state updates
- requestAnimationFrame for animations

### 10.3 Memory
- Cleanup on unmount
- AbortController for fetch
- WeakRef for caches
- Periodic cleanup of stale data

### 10.4 Background Behavior
```typescript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Pause polling
    // Stop particles
    // Reduce timers
  } else {
    // Resume
  }
});
```

## 11. Theming

### 11.1 CSS Variables
```css
:root {
  --oig-bg-primary: var(--primary-background-color);
  --oig-text-primary: var(--primary-text-color);
  --oig-accent: var(--accent-color);
  /* ... */
}
```

### 11.2 Theme Detection
```typescript
function detectTheme(): 'light' | 'dark' {
  // 1. Check HA theme
  // 2. Check system preference
  // 3. Default
}
```

## 12. Storage

### 12.1 Namespacing
```typescript
const STORAGE_PREFIX = 'oig_v2_';

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}
```

### 12.2 Storage Keys
- `oig_v2_layout_{breakpoint}` - Saved layouts
- `oig_v2_tiles_config` - Tiles configuration
- `oig_v2_preferences` - User preferences

## 13. Logging

### 13.1 Structured Logger
```typescript
const logger = {
  debug: (msg: string, data?: object) => void;
  info: (msg: string, data?: object) => void;
  warn: (msg: string, data?: object) => void;
  error: (msg: string, error?: Error, data?: object) => void;
};

// All logs prefixed with [V2]
```

## 14. Deployment

### 14.1 Build Output
```
dist/
├── index.html
├── assets/
│   ├── index-{hash}.js
│   ├── index-{hash}.css
│   ├── vendor-{hash}.js
│   └── features/
│       ├── flow-{hash}.js
│       ├── pricing-{hash}.js
│       └── ...
└── static/
    └── css/
        └── variables.css
```

### 14.2 Cache Strategy
- Hashed filenames for cache busting
- Long cache TTL for hashed assets
- No cache for index.html

## 15. Security

### 15.1 Token Handling
- Never log tokens
- Never store in localStorage
- Use hass.auth automatically

### 15.2 Content Security
- No inline scripts
- No eval
- Sanitize user input

## 16. Migration Path

### Phase 1: Infrastructure
- Build system
- Core modules
- Basic routing

### Phase 2: Shell
- Header
- Tabs
- Theme

### Phase 3: Features
- Flow (particles, nodes)
- Pricing (charts)
- Timeline
- Control Panel

### Phase 4: Polish
- Mobile optimization
- Performance tuning
- Error handling
- Testing
