# Changelog

All notable changes to this project will be documented in this file.

---

## [v1.1.0] - 2026-04-04

### Added
- Unit tests for `analyzer.cjs` (22 tests covering futures/spot/behavior analysis)
- Unit tests for `shadowSim.cjs` (47 tests covering all strategy simulators)
- `.editorconfig` for consistent coding style across editors

### Fixed
- `simulateSelectiveTrading` now uses real trade counts per hour (`h.total`) instead of hardcoded estimates
- `simulateSpotDCA` gracefully handles missing `totalVolume` data
- `analyzeByHour` no longer mutates the original `pnlTrades` array passed in
- `getAllSpotTrades` now returns errors alongside partial results instead of silently skipping
- `binance.cjs` HTTPS requests now have a 10-second timeout (prevents indefinite hangs)
- `getMotivation` conditional boundaries clarified (no overlapping conditions)
- All magic number thresholds moved to named constants in `coach.cjs`
- All source files are now properly separated (were previously concatenated in git)

### Changed
- Console output changed from Unicode box-drawing chars to ASCII-compatible characters
- `package.json` `npm test` now runs the actual test suites
- Version bumped to `1.1.0` to reflect significant fixes and additions

### Security
- Request timeouts prevent indefinite resource consumption
- Improved error reporting surfaces partial API failures

---

## [v1.0.0] - 2026-03-11

### Added
- Initial release
- Basic Shadow Binance Bot functionality
- Futures income analysis with win/loss tracking
- Spot trade analysis for multiple symbols
- Shadow strategy simulation engine
- AI coaching feedback with behavioral pattern detection
- Demo Mode for when API keys are not configured

### Notes
- First public version
