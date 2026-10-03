// =====================================================================
//  Service worker do Painel RVB: deixa o painel instalável como app e mostra os avisos (Web Push)
//  que as funções mandam (_shared/push.ts). Não guarda nada em cache: o painel sempre carrega da rede.
//  Conteúdo do aviso: { titulo, corpo, url, tag }. Tocar no aviso abre o painel direto na conversa.
// =====================================================================
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { corpo: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Painel RVB', {
    body: d.corpo || '',
    icon: 'icone-192.png',
    badge: 'icone-192.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,          // mesma conversa: substitui o aviso anterior, mas vibra de novo
    data: { url: d.url || './#conversas' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './#conversas', self.registration.scope);
  e.waitUntil((async () => {
    // painel já aberto: traz para a frente e pede para abrir a conversa; senão abre uma janela nova
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const painel = janelas.find((c) => c.url.startsWith(self.registration.scope));
    if (painel) { await painel.focus(); painel.postMessage({ abrir: url.hash }); return; }
    await self.clients.openWindow(url.href);
  })());
});
