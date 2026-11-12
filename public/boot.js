// Start loading the private content while the app bundle is still downloading.
// Without a session the server answers {"authenticated":false} to this probe and
// the app shows the unlock screen. The promise is consumed once by the app.
// When the content names private fonts, their download starts right away too
// (the app reuses these faces instead of fetching them again).
(function () {
  var ETHIOPIC = 'U+1200-139F, U+2D80-2DDF, U+AB00-AB2F';
  function startFonts(fonts) {
    if (!fonts || typeof FontFace === 'undefined' || !document.fonts) return;
    var list = [
      ['Moon Heading', fonts.heading],
      ['Moon Body', fonts.body],
    ];
    window.__moonFonts = Promise.all(
      list
        .filter(function (f) {
          return f[1] && /^[a-z0-9-]+\.woff2$/.test(f[1]);
        })
        .map(function (f) {
          var face = new FontFace(f[0], 'url(/api/media/' + f[1] + ') format("woff2")', {
            display: 'swap',
            unicodeRange: ETHIOPIC,
            weight: '100 900',
          });
          document.fonts.add(face);
          return face.load().catch(function () {});
        }),
    );
  }
  window.__moonContent = fetch('/api/content', {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'X-Moon-Probe': '1' },
  })
    .then(function (res) {
      if (res.ok)
        res
          .clone()
          .json()
          .then(function (c) {
            if (c && c.fonts) startFonts(c.fonts);
          })
          .catch(function () {});
      return res;
    })
    .catch(function () {
      return null;
    });
})();
