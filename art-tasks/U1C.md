# U1C: logo and app icon, simple and logical (2 images)

Track: ui. Art request 360 (Stefan rejected U1B, 2026-10-14: "not consistent and logical, handles
in front and behind at the same time"). Replaces U1B. **Fewer pieces, nothing crossing**: one
emblem and the wordmark, each element in a fixed stacking order.

Follow `STYLE.md` (**one style**: detailed painted pixel art like the shipped longhouse and
watch tower, grim and mythic, Norse-carved, no cartoon) and `docs/asset-spec.md`. Fetch raw the
anchor pictures `STYLE.md` names and match them. **Check both images against `QA.md`** before
upload; layering (rule 1) is the reason for this batch.

Square canvas at your normal output size, one item per image.

**The emblem** (the same in both items): a **round carved stone disc** with a thin iron rim. On the
disc, carved in shallow relief and evenly spaced around its edge, three small symbols: **a
hammer** (top left), **an owl** (top right), **an eye of Horus** (bottom); they are carved INTO
the stone, nothing sticks out. In the centre of the disc **one glowing gold drop of divine
blood**, lying ON the stone. No weapons, no rays, no ribbons, nothing passing behind or in front of
the disc.

**Stacking order, back to front** (state it exactly like this): background, then the stone disc,
then the carved symbols (in the stone), then the gold drop, then (logo only) the wordmark.

1. `ui_logo`: the emblem in the upper half, centred, about 45% of the canvas width. Below it,
   **not touching or overlapping the emblem**, the wordmark **GODBLOODED** in one line of heavy
   carved letters of dark bronze with a worn gold edge, about 90% of the canvas width, centred.
   Spell it exactly G-O-D-B-L-O-O-D-E-D. **Flat magenta #FF00FF background.**
2. `ui_icon_app`: the emblem alone, filling about 80% of a **deep slate-blue rounded square**
   that fills the canvas, centred. No text. It must **read at 48 px**: the disc, the drop and
   the rim.
