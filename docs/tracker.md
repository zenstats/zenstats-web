# ZenStats Tracking Script

The ZenStats tracking script is a lightweight (~4–6 KB minified, ~2.5 KB gzipped depending on features selected) JavaScript snippet that tracks pageviews, engagement time, scroll depth, custom events, outbound links, file downloads, and form submissions. It supports any framework including React, Vue, Angular, and plain HTML.

## Table of Contents

- [Installation](#installation)
- [Script Variants (Feature Selection)](#script-variants-feature-selection)
- [Script Tag Attributes](#script-tag-attributes)
- [Automatic Tracking](#automatic-tracking)
- [Custom Events (Tagged Events)](#custom-events-tagged-events)
- [Manual Tracking via JavaScript](#manual-tracking-via-javascript)
- [Goals & Conversions](#goals--conversions)
- [Funnels](#funnels)
- [SPA Routing](#spa-routing)
- [Privacy & Data](#privacy--data)
- [Integration Guides](#integration-guides)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

---

## Installation

### Quick Start

1. In your ZenStats dashboard, go to the site's **Install Tracking Code** page
2. Select the features you need using the checkboxes
3. Copy the generated `<script>` snippet
4. Paste it into the `<head>` of every page:

```html
<script defer crossorigin="anonymous" data-domain="yourdomain.com" src="https://your-zenstats-domain.com/js/script.js"></script>
```

Replace `yourdomain.com` with the domain registered in ZenStats, and `your-zenstats-domain.com` with your ZenStats instance hostname.

---

## Script Variants (Feature Selection)

ZenStats compiles optimized script variants based on your selected features. Unlike traditional analytics scripts that bundle everything, ZenStats only includes the code you actually need — keeping your site fast.

In the **Install Tracking Code** page, toggle the checkboxes to enable or disable features. The script URL in the snippet automatically updates to fetch the matching pre-compiled file.

| Feature | Checkbox | Script URL example | Description |
|---------|----------|-------------------|-------------|
| **Tagged Events** | ☑ Tagged Events | `script.te.js` | Track clicks/forms via CSS class names (`event-name=...`) |
| **Outbound Links** | ☑ Outbound Links | `script.ol.js` | Auto-track clicks on links pointing to external domains |
| **File Downloads** | ☑ File Downloads | `script.fd.js` | Auto-track clicks on document/media/archive links |
| **Hash Routing** | ☑ Hash Routing | `script.ha.js` | SPA tracking via `hashchange` instead of History API |
| **Page Exclusions** | ☑ Page Exclusions | `script.ex.js` | Include/exclude pages by path pattern |
| **Manual Pageview URL** | ☑ Manual Pageview URL | `script.ma.js` | Override tracked URL via `options.u` / `options.url` |

### Script file naming

```
script.js                          ← all features (backward‑compatible alias)
script.{ex}.{fd}.{ha}.{ma}.{ol}.{te}.js   ← any combination, sorted alphabetically
```

**Abbreviation key:** `ex` = exclusions, `fd` = file downloads, `ha` = hash routing, `ma` = manual URL, `ol` = outbound links, `te` = tagged events.

### File sizes (minified; ~2.5 KB gzipped)

| Variant | Minified |
|---------|---------|
| Bare (pageviews only) | ~4.1 KB |
| Single feature | ~4.5–5.2 KB |
| All 6 features | ~6.0 KB |

---

## Script Tag Attributes

| Attribute | Required | Feature | Description |
|-----------|----------|---------|-------------|
| `data-domain` | Yes | — | Domain registered in ZenStats |
| `data-api` | No | — | Custom API endpoint (default: `/api/event` from script origin) |
| `data-include` | No | Page Exclusions | Comma‑separated path patterns. If set, **only** matching pages are tracked. Supports `*` (segment) and `**` (multi‑segment). |
| `data-exclude` | No | Page Exclusions | Comma‑separated path patterns. Matching pages are **excluded** from tracking. Supports `*` and `**`. |
| `data-file-types` | No | File Downloads | Comma‑separated file extensions (default: `pdf,xlsx,docx,…`). |

> **Note:** `data-outbound-links` and `data-file-downloads` HTML attributes no longer exist — enable these features via the checkbox UI on the Install page instead. The script variant filename determines which code is included.

### Page Exclusions examples

```html
<!-- Only track /blog/ and /docs/ sub-pages -->
<script defer data-domain="example.com" data-include="/blog/**, /docs/**" src="...script.ex.js"></script>

<!-- Track everything except /admin/ and /internal/ -->
<script defer data-domain="example.com" data-exclude="/admin/**, /internal/**" src="...script.ex.js"></script>

<!-- Wildcard: exclude all .php pages -->
<script defer data-domain="example.com" data-exclude="*.php" src="...script.ex.js"></script>
```

The exclusion check runs per pageview at runtime. Mismatched pages are silently ignored (status: `ignored: true` in callbacks).

### Custom file types

```html
<script defer data-domain="example.com" data-file-types="pdf,zip,csv" src="...script.fd.js"></script>
```

### Proxy Setup (Recommended)

Serve the script from your own domain to avoid ad‑blocker interference:

**Caddy:**

```
example.com {
    handle /js/* {
        reverse_proxy your-zenstats-domain.com
    }
}
```

**Nginx:**

```nginx
location /js/ {
    proxy_pass https://your-zenstats-domain.com/js/;
    proxy_set_header Host your-zenstats-domain.com;
}
```

---

## Automatic Tracking

Once installed, ZenStats automatically tracks:

### Pageviews

- Initial page load
- Browser back / forward navigation
- SPA route changes (History API or hash routing, depending on script variant)

### Engagement (Time on Page & Scroll Depth)

- **Active time**: Measured only when the tab is visible and focused
- **Scroll depth**: Maximum scroll percentage reached
- Active-time deltas are recorded every 10 seconds, with the remainder recorded on navigation, blur, tab hiding or page exit
- The queue is flushed on tab hiding and `pagehide`, including visits shorter than 2 seconds
- `time_on_page` is total reported active time divided by pageviews, including zero for views without engagement; background time is excluded
- Engagement heartbeats do not count toward the events metric or change bounce status on their own

### Outbound Link Clicks

When the **Outbound Links** feature is enabled, clicks on `<a>` elements pointing to other domains are tracked as `Outbound Link: Click` with a `url` property. Pseudo‑protocols (`javascript:`, `mailto:`, `tel:`) are excluded.

### File Downloads

When the **File Downloads** feature is enabled, clicks on links ending with recognized file extensions are tracked as `File Download` with a `url` property.

### Form Submissions

When **Tagged Events** or **Outbound Links** / **File Downloads** are enabled, `<form>` submissions are tracked as `Form: Submission`. If the form has a CSS class `event-name=…`, it is tracked with that custom name instead.

---

## Custom Events (Tagged Events)

The "Tagged Events" feature enables **no‑code event tracking** via CSS classes.

**Format:** `event-name=EventName`

```html
<!-- Track button clicks -->
<button class="event-name=Signup">Sign Up</button>

<!-- Track link clicks -->
<a href="/pricing" class="event-name=Pricing+Click">View Pricing</a>

<!-- Track form submissions -->
<form class="event-name=Contact+Form">
  <input type="email" />
  <button type="submit">Submit</button>
</form>
```

### Additional Properties via Classes

```html
<button class="event-name=Purchase event-plan=Pro event-amount=99">
  Buy Pro
</button>
```

Sends an event named `Purchase` with `{ plan: "Pro", amount: "99" }`.

**Rules:**
- Use `+` for spaces in event names (`Button+Click` → "Button Click")
- Classes are checked on the clicked element and up to 3 parent levels
- For links, the `url` property is automatically set to the link's `href`

---

## Manual Tracking via JavaScript

```javascript
// Basic custom event
zenstats('Signup')

// Event with properties
zenstats('Purchase', {
  props: { plan: 'Business', amount: 99 }
})

// Event with callback
zenstats('Download', {
  callback: function(result) {
    console.log('Status:', result.status)
  }
})

// Non‑interactive event (does not affect bounce rate)
zenstats('Scroll Depth', { interactive: false })

// Manual pageview URL override (requires Manual URL feature)
zenstats('pageview', {
  u: '/virtual-path',
  props: { section: 'docs' }
})
// or using the options.url alias:
zenstats('pageview', { url: '/virtual-path' })
```

---

## SPA Routing

By default, the script uses **History API** (pushState / replaceState / popstate) for SPA pageview tracking. Query-only changes on the same path do not add a pageview.

If your SPA uses **hash-based routing** (`#/path`), select the **Hash Routing** checkbox on the Install page. The script listens for `hashchange` and includes `h: 1` on all events, keeping pageviews and engagement on the same page. Query parameters inside the hash are excluded from page paths and do not add pageviews by themselves.

---

## Goals & Conversions

Create goals in the ZenStats UI to track conversions:

1. **Site Settings** → **Conversions** → **Goals**
2. Click **Add Goal**
3. Choose type:
   - **Custom Event** — match event names like `Signup`, `Purchase`
   - **Page View** — match URL paths like `/thank-you`
4. Enter a display name and create

After creating a goal, the matching events appear in the dashboard.

---

## Funnels

Track multi‑step conversion flows:

1. **Site Settings** → **Conversions** → **Funnels** → **Add Funnel**
2. Name the funnel (e.g., "Signup Flow")
3. Add 2–8 steps by selecting existing goals
4. View results in **Funnel Analysis**: visitors per step, drop‑off, conversion rate

---

## Privacy & Data

### Bot Filtering

ZenStats automatically ignores:

- Headless browsers (`_phantom`, `__nightmare`, `webdriver`, `Cypress`)
- Events from pages with `localStorage.zenstats_ignore = 'true'`

### Ignore Your Own Visits

```javascript
// In browser console
localStorage.setItem('zenstats_ignore', 'true')

// Re‑enable
localStorage.removeItem('zenstats_ignore')
```

### What ZenStats Collects

| Collected | Not Collected |
|-----------|--------------|
| Page URL | Personal information |
| Referrer | |
| Browser & OS | Cookies |
| Screen size | |
| Country / city (from IP) | |
| UTM parameters | |

---

## Integration Guides

### React / Next.js

**React Router** — no setup needed. History‑based SPA tracking is automatic.

**Next.js (App Router):**

```tsx
// app/layout.tsx
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script defer crossorigin="anonymous"
          data-domain="yourdomain.com"
          src="https://stats.example.com/js/script.js" />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### Vue / Nuxt

**Vue Router** — automatic with History mode.

**Nuxt** (`nuxt.config.ts`):

```ts
export default defineNuxtConfig({
  app: {
    head: {
      script: [{
        defer: true,
        crossorigin: 'anonymous',
        'data-domain': 'yourdomain.com',
        src: 'https://stats.example.com/js/script.js'
      }]
    }
  }
})
```

### WordPress

Add to `header.php`:

```php
<script defer crossorigin="anonymous" data-domain="yourdomain.com" src="https://stats.example.com/js/script.js"></script>
```

Or use an **Insert Headers and Footers** plugin.

### Plain HTML

```html
<!DOCTYPE html>
<html>
<head>
  <script defer crossorigin="anonymous" data-domain="yourdomain.com"
          src="https://stats.example.com/js/script.js"></script>
</head>
<body><!-- your content --></body>
</html>
```

---

## Troubleshooting

### Events not showing

1. **Check script loaded**: DevTools → Network → look for the script file
2. **Domain matches**: `data-domain` must match the registered site exactly
3. **Correct variant**: Verify the script URL matches your feature selection
4. **Console errors**: Check for CSP, CORS, or network errors
5. **Goals created**: Custom events only appear after matching goals are set up

### SPA navigation not tracking

- The default variant uses History API; if your SPA uses hash routing, select **Hash Routing** on the Install page
- For custom routing, manually call `zenstats('pageview')` after navigation

### Engagement data missing

- Active-time deltas are recorded every 10 seconds, including the final partial interval on hiding or leaving the page
- Short visits attempt to flush on tab hiding or `pagehide`; process termination, network loss or blockers can still prevent delivery

### Debug mode

```javascript
window.__zenstats = true  // bypass bot filtering during tests
```

---

## API Reference

### `window.zenstats(eventName, options?)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventName` | `string` | Event name ("pageview", "engagement", or custom) |
| `options` | `object` | Optional configuration |

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `props` | `object` | `{}` | Custom properties attached to the event |
| `callback` | `function` | — | Invoked after the request completes |
| `interactive` | `boolean` | `true` | `false` = does not affect bounce rate |
| `u` / `url` | `string` | — | Manual URL override (requires **Manual Pageview URL** feature) |
| `meta` | `any` | — | Arbitrary metadata (JSON‑serialized) |

**Callback response:**

```javascript
{ status: 200, ignored: false }
// status: HTTP status code (0 on network failure)
// ignored: true if the event was filtered (bot, exclusion rule, localStorage flag)
```

### Event Payload (sent to `/api/event`)

```javascript
{
  n: "pageview",              // event name
  v: "1",                     // script version
  t: "2025-01-01T00:00:00.000Z", // client timestamp (ISO 8601, UTC)
  u: "https://example.com/",  // full URL
  d: "example.com",           // domain
  r: "https://google.com/",   // referrer (null if direct)
  p: { key: "value" },        // custom properties
  m: "{\"key\":\"value\"}",   // metadata (JSON string, optional)
  e: 15000,                   // engagement time in ms (engagement only)
  sd: 85,                     // scroll depth in % (engagement only)
  i: false,                   // interactive flag
  h: 1,                       // hash‑routing marker (Hash Routing feature)
  revenue: { amount: "49.99", currency: "USD" } // ecommerce revenue (optional)
}
```

**About `revenue` (ecommerce):** attach a `revenue` object to any event to record its monetary value. `amount` accepts a string or number, `currency` is an ISO 4217 code. Query it with the `total_revenue` / `average_revenue` metrics. The tracking script does not populate `revenue` automatically yet — post the event with the `revenue` field to `/api/event` from your server or checkout flow.

**About `t` (client timestamp):** the tracker stamps each event with the client-side time (`new Date().toISOString()`) when the event occurs. Because events may be buffered client-side and flushed a moment later (see Batching below) or sent on page unload, this preserves the true event time. The server accepts `t` only when it is within the last hour and not in the future; otherwise it falls back to the server receive time. Omitting `t` (older tracker builds) also falls back to server time, so this is backward compatible.

### Batch Payload

To reduce requests, the tracker queues events for up to ~2 seconds and sends them together. When more than one event is queued, they are flushed as a single `batch` request:

```javascript
{
  n: "batch",                 // marks a batch envelope
  v: "1",                     // script version
  e: [                        // array of sub-events (each is a normal payload)
    { n: "pageview", t: "2025-01-01T00:00:00.000Z", u: "...", d: "example.com", ... },
    { n: "Signup",   t: "2025-01-01T00:00:01.200Z", u: "...", d: "example.com", ... }
  ]
}
```

Notes:
- In a batch envelope, `e` is the **array of sub-events** — not the engagement time. Each sub-event carries its own `t`, so per-event ordering and timing survive batching.
- Sub-events inherit the batch-level `d` (domain) when they don't specify their own.
- A single queued event is sent as a normal (non-batch) payload, not wrapped in `batch`.

### Built‑in Event Names

| Event | Source |
|-------|--------|
| `pageview` | Automatic on load / navigation |
| `engagement` | Automatic (scroll depth + active time) |
| `Outbound Link: Click` | Outbound Links feature |
| `File Download` | File Downloads feature |
| `Form: Submission` | Auto‑tracked form submissions |
| `batch` | Multiple queued events sent together |


## Optional scroll depth heatmaps

Enable **Heatmap settings → Collection settings → Collect scroll depth**, and retain `data-heatmap="true"` on your existing Tracker tag. Update both the API and self-hosted `heatmap.js`; older APIs do not advertise the scroll capability. Clicks and scroll collection have independent switches and are gated by the heatmap master switch, path allowlist and page sampling rate.

The heatmap workspace now has a **Scroll depth** mode with 80 vertical reach bands, URL or aggregation-key grouping, device groups, release versions, screenshots and a date range of at most 7 recent calendar days (or the shorter configured raw retention). No-click and no-scroll page views contribute an initial visible sample. Retries and revision updates do not create extra page views.

Reach describes the captured page-view sample, not visitors or completed reading. Large document growth (>25%), report limits and unsupported layouts are flagged and excluded from the valid denominator; late initialization is flagged separately. Scroll reports use a separate bounded queue and do not increment ordinary PV, UV, sessions or custom events. A 202 response acknowledges memory admission only; administrators can inspect **Scroll collection quality**. Historical rollups and Core Web Vitals are planned separately.
