(function () {
  'use strict';
  const KEY = 'fin_token';
  const API_ROOT = `${(window.BIZWISE_API_URL || '').replace(/\/+$/, '')}/api`;
  const S = { token: null, user: null, business: { name: '', tagline: '' }, period: 'month', reportType: 'overview', positionDate: new Date().toISOString().slice(0, 10), cats: [], customers: [], suppliers: [], products: {}, rows: {}, q: '', method: '' };
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (p) => 'GH₵' + (p / 100).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ghs = (p) => (p / 100).toFixed(2);
  const plural = (n, w, w2) => `${n} ${n === 1 ? w : w2 || w + 's'}`;
  const METH = { cash: 'Cash', momo: 'Mobile Money', bank: 'Bank' };
  const PERIODS = [['month', 'This month'], ['week', 'This week'], ['today', 'Today'], ['last_month', 'Last month'], ['year', 'This year'], ['all', 'All time']];
  const todayIso = () => new Date().toISOString().slice(0, 10);
  const fmtDate = (d) => { const t = new Date(d + 'T00:00:00Z'), sameYear = t.getUTCFullYear() === new Date().getUTCFullYear(); return t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }), timeZone: 'UTC' }); };

  const P = {
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M12 7v7M14 8.5h-3a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3h-3"/>',
    wallet: '<path d="M3 8a2 2 0 0 1 2-2h13v3"/><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M16 14h2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M18 14.5c2.5.3 4 2 4 5"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21h4"/>',
    truck: '<path d="M2 6h12v10H2zM14 9h4l4 4v3h-8"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
    doc: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    gear: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    sparkle: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
    up: '<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>', down: '<path d="m3 7 6 6 4-4 8 8M15 17h6v-6"/>',
    dots: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    logout: '<path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M16 17l5-5-5-5M21 12H9"/>', check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    swap: '<path d="M7 7h13l-3-3M17 17H4l3 3"/>', hand: '<path d="M3 15c3 0 4-1 6-1h5a2 2 0 0 1 0 4h-4M3 13v7M14 18l5-2 2-2"/><circle cx="14" cy="7" r="3"/>',
  };
  const ic = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

  // ---------- api ----------
  async function api(path, opt = {}) {
    const h = { 'Content-Type': 'application/json' };
    if (S.token) h.Authorization = 'Bearer ' + S.token;
    const r = await fetch(API_ROOT + path, { method: opt.method || 'GET', headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined });
    const j = (r.headers.get('content-type') || '').includes('json') ? await r.json() : null;
    if (r.status === 401 && !path.startsWith('/auth/login') && path !== '/auth/google') { signOut(); throw new Error('Please sign in again'); }
    if (!r.ok) throw new Error((j && j.error) || 'Something went wrong');
    return j;
  }
  async function download(path, name) {
    const r = await fetch(API_ROOT + path, { headers: { Authorization: 'Bearer ' + S.token } });
    if (!r.ok) return toast('Could not download');
    const a = document.createElement('a'); a.href = URL.createObjectURL(await r.blob()); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  let tt; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2200); }
  const keep = (v) => { try { v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } };
  function signOut() { S.token = null; S.user = null; keep(null); closeModal(); render(); }

  // ---------- forms ----------
  function fieldHtml(f) {
    const v = f.value == null ? '' : f.value, req = f.required ? ' required' : '', cls = f.full ? ' class="f full"' : ' class="f"';
    let input;
    if (f.type === 'select') input = `<select name="${f.name}"${req}>${f.options.map((o) => `<option value="${esc(o[0])}"${String(o[0]) === String(v) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
    else if (f.type === 'textarea') input = `<textarea name="${f.name}" rows="2" maxlength="300">${esc(v)}</textarea>`;
    else if (f.type === 'number') input = `<input name="${f.name}" type="number" step="${f.integer ? 1 : 0.01}" min="0" inputmode="decimal" value="${esc(v)}" placeholder="${esc(f.placeholder || '')}"${req}>`;
    else input = `<input name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" ${f.max ? `max="${f.max}"` : ''} maxlength="${f.type === 'date' ? 10 : 120}" placeholder="${esc(f.placeholder || '')}"${req}>`;
    return `<label${cls}>${esc(f.label)}${f.hint ? `<span class="h">${esc(f.hint)}</span>` : ''}${input}</label>`;
  }
  function closeModal() { const m = $('#modal'); if (m) m.remove(); }
  function openForm({ title, fields, submit = 'Save', intro, onSubmit }) {
    closeModal();
    const m = document.createElement('div'); m.id = 'modal';
    m.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h2>${esc(title)}</h2>${intro ? `<p style="color:var(--mut);margin:-8px 0 14px">${esc(intro)}</p>` : ''}
      <form novalidate><div class="form-grid">${fields.map(fieldHtml).join('')}</div><div class="err" role="alert"></div>
      <div class="mfoot"><button type="button" class="btn" data-act="close">Cancel</button><button class="btn pri" type="submit">${esc(submit)}</button></div></form></div>`;
    document.body.appendChild(m);
    const form = $('form', m), err = $('.err', m); const first = form.querySelector('input,select,textarea'); if (first) first.focus();
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); const btn = $('.pri', form), vals = Object.fromEntries(new FormData(form).entries());
      for (const f of fields) if (f.required && !String(vals[f.name] || '').trim()) { err.textContent = `${f.label} is required`; return; }
      btn.disabled = true; err.textContent = '';
      try { await onSubmit(vals); closeModal(); toast('Saved'); render(); } catch (x) { err.textContent = x.message; btn.disabled = false; }
    });
  }
  const methodOpts = () => Object.entries(METH);
  async function parties() { [S.customers, S.suppliers, S.cats] = await Promise.all([api('/customers'), api('/suppliers'), api('/categories')]); }
  const partyOpts = (list, none) => [['', none], ...list.map((p) => [p.id, p.name])];

  async function formProductSale() {
    await parties();
    const products = await api('/products');
    if (!products.length) {
      toast('Add products in Inventory before recording an itemized sale');
      return;
    }
    let cart = [];
    closeModal();
    const m = document.createElement('div'); m.id = 'modal';
    m.innerHTML = `<div class="box sale-box" role="dialog" aria-modal="true" aria-label="Record product sale">
      <h2>Record product sale</h2><form id="product-sale-form" novalidate>
      <div class="scan-row"><label class="f">Scan or type barcode<input id="sale-barcode" autocomplete="off" placeholder="Scan barcode, then press Enter"></label>
      <label class="f">Or choose a product<select id="sale-product"><option value="">Select a product</option>${products.map((p) => `<option value="${p.id}"${p.stockQuantity < 1 ? ' disabled' : ''}>${esc(p.name)}${p.barcode ? ` · ${esc(p.barcode)}` : ''} · ${money(p.unitPrice)} · ${p.stockQuantity} in stock</option>`).join('')}</select></label>
      <label class="f qty-field">Qty<input id="sale-qty" type="number" min="1" step="1" value="1"></label>
      <button class="btn" type="button" id="sale-add">Add item</button></div>
      <div id="sale-cart" class="sale-cart"></div>
      <div class="sale-total"><span>Total</span><strong id="sale-total">${money(0)}</strong></div>
      <div class="form-grid sale-checkout">
        <label class="f">Date<input name="date" type="date" value="${todayIso()}" max="${todayIso()}" required></label>
        <label class="f">Customer<select name="customerId">${partyOpts(S.customers, 'No customer (walk-in)').map((o) => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select><span class="h">Required when payment is partial</span></label>
        <label class="f">Paid with<select name="method">${methodOpts().map((o) => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select></label>
        <label class="f">Amount paid now (GH₵)<input name="paidGhs" type="number" min="0" step="0.01" placeholder="Leave blank for full payment"></label>
        <label class="f full">Note (optional)<textarea name="note" rows="2" maxlength="300"></textarea></label>
      </div><div class="err" role="alert"></div><div class="mfoot"><button type="button" class="btn" data-act="close">Cancel</button><button class="btn pri" type="submit">Save sale</button></div></form></div>`;
    document.body.appendChild(m);
    const form = $('#product-sale-form', m), error = $('.err', m);
    const redraw = () => {
      const box = $('#sale-cart', m);
      box.innerHTML = cart.length ? cart.map((line, i) => `<div class="cart-line"><div class="cart-product"><b>${esc(line.name)}</b><span>${money(line.unitPrice)} each · ${money(line.unitPrice * line.quantity)}</span></div>
        <div class="cart-controls"><button type="button" aria-label="Decrease quantity" data-cart-act="minus" data-index="${i}">−</button><span>${line.quantity}</span><button type="button" aria-label="Increase quantity" data-cart-act="plus" data-index="${i}">+</button><button type="button" class="remove-line" data-cart-act="remove" data-index="${i}" aria-label="Remove item">×</button></div></div>`).join('') : '<p class="empty">Scan a barcode or select products to build the sale.</p>';
      $('#sale-total', m).textContent = money(cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
    };
    const add = (product) => {
      const qty = Number($('#sale-qty', m).value), existing = cart.find((line) => line.id === product.id);
      const next = qty + (existing ? existing.quantity : 0);
      if (!Number.isSafeInteger(qty) || qty < 1 || next > product.stockQuantity) { error.textContent = `Only ${product.stockQuantity - (existing ? existing.quantity : 0)} more ${product.name} in stock`; return; }
      if (existing) existing.quantity = next;
      else cart.push({ id: product.id, name: product.name, unitPrice: product.unitPrice, stockQuantity: product.stockQuantity, quantity: qty });
      error.textContent = ''; $('#sale-qty', m).value = '1'; redraw();
    };
    $('#sale-add', m).addEventListener('click', () => {
      const p = products.find((item) => item.id === Number($('#sale-product', m).value));
      if (!p) { error.textContent = 'Select an in-stock product'; return; }
      add(p);
    });
    $('#sale-barcode', m).addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const value = e.currentTarget.value.trim();
      const product = products.find((p) => p.barcode && p.barcode === value);
      if (!product) { error.textContent = 'No product matches that barcode'; return; }
      add(product); e.currentTarget.value = '';
    });
    m.addEventListener('click', (e) => {
      const button = e.target.closest('[data-cart-act]'); if (!button) return;
      const line = cart[Number(button.dataset.index)]; if (!line) return;
      if (button.dataset.cartAct === 'remove') cart.splice(Number(button.dataset.index), 1);
      if (button.dataset.cartAct === 'minus') { line.quantity -= 1; if (!line.quantity) cart.splice(Number(button.dataset.index), 1); }
      if (button.dataset.cartAct === 'plus') {
        if (line.quantity >= line.stockQuantity) { error.textContent = `Only ${line.stockQuantity} ${line.name} in stock`; return; }
        line.quantity += 1;
      }
      error.textContent = ''; redraw();
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!cart.length) { error.textContent = 'Add at least one product'; return; }
      const btn = $('.pri', form), v = Object.fromEntries(new FormData(form).entries());
      btn.disabled = true; error.textContent = '';
      try {
        await api('/sales', { method: 'POST', body: { items: cart.map((line) => ({ productId: line.id, quantity: line.quantity })),
          date: v.date, customerId: v.customerId || null, method: v.method, paidGhs: v.paidGhs, note: v.note } });
        closeModal(); toast('Sale saved; stock updated'); render();
      } catch (x) { error.textContent = x.message; btn.disabled = false; }
    });
    redraw(); $('#sale-barcode', m).focus();
  }

  async function formSale(x) {
    if (!x) return formProductSale();
    await parties();
    const edit = !!x;
    openForm({
      title: edit ? 'Edit sale' : 'Record sale', submit: edit ? 'Save changes' : 'Save sale',
      intro: edit ? 'To change how it was paid, use "Record payment" on the sale.' : '',
      fields: [
        { name: 'item', label: 'What was sold?', value: edit ? x.title : '', required: true, full: true, placeholder: 'e.g. Digestive Biscuit' },
        { name: 'amountGhs', label: 'Total amount (GH₵)', type: 'number', value: edit ? ghs(x.amount) : '', required: true },
        { name: 'date', label: 'Date', type: 'date', value: edit ? x.date : todayIso(), max: todayIso(), required: true },
        ...(edit ? [] : [{ name: 'method', label: 'Paid with', type: 'select', options: methodOpts() }, { name: 'paidGhs', label: 'Amount paid now (GH₵)', type: 'number', hint: 'Leave empty if paid in full', placeholder: 'Full amount' }]),
        { name: 'customerId', label: 'Customer', type: 'select', options: partyOpts(S.customers, 'No customer (walk-in)'), value: edit ? x.party_id || '' : '', hint: 'Needed if the customer will pay later' },
        ...(edit ? [] : [{ name: 'newParty', label: 'Or add a new customer', placeholder: 'Customer name' }]),
        { name: 'note', label: 'Note (optional)', type: 'textarea', value: edit ? x.note : '', full: true },
      ],
      onSubmit: async (v) => {
        let cid = v.customerId || null;
        if (!edit && !cid && (v.newParty || '').trim()) cid = (await api('/customers', { method: 'POST', body: { name: v.newParty } })).id;
        const body = { item: v.item, amountGhs: v.amountGhs, date: v.date, customerId: cid, note: v.note };
        if (edit) await api('/sales/' + x.id, { method: 'PUT', body }); else await api('/sales', { method: 'POST', body: { ...body, method: v.method, paidGhs: v.paidGhs } });
      },
    });
  }
  async function formExpense(x) {
    await parties();
    const edit = !!x;
    openForm({
      title: edit ? 'Edit expense' : 'Record expense', submit: edit ? 'Save changes' : 'Save expense',
      intro: edit ? 'To change how it was paid, use "Record payment" on the expense.' : '',
      fields: [
        { name: 'description', label: 'What was it for?', value: edit ? x.title : '', required: true, full: true, placeholder: 'e.g. Electricity' },
        { name: 'amountGhs', label: 'Total amount (GH₵)', type: 'number', value: edit ? ghs(x.amount) : '', required: true },
        { name: 'date', label: 'Date', type: 'date', value: edit ? x.date : todayIso(), max: todayIso(), required: true },
        { name: 'category', label: 'Category', type: 'select', options: S.cats.map((c) => [c, c]), value: edit ? x.category : 'Other' },
        ...(edit ? [] : [{ name: 'method', label: 'Paid with', type: 'select', options: methodOpts() }, { name: 'paidGhs', label: 'Amount paid now (GH₵)', type: 'number', hint: 'Leave empty if paid in full', placeholder: 'Full amount' }]),
        { name: 'supplierId', label: 'Supplier', type: 'select', options: partyOpts(S.suppliers, 'No supplier'), value: edit ? x.party_id || '' : '', hint: 'Needed if you will pay later' },
        ...(edit ? [] : [{ name: 'newParty', label: 'Or add a new supplier', placeholder: 'Supplier name' }]),
        { name: 'note', label: 'Note (optional)', type: 'textarea', value: edit ? x.note : '', full: true },
      ],
      onSubmit: async (v) => {
        let sid = v.supplierId || null;
        if (!edit && !sid && (v.newParty || '').trim()) sid = (await api('/suppliers', { method: 'POST', body: { name: v.newParty } })).id;
        const body = { description: v.description, amountGhs: v.amountGhs, date: v.date, category: v.category, supplierId: sid, note: v.note };
        if (edit) await api('/expenses/' + x.id, { method: 'PUT', body }); else await api('/expenses', { method: 'POST', body: { ...body, method: v.method, paidGhs: v.paidGhs } });
      },
    });
  }
  function formPayment(url, title, owed, who) {
    openForm({
      title, submit: 'Save payment', intro: `${who} ${money(owed)} is still unpaid.`,
      fields: [{ name: 'amountGhs', label: 'Amount (GH₵)', type: 'number', value: ghs(owed), required: true }, { name: 'method', label: 'Paid with', type: 'select', options: methodOpts() },
        { name: 'date', label: 'Date', type: 'date', value: todayIso(), max: todayIso(), required: true }],
      onSubmit: (v) => api(url, { method: 'POST', body: v }),
    });
  }
  function formParty(kind, x) {
    const one = kind === 'customers' ? 'customer' : 'supplier';
    openForm({
      title: x ? `Edit ${one}` : `Add ${one}`,
      fields: [{ name: 'name', label: 'Name', value: x ? x.name : '', required: true, full: true }, { name: 'phone', label: 'Phone (optional)', value: x ? x.phone : '' }, { name: 'note', label: 'Note (optional)', value: x ? x.note : '' }],
      onSubmit: (v) => api(`/${kind}${x ? '/' + x.id : ''}`, { method: x ? 'PUT' : 'POST', body: v }),
    });
  }
  function formTransfer() {
    openForm({
      title: 'Move money', intro: 'For example, taking cash to the bank or moving MoMo to your bank.',
      fields: [{ name: 'from', label: 'From', type: 'select', options: methodOpts(), value: 'cash' }, { name: 'to', label: 'To', type: 'select', options: methodOpts(), value: 'bank' },
        { name: 'amountGhs', label: 'Amount (GH₵)', type: 'number', required: true }, { name: 'date', label: 'Date', type: 'date', value: todayIso(), max: todayIso(), required: true }, { name: 'note', label: 'Note (optional)', full: true }],
      onSubmit: (v) => api('/transfers', { method: 'POST', body: v }),
    });
  }
  function formReminder() {
    openForm({
      title: 'New reminder',
      fields: [{ name: 'title', label: 'Remind me to…', required: true, full: true, placeholder: 'e.g. Pay ECG bill' }, { name: 'dueDate', label: 'Due date', type: 'date', value: todayIso(), required: true },
        { name: 'amountGhs', label: 'Amount (optional)', type: 'number' }, { name: 'note', label: 'Note (optional)', full: true }],
      onSubmit: (v) => api('/reminders', { method: 'POST', body: v }),
    });
  }

  // ---------- shell ----------
  const NAV = [['dashboard', 'Dashboard', 'grid'], ['sales', 'Sales', 'bag'], ['inventory', 'Inventory', 'bag'], ['expenses', 'Expenses', 'receipt'], ['money', 'Money', 'wallet'], ['customers', 'Customers', 'users'], ['reminders', 'Reminders', 'bell'], ['suppliers', 'Suppliers', 'truck'], ['reports', 'Reports', 'doc'], ['settings', 'Settings', 'gear']];
  function shell() {
    $('#app').innerHTML = `<div class="app"><aside class="side"><div class="brand"><h1>${esc(S.business.name)}</h1><p>${esc(S.business.tagline)}</p></div>
      <nav class="nav" aria-label="Main">${NAV.map((n) => `<a href="#/${n[0]}" data-nav="${n[0]}">${ic(n[2])}<span>${n[1]}</span></a>`).join('')}</nav>
      <div class="me"><div class="name">${esc(S.user.name)}</div><button data-act="signout">${ic('logout')} Sign out</button></div></aside>
      <main class="main"><div class="page" id="page"></div></main></div>`;
  }
  const route = () => { const h = (location.hash.slice(2) || 'dashboard').split('?'); return { page: h[0], params: Object.fromEntries(new URLSearchParams(h[1] || '')) }; };
  const periodSelect = (cur, act) => `<select data-change="${act}" aria-label="Period">${PERIODS.map((p) => `<option value="${p[0]}"${p[0] === cur ? ' selected' : ''}>${p[1]}</option>`).join('')}</select>`;
  const head = (title, sub, actions) => `<div class="head"><div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div><div class="actions">${actions || ''}</div></div>`;
  const empty = (msg) => `<div class="empty">${msg}</div>`;

  // ---------- dashboard ----------
  function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1)))); for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p; return 10 * p; }
  function chartSvg(c) {
    if (!c.labels.length) return empty('No sales or expenses yet for this period.');
    const W = 900, H = 300, ml = 70, mr = 16, mt = 14, mb = 40, n = c.labels.length;
    const hi = niceMax(Math.max(...c.sales, ...c.expenses, ...c.profit, 100)), lo = Math.min(0, ...c.profit) < 0 ? -niceMax(-Math.min(...c.profit)) : 0;
    const y = (v) => mt + (H - mt - mb) * (1 - (v - lo) / (hi - lo)), gw = (W - ml - mr) / n, bw = Math.max(3, Math.min(26, gw * 0.34));
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = lo + ((hi - lo) * i) / 4; g += `<line x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}" stroke="#e7e3da" stroke-dasharray="4 5"/><text x="${ml - 10}" y="${y(v) + 4}" text-anchor="end" font-size="12" fill="#6b746f">GH₵ ${Math.round(v / 100).toLocaleString('en-GH')}</text>`; }
    const step = Math.ceil(n / 12); let bars = '', pts = [], lab = '';
    c.labels.forEach((k, i) => {
      const cx = ml + gw * i + gw / 2;
      bars += `<rect x="${cx - bw - 1}" y="${y(c.sales[i])}" width="${bw}" height="${Math.max(0, y(0) - y(c.sales[i]))}" rx="3" fill="var(--green2)"><title>${esc(k)} sales ${money(c.sales[i])}</title></rect>`;
      bars += `<rect x="${cx + 1}" y="${y(c.expenses[i])}" width="${bw}" height="${Math.max(0, y(0) - y(c.expenses[i]))}" rx="3" fill="#e3a24b"><title>${esc(k)} expenses ${money(c.expenses[i])}</title></rect>`;
      if (c.sales[i] || c.expenses[i]) pts.push([cx, y(c.profit[i])]);
      if ((n - 1 - i) % step === 0) lab += `<text x="${cx}" y="${H - 14}" text-anchor="middle" font-size="12" fill="#6b746f">${c.monthly ? new Date(k + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }) : fmtDate(k)}</text>`;
    });
    const line = pts.length > 1 ? `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="var(--green)" stroke-width="2"/>` : '';
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Sales, expenses and profit chart">${g}${bars}${line}${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#fff" stroke="var(--green)" stroke-width="2"/>`).join('')}${lab}</svg>
      <div class="legend"><span><i style="background:var(--green2)"></i>Sales</span><span><i style="background:#e3a24b"></i>Expenses</span><span><i style="background:#fff;border:2px solid var(--green);border-radius:50%"></i>Profit</span></div>`;
  }
  const delta = (ch, label, goodUp) => (ch === null || ch === undefined ? '' : ` · <span class="${(ch >= 0) === goodUp ? 'up' : 'down'}">${ch >= 0 ? '▲' : '▼'} ${Math.abs(ch)}%</span> vs ${esc(label)}`);
  async function pageDashboard() {
    const d = await api('/dashboard?period=' + S.period), t = d.totals, h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    $('#page').innerHTML = head(`Hello, ${esc(d.user.name.split(' ')[0])}`, `${esc(d.period)} · ${esc(d.business.name)}`,
      `${periodSelect(S.period, 'period')}<button class="btn" data-act="new-expense">${ic('receipt')} Expense</button><button class="btn pri" data-act="new-sale">${ic('plus')} Record sale</button>`)
      .replace('<h1>', `<p class="hi">${greet}</p><h1>`) +
      `<div class="kpis">
        <div class="card kpi"><div class="lab">Money from sales ${ic('up')}</div><div class="val g">${money(t.sales)}</div><div class="note">${plural(t.salesCount, 'sale')}${d.change ? delta(d.change.sales, d.prevLabel, true) : ''}</div></div>
        <div class="card kpi"><div class="lab">Expenses ${ic('down')}</div><div class="val a">${money(t.expenses)}</div><div class="note">${plural(t.expensesCount, 'expense')}${d.change ? delta(d.change.expenses, d.prevLabel, false) : ''}</div></div>
        <div class="card kpi"><div class="lab">Profit ${ic('wallet')}</div><div class="val ${t.profit < 0 ? 'r' : 'g'}">${money(t.profit)}</div><div class="note">${d.profitPercent === null ? 'No sales yet' : d.profitPercent + '% of sales'}</div></div>
        <div class="card kpi"><div class="lab">Money on hand ${ic('hand')}</div><div class="val">${money(d.balances.total)}</div><div class="note">Cash ${money(d.balances.cash)} · MoMo ${money(d.balances.momo)} · Bank ${money(d.balances.bank)}</div></div></div>
      <div class="card chart"><div class="top"><h3>Sales, expenses &amp; profit</h3><span>${esc(d.period)}</span></div>${chartSvg(d.chart)}</div>
      <div class="two"><a class="card link-card" href="#/customers"><div><div class="lab" style="color:var(--mut);font-size:12.5px;letter-spacing:.06em;text-transform:uppercase">Customers owe you</div><div class="val">${money(d.owedToYou)}</div></div>${ic('arrow')}</a>
        <a class="card link-card" href="#/suppliers"><div><div class="lab" style="color:var(--mut);font-size:12.5px;letter-spacing:.06em;text-transform:uppercase">You owe suppliers</div><div class="val">${money(d.youOwe)}</div></div>${ic('arrow')}</a></div>
      ${d.dueReminders ? `<a class="card link-card" href="#/reminders" style="margin-bottom:22px"><div><b>${plural(d.dueReminders, 'reminder')}</b> due or overdue</div>${ic('arrow')}</a>` : ''}
      <div class="card ai" id="ai"><div class="row"><div><h3>Your finances in plain English</h3><p>A short summary of this period, written from your numbers.</p></div><button class="btn pri" data-act="explain">${ic('sparkle')} Explain my finances</button></div>
        <p id="ai-out" style="margin-top:14px">Tap the button and you will see what went well, what to watch, and what to do next.</p></div>`;
  }
  async function explain(btn) {
    btn.disabled = true;
    try {
      const r = await api('/insights?period=' + S.period), list = (a) => `<ul>${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
      $('#ai-out').outerHTML = `<div id="ai-out" style="margin-top:14px;color:var(--ink)"><b>${esc(r.headline)}</b>${r.good.length ? `<h4>What went well</h4>${list(r.good)}` : ''}${r.watch.length ? `<h4>What to watch</h4>${list(r.watch)}` : ''}<h4>What to do next</h4>${list(r.next)}</div>`;
    } catch (e) { toast(e.message); }
    btn.disabled = false;
  }

  // ---------- sales & expenses ----------
  const menu = (items) => `<div class="menu-wrap"><button class="dots" data-act="menu" aria-label="More actions" aria-haspopup="true">${ic('dots')}</button><div class="menu" hidden>${items.join('')}</div></div>`;
  function entryRow(kind, x) {
    const sale = kind === 'sales'; S.rows[kind][x.id] = x;
    const meta = [fmtDate(x.date)]; if (!sale && x.category) meta.push(x.category); if (x.party_name) meta.push(x.party_name); meta.push(x.method ? METH[x.method] : 'On credit');
    const items = [];
    if (!sale || !x.itemized) items.push(`<button data-act="edit-${kind}" data-id="${x.id}">Edit</button>`);
    else meta.push('stock tracked');
    if (x.owed > 0) items.push(`<button data-act="pay-${kind}" data-id="${x.id}">${sale ? 'Record payment' : 'Pay supplier'}</button>`);
    if (S.user.role === 'owner') items.push(`<button class="danger" data-act="del-${kind}" data-id="${x.id}">Delete</button>`);
    return `<div class="row-card"><div class="icn">${ic(sale ? 'bag' : 'receipt')}</div><div class="mid"><div class="t">${esc(x.title)}</div><div class="m">${meta.map(esc).join(' · ')}</div></div>
      <div class="amt ${sale ? 'g' : 'r'}">${sale ? '' : '- '}${money(x.amount)}${x.owed > 0 ? `<span class="owe">${money(x.owed)} ${sale ? 'owed' : 'unpaid'}</span>` : ''}</div>${items.length ? menu(items) : ''}</div>`;
  }
  async function pageEntries(kind) {
    const sale = kind === 'sales', { params } = route();
    S.rows[kind] = {};
    const per = params.period || S.period, fil = params.customer ? `&customer=${encodeURIComponent(params.customer)}` : params.supplier ? `&supplier=${encodeURIComponent(params.supplier)}` : params.category ? `&category=${encodeURIComponent(params.category)}` : '';
    $('#page').innerHTML = head(sale ? 'Sales' : 'Expenses', '<span id="sub">&nbsp;</span>', `${periodSelect(per, 'period')}<button class="btn pri" data-act="new-${kind === 'sales' ? 'sale' : 'expense'}">${ic('plus')} ${sale ? 'Record sale' : 'Record expense'}</button>`) +
      `<div class="filters"><input id="q" type="search" placeholder="Search ${sale ? 'items or customers' : 'expenses or suppliers'}" value="${esc(S.q)}" aria-label="Search">
        <select id="mf" aria-label="Payment method"><option value="">All payment methods</option>${methodOpts().map((m) => `<option value="${m[0]}"${S.method === m[0] ? ' selected' : ''}>${m[1]}</option>`).join('')}</select>
        <button class="btn sm" data-act="export" data-kind="${kind}">Download CSV</button>${fil ? `<span class="chip">Filtered <a href="#/${kind}" style="text-decoration:underline">Show all</a></span>` : ''}</div><div class="list" id="list"></div>`;
    const load = async () => {
      const r = await api(`/${kind}?period=${per}&q=${encodeURIComponent(S.q)}&method=${S.method}${fil}`);
      S.rows[kind] = {};
      $('#sub').textContent = `${plural(r.count, sale ? 'sale' : 'expense')} · ${money(r.total)} ${sale ? 'in' : 'spent in'} ${r.period.toLowerCase()}`;
      $('#list').innerHTML = r.rows.length ? r.rows.map((x) => entryRow(kind, x)).join('') : empty(S.q || S.method || fil ? 'Nothing matches that search.' : `No ${kind} recorded for ${esc(r.period.toLowerCase())}.`);
    };
    window.__reload = load; await load();
  }

  async function formProduct() {
    openForm({
      title: 'Add inventory item', submit: 'Add product',
      intro: 'Set the selling price and the quantity currently on hand. Barcodes are optional.',
      fields: [
        { name: 'name', label: 'Product name', required: true, full: true, placeholder: 'e.g. Rice, 5 kg' },
        { name: 'barcode', label: 'Barcode (optional)', placeholder: 'Scan or type barcode' },
        { name: 'unitPriceGhs', label: 'Selling price (GH₵)', type: 'number', required: true },
        { name: 'stockQuantity', label: 'Opening quantity', type: 'number', integer: true, value: 0, required: true, hint: 'Use a whole number' },
      ],
      onSubmit: (v) => api('/products', { method: 'POST', body: v }),
    });
  }
  function formStockAdjustment(product) {
    openForm({
      title: `Adjust stock: ${product.name}`, submit: 'Save stock change',
      intro: `Current stock: ${product.stockQuantity}. Enter a positive number to add stock or a negative number to remove damaged or missing items.`,
      fields: [
        { name: 'quantityChange', label: 'Change in units', required: true, placeholder: 'e.g. 5 or -2' },
        { name: 'note', label: 'Reason', required: true, placeholder: 'e.g. Restock or damaged goods' },
      ],
      onSubmit: (v) => api(`/products/${product.id}/stock`, { method: 'POST', body: { quantityChange: Number(v.quantityChange), note: v.note } }),
    });
  }
  async function pageInventory() {
    const products = await api('/products'), own = S.user.role === 'owner';
    const totalUnits = products.reduce((sum, p) => sum + p.stockQuantity, 0);
    $('#page').innerHTML = head('Inventory', `${products.length} products · ${plural(totalUnits, 'unit')} in stock`,
      own ? `<button class="btn pri" data-act="new-product">${ic('plus')} Add product</button>` : '') +
      (products.length ? `<div class="card inventory-card"><div class="inventory-table"><div class="inventory-heading"><span>Product</span><span>Barcode</span><span>Price</span><span>In stock</span>${own ? '<span></span>' : ''}</div>
        ${products.map((p) => `<div class="inventory-row"><div class="inventory-name"><b>${esc(p.name)}</b></div><div class="inventory-barcode">${esc(p.barcode || '—')}</div><div>${money(p.unitPrice)}</div>
          <div class="${p.stockQuantity === 0 ? 'stock-empty' : p.stockQuantity <= 5 ? 'stock-low' : ''}">${p.stockQuantity}</div>${own ? `<div><button class="btn sm" data-act="adjust-stock" data-id="${p.id}">Adjust stock</button></div>` : ''}</div>`).join('')}
        </div></div>` : empty(own ? 'No products yet. Add your first product to track stock and scan it into sales.' : 'The owner has not added any products yet.'));
    S.products = Object.fromEntries(products.map((p) => [p.id, p]));
  }

  // ---------- money ----------
  async function pageMoney() {
    const r = await api('/money'), b = r.balances;
    const row = (m) => {
      let icn = 'wallet', label = esc(m.label || ''), amt, cls;
      if (m.type === 'transfer') { const [f, t] = m.method.split('>'); icn = 'swap'; label = `Moved ${METH[f]} → ${METH[t]}${m.label ? ' · ' + esc(m.label) : ''}`; amt = money(m.amount); cls = ''; }
      else { amt = (m.type === 'in' ? '+ ' : '- ') + money(m.amount); cls = m.type === 'in' ? 'g' : 'r'; label = (m.type === 'in' ? 'Received: ' : 'Paid: ') + label; }
      return `<div class="row-card"><div class="icn">${ic(icn)}</div><div class="mid"><div class="t">${label}</div><div class="m">${fmtDate(m.date)}${m.type === 'transfer' ? '' : ' · ' + METH[m.method]}</div></div><div class="amt ${cls}">${amt}</div></div>`;
    };
    $('#page').innerHTML = head('Money', `${money(b.total)} in total`, `<button class="btn pri" data-act="transfer">${ic('swap')} Move money</button>`) +
      `<div class="bal">${['cash', 'momo', 'bank'].map((m) => `<div class="card kpi"><div class="lab">${METH[m]}</div><div class="val ${b[m] < 0 ? 'r' : ''}">${money(b[m])}</div></div>`).join('')}</div>
       <h2 class="sec">Recent money in and out</h2><div class="list">${r.moves.length ? r.moves.map(row).join('') : empty('No money movements yet.')}</div>`;
  }

  // ---------- customers & suppliers ----------
  async function pageParties(kind) {
    const cust = kind === 'customers', list = await api('/' + kind), owed = list.reduce((a, p) => a + Math.max(0, p.owed), 0);
    list.forEach((p) => { S.rows[kind] = S.rows[kind] || {}; S.rows[kind][p.id] = p; });
    const one = cust ? 'customer' : 'supplier';
    $('#page').innerHTML = head(cust ? 'Customers' : 'Suppliers', `${plural(list.length, one)} · ${money(owed)} ${cust ? 'owed to you' : 'owed by you'}`, `<button class="btn pri" data-act="new-party" data-kind="${kind}">${ic('plus')} Add ${one}</button>`) +
      `<div class="list">${list.length ? list.map((p) => {
        const items = []; if (p.owed > 0) items.push(`<button data-act="settle" data-kind="${kind}" data-id="${p.id}">${cust ? 'Collect payment' : 'Pay supplier'}</button>`);
        items.push(`<a class="btn sm" style="display:block;border:0;background:none;padding:10px 12px;border-radius:10px;font-weight:400" href="#/${cust ? 'sales' : 'expenses'}?${one}=${p.id}&period=all">View ${cust ? 'sales' : 'expenses'}</a>`, `<button data-act="edit-party" data-kind="${kind}" data-id="${p.id}">Edit</button>`);
        if (S.user.role === 'owner') items.push(`<button class="danger" data-act="del-party" data-kind="${kind}" data-id="${p.id}">Delete</button>`);
        return `<div class="row-card"><div class="icn">${esc(p.name.charAt(0).toUpperCase())}</div><div class="mid"><div class="t">${esc(p.name)}</div><div class="m">${esc(p.phone || 'No phone')} · ${plural(p.entries, cust ? 'sale' : 'expense')}</div></div>
          <div class="amt ${p.owed > 0 ? 'r' : ''}">${p.owed > 0 ? money(p.owed) + `<span class="owe">${cust ? 'owes you' : 'you owe'}</span>` : '<span class="tag">Settled</span>'}</div>${menu(items)}</div>`;
      }).join('') : empty(`No ${one}s yet. Add one, or type a name when you record a ${cust ? 'sale' : 'expense'}.`)}</div>`;
  }

  // ---------- reminders ----------
  async function pageReminders() {
    const list = await api('/reminders'), t = todayIso();
    $('#page').innerHTML = head('Reminders', `${plural(list.filter((r) => !r.done).length, 'open reminder')}`, `<button class="btn pri" data-act="new-reminder">${ic('plus')} New reminder</button>`) +
      `<div class="list">${list.length ? list.map((r) => `<div class="row-card rem ${r.done ? 'done' : ''}"><button class="chk ${r.done ? 'on' : ''}" data-act="toggle-rem" data-id="${r.id}" data-done="${r.done ? 0 : 1}" aria-label="${r.done ? 'Mark as not done' : 'Mark as done'}">${r.done ? ic('check') : ''}</button>
        <div class="mid"><div class="t">${esc(r.title)}</div><div class="m">${fmtDate(r.due_date)}${r.amount ? ' · ' + money(r.amount) : ''}${r.note ? ' · ' + esc(r.note) : ''}</div></div>
        ${!r.done && r.due_date < t ? '<span class="tag od">Overdue</span>' : ''}<button class="dots" data-act="del-rem" data-id="${r.id}" aria-label="Delete reminder" style="font-size:20px;line-height:1">×</button></div>`).join('') : empty('No reminders yet. Add one for a bill or a debt you need to chase.')}</div>`;
  }

  // ---------- reports ----------
  function reportTabs() {
    const tabs = [['overview', 'Overview'], ['profit-loss', 'Profit & loss'], ['position', 'Statement of financial position']];
    return `<div class="report-tabs" role="tablist" aria-label="Report type">${tabs.map(([id, label]) => `<button class="btn sm ${S.reportType === id ? 'pri' : ''}" type="button" role="tab" aria-selected="${S.reportType === id}" data-act="report-tab" data-report="${id}">${label}</button>`).join('')}</div>`;
  }
  async function pageProfitLoss() {
    const r = await api('/reports?period=' + S.period), t = r.totals;
    $('#page').innerHTML = head('Profit & loss', `${esc(r.period)} · Accrual basis`, periodSelect(S.period, 'period')) + reportTabs() +
      `<div class="card statement">
        <h2>Profit & loss statement</h2><p class="statement-sub">${esc(r.period)} · Revenue and expenses are recorded on their transaction dates.</p>
        <div class="statement-row"><strong>Revenue</strong><strong>${money(t.sales)}</strong></div>
        <div class="statement-row statement-indent"><span>Sales</span><span>${money(t.sales)}</span></div>
        <div class="statement-row"><strong>Expenses</strong><strong>${money(t.expenses)}</strong></div>
        ${r.byCategory.length ? r.byCategory.map((row) => `<div class="statement-row statement-indent"><span>${esc(row.name)}</span><span>${money(row.total)}</span></div>`).join('') : `<div class="statement-row statement-indent"><span>No expenses recorded</span><span>${money(0)}</span></div>`}
        <div class="statement-row statement-total"><strong>${t.profit < 0 ? 'Net loss' : 'Net profit'}</strong><strong class="${t.profit < 0 ? 'r' : ''}">${money(Math.abs(t.profit))}</strong></div>
       </div><div class="actions statement-actions"><button class="btn" type="button" data-act="print-report">Print / Save PDF</button></div>`;
  }
  async function pageFinancialPosition() {
    const r = await api('/reports/financial-position?date=' + encodeURIComponent(S.positionDate));
    const valueRow = (label, amount, options = {}) => `<div class="statement-row ${options.indent ? 'statement-indent' : ''} ${options.total ? 'statement-total' : ''}"><${options.total ? 'strong' : 'span'}>${label}</${options.total ? 'strong' : 'span'}><${options.total ? 'strong' : 'span'}>${money(amount)}</${options.total ? 'strong' : 'span'}></div>`;
    $('#page').innerHTML = head('Statement of financial position', `As at ${fmtDate(r.date)}`, `<label class="statement-date">As at <input id="position-date" type="date" value="${esc(S.positionDate)}" max="${todayIso()}"></label>`) + reportTabs() +
      `<div class="card statement">
        <h2>Statement of financial position</h2><p class="statement-sub">Assets, liabilities and equity as at ${fmtDate(r.date)}.</p>
        <h3 class="statement-heading">Assets</h3>
        ${valueRow('Cash', r.assets.cash, { indent: true })}${valueRow('Mobile money', r.assets.momo, { indent: true })}${valueRow('Bank', r.assets.bank, { indent: true })}${valueRow('Customer receivables', r.assets.receivables, { indent: true })}${valueRow('Total assets', r.assets.total, { total: true })}
        <h3 class="statement-heading">Liabilities</h3>
        ${valueRow('Supplier payables', r.liabilities.payables, { indent: true })}${valueRow('Total liabilities', r.liabilities.total, { total: true })}
        <h3 class="statement-heading">Equity</h3>
        ${valueRow('Owner capital (opening balances)', r.equity.ownerCapital, { indent: true })}${valueRow('Retained earnings (net profit to date)', r.equity.retainedEarnings, { indent: true })}${valueRow('Total equity', r.equity.total, { total: true })}
        ${valueRow('Total liabilities and equity', r.totalLiabilitiesAndEquity, { total: true })}
        <p class="statement-note">Opening balances use the current Settings values and are treated as owner capital; past changes to opening balances are not historized. This statement includes recorded cash, customer receivables and supplier payables; other assets and liabilities are not tracked by the app.</p>
       </div><div class="actions statement-actions"><button class="btn" type="button" data-act="print-report">Print / Save PDF</button></div>`;
  }
  async function pageReports() {
    if (S.reportType === 'profit-loss') return pageProfitLoss();
    if (S.reportType === 'position') return pageFinancialPosition();
    const r = await api('/reports?period=' + S.period), t = r.totals, bars = (rows, link) => (rows.length ? rows.map((x) => { const max = rows[0].total || 1;
      return `<div class="b"><div class="bl"><span>${link ? `<a href="#/expenses?category=${encodeURIComponent(x.name)}&period=${S.period}" style="text-decoration:underline">${esc(x.name)}</a>` : esc(x.name === 'cash' || x.name === 'momo' || x.name === 'bank' ? METH[x.name] : x.name)}</span><b>${money(x.total)}</b></div><div class="tr"><i style="width:${Math.max(3, (x.total / max) * 100)}%"></i></div></div>`; }).join('') : '<p style="color:var(--mut)">Nothing yet.</p>');
    $('#page').innerHTML = head('Reports', esc(r.period), periodSelect(S.period, 'period')) + reportTabs() +
      `<div class="kpis three"><div class="card kpi"><div class="lab">Sales</div><div class="val g">${money(t.sales)}</div><div class="note">${plural(t.salesCount, 'sale')}</div></div>
        <div class="card kpi"><div class="lab">Expenses</div><div class="val a">${money(t.expenses)}</div><div class="note">${plural(t.expensesCount, 'expense')}</div></div>
        <div class="card kpi"><div class="lab">Profit</div><div class="val ${t.profit < 0 ? 'r' : 'g'}">${money(t.profit)}</div><div class="note">Sales minus expenses</div></div></div>
       <div class="set-grid"><div class="card bars"><h3>Where the money went</h3>${bars(r.byCategory, true)}</div><div class="card bars"><h3>Money received, by how</h3>${bars(r.receivedByMethod)}</div>
        <div class="card bars"><h3>Best-selling items</h3>${bars(r.topItems)}</div><div class="card bars"><h3>Top customers</h3>${bars(r.topCustomers)}</div></div>
       <div class="two"><div class="card"><div style="color:var(--mut);font-size:13px">CUSTOMERS OWE YOU</div><div class="kpi"><div class="val">${money(r.owedToYou)}</div></div></div><div class="card"><div style="color:var(--mut);font-size:13px">YOU OWE SUPPLIERS</div><div class="kpi"><div class="val">${money(r.youOwe)}</div></div></div></div>
       <div class="actions"><button class="btn" data-act="export" data-kind="sales">Download sales (CSV)</button><button class="btn" data-act="export" data-kind="expenses">Download expenses (CSV)</button></div>`;
  }

  // ---------- settings ----------
  async function pageSettings() {
    const [s, cats, users] = await Promise.all([api('/settings'), api('/categories'), S.user.role === 'owner' ? api('/users') : Promise.resolve(null)]), own = S.user.role === 'owner', dis = own ? '' : ' disabled';
    const num = (n, l, v) => `<label class="f">${l}<input name="${n}" type="number" step="0.01" min="0" value="${v}"${dis}></label>`;
    $('#page').innerHTML = head('Settings', own ? 'Your business, your team and your account' : 'Only the owner can change business settings') +
      `<div class="set-grid"><form class="card" data-form="settings"><h3>Business</h3><div style="display:grid;gap:12px;margin-top:14px"><label class="f">Business name<input name="name" value="${esc(s.name)}"${dis} required></label>
        <label class="f">Tagline<input name="tagline" value="${esc(s.tagline)}"${dis}></label>
        <p style="color:var(--mut);margin:4px 0 0;font-size:13px">Opening balances: what you had in each place before you started using this app.</p>
        ${num('openCash', 'Cash (GH₵)', s.openCash)}${num('openMomo', 'Mobile Money (GH₵)', s.openMomo)}${num('openBank', 'Bank (GH₵)', s.openBank)}</div>
        <div class="err" role="alert"></div>${own ? '<div class="mfoot"><button class="btn pri" type="submit">Save business</button></div>' : ''}</form>
       <form class="card" data-form="password"><h3>Change my password</h3><div style="display:grid;gap:12px;margin-top:14px"><label class="f">Current password<input name="current" type="password" autocomplete="current-password" required></label>
        <label class="f">New password<span class="h">At least 8 characters</span><input name="next" type="password" autocomplete="new-password" minlength="8" required></label></div><div class="err" role="alert"></div><div class="mfoot"><button class="btn pri" type="submit">Change password</button></div></form></div>
       <h2 class="sec">Expense categories</h2><div class="card"><div style="display:flex;gap:8px;flex-wrap:wrap">${cats.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>
        ${own ? '<form data-form="category" style="display:flex;gap:10px;margin-top:14px"><input name="name" placeholder="New category" maxlength="40" required><button class="btn" type="submit">Add</button></form>' : ''}</div>
       ${own ? `<h2 class="sec">Team logins</h2><div class="list users">${users.map((u) => `<div class="row-card"><div class="mid"><div class="t">${esc(u.name)}</div><div class="m">${esc(u.email)} · ${u.role === 'owner' ? 'Owner' : 'Staff'}</div></div>${u.id === S.user.id ? '<span class="tag">You</span>' : `<button class="btn sm danger" data-act="del-user" data-id="${u.id}">Remove</button>`}</div>`).join('')}</div>
        <form class="card" data-form="user" style="margin-top:14px"><h3>Add a login</h3><div class="form-grid" style="margin-top:12px"><label class="f">Name<input name="name" required maxlength="80"></label><label class="f">Email<input name="email" type="email" required></label>
         <label class="f">Password<span class="h">At least 8 characters</span><input name="password" type="password" minlength="8" autocomplete="new-password" required></label><label class="f">Role<select name="role"><option value="staff">Staff (can record, cannot delete or change settings)</option><option value="owner">Owner (full access)</option></select></label></div>
         <div class="err" role="alert"></div><div class="mfoot"><button class="btn pri" type="submit">Add login</button></div></form>` : ''}`;
  }
  const FORMS = {
    settings: (v) => api('/settings', { method: 'PUT', body: v }).then(async () => { S.business = (await api('/auth/me')).business; shell(); }),
    password: (v) => api('/auth/password', { method: 'POST', body: v }),
    category: (v) => api('/categories', { method: 'POST', body: v }),
    user: (v) => api('/users', { method: 'POST', body: v }),
  };

  // ---------- login ----------
  let googleIdentityPromise;
  function loadGoogleIdentity() {
    if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve();
    if (!googleIdentityPromise) {
      googleIdentityPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = resolve;
        script.onerror = () => { googleIdentityPromise = null; reject(new Error('Google sign-in could not load')); };
        document.head.appendChild(script);
      });
    }
    return googleIdentityPromise;
  }
  async function loginView() {
    let b = {}; try { b = await (await fetch(API_ROOT + '/public')).json(); } catch (e) { /* offline */ }
    S.business = { name: b.name || 'My Business', tagline: b.tagline || '' };
    if (b.setupRequired) {
      $('#app').innerHTML = `<div class="login"><form class="card" id="register"><h1>Create your account</h1><p>Set up your business owner account to get started.</p>
        <label class="f">Business name<input name="businessName" maxlength="120" required autocomplete="organization"></label>
        <label class="f">Your name<input name="name" maxlength="80" required autocomplete="name"></label>
        <label class="f">Email<input name="email" type="email" maxlength="120" required autocomplete="email"></label>
        <label class="f">Password<span class="h">At least 8 characters</span><input name="password" type="password" minlength="8" required autocomplete="new-password"></label>
        <div class="err" role="alert"></div><button class="btn pri" style="width:100%;justify-content:center;margin-top:8px" type="submit">Create account</button></form></div>`;
      $('#register').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.currentTarget, btn = $('button[type=submit]', form), err = $('.err', form);
        btn.disabled = true; err.textContent = '';
        try {
          const values = Object.fromEntries(new FormData(form).entries());
          const r = await api('/auth/register', { method: 'POST', body: values });
          S.token = r.token; S.user = r.user; S.business.name = values.businessName; keep(r.token);
          location.hash = '#/dashboard'; render();
        } catch (x) { err.textContent = x.message; btn.disabled = false; }
      });
      return;
    }
    $('#app').innerHTML = `<div class="login"><form class="card" id="login"><h1>${esc(S.business.name)}</h1><p>${esc(S.business.tagline || 'Sign in to continue')}</p>
      <label class="f">Email<input name="email" type="email" autocomplete="username" required autofocus></label><label class="f">Password<input name="password" type="password" autocomplete="current-password" required></label>
      <div class="err" role="alert"></div><button class="btn pri" style="width:100%;justify-content:center;margin-top:8px" type="submit">Sign in</button>
      <div id="google-login" hidden><div class="login-divider"><span>or</span></div><div id="google-button"></div></div>
      <div id="google-status" class="login-auth-status" role="status" aria-live="polite"></div></form></div>`;
    $('#login').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target, btn = $('button', f); btn.disabled = true; $('.err', f).textContent = '';
      try { const r = await api('/auth/login', { method: 'POST', body: { email: f.email.value, password: f.password.value } }); S.token = r.token; S.user = r.user; keep(r.token); location.hash = '#/dashboard'; render(); }
      catch (x) { $('.err', f).textContent = x.message; btn.disabled = false; }
    });
    const status = $('#google-status');
    let config;
    try {
      const configResponse = await fetch(API_ROOT + '/auth/google/config');
      if (!configResponse.ok) {
        status.textContent = configResponse.status === 404
          ? 'Google sign-in settings were not found on this server (404). Open BIZWISE from its backend server, not another app or a static frontend.'
          : `Could not load Google sign-in settings (HTTP ${configResponse.status}). Check the BIZWISE backend and refresh this page.`;
        return;
      }
      if (!(configResponse.headers.get('content-type') || '').includes('application/json')) {
        status.textContent = 'The sign-in settings URL returned a web page instead of API settings. Open BIZWISE from its backend server, not another app or a static frontend.';
        return;
      }
      config = await configResponse.json();
    } catch (e) {
      status.textContent = 'Could not reach the sign-in service. Check that the BIZWISE backend is running, then refresh this page.';
      return;
    }
    if (!config.clientId) {
      status.textContent = 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID in backend/.env and restart the backend.';
      return;
    }
    try {
      await loadGoogleIdentity();
      if (!$('#google-button')) return;
      window.google.accounts.id.initialize({
        client_id: config.clientId,
        callback: async ({ credential }) => {
          status.textContent = '';
          const error = $('.err', $('#login'));
          error.textContent = '';
          try {
            const r = await api('/auth/google', { method: 'POST', body: { credential } });
            S.token = r.token; S.user = r.user; keep(r.token); location.hash = '#/dashboard'; render();
          } catch (x) {
            error.textContent = x.message;
          }
        },
      });
      window.google.accounts.id.renderButton($('#google-button'), { theme: 'outline', size: 'large', text: 'continue_with', width: 340 });
      $('#google-login').hidden = false;
    } catch (e) {
      status.textContent = 'Google sign-in script was blocked or could not load. Check your connection, browser extensions, and the site security policy.';
    }
  }

  // ---------- render ----------
  const PAGES = { dashboard: pageDashboard, sales: () => pageEntries('sales'), inventory: pageInventory, expenses: () => pageEntries('expenses'), money: pageMoney, customers: () => pageParties('customers'), suppliers: () => pageParties('suppliers'), reminders: pageReminders, reports: pageReports, settings: pageSettings };
  async function render() {
    if (!S.token) return loginView();
    try {
      if (!S.user || !$('#page')) { const me = await api('/auth/me'); S.user = me.user; S.business = me.business; shell(); }
      const { page } = route(), fn = PAGES[page] || pageDashboard;
      document.querySelectorAll('[data-nav]').forEach((a) => { const on = a.dataset.nav === (PAGES[page] ? page : 'dashboard'); a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
      document.title = `${S.business.name} · ${(NAV.find((n) => n[0] === page) || NAV[0])[1]}`;
      await fn();
    } catch (e) { if (S.token) { const p = $('#page'); if (p) p.innerHTML = `<div class="empty">${esc(e.message)}</div>`; } }
  }

  // ---------- events ----------
  const confirmDelete = (what) => window.confirm(`Delete this ${what}? This cannot be undone.`);
  const ACT = {
    close: closeModal, signout: signOut, explain: (el) => explain(el),
    'report-tab': (el) => { S.reportType = el.dataset.report; render(); },
    'print-report': () => window.print(),
    'new-sale': () => formSale(), 'new-expense': () => formExpense(), transfer: formTransfer, 'new-reminder': formReminder,
    'new-product': formProduct, 'adjust-stock': (el) => formStockAdjustment(S.products[el.dataset.id]),
    'new-party': (el) => formParty(el.dataset.kind),
    'edit-sales': (el) => formSale(S.rows.sales[el.dataset.id]), 'edit-expenses': (el) => formExpense(S.rows.expenses[el.dataset.id]),
    'edit-party': (el) => formParty(el.dataset.kind, S.rows[el.dataset.kind][el.dataset.id]),
    'pay-sales': (el) => { const x = S.rows.sales[el.dataset.id]; formPayment(`/sales/${x.id}/payments`, 'Record payment', x.owed, `${x.party_name || 'The customer'}'s balance for "${x.title}":`); },
    'pay-expenses': (el) => { const x = S.rows.expenses[el.dataset.id]; formPayment(`/expenses/${x.id}/payments`, 'Pay supplier', x.owed, `For "${x.title}":`); },
    settle: (el) => { const p = S.rows[el.dataset.kind][el.dataset.id], c = el.dataset.kind === 'customers'; formPayment(`/${el.dataset.kind}/${p.id}/payments`, c ? 'Collect payment' : 'Pay supplier', p.owed, `${p.name} ${c ? 'owes you' : 'is owed'}`); },
    'del-sales': (el) => del('sales', el.dataset.id, 'sale'), 'del-expenses': (el) => del('expenses', el.dataset.id, 'expense'),
    'del-party': (el) => del(el.dataset.kind, el.dataset.id, el.dataset.kind === 'customers' ? 'customer' : 'supplier'),
    'toggle-rem': async (el) => { await api('/reminders/' + el.dataset.id, { method: 'PATCH', body: { done: el.dataset.done === '1' } }); render(); },
    'del-rem': async (el) => { await api('/reminders/' + el.dataset.id, { method: 'DELETE' }); render(); },
    'del-user': async (el) => { if (!confirmDelete('login')) return; try { await api('/users/' + el.dataset.id, { method: 'DELETE' }); render(); } catch (e) { toast(e.message); } },
    export: (el) => { const k = el.dataset.kind, per = route().params.period || S.period; download(`/export/${k}.csv?period=${per}&q=${encodeURIComponent(S.q)}&method=${S.method}`, `${k}.csv`); },
    menu: (el) => { const m = el.nextElementSibling, open = !m.hidden; document.querySelectorAll('.menu').forEach((x) => { x.hidden = true; }); m.hidden = open; },
  };
  async function del(path, id, what) { if (!confirmDelete(what)) return; try { await api(`/${path}/${id}`, { method: 'DELETE' }); toast('Deleted'); render(); } catch (e) { toast(e.message); } }
  document.addEventListener('click', async (e) => {
    if (!e.target.closest('.menu-wrap')) document.querySelectorAll('.menu').forEach((x) => { x.hidden = true; });
    if (e.target.id === 'modal') return closeModal();
    const el = e.target.closest('[data-act]'); if (!el || !ACT[el.dataset.act]) return;
    if (el.dataset.act !== 'menu') document.querySelectorAll('.menu').forEach((x) => { x.hidden = true; });
    try { await ACT[el.dataset.act](el); } catch (x) { toast(x.message); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.change === 'period') { S.period = t.value; const { page, params } = route(); if (params.period) location.hash = `#/${page}`; else render(); }
    if (t.id === 'position-date') { S.positionDate = t.value; render(); }
    if (t.id === 'mf') { S.method = t.value; if (window.__reload) window.__reload(); }
  });
  let qt; document.addEventListener('input', (e) => { if (e.target.id === 'q') { clearTimeout(qt); qt = setTimeout(() => { S.q = e.target.value.trim(); if (window.__reload) window.__reload(); }, 250); } });
  document.addEventListener('submit', async (e) => {
    const f = e.target, kind = f.dataset && f.dataset.form; if (!kind) return;
    e.preventDefault(); const err = $('.err', f), btn = $('button[type=submit]', f); if (err) err.textContent = ''; btn.disabled = true;
    try { await FORMS[kind](Object.fromEntries(new FormData(f).entries())); toast('Saved'); if (kind === 'password') f.reset(); else render(); } catch (x) { if (err) err.textContent = x.message; else toast(x.message); }
    btn.disabled = false;
  });
  window.addEventListener('hashchange', () => { S.q = ''; S.method = ''; render(); });

  try { S.token = sessionStorage.getItem(KEY); } catch (e) { S.token = null; }
  render();
})();
