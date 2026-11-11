# Heads track orders

Read `art-tasks/heads/START.md` and `art-tasks/heads/README.md` on `main` first (fetch with `?t=<current time>`). Newest order last.

- O-1 (2026-11-11 21:47): **wake test, no images.** When you notice this order, append one line to `art-inbox/replies/heads.md`: `O-1 | <date time> | woke | <how you noticed it: pull request watch, scheduled task, or Stefan>`. Paint nothing. **Then pause.**
- O-2 (2026-11-11 21:50): **paint.** Before painting, write `O-2 | <date time> | confirmed | starting` in `art-inbox/replies/heads.md`. Then paint **four Thorblood heads** (Thor's children, Norse), one per image, each following `art-tasks/heads/PROMPT.md` over the template, and deliver each as soon as it passes:
  1. **`head_thorblood_01`**: a man, short red beard and short red hair, a scar across one brow.
  2. **`head_thorblood_02`**: a man, braided blond beard with bronze rings, shaved head with one braid on top.
  3. **`head_thorblood_03`**: a woman, long red braided hair, a bronze earring, clearly feminine.
  4. **`head_thorblood_04`**: a woman, short dark-copper hair swept back, a small scar on one cheek, clearly feminine.
  Each a different face and silhouette; all grim adult warriors. **Quota first:** if image generation is refused or rate-limited, write the `stopped | quota` line and stop. When all four are delivered, write the `done` line, **then pause**.
- O-3 (2026-11-11 21:55): **answer to your O-2 question, then carry on with O-2.** Deliver each head **as it comes out**: a 1254 x 1254 render and a near-magenta background (such as 242, 14, 242) are fine. **Do not resize, crop, recolour or correct anything**; Art's import keys near-magenta and measures and scales the head itself. Only the placement and proportions on the template matter. Write `O-3 | <date time> | done | continuing O-2` and go on with O-2.
- O-4 (2026-11-11 22:00): **report progress as you go**, for this and every later order. After each step of each head, append one short line to `art-inbox/replies/heads.md`: `O-<n> | <date time> | progress | head <k> painted, QA ok, uploading`, then `O-<n> | <date time> | progress | head <k> uploaded <link or path>` (or `head <k> redo <k>: <why>`). Keep each run short: deliver, log, pause. Write `O-4 | <date time> | done | progress lines on` and continue with O-2.
- O-5 (2026-11-11 22:02): **this replaces O-4.** No line per head. Write a `progress` line only **at the halfway point** of an order (for example `O-<n> | <date time> | progress | 2 of 4 heads uploaded <links>`) and the `done` line when everything is uploaded, plus the `confirmed | starting` line and any question or failure line as before. Write `O-5 | <date time> | done | progress at halfway only` and continue with O-2.
