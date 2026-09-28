/* =====================================================================
   RVB · Chat de orçamento no site (rvb.com.br)
   Um script só, colocado uma vez no tema (antes de </body>):

     <script src="https://atendimento.rvb.com.br/rvb-chat.js" defer></script>

   O que ele faz:
   1. Qualquer link ou botão com href="#orcamento", classe "rvb-abrir-chat" ou atributo
      data-rvb-chat abre o chat em TELA CHEIA por cima da página (o site continua embaixo; no ×
      a pessoa volta onde estava). Produto opcional: data-produto-id="chute-a-gol"
      data-produto-nome="Chute a Gol Inflável".
   2. Botão flutuante verde (WhatsApp) no canto inferior direito abre o chat numa janelinha
      (tela cheia no celular). Desligue com data-flutuante="nao" na tag do script, ou
      <body data-rvb-flutuante="nao">.
   3. Passa para o chat a página de origem e os UTMs (da URL atual ou do primeiro acesso,
      guardado em cookie por 90 dias).
   4. Intercepta links antigos sem precisar editá-los: links para o WhatsApp da central
      (wa.me/551120928787, que caía no Blip) abrem o chat no modo contato, e links para a página
      /solicitar-orcamento abrem o chat de orçamento. Desligue com data-interceptar="nao".
   Configuração opcional na tag do script:
     data-base="https://atendimento.rvb.com.br/"   endereço do chat
     data-nova-aba="sim"                          botões abrem o chat em nova aba em vez de tela cheia
   ===================================================================== */
