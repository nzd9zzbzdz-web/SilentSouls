# Media / Gallery photos

Drop image files in **this folder** and they appear on the public Media page
(`/<org>/gallery`) automatically — no code changes needed.

- Supported: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`
- **Caption** comes from the file name: dashes/underscores become spaces.
  `sandy-shores-ride.jpg` -> "sandy shores ride"
- **Order** is alphabetical. To control it, prefix a number:
  `01-club-photo.jpg`, `02-food-drive.jpg`. The number is stripped from the caption.

After adding files, commit + push. Hard-refresh the live site (Ctrl+Shift+R).
