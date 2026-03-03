# Feature: Multi-Stop Route Planner

## Summary

Add route planning that optimizes 80-100 selected properties by distance (nearest neighbor algorithm), splits into 10-stop segments, and exports to Google Maps or Apple Maps based on user's saved preference.

## Decisions

| Decision | Choice |
|----------|--------|
| Map app selection | User preference in settings (one-tap export) |
| Supported apps | Google Maps + Apple Maps only |
| Large selections | Split into 10-stop route segments |
| Route optimization | Nearest neighbor from current GPS location |
| GPS fallback | Use geographic center of properties |

---

## Implementation Phases

### Phase 1: Route Optimization Library

**Create:** `src/lib/route-optimizer.ts`

Core functions:
- `haversineDistance(a, b)` - Calculate distance between coordinates (miles)
- `optimizeRoute(properties, startLocation)` - Nearest neighbor sorting
- `createRouteSegments(orderedProperties)` - Split into chunks of 10
- `generateGoogleMapsUrl(segment, startCoord)` - Google Maps deep link
- `generateAppleMapsUrl(segment, startCoord)` - Apple Maps deep link

Types:
```typescript
interface RouteSegment {
  segmentNumber: number;
  properties: RouteProperty[];
  estimatedDistance: number;
}

interface OptimizedRoute {
  segments: RouteSegment[];
  totalProperties: number;
  propertiesWithoutCoords: number;
  startLocation: Coordinate;
}
```

### Phase 2: Settings Hook

**Create:** `src/hooks/useRouteSettings.tsx`

Follow pattern from `useRoofAgeSettings.tsx`:
- localStorage key: `roofage-pro-route-settings`
- Store: `{ preferredMapApp: "google" | "apple" }`
- Default: `"google"`

**Modify:** `src/components/Providers.tsx` - Add RouteSettingsProvider

### Phase 3: Route Export Modal UI

**Create:** `src/components/route/RouteExportModal.tsx`

Modal flow:
1. Request GPS location on open
2. Run route optimization
3. Display segments with expand/collapse
4. "Open in [App]" button per segment

UI structure:
```
┌─────────────────────────────────────────┐
│ Plan Route                         [X]  │
├─────────────────────────────────────────┤
│ 📍 Starting from your location          │
│ [Google Maps] [Apple Maps] ← toggle     │
├─────────────────────────────────────────┤
│ Route 1 of 10 • 10 stops • ~12.4 mi     │
│ ▼ (expandable address list)             │
│ [Open in Google Maps]                   │
├─────────────────────────────────────────┤
│ Route 2 of 10 • 10 stops • ~8.2 mi      │
│ ▶ (collapsed)                           │
│ [Open in Google Maps]                   │
├─────────────────────────────────────────┤
│ ⚠️ 3 properties skipped (no coords)     │
└─────────────────────────────────────────┘
```

**Create:** `src/components/route/RouteSegmentCard.tsx`
- Collapsible card showing segment details
- Numbered address list when expanded
- "Open" button

### Phase 4: Integration

**Modify:** `src/components/property/SelectionToolbar.tsx`
- Remove 10-stop limit and warning
- Change "Plan Route" button to open RouteExportModal
- Pass selectedProperties to modal

---

## Files to Create

| File | Purpose | ~Lines |
|------|---------|--------|
| `src/lib/route-optimizer.ts` | Algorithm + URL generation | 200 |
| `src/hooks/useRouteSettings.tsx` | Map app preference | 60 |
| `src/components/route/RouteExportModal.tsx` | Main modal | 250 |
| `src/components/route/RouteSegmentCard.tsx` | Segment display | 100 |
| `src/components/route/index.ts` | Barrel export | 5 |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/property/SelectionToolbar.tsx` | Replace route button logic with modal trigger |
| `src/components/Providers.tsx` | Add RouteSettingsProvider |
| `src/hooks/index.ts` | Export useRouteSettings |

---

## Technical Notes

**Nearest Neighbor Algorithm:**
```
1. Start at user's GPS location
2. Find closest unvisited property
3. Move to that property, mark visited
4. Repeat until all visited
5. Split ordered list into 10-property segments
```

**URL Formats:**
- Google: `https://www.google.com/maps/dir/?api=1&origin=LAT,LNG&destination=LAT,LNG&waypoints=LAT,LNG|LAT,LNG`
- Apple: `https://maps.apple.com/?saddr=LAT,LNG&daddr=LAT,LNG+to:LAT,LNG+to:LAT,LNG`

**Segment Chaining:**
- Segment 1: Origin = GPS location
- Segment 2+: Origin = last stop of previous segment

---

## Verification

1. **Unit tests:** Test route optimizer with mock coordinates
2. **Manual testing:**
   - Select 25 properties, verify 3 route segments created
   - Test GPS fallback by denying location permission
   - Verify Google Maps URL opens with correct stops
   - Verify Apple Maps URL opens with correct stops
   - Test on mobile device in Chrome/Safari
3. **Edge cases:**
   - Single property selected
   - Properties with missing coordinates
   - GPS denied/unavailable
