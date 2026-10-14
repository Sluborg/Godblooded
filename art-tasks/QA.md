# Image QA (every image, before it is uploaded or shown)

Lead's rule (2026-10-14, after Stefan rejected U1B: handles both in front of and behind the sun).
Every image passes this check at **full size** before it leaves the chat; Art checks it again on
arrival before anything reaches Lead or Stefan.

**How:** after making an image, look at it at full size and go through the list. Any fail:
redo the image with a corrective prompt that names the fault and the fix (for example "the
hammer handle must pass BEHIND the sun along its whole length"). Up to **3 tries**; if the third
still fails, do not upload it: report the item and the fault instead.

1. **Layering is logical:** every object is either in front of or behind another along its whole
   length, never both. No handle, strap or limb weaving through something solid.
2. **One light:** light from the top left everywhere; highlights and shading agree.
3. **Anatomy and grip:** the right number of fingers, arms and legs; hands really hold what they
   hold (fingers around the grip, the grip inside the fist); weapons have one blade or head,
   joined to their handle; joints bend the right way.
4. **Nothing melted or doubled:** no fused shapes, no duplicated parts, no half-drawn pieces, no
   stray marks, no letters or text unless asked.
5. **Matches `STYLE.md`:** the anchors' painted pixel look, thin dark-brown outline, earthy
   palette, no cartoon faces, no blur, no grain or noise texture.
6. **Matches the batch:** every listed feature is there, the right number of things, nothing
   touches the canvas edge.
7. **Reads at target size:** shrink it to the size the batch names (units 30-40 px, icons 32-48
   px): the silhouette and the main shapes still read.

**Not faults** (Art fixes these in the pipeline; never redo or withhold an image for them, just
note them in the log): a background that is near the key colour instead of exact (it must be
flat and even, e.g. RGB 240,13,242 is fine); framing or size a few percent off the batch (within
about 10 percentage points, e.g. 93% instead of 85%); the canvas size.
