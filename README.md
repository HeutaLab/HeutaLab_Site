# HeutaLab static website

This folder contains the complete framework-free version of the HeutaLab
homepage. It can be opened locally or uploaded to any static web host.

## Folder structure

```text
heutalab-static-site/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── main.js
└── assets/
    ├── favicon.svg
    ├── heutalab-reference.png
    ├── og.png
    └── tiles/
        ├── coding.png
        ├── game-based-learning.png
        ├── media.png
        ├── pd.png
        └── presenting.png
```

## Preview it

You can double-click `index.html`, or run a simple local server from this
folder:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Before publishing

- Replace the placeholder navigation, app, login and social links.
- Connect the newsletter form in `js/main.js` to your email platform.
- Replace `hello@heutalab.example` with the correct email address.
- Use an absolute, public URL for the Open Graph image after the site is live.

No build tools or package installation are required.
