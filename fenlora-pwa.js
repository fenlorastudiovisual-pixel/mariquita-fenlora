/* ════════════════════════════════════════════════════════════
   FENLORA PWA — "Guardar en mi celular" para Rutas Fenlora
   Un solo módulo para los 3 paneles: mapa, negocio y conductor.

   Uso:
     FenloraPWA.init({
       name:      'Rutas Fenlora',        // nombre de la app
       shortName: 'Rutas',                // nombre corto (bajo el ícono)
       id:        '/rutas-mapa',          // identidad única (separa cada app)
       icon: { mode:'static', url:'fenlora-icon-512.png', url192:'fenlora-icon-192.png' },
       // icon: { mode:'photo', url:'<foto del negocio>', text:'Nombre' }   // foto, con inicial de respaldo
       // icon: { mode:'emoji', emoji:'🚕' }                                 // emoji sobre badge dorado
       // icon: { mode:'initial', text:'Nombre' }                           // inicial en círculo
       button: { mode:'float', text:'📲 Guardar app' }       // botón flotante (mapa)
       // button: { mode:'after', anchor:'hero', text:'📲 Guardar este panel' } // botón inline tras un elemento
     });
   ════════════════════════════════════════════════════════════ */
(function () {
  var FenloraPWA = {};
  var deferredPrompt = null;
  var cfg = {};

  // ── Detección de plataforma ──
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  // ── Generadores de ícono (canvas → data URL) ──
  function roundRect(x, a, b, w, h, r) {
    x.beginPath();
    x.moveTo(a + r, b);
    x.arcTo(a + w, b, a + w, b + h, r);
    x.arcTo(a + w, b + h, a, b + h, r);
    x.arcTo(a, b + h, a, b, r);
    x.arcTo(a, b, a + w, b, r);
    x.closePath();
  }
  function goldGrad(x, size) {
    var g = x.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, '#e8b923');
    g.addColorStop(1, '#c8860a');
    return g;
  }
  function initialIcon(text, size) {
    size = size || 512;
    var c = document.createElement('canvas'); c.width = c.height = size;
    var x = c.getContext('2d');
    x.fillStyle = '#0a091c'; x.fillRect(0, 0, size, size);
    x.beginPath(); x.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
    x.fillStyle = goldGrad(x, size); x.fill();
    x.fillStyle = '#1a1305';
    x.font = 'bold ' + (size * 0.46) + 'px Syne, Arial, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    var letra = (text || 'F').trim().charAt(0).toUpperCase() || 'F';
    x.fillText(letra, size / 2, size / 2 + size * 0.02);
    return c.toDataURL('image/png');
  }
  function emojiIcon(emoji, size) {
    size = size || 512;
    var c = document.createElement('canvas'); c.width = c.height = size;
    var x = c.getContext('2d');
    x.fillStyle = '#0a091c'; x.fillRect(0, 0, size, size);
    var m = size * 0.10, r = size * 0.18;
    roundRect(x, m, m, size - 2 * m, size - 2 * m, r);
    x.fillStyle = goldGrad(x, size); x.fill();
    x.font = (size * 0.5) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(emoji || '🚗', size / 2, size / 2 + size * 0.04);
    return c.toDataURL('image/png');
  }

  // Resuelve los íconos a usar según el modo
  function resolveIcons(icon) {
    icon = icon || {};
    if (icon.mode === 'static') {
      return { i512: icon.url, i192: icon.url192 || icon.url };
    }
    if (icon.mode === 'photo') {
      if (icon.url) return { i512: icon.url, i192: icon.url };
      return { i512: initialIcon(icon.text, 512), i192: initialIcon(icon.text, 192) };
    }
    if (icon.mode === 'emoji') {
      return { i512: emojiIcon(icon.emoji, 512), i192: emojiIcon(icon.emoji, 192) };
    }
    if (icon.mode === 'initial') {
      return { i512: initialIcon(icon.text, 512), i192: initialIcon(icon.text, 192) };
    }
    return { i512: 'fenlora-icon-512.png', i192: 'fenlora-icon-192.png' };
  }

  // ── Manifiesto dinámico (Blob) + meta de iOS ──
  function injectManifest(c, icons) {
    var manifest = {
      id: c.id || location.pathname,
      name: c.name,
      short_name: c.shortName || (c.name || 'Fenlora').slice(0, 12),
      start_url: c.startUrl || (location.pathname + location.search),
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: c.bg || '#0a091c',
      theme_color: c.theme || '#c8860a',
      icons: [
        { src: icons.i192, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: icons.i512, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: icons.i512, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    };
    var blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.querySelector('link[rel="manifest"]');
    if (!link) { link = document.createElement('link'); link.rel = 'manifest'; document.head.appendChild(link); }
    link.href = url;

    // iOS
    setMeta('apple-mobile-web-app-capable', 'yes');
    setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    setMeta('apple-mobile-web-app-title', c.shortName || c.name);
    setMetaTheme(c.theme || '#c8860a');
    var ati = document.querySelector('link[rel="apple-touch-icon"]');
    if (!ati) { ati = document.createElement('link'); ati.rel = 'apple-touch-icon'; document.head.appendChild(ati); }
    ati.href = icons.i192;
  }
  function setMeta(name, content) {
    var m = document.querySelector('meta[name="' + name + '"]');
    if (!m) { m = document.createElement('meta'); m.name = name; document.head.appendChild(m); }
    m.content = content;
  }
  function setMetaTheme(color) {
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    m.content = color;
  }

  // ── Botón ──
  function styles() {
    if (document.getElementById('fenlora-pwa-styles')) return;
    var s = document.createElement('style');
    s.id = 'fenlora-pwa-styles';
    s.textContent =
      '.fpwa-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;' +
      'font-weight:700;font-size:14px;cursor:pointer;border:none;border-radius:12px;padding:13px 20px;' +
      'background:linear-gradient(135deg,#e8b923,#c8860a);color:#1a1305;box-shadow:0 4px 16px rgba(200,134,10,.35);' +
      'transition:transform .12s,box-shadow .12s}' +
      '.fpwa-btn:active{transform:scale(.97)}' +
      '.fpwa-after{width:calc(100% - 40px);margin:14px 20px 4px}' +
      '.fpwa-float{position:fixed;left:14px;bottom:16px;z-index:1500}' +
      '@media(min-width:700px){.fpwa-float{left:auto;right:18px}}' +
      /* Guía iOS */
      '#fpwa-ios{display:none;position:fixed;inset:0;z-index:9999;background:rgba(10,9,28,.86);backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:24px}' +
      '#fpwa-ios.show{display:flex}' +
      '#fpwa-ios .box{background:#16122a;border:1px solid rgba(200,134,10,.35);border-radius:18px;max-width:340px;width:100%;padding:24px 22px;color:#fff;text-align:center}' +
      '#fpwa-ios h3{margin:0 0 6px;font-size:17px}' +
      '#fpwa-ios p{margin:0 0 16px;font-size:13px;color:rgba(255,255,255,.7);line-height:1.5}' +
      '#fpwa-ios .step{display:flex;align-items:center;gap:11px;text-align:left;background:rgba(255,255,255,.05);border-radius:10px;padding:11px 13px;margin-bottom:9px;font-size:13px;line-height:1.4}' +
      '#fpwa-ios .step b{color:#e8b923}' +
      '#fpwa-ios .num{flex-shrink:0;width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#e8b923,#c8860a);color:#1a1305;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px}' +
      '#fpwa-ios .cerrar{margin-top:8px;background:none;border:none;color:rgba(255,255,255,.5);font-size:13px;cursor:pointer;padding:6px;font-family:inherit}';
    document.head.appendChild(s);
  }

  function mkBtn(text) {
    var b = document.createElement('button');
    b.className = 'fpwa-btn';
    b.id = 'fpwa-install';
    b.type = 'button';
    b.innerHTML = text || '📲 Guardar en mi celular';
    b.onclick = FenloraPWA.install;
    return b;
  }

  function mountButton(btnCfg) {
    if (isStandalone()) return; // ya instalada → no mostrar
    styles();
    var b = mkBtn(btnCfg && btnCfg.text);
    if (btnCfg && btnCfg.mode === 'after' && btnCfg.anchor) {
      var anchor = document.getElementById(btnCfg.anchor);
      if (anchor && anchor.parentNode) {
        b.classList.add('fpwa-after');
        anchor.parentNode.insertBefore(b, anchor.nextSibling);
        return;
      }
    }
    // por defecto: flotante
    b.classList.add('fpwa-float');
    document.body.appendChild(b);
  }

  // ── Guía para iPhone ──
  function buildIOSGuide() {
    if (document.getElementById('fpwa-ios')) return;
    var d = document.createElement('div');
    d.id = 'fpwa-ios';
    d.innerHTML =
      '<div class="box">' +
      '<h3>📲 Guardar como app</h3>' +
      '<p>En iPhone, guárdala en 2 pasos desde Safari:</p>' +
      '<div class="step"><div class="num">1</div><div>Toca el botón <b>Compartir</b> &#x2191; (abajo en Safari)</div></div>' +
      '<div class="step"><div class="num">2</div><div>Elige <b>"Añadir a pantalla de inicio"</b></div></div>' +
      '<div class="step"><div class="num">3</div><div>Toca <b>Añadir</b> y listo ✅</div></div>' +
      '<button class="cerrar" onclick="document.getElementById(\'fpwa-ios\').classList.remove(\'show\')">Cerrar</button>' +
      '</div>';
    d.addEventListener('click', function (e) { if (e.target === d) d.classList.remove('show'); });
    document.body.appendChild(d);
  }
  function showIOSGuide() { styles(); buildIOSGuide(); document.getElementById('fpwa-ios').classList.add('show'); }

  function showAndroidFallback() {
    alert('Para instalar la app:\n\nToca el menú ⋮ (arriba a la derecha) y elige\n"Instalar aplicación" o "Agregar a pantalla de inicio".');
  }

  // ── API pública ──
  FenloraPWA.init = function (options) {
    cfg = options || {};
    var icons = resolveIcons(cfg.icon);
    cfg._icons = icons;

    try { injectManifest(cfg, icons); } catch (e) {}

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(cfg.sw || 'sw.js').catch(function () {});
    }

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
    });
    window.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      var b = document.getElementById('fpwa-install');
      if (b) b.style.display = 'none';
    });

    if (cfg.button) mountButton(cfg.button);
  };

  FenloraPWA.install = function () {
    if (isStandalone()) return;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; });
    } else if (isIOS()) {
      showIOSGuide();
    } else {
      showAndroidFallback();
    }
  };

  window.FenloraPWA = FenloraPWA;
})();
