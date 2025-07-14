# ResonanceDB Monorepo Restructuring Plan

## Target Structure
```
/
├── packages/
│   ├── core/                    # Core ResonanceDB library
│   │   ├── src/
│   │   │   ├── core/           # Stream manager, query engine
│   │   │   ├── parser/         # Unified parser system
│   │   │   └── utils/          # Shared utilities
│   │   ├── tests/
│   │   └── package.json
│   ├── ui/                      # Shared UI components
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   └── utils/          # UI utilities
│   │   └── package.json
│   ├── server/                  # Server with integrated UI
│   │   ├── src/
│   │   │   ├── server/         # HTTP server
│   │   │   ├── api/            # REST API
│   │   │   └── ui/             # Server-specific UI
│   │   ├── public/             # Static assets
│   │   └── package.json
│   └── demo/                    # Demo UI application
│       ├── src/
│       ├── public/
│       └── package.json
└── package.json                # Root workspace config
```

## Migration Steps

Important: 
 Use bun
 Use javascript not type script.

### Phase 1: Core Package
1. Create `packages/core/`
2. Move `/src/core/` to `packages/core/src/core/`
3. Move `/src/parser/` to `packages/core/src/parser/`
4. Move `/src/utils/` to `packages/core/src/utils/`
5. Move `/tests/` to `packages/core/tests/`
6. Create `packages/core/package.json`
7. Update all import paths

### Phase 2: Shared UI Package
1. Create `packages/ui/`
2. Move shared components from `/demo-bun/src/components/` to `packages/ui/src/components/`
3. Move shared hooks and utilities to `packages/ui/src/`
4. Create `packages/ui/package.json`
5. Set up dependency on core package

### Phase 3: Server Package
1. Create `packages/server/`
2. Move server-related files to `packages/server/src/`
3. Create server-specific UI in `packages/server/src/ui/`
4. Set up dependencies on core and ui packages
5. Create `packages/server/package.json`

### Phase 4: Demo Package
1. Create `packages/demo/`
2. Move `/demo-bun/` content to `packages/demo/`
3. Update to use core and ui packages
4. Create `packages/demo/package.json`

### Phase 5: Workspace Setup
1. Update root `package.json` with workspace config
2. Remove old files from root
3. Update build scripts
4. Test all packages work together