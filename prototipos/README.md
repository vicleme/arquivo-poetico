# Prototypes

Standalone pages for trying an idea before it goes into the app. Nothing here is loaded by `index.html`, no test depends on this folder, and any prototype can be deleted without affecting Arquivo Poético.

## cifra-minima.html

Prototype of the minimal Chord sheet ("Cifra") feature (see `planejamento/ideia-musica-e-cifra.md`, Phase 15): chords pasted the way they appear on chord websites, stored per version (label, key, capo, source, notes) and shown in a monospaced font, with optional chord highlighting. It lets someone who plays an instrument review the format and fields, with six questions at the end of the page.

- Opens directly in the browser, with no build step and no dependencies (only the optional Google Fonts stylesheet).
- The sample lyrics and chords are invented, so no third-party work is included.
- Stores what the user types in `localStorage` under the key `cifra-minima-v1`, deliberately outside the `arquivoPoetico_` prefix, so "Empty the archive" does not touch it.
- The chord recognizer (`ACORDE`, a regular expression) can be reused for the real Chord sheet feature.
- It stays out of the app and out of every export. If the folder is published along with the site, the page is reachable at `/prototipos/cifra-minima.html`.
