# Changelog

## [1.1.0] - 2026-11-23

### Features

- a378807 feat(api): extend the schema allowlist with full origins
- f61a18b feat(ui): show the version and commit in the footer
- 188e27a feat(release): version on push with a changelog and tag

### Bug Fixes

- 86bb610 fix(release): derive the first base from the version commit
- 2241dd2 fix(release): set the committer identity before tagging
- e2df3b2 fix(api): build the elevation request from a constant origin
- c67ca0f fix(ui): scan tags and render diagrams in place
- 17d0273 fix(api): pin outbound fetches through typed lib/net boundary

### Other

- 9ca236d docs: add a security policy
- 366c06d test: retry the palette shortcut until the listener is attached
- 3a47860 docs: record the release rule
