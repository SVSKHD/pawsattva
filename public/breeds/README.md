# Verified breed thumbnails

PetFeed breed thumbnails are client-facing and must be accurate.

## Rules

- Store only manually verified breed images in this folder.
- Prefer WebP files with a square crop, at least 320x320.
- Use lowercase kebab-case names, for example:
  - `/breeds/labrador.webp`
  - `/breeds/german-shepherd.webp`
  - `/breeds/indian-pariah.webp`
- Add the path to the breed's `thumbnail` field in `lib/pet-wellness.ts`.
- Never reuse one breed image for another breed.
- If a breed has no verified local image, leave `thumbnail` unset. The UI will show the PawSattva initials/paw tile instead.

This intentionally avoids random or externally resolved breed photos in the client-facing picker.
