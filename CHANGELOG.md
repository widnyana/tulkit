# Changelog

## [1.2.0] - 2026-11-24

### Features

- 7925f43 feat(gpx): gate map interaction behind a click and draw route direction as chevrons
- 8945d24 feat(gpx): mark the last viewed library route
- 70c0be4 feat: acknowledge navigation with a progress bar and route fade
- 91f3609 feat(gpx): let the plan-tab map grow with the viewport on tablet and desktop
- 4a900ad feat(gpx): replace the mobile tab strip with a folding-fan menu button
- 55738cf feat(gpx): add BYOK elevation-gain estimate to the result panel
- aaba772 feat(gpx): put the map first and let it grow with the viewport in the view tab
- 1e6ced2 feat(gpx): estimate elevation gain via OpenTopography or Google
- 605442b feat(gpx): respect device safe-area insets
- 00f77fb feat(gpx): turn the missing-entry dialog into a bottom sheet on mobile
- 39c3740 feat(gpx): enlarge route point row actions for touch
- a5749db feat(gpx): size map panels to the viewport and enlarge map control buttons for touch
- 0c93f04 feat(gpx): make the tool tab strip scroll on small screens
- 9bbfc80 feat(gpx): proxy Google's elevation API for the browser

### Bug Fixes

- d146628 fix(gpx): ignore extension-injected attributes when hydrating the page wrapper
- 78ae10b fix(gpx): use design-system tokens for the fan sticks
- 70b3508 fix(gpx): render the section menu as wooden fan sticks
- 34a983b fix(gpx): replace scrolling tab strip with a static grid and short mobile labels

### Other

- 200f6a3 refactor(gpx): share the elevation-gain noise filter
- 7e2456f ci: bump the release workflow actions to v7

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
