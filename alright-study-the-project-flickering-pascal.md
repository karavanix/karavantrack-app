# KaravanTrack Loads Redesign Plan

## Context

The backend has expanded the load status system with granular transit sub-statuses (`picking_up`, `picked_up`, `dropping_off`, `dropped_off`). The frontend is out of sync: types, badges, filters, and the dashboard don't know about these statuses. Alongside this, the overall loads UX needs a rethink — stats cards are confusing, create-load is buried on its own page, and a kanban view better fits how dispatchers think about loads moving through states.

---

## 1. Update Types (`src/types/index.ts`)

### LoadStatus — add new transit substates, keep `completed` for backward compat

```typescript
export type LoadStatus =
  | "created"
  | "assigned"
  | "accepted"
  | "picking_up"
  | "picked_up"
  | "in_transit"
  | "dropping_off"
  | "dropped_off"
  | "completed"      // keep for backward compat
  | "confirmed"
  | "cancelled";
```

### LoadStats — replace old shape with the new API shape

```typescript
export interface LoadStats {
  created: number;
  assigned: number;
  accepted: number;
  picking_up: number;
  picked_up: number;
  in_transit: number;
  dropping_off: number;
  dropped_off: number;
  confirmed: number;
  canceled: number;  // API spells it this way
  total: number;
}
```

---

## 2. Update StatusBadge (`src/components/status-badge.tsx`)

Add entries for: `picking_up`, `picked_up`, `dropping_off`, `dropped_off`

| Status | Label | Variant |
|--------|-------|---------|
| picking_up | Picking Up | warning |
| picked_up | Picked Up | warning |
| in_transit | In Transit | warning |
| dropping_off | Dropping Off | info |
| dropped_off | Dropped Off | info |

---

## 3. Create Load → Modal (`src/components/loads/create-load-modal.tsx`)

Extract the entire `create-load.tsx` form into a `CreateLoadModal` component.

- Use existing `Dialog` from `src/components/ui/dialog.tsx`
- Dialog size: `max-w-5xl w-full` with `max-h-[90vh] overflow-y-auto`
- Inside: two-column layout (form left, map right) — same as current page but inside dialog
- On submit success: `onSuccess()` callback (closes modal + refreshes load list)
- No navigation on success (user stays on dashboard)
- Triggered by the "New Load" button in dashboard header
- Keep `/loads/new` route but redirect it to `/` (or show a simple redirect)

**Props:**
```typescript
interface CreateLoadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
```

---

## 4. Load Card Component (`src/components/loads/load-card.tsx`)

Reusable card for kanban columns, showing:
- Title (bold)
- Reference ID (code, muted)
- StatusBadge
- Carrier name (if assigned)
- Pickup → Dropoff route (truncated addresses)
- Pickup datetime (if set)
- Click → navigate to `/loads/{id}`

Use `card` from `src/components/ui/card.tsx`.

---

## 5. Kanban Board (`src/components/loads/load-kanban.tsx`)

**Column order (all statuses):**

```
Created → Assigned → Accepted → Picking Up → Picked Up → In Transit → Dropping Off → Dropped Off → Confirmed
```

Cancelled loads in a separate collapsed column at the far right (click to expand).

**Layout:**
- Horizontal scrollable flex row
- Each column: fixed width ~280px, full-height scroll
- Column header: status name + count badge (e.g., "Created (3)")
- Column body: scrollable list of `LoadCard` components
- Empty column: muted "No loads" placeholder

**Props:**
```typescript
interface LoadKanbanProps {
  loads: Load[];
  carrierMap: Record<string, string>;
  isLoading: boolean;
}
```

No drag-and-drop for now — status changes happen inside the load detail page.

---

## 6. Dashboard Redesign (`src/pages/dashboard.tsx`)

**Remove:** The 5 stats cards (confusing, don't map to statuses).

**New layout:**

```
[Header: "Loads" title + subtitle]          [+ New Load btn]
[View toggle: ⊞ Kanban | ☰ List]           [↻ Reload btn]
[Error banner if any]
[Kanban view OR List view]
```

**Kanban view** (default): `<LoadKanban loads={loads} ... />`

**List view**: Existing `DataTable` with status filter tabs above it.

**State to add:**
- `viewMode: "kanban" | "list"` (persisted in localStorage so user's preference is remembered)
- `createModalOpen: boolean`

**Data fetching changes:**
- Keep fetching all loads without status filter when in kanban (so all columns are populated)
- When in list view, use per-tab status filtering as before
- Stats API still fetched — but now used only for column header counts in kanban (columns read from `stats` object directly, not from filtering `loads` array)
- 60-second auto-refresh stays

**"New Load" button:** Opens `CreateLoadModal` instead of navigating to `/loads/new`

---

## 7. Load Detail Updates (`src/pages/load-detail.tsx`)

**Update action availability logic:**

```typescript
const canAssign = load.status === "created";
const canCancel = ["created", "assigned"].includes(load.status);
const canConfirm = load.status === "dropped_off" || load.status === "completed"; // backward compat
```

**Update trackable statuses:**

```typescript
const isTrackable = [
  "assigned", "accepted",
  "picking_up", "picked_up",
  "in_transit",
  "dropping_off", "dropped_off"
].includes(load.status);
```

**History timeline:** already supported via `history` array — no API changes needed, just ensure the new status names display properly through `StatusBadge`.

---

## 8. i18n Updates (`src/i18n/locales/en/translation.json` + ru + uz)

Add translation keys for:
- `status_picking_up`, `status_picked_up`, `status_dropping_off`, `status_dropped_off`
- `dashboard_view_kanban`, `dashboard_view_list`
- Update `dashboard_tab_*` or reuse existing keys in list view tabs

---

## 9. Route Cleanup (`src/App.tsx` or router config)

- `/loads/new` → redirect to `/` (since creation is now a modal)
- OR keep the route but open the dashboard with the modal pre-opened (simpler: just redirect)

---

## Kanban Column Grouping (visual design note)

With 9+ columns, use subtle group separators:

```
[Planning]           [Pickup Phase]            [Delivery Phase]    [Done]   [Cancelled]
Created | Assigned | Accepted | PickingUp | PickedUp | InTransit | DroppingOff | DroppedOff | Confirmed
```

---

## Critical Files

| File | Action |
|------|--------|
| `src/types/index.ts` | Expand LoadStatus + LoadStats |
| `src/components/status-badge.tsx` | Add 4 new statuses |
| `src/components/loads/create-load-modal.tsx` | New — extracted form |
| `src/components/loads/load-card.tsx` | New — kanban card |
| `src/components/loads/load-kanban.tsx` | New — board component |
| `src/pages/dashboard.tsx` | Full redesign |
| `src/pages/load-detail.tsx` | Update action/tracking logic |
| `src/i18n/locales/*/translation.json` | New status labels + view toggle |
| `src/pages/create-load.tsx` | Keep or redirect — decision: add redirect to `/` |

---

## Verification

1. Run dev server (`npm run dev`)
2. Open dashboard — verify kanban view shows with all status columns
3. Click "New Load" → modal opens with full form + map
4. Create a load → modal closes, load appears in "Created" column
5. Navigate to load detail — verify new statuses display with correct badges
6. For a load in `dropped_off` status, verify "Confirm Delivery" button appears
7. Toggle to list view — tabs and table display correctly
8. Check carrier tracking still works for new transit substates
9. Verify all 3 locales compile without missing key warnings
