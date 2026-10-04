# Upload log

ChatGPT appends one line per event (`art-tasks/README.md`, "Delivering"). Never merged to `main`.

```
<batch> | <YYYY-MM-DD HH:MM> | started
<batch> | <YYYY-MM-DD HH:MM> | <id>, <id>, ... | uploaded
```


B1-test | 2026-10-04 17:23 | started
B1-test | 2026-10-04 17:24 | hero_warrior_t1_front | uploaded

Test delivery: test--hero_warrior_t1_front.png (unchanged PNG, 1254x1254, 1679418 bytes), https://drive.google.com/file/d/1JnwMvAXHlUEw3O6A0_mqO7jLWUqmFSEm/view. Does not complete B1. Review notes: more surface texture and taller framing than specified; green background is near key colour (corner RGB 18,242,15), not exact #00FF00. Generated with built-in image generation from B1 item 1 plus STYLE.md and asset-spec.md.

R1 | 2026-10-04 18:12 UTC | started

R1 | 2026-10-04 18:19:24 UTC | hero_warrior_t1_front_body, hero_warrior_t1_front_arm, hero_warrior_t1_side, hero_warrior_t1_side_body, hero_warrior_t1_side_arm | uploaded
R1 delivery: unchanged 1254x1254 PNGs. front_body: https://drive.google.com/file/d/1jrJwz_aeK4lzZvuMCrxshkksxTJCQZnO/view ; front_arm: https://drive.google.com/file/d/1Fbh3s2zdKIwMJ3fsr56NRe-bQEwhQDB8/view ; side: https://drive.google.com/file/d/1_xuV4axbNsFxzggWHKePp2GPGIluYb8e/view ; side_body: https://drive.google.com/file/d/1jMAKReCtJNGSKjKwr-zYV033xYkTyUxM/view ; side_arm: https://drive.google.com/file/d/1Z-WnjTnNQtMxmFIcGm9eIaa_m09MpR-R/view . Built-in image edits of specified front reference and generated side reference. Review: front arm reposed as requested and alignment corrected once; slight sleeve/shoulder shape differences remain, exact pixel alignment not guaranteed. Side body/arm preserve visual placement, small redraw differences remain. Side figure taller than 75%, feet near 93%. Textures retained to match reference; green corners near key (RGB 14-16,241-242,14-21), not exact #00FF00. No cropping/resizing/conversion/recompression.
B1 | 2026-10-04 18:19:24 UTC | started

B1 | 2026-10-04 18:26:30 UTC | hero_warrior_t1_front, hero_warrior_t1_back, mon_draugr_t1_front, bld_townhall_t1 | uploaded
B1 delivery: unchanged 1254x1254 PNGs, built-in image generation. hero_warrior_t1_front (1480140 bytes): https://drive.google.com/file/d/1rUQdn9Hk63eIFrqD1n7X6PE5c1b3D3Nm/view ; hero_warrior_t1_back (1430070 bytes): https://drive.google.com/file/d/1RYYsXH3orOxI0FDNymMqatoJnpMlAVYZ/view ; mon_draugr_t1_front (1398069 bytes): https://drive.google.com/file/d/1esFbpNxwgIgmEdy64bFtBN3ZHGEHJuWj/view ; bld_townhall_t1 (1676467 bytes): https://drive.google.com/file/d/151qcfcCZzxEyCC8xwJefLEMFdFo1Nk9W/view . Drive metadata readback verified MIME, byte size and destination folder. Review: clean cel-shading improved over original test; units still taller than 75% framing (feet about 91-93%). Back helmet has a long rear vertical strap resembling noseguard; check design consistency. Townhall near 95% width instead of 85%, turf/carving more detailed than ideal at phone scale. Green/magenta backgrounds near key colours rather than exact hex (corners front 18,243,19; back 18,242,19; draugr 240,14,242; townhall 241,14,241). Nothing visibly cut off; no scenery, external shadows or text. B1 awaits Stefan style approval; no later batches made. R1 retained original textured reference as instructed.

S1 | 2026-10-04 20:42 UTC | started

S1 | 2026-10-04 20:50 UTC | hero_warrior-a_t1_front, hero_warrior-b_t1_front, hero_warrior-c_t1_front, hero_warrior-d_t1_front, hero_warrior-e_t1_front | uploaded
S1 delivery: unchanged 1254x1254 PNGs, built-in image generation from the required character reference. A baseline (1642028 bytes): https://drive.google.com/file/d/1-zp_fQ26O-9FldsRVuc16FLYa0t05FsL/view ; B flat mobile strategy (1409010 bytes): https://drive.google.com/file/d/1Ly74035SgW4kjbOreMKCb2XACbtuTryH/view ; C classic fantasy strategy (1642279 bytes): https://drive.google.com/file/d/1zCD8EeUiSRwy0lNILBKa01_i5BqNekqo/view ; D storybook watercolour (1971480 bytes): https://drive.google.com/file/d/13qA1ESw4Xgl0IsWjCOHII7hzD6REnyGK/view ; E chunky pixel art (1246803 bytes): https://drive.google.com/file/d/1ownjn45OXlOL2Vwi6N-DOEuSn3Us_zfw/view . Drive metadata verified names, MIME, byte sizes and destination. Review: all use a lower-handle axe grip and planted stance; A-D axe heads angle upward but read more toward viewer-left than forward lower-right. Styles are clearly differentiated. Figures remain somewhat larger than nominal 75% framing. Pixel variant uses crisp block pixels but its corner background deviates more from key green (RGB 53,243,44); A-D corners are near-green RGB 16-17,242,14-17. No visible cropping, ground, external shadow, scenery or text.
