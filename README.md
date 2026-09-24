# Penn State Coffee Club

A single-page site built around opening a coffee bag and discovering a club evening inside it. A Three.js model gives the bag connected front, back, side, and mouth surfaces. The seal, shoulders, and side gussets deform together as the visitor scrolls. A separate lining descends into a hollow, shadowed interior, with no coffee texture across the opening. Scroll motion is damped and reversible; reduced-motion preferences show the open pose without animation. Editorial typography uses Newsreader throughout. The page is still a static Vercel site.

## Local preview

Run a static server from this directory, for example:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Site content

- Weekly schedule: Thursdays at HUB-Robeson 102; Brew Team at 6:30 PM, public meeting at 7 PM, official campus block from 6:30 PM to 8 PM.
- Board names and roles reflect the supplied current officer list.
- Instagram posts are embedded from the public @psucoffee account.
- The flat bag artwork is generated for this site and applied to the model as a texture. The club seal is a locally stored copy of the public Instagram profile image.
- The WebGL scene uses a vendored copy of Three.js 0.186.0 under its MIT license.
- The board is presented as a typographic roster until approved portraits are available.

## Image files

The PNGs preserve the generated source images. The page uses the smaller WebP versions for faster loading.
