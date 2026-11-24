/* Language toggle for Ziyin Luo's site.
 *
 * English is the default. If a visitor switches to Chinese, the choice is
 * stored in localStorage and restored on their next visit, so it "stays
 * Chinese" for them.
 *
 * The toggle works purely with CSS: translatable text is wrapped in
 * <span class="t-en">…</span> and <span class="t-zh">…</span> pairs, and this
 * script flips a data-lang attribute on <html> to show one or the other.
 */
(function () {
  var KEY = 'zyl-site-lang';

  function current() {
    try {
      return window.localStorage.getItem(KEY) === 'zh' ? 'zh' : 'en';
    } catch (e) {
      return 'en';
    }
  }

  function apply(lang) {
    var root = document.documentElement;
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');

    var title = document.querySelector('title');
    if (title && title.getAttribute('data-en') && title.getAttribute('data-zh')) {
      document.title = lang === 'zh'
        ? title.getAttribute('data-zh')
        : title.getAttribute('data-en');
    }

    var btn = document.getElementById('lang-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', lang === 'zh' ? 'true' : 'false');
    }
  }

  // Run synchronously in <head> so returning Chinese readers see no flash
  // of English while the page parses.
  apply(current());

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('lang-toggle');
    if (!btn) { return; }
    btn.addEventListener('click', function () {
      var next = current() === 'zh' ? 'en' : 'zh';
      try { window.localStorage.setItem(KEY, next); } catch (e) {}
      apply(next);
    });
  });
})();
