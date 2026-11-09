# ZenStats heatmap screenshot worker

Optional internal browser service, separate from the Go ingestion process. Requires Node 22 and Playwright Chromium. `npm ci && npx playwright install chromium`, then set a random `SCREENSHOT_TOKEN` (32+ characters) and `npm start`. For local use with installed Google Chrome, set `SCREENSHOT_BROWSER_CHANNEL=chrome` instead of downloading Chromium. Docker uses its bundled Chromium. Default listen address is `0.0.0.0:8090`; use `HOST=127.0.0.1` for local development.

- `POST /capture`, `Authorization: Bearer <token>`; JSON `{url, viewport_width, viewport_height}`.
- Response `{url, page, image}`: final URL, measured layout, base64 PNG.
- `GET /health` reports worker availability; one task at a time, overload 429.
- `npm test` runs private/reserved destination checks and real Chromium capture tests.

The worker forces browser connections through a DNS-validating HTTP/CONNECT proxy. Default allowed upstream ports: 80 and 443. Private/reserved networks are denied, including subresources and redirects. `SCREENSHOT_ALLOW_PRIVATE_HOSTS` and `SCREENSHOT_ALLOW_PORTS` are explicit administrator-only development exceptions; leave unset in production. Never publish the worker port publicly or place its token in Tracker configuration.

Captures use fresh contexts without login state, suppress ZenStats collection, block service workers and WebSockets, and limit screenshots to 5MiB/25MP. API-side checks additionally require site membership, site URL ownership and an exact match with the selected historical layout. See the backend heatmap implementation document and the deploy repository's `docs/heatmap-screenshot.md`.

The Docker image uses the same pinned Playwright version as package-lock.json. CI builds `zenstats-web-screenshot` alongside the frontend image, including ACR-compatible attestation settings.
