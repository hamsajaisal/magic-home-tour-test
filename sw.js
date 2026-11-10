// Lets the game work without internet. The first visit saves every game file on the phone.
// After that, the game always tries the internet first (so updates arrive), and uses the saved
// copy when there is no connection or it is very slow.
// Named after where the game lives, so the test copy and the real game keep separate saved files.
const CACHE = `magic-home-tour-v1:${self.registration.scope}`;
const WAIT_MS = 4000;

const FILES = [
  './', 'index.html', 'settings.js', 'manifest.webmanifest', 'css/style.css',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'js/main.js', 'js/audio.js', 'js/controls.js', 'js/fx.js', 'js/i18n.js', 'js/progress.js',
  'js/question-format.js', 'js/questions.js', 'js/rewards.js', 'js/storage.js', 'js/voice.js',
  'js/lib/three.module.min.js', 'js/ui/panels.js', 'js/ui/quiz.js', 'js/ui/practice.js', 'js/ui/slate.js', 'js/ui/news.js', 'js/ui/a11y.js', 'js/a11y-mode.js', 'js/world/route.js',
  'js/world/decor.js', 'js/world/extras.js', 'js/world/forest.js', 'js/world/house.js', 'js/world/physics.js',
  'js/world/player.js', 'js/world/props.js', 'js/world/surprises.js', 'js/world/terrace.js',
  'data/rooms.json', 'data/chapters.json', 'data/shop.json', 'data/badges.json', 'data/lang/en.json', 'data/lang/ml.json',
  'data/voice/voice.json', 'data/questions/index.json', 'data/duplicates.json', 'data/whatsnew.json', 'data/a11y-lines.json',
  'assets/fonts/manjari-malayalam-400.woff2', 'assets/fonts/manjari-malayalam-700.woff2',
  'assets/fonts/anek-malayalam-500.woff2', 'assets/fonts/anek-malayalam-700.woff2',
  'assets/fonts/baloo-chettan-2-latin-500.woff2', 'assets/fonts/baloo-chettan-2-latin-700.woff2',
  'assets/fonts/baloo-chettan-2-latin-800.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(FILES);
    // the question files are listed in data/questions/index.json
    try {
      const index = await (await fetch('data/questions/index.json')).json();
      await cache.addAll((index.files || []).map((f) => `data/questions/${f}`));
    } catch (err) { /* they will be saved the first time they load */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const mine = (key) => key.endsWith(`:${self.registration.scope}`) || key === 'magic-home-tour-v1';
    for (const key of await caches.keys()) if (mine(key) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fromNetworkOrCache(req));
});

async function fromNetworkOrCache(req) {
  const cache = await caches.open(CACHE);
  const network = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  network.catch(() => {});   // handled below
  const slow = new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  try {
    const first = await Promise.race([network, slow]);
    if (first) return first;
  } catch (err) { /* no internet */ }
  const saved = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' && await cache.match('index.html'));
  return saved || network;
}
