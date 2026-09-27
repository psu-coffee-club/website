# Penn State Coffee Club

A single-page site built around opening a coffee bag and discovering a club evening inside it. A Three.js model gives the bag connected front, back, side, and mouth surfaces. The seal, shoulders, and side gussets deform together as the visitor scrolls. A separate lining descends into a hollow, shadowed interior, with no coffee texture across the opening. Scroll motion is damped and reversible; reduced-motion preferences show the open pose without animation. Editorial typography uses Newsreader throughout. The page is still a static Vercel site.

## Local preview

Run a static server from this directory, for example:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Site content

- Weekly schedule: Thursdays at HUB-Robeson 102; Brew Team at 6:30 PM and general meeting at 7 PM.
- Board names and roles reflect the supplied current officer list.
- Instagram posts are embedded from the public @psucoffee account.
- The flat bag artwork is generated for this site and applied to the model as a texture. The club seal is a locally stored copy of the public Instagram profile image.
- The WebGL scene uses a vendored copy of Three.js 0.186.0 under its MIT license.
- The board is presented as a typographic roster until approved portraits are available.

## Image files

The PNGs preserve the generated source images. The page uses the smaller WebP versions for faster loading.

## Bag rendering

The bag uses physical paper materials, a metallic lining, and a procedural linear HDR studio environment. On desktop viewports of at least 900px with a fine pointer and floating-point render targets, the story scene loads the vendored `three-gpu-pathtracer` 0.0.24 renderer after the pose settles. It accumulates up to 96 samples with four light bounces, then stops. Scroll movement cancels accumulation immediately and uses the physical raster renderer. Mobile and unsupported devices keep the physical renderer. Rendering pauses when the bag is off screen or the document is hidden.

The path tracer and its BVH dependency are bundled in `vendor/pathtracer.js`; their MIT licenses are in `vendor/PATHTRACER_LICENSES.txt`.

## Club film

The user-supplied 37-second club film appears above the Instagram posts. `videos/coffee-club-film.mp4` is a 1080p H.264/AAC web copy with fast-start metadata; the original 4K MOV remains outside the repository. The player uses native controls, inline playback, an extracted poster frame, and no autoplay or video preloading.