(function () {
  'use strict';
  if (window.__rvbChat) return;
  var me = document.currentScript || {};
  var ds = me.dataset || {};
  var BASE = ds.base || (function () {
    try { return new URL('.', me.src).href; } catch (e) { return 'https://atendimento.rvb.com.br/'; }   // pasta onde este script está
  })();
  var ORIGEM = new URL(BASE).origin;
  var FLUTUANTE = (ds.flutuante || (document.body && document.body.dataset.rvbFlutuante) || 'sim') !== 'nao';
  var NOVA_ABA = (ds.novaAba || 'nao') === 'sim';
  var INTERCEPTAR = (ds.interceptar || 'sim') !== 'nao';
  var WA_CENTRAL = /(wa\.me|whatsapp\.com)\/(send\?phone=)?(\+?55)?1120928787/;
  var MOBILE = function () { return window.innerWidth <= 640; };

  /* ---------- UTMs: primeiro toque guardado em cookie ---------- */
  function utmsDaUrl() {
    var o = {};
    try { new URLSearchParams(location.search).forEach(function (v, k) { if (k.indexOf('utm_') === 0) o[k] = v; }); } catch (e) {}
    return o;
  }
  function lerCookie() {
    var m = document.cookie.match(/(?:^|; )rvb_utm=([^;]*)/);
    try { return m ? JSON.parse(decodeURIComponent(m[1])) : null; } catch (e) { return null; }
  }
  var atuais = utmsDaUrl();
  if (Object.keys(atuais).length && !lerCookie()) {
    atuais.landing = location.pathname;
    document.cookie = 'rvb_utm=' + encodeURIComponent(JSON.stringify(atuais)) + '; max-age=' + (90 * 86400) + '; path=/; SameSite=Lax';
  }

  /* ---------- Estilos ---------- */
  var css = '' +
    '.rvbc-fundo{position:fixed;inset:0;z-index:2147483000;background:rgba(20,26,51,.55);display:none;opacity:0;transition:opacity .2s}' +
    '.rvbc-fundo.on{display:block;opacity:1}' +
    '.rvbc-painel{position:fixed;right:20px;bottom:20px;width:420px;height:min(700px,calc(100vh - 40px));z-index:2147483001;' +
      'background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 24px 60px rgba(20,26,51,.35);display:none;transform:translateY(16px);opacity:0;transition:transform .22s,opacity .22s}' +
    '.rvbc-painel.on{display:block;transform:none;opacity:1}' +
    '.rvbc-painel.cheia{inset:0;width:auto;height:auto;border-radius:0;box-shadow:none}' +
    '.rvbc-painel iframe{width:100%;height:100%;border:0;display:block}' +
    '.rvbc-x{position:absolute;top:8px;right:8px;width:34px;height:34px;border-radius:50%;border:1px solid #D3E2F2;background:#fff;color:#17171D;' +
      'font:20px/1 Arial,sans-serif;cursor:pointer;display:grid;place-items:center;box-shadow:0 2px 8px rgba(20,26,51,.15);z-index:2}' +
    '.rvbc-bolha{position:fixed;right:20px;bottom:20px;z-index:2147482999;display:inline-flex;align-items:center;gap:10px;' +
      'background:#25D366;color:#fff;border:0;border-radius:999px;padding:12px 20px 12px 14px;font:700 15px/1 "Baloo 2",Arial,sans-serif;' +
      'cursor:pointer;box-shadow:0 8px 24px rgba(37,211,102,.4);transition:transform .12s}' +
    '.rvbc-bolha:hover{transform:translateY(-2px)}' +
    '.rvbc-bolha svg{width:22px;height:22px}' +
    'html.rvbc-trava{overflow:hidden}' +
    '@media (max-width:640px){' +
      '.rvbc-painel{inset:0;width:auto;height:auto;border-radius:0}' +
      '.rvbc-bolha{padding:12px 16px 12px 12px;font-size:14px;right:12px;bottom:12px}' +
      '.rvbc-x{top:6px;right:6px}' +
    '}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- Elementos ---------- */
  var fundo, painel, frame, bolha, aberto = false, ultimoFoco = null;
  function montar() {
    if (painel) return;
    fundo = document.createElement('div'); fundo.className = 'rvbc-fundo';
    painel = document.createElement('div'); painel.className = 'rvbc-painel'; painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-label', 'Solicitar orçamento');
    var x = document.createElement('button'); x.className = 'rvbc-x'; x.type = 'button'; x.setAttribute('aria-label', 'Fechar'); x.innerHTML = '&times;';
    frame = document.createElement('iframe'); frame.title = 'Solicitar orçamento'; frame.setAttribute('allow', 'clipboard-write');
    painel.appendChild(x); painel.appendChild(frame);
    document.body.appendChild(fundo); document.body.appendChild(painel);
    x.addEventListener('click', fechar);
    fundo.addEventListener('click', fechar);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && aberto) fechar(); });
    window.addEventListener('message', function (e) {
      if (e.origin !== ORIGEM) return;
      var d = e.data || {};
      if (d.rvb === 'fechar') fechar();
      if (d.rvb === 'expandir') { try { frame.contentWindow.postMessage({ rvb: 'expandido' }, ORIGEM); } catch (err) {} }
    });
  }

  function urlDoChat(opts) {
    var p = new URLSearchParams();
    if (opts.cheia) p.set('tela', 'cheia'); else p.set('embed', '1');
    p.set('origem', location.pathname);
    if (opts.produto_id) p.set('produto_id', opts.produto_id);
    if (opts.produto_nome) p.set('produto_nome', opts.produto_nome);
    if (opts.modo) p.set('modo', opts.modo);
    var u = Object.assign({}, lerCookie() || {}, utmsDaUrl());
    Object.keys(u).forEach(function (k) { if (k.indexOf('utm_') === 0) p.set(k, u[k]); });
    if (u.landing) p.set('landing', u.landing);
    return BASE + '?' + p.toString();
  }

  var srcAtual = null;
  function abrir(opts) {
    opts = opts || {};
    if (opts.cheia && NOVA_ABA) { window.open(urlDoChat(opts), '_blank', 'noopener'); return; }
    montar();
    painel.classList.toggle('cheia', !!opts.cheia);
    var src = urlDoChat(opts);
    if (src !== srcAtual) { frame.src = src; srcAtual = src; }   // mesma conversa se reabrir com o mesmo contexto
    ultimoFoco = document.activeElement;
    fundo.classList.add('on'); painel.classList.add('on');
    if (bolha) bolha.style.display = 'none';
    document.documentElement.classList.add('rvbc-trava');
    aberto = true;
    try { frame.contentWindow.postMessage({ rvb: (MOBILE() || opts.cheia) ? 'expandido' : 'recolhido' }, ORIGEM); } catch (e) {}
    setTimeout(function () { try { frame.focus(); } catch (e) {} }, 250);
  }
  function fechar() {
    if (!aberto) return;
    fundo.classList.remove('on'); painel.classList.remove('on');
    if (bolha) bolha.style.display = '';
    document.documentElement.classList.remove('rvbc-trava');
    aberto = false;
    if (ultimoFoco && ultimoFoco.focus) { try { ultimoFoco.focus(); } catch (e) {} }
  }

  /* ---------- Gatilhos: links/botões do site ---------- */
  function opcoesDe(el) {
    var d = el.dataset || {};
    var o = { produto_id: d.produtoId || d.rvbProdutoId || '', produto_nome: d.produtoNome || d.rvbProdutoNome || '', modo: d.rvbChat && d.rvbChat !== '' ? d.rvbChat : '' };
    if (!o.produto_id && window.RVB_CHAT && window.RVB_CHAT.produto_id) { o.produto_id = window.RVB_CHAT.produto_id; o.produto_nome = window.RVB_CHAT.produto_nome || ''; }
    return o;
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a[href], .rvb-abrir-chat, [data-rvb-chat]');
    if (!el) return;
    var href = el.getAttribute('href') || '';
    var direto = /#(orcamento|contato)/.test(href) || el.matches('.rvb-abrir-chat, [data-rvb-chat]');
    var legado = INTERCEPTAR && (WA_CENTRAL.test(href) || /\/solicitar-orcamento\/?(\?|#|$)/.test(href));
    if (!direto && !legado) return;
    e.preventDefault();
    var o = opcoesDe(el); o.cheia = true;
    if (!o.modo && (/#contato/.test(href) || WA_CENTRAL.test(href))) o.modo = 'contato';
    abrir(o);
  }, true);

  /* ---------- Botão flutuante ---------- */
  function montarBolha() {
    if (!FLUTUANTE || bolha) return;
    bolha = document.createElement('button'); bolha.type = 'button'; bolha.className = 'rvbc-bolha';
    bolha.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.9 2.9 4.6 4 1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg><span>Solicitar orçamento</span>';
    bolha.addEventListener('click', function () { abrir(Object.assign({}, window.RVB_CHAT || {}, { cheia: false })); });
    document.body.appendChild(bolha);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarBolha); else montarBolha();

  /* abre sozinho se a página foi carregada com #orcamento (links de e-mail, anúncios) */
  if (/^#(orcamento|contato)$/.test(location.hash)) {
    var m = location.hash === '#contato' ? 'contato' : '';
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { abrir({ modo: m, cheia: true }); }); else abrir({ modo: m, cheia: true });
  }

  window.__rvbChat = { abrir: abrir, fechar: fechar };
})();
