# TODO

- [x] Remove onWheel zoom handler from FlameGraph canvas (trackpad scroll should scroll page normally)
- [x] Add zoom in/out/reset buttons to Toolbar
- [x] Pass zoom control callbacks from Home through Toolbar to FlameGraph
- [x] Update help text to remove "Scroll to zoom" reference
- [x] Add URL query parameter support for `hz` and `json` (URL-encoded or base64)
- [x] Update URL when user changes hz or json input (sync state to URL)
- [x] Add help text about URL parameter usage
- [ ] Replace query params with compressed hash-fragment encoding (pako gzip + base64url)
- [ ] Support large JSON payloads that exceed URL query param limits
- [ ] Keep backward compat with old ?json= query param links
- [ ] Update Share URL button to use new compressed format
- [ ] Update help text with new URL format
