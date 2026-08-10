# Media / Gallery photos — one folder per club

Photos live in `public/gallery/<org-slug>/`. This folder is `silent-souls`
(Ravens of Death MC). They appear on that club's public Media page
(`/<slug>/gallery`) and in its home page hero filmstrip automatically — no code
changes needed.

**Per club, deliberately.** A flat `public/gallery` was read by every org, so a
second club on the same deployment showed the first club's photo wall as its
own. A club with no folder simply has no shipped photos, which is correct.

- Supported: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`
- **Caption** comes from the file name: dashes/underscores become spaces.
  `sandy-shores-ride.jpg` -> "sandy shores ride"
- **Order** is alphabetical. To control it, prefix a number:
  `01-club-photo.jpg`, `02-food-drive.jpg`. The number is stripped from the caption.
- **`_captions.json`** (optional) overrides both: files listed in `order` come
  first, in that order, with the titles given. Anything in the folder but not
  listed still shows, after them, captioned from its filename. Delete the file
  and everything falls back to filename captions in alphabetical order.

After adding files, commit + push. Hard-refresh the live site (Ctrl+Shift+R).
