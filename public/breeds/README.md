# Breed thumbnails

PetFeed breed thumbnails are client-facing and must be accurate.

## Resolution order

1. **Verified local asset** in `/public/breeds/` — highest priority.
2. **Validated Wikipedia/Wikimedia thumbnail** — server-side resolver searches the exact breed with dog/cat context and rejects ambiguous/unrelated pages.
3. **PawSattva initials + paw tile** — shown when no validated photo is available.

## Adding a permanent PawSattva thumbnail

- Prefer WebP with a square crop, at least 320x320.
- Use lowercase kebab-case names, for example:
  - `/breeds/labrador.webp`
  - `/breeds/german-shepherd.webp`
  - `/breeds/indian-pariah.webp`
- Manually verify that the image matches the breed.
- Add the path to the breed's `thumbnail` field in `lib/pet-wellness.ts`.
- Never reuse one breed image for another breed.

The Wikimedia fallback is cached and validates both the species and breed context before a thumbnail can be displayed. If validation fails, PawSattva shows the branded fallback rather than risking a wrong pet photo.
