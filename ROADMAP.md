# v1.0 Roadmap

## v1.0.0-alpha.1 — "Foundation"

**Goal: Ship a v1 that's installable, testable, and reliable.**

- [x] Rename to `vite-image-react`
- [x] SVGO integration
- [x] Fix tier width mismatch
- [x] SEO keywords + GitHub topics
- [x] Vite Plugin Registry metadata
- [x] Fix SVG/GIF not writing to disk
- [x] Structured error handling + format fallback (AVIF → WebP → JPEG)
  [x] 7+ empty `catch {}` blocks replaced with `console.warn` + graceful degradation
- [x] CMYK JPEG conversion (detect + toColorspace('srgb'))
- [x] EXIF orientation handling (sharp().rotate())
- [x] Animated WebP input detection
- [x] PNG alpha channel preservation in preprocessor
- [x] Bundle size CI regression check (size-limit)
- [x] Test coverage expanded (77 tests, 10 test files)

## v1.0.0-alpha.2 — "Remote + DX"

- [ ] Remote image loader (`viteImageReact({ remote: { domains: ['images.unsplash.com'] } })`)
- [ ] StackBlitz demo (link in README)
- [ ] Migration guide from `gotodev-image-optimizer`
- [ ] Node 18 support (broaden `engines` field)
- [ ] Add `@vitejs/plugin-react` to compatible packages in registry metadata
- [ ] Auto srcSet generation (multi-width variants)
- [ ] Public directory processing
- [ ] Build caching (content-hash based)

## v1.0.0-rc.1 — "Production ready"

- [ ] Docs site (or expanded README with full API reference)
- [ ] Automated npm publish workflow (tag → publish)
- [ ] Security audit (dependency review, supply chain)
- [ ] Performance benchmark page (gotodev.ma/vite-image-react-benchmark)
- [ ] `fetchPriority='low'` confirmed working across browsers
- [ ] Test coverage >80%

## v1.0.0 — "Ship it"

Blockers:
- [ ] At least 1 real production project running it
- [ ] No open bugs tagged `blocker`
- [ ] All catch blocks have structured fallback
- [ ] CI is green for 2 consecutive weeks

---

## How to contribute

Open issues for bugs, feature requests, or benchmark results.
PRs welcome — see CONTRIBUTING.md.
