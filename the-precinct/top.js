// The top bar on References, the comic builder and the key page: once there is
// work in a case, its button says which case it goes back to. The home page
// keeps the work (in this browser only) and words its own buttons.
(function () {
  try {
    var j = JSON.parse(localStorage.getItem('precinct_journey') || 'null');
    var lab = document.querySelector('#topStart .lab');
    if (!j || !lab || !(j.c >= 1 && j.c <= 5)) return;
    var begun = Object.values(j.done || {}).some(function (d) { return Array.isArray(d) && d.length; })
      || Object.values(j.work || {}).some(function (w) { return w && (w.notes || w.attempt || w.idea); });
    if (begun) lab.textContent = 'Back to Case 0' + j.c;
  } catch (e) {}
})();
