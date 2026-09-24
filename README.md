# Penn State Coffee Club

A single-page site built around opening a coffee bag and discovering a club evening inside it. A Three.js model gives the bag connected front, back, side, and mouth surfaces. Its top panels separate as the visitor scrolls, revealing a photographic coffee bean texture inside. Editorial typography uses Newsreader throughout. The page is still a static Vercel site.

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
