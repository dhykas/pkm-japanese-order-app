/* =========================================================
   Shared helpers used by every page.

   "Database" = localStorage. All pages read/write the same key, so an order placed on the
   customer pages shows up on the cashier and dashboard right away:
     - browsers fire a `storage` event in every OTHER tab when localStorage changes
     - the tab that wrote gets a custom `orders:changed` event
     - a light poll every 1.5 s is the fallback in case the storage event is not delivered

   The customer's cart (not yet ordered) lives in sessionStorage, i.e. only in that tab.

   Order shape:
     { id, number, type: 'table' | 'bulk', table, customer: {name, phone, method, date, time, address},
       items: [{id, name, price, qty}], note, status: 'new'|'cooking'|'served'|'paid',
       subtotal, discountPct, discount, total, billRequested, createdAt, updatedAt }
   ========================================================= */
var DB_KEY = 'resto_demo_orders';

var Store = {
  all: function () {
    try { return JSON.parse(localStorage.getItem(DB_KEY)) || []; } catch (e) { return []; }
  },
  saveAll: function (orders) {
    localStorage.setItem(DB_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent('orders:changed'));
  },
  add: function (order) {
    var list = this.all();
    list.unshift(order);
    this.saveAll(list);
    return order;
  },
  addMany: function (list) {
    var all = this.all(), n = this.nextNumber();
    list.slice().sort(function (a, b) { return a.createdAt - b.createdAt; }).forEach(function (o) { o.number = n++; });
    this.saveAll(all.concat(list).sort(function (a, b) { return b.createdAt - a.createdAt; }));
  },
  update: function (id, patch) {
    this.saveAll(this.all().map(function (o) {
      return o.id === id ? Object.assign({}, o, patch, { updatedAt: Date.now() }) : o;
    }));
  },
  remove: function (id) { this.saveAll(this.all().filter(function (o) { return o.id !== id; })); },
  clear: function () { this.saveAll([]); },
  byId: function (id) { return this.all().filter(function (o) { return o.id === id; })[0]; },
  nextNumber: function () {
    return this.all().reduce(function (m, o) { return Math.max(m, o.number || 0); }, 0) + 1;
  },
  requestBill: function (table) {
    this.saveAll(this.all().map(function (o) {
      var hit = orderType(o) === 'table' && o.table === table && o.status !== 'paid';
      return hit ? Object.assign({}, o, { billRequested: true, updatedAt: Date.now() }) : o;
    }));
  },
  onChange: function (cb) {
    window.addEventListener('storage', function (e) { if (e.key === DB_KEY) cb(); });
    window.addEventListener('orders:changed', cb);
    var last = localStorage.getItem(DB_KEY);
    setInterval(function () {
      var now = localStorage.getItem(DB_KEY);
      if (now !== last) { last = now; cb(); }
    }, 1500);
  }
};

/* ---------- Status vocabulary (labels differ per order type) ---------- */
var STATUS_FLOW = ['new', 'cooking', 'served', 'paid'];
var LABELS = {
  table: { status: { new: 'New', cooking: 'Cooking', served: 'Served', paid: 'Paid' },
           next:   { new: 'Start cooking', cooking: 'Mark served', served: 'Mark paid' } },
  bulk:  { status: { new: 'New', cooking: 'Preparing', served: 'Ready', paid: 'Paid' },
           next:   { new: 'Confirm & prepare', cooking: 'Mark ready', served: 'Mark paid' } }
};
function orderType(o) { return o.type || 'table'; }
function statusLabel(o) { return LABELS[orderType(o)].status[o.status] || o.status; }
function nextLabel(o) { return LABELS[orderType(o)].next[o.status]; }
function orderWho(o) { return orderType(o) === 'bulk' ? ((o.customer && o.customer.name) || 'Bulk order') : 'Table ' + o.table; }
function orderSubtotal(o) { return o.items.reduce(function (t, it) { return t + it.price * it.qty; }, 0); }
function orderTotal(o) { return o.total != null ? o.total : orderSubtotal(o); }
function orderQty(o) { return o.items.reduce(function (t, it) { return t + it.qty; }, 0); }

/* Bulk discount: tier by order subtotal. Returns the tier hit and the next one to unlock. */
function bulkDiscount(subtotal) {
  var hit = null, next = null;
  MENU_DATA.bulk.tiers.forEach(function (t) {
    if (subtotal >= t.minSubtotal) hit = t; else if (!next) next = t;
  });
  return { pct: hit ? hit.pct : 0, tier: hit, next: next };
}

/* Build a complete order object (totals, ids, timestamps) from a partial one. */
function makeOrder(base) {
  var o = Object.assign({ id: uid(), type: 'table', status: 'new', note: '', billRequested: false, createdAt: Date.now() }, base);
  o.updatedAt = o.updatedAt || o.createdAt;
  var sub = orderSubtotal(o), pct = o.type === 'bulk' ? bulkDiscount(sub).pct : 0;
  o.subtotal = sub;
  o.discountPct = pct;
  o.discount = Math.round(sub * pct / 100);
  o.total = sub - o.discount;
  if (o.number == null) o.number = Store.nextNumber();
  return o;
}

/* ---------- Formatting ---------- */
function uid() { return 'ord_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function rupiah(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }
function rupiahShort(n) {
  n = Number(n || 0);
  if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
  if (n >= 1e3) return 'Rp ' + Math.round(n / 1e3) + 'K';
  return 'Rp ' + n;
}
function fmtTime(ts) { return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
function fmtDay(ts) { return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function isoDate(d) {
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function timeAgo(ts) {
  var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  var m = Math.round(s / 60);
  if (m < 60) return m + ' min ago';
  var h = Math.round(m / 60);
  if (h < 24) return h + ' h ago';
  return Math.round(h / 24) + ' d ago';
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function itemLines(o) {
  return '<ul>' + o.items.map(function (i) {
    return '<li><span class="q">' + i.qty + '×</span><span class="n">' + esc(i.name) + '</span><span class="a">' + rupiah(i.price * i.qty) + '</span></li>';
  }).join('') + '</ul>';
}
function sumLines(o) {
  if (!o.discount) return '<div class="sum"><div class="total"><span>Total</span><span>' + rupiah(orderTotal(o)) + '</span></div></div>';
  return '<div class="sum"><div><span>Subtotal</span><span>' + rupiah(o.subtotal) + '</span></div>' +
    '<div class="disc"><span>Bulk discount ' + o.discountPct + '%</span><span>−' + rupiah(o.discount) + '</span></div>' +
    '<div class="total"><span>Total</span><span>' + rupiah(o.total) + '</span></div></div>';
}
function stepsHtml(o) {
  var step = STATUS_FLOW.indexOf(o.status), L = LABELS[orderType(o)].status;
  return '<div class="steps">' + STATUS_FLOW.map(function (s, i) { return '<i class="' + (i <= step ? 'done' : '') + '"></i>'; }).join('') + '</div>' +
    '<div class="steps-labels">' + STATUS_FLOW.map(function (s, i) { return '<span class="' + (i <= step ? 'done' : '') + '">' + L[s] + '</span>'; }).join('') + '</div>';
}

/* Quantity stepper: − [editable number] +  (used on menu cards and cart lines) */
function qtyControl(id, qty, opts) {
  opts = opts || {};
  return '<span class="qty' + (opts.small ? ' sm' : '') + '">' +
    '<button type="button" data-dec="' + id + '" aria-label="Less">−</button>' +
    '<input type="number" data-qty="' + id + '" value="' + qty + '" min="0" max="999" step="1" inputmode="numeric" pattern="[0-9]*" aria-label="Quantity"' +
      (opts.min > 1 ? ' title="Minimum ' + opts.min + '"' : '') + '>' +
    '<button type="button" data-inc="' + id + '" aria-label="More">+</button></span>';
}

/* ---------- Shared top bar ---------- */
var NAV = {
  customer: [
    { id: 'home', label: 'Home', href: 'index.html' },
    { id: 'order', label: 'Order at table', href: 'index.html#tables' },
    { id: 'bulk', label: 'Bento & platters', href: 'bulk.html' }
  ],
  staff: [
    { id: 'cashier', label: 'Cashier', href: 'cashier.html' },
    { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html' }
  ]
};
function renderNav(opts) {
  var area = opts.area || 'customer', R = MENU_DATA.restaurant;
  var links = NAV[area].map(function (l) {
    return '<a href="' + l.href + '" class="' + (l.id === opts.active ? 'active' : '') + '">' + l.label + '</a>';
  }).join('');
  var swap = area === 'customer'
    ? '<a href="cashier.html" class="nav-swap">Staff →</a>'
    : '<a href="index.html" class="nav-swap">← Customer</a>';
  document.getElementById('topbar').innerHTML =
    '<div class="container topbar-in">' +
      '<a class="brand" href="' + (area === 'staff' ? 'cashier.html' : 'index.html') + '">' +
        '<span class="logo">' + (area === 'staff' ? '計' : '麺') + '</span>' +
        '<span class="name">' + esc(R.name) + (area === 'staff' ? '<small>Staff</small>' : '<span class="jp">' + esc((R.jp || '').split(' ')[0]) + '</span>') + '</span></a>' +
      '<nav class="nav" id="nav">' + links + swap + '</nav>' +
      '<div class="topbar-right" id="topbarRight">' + (opts.right || '') + '</div>' +
      '<button type="button" class="nav-toggle only-mobile" id="navToggle" aria-label="Menu" aria-expanded="false" aria-controls="nav">☰</button>' +
    '</div>';

  /* hamburger menu on small screens */
  var tb = document.getElementById('topbar'), tg = document.getElementById('navToggle');
  function setNav(open) {
    tb.classList.toggle('nav-open', open);
    tg.textContent = open ? '✕' : '☰';
    tg.setAttribute('aria-expanded', String(open));
  }
  tg.addEventListener('click', function (e) { e.stopPropagation(); setNav(!tb.classList.contains('nav-open')); });
  document.addEventListener('click', function (e) { if (!e.target.closest('#navToggle')) setNav(false); });
}

/* ---------- Modal dialog (confirmation + success) ---------- */
function showModal(o) {
  closeModal();
  var wrap = document.createElement('div');
  wrap.className = 'modal-backdrop'; wrap.id = 'modal';
  wrap.innerHTML =
    '<div class="modal' + (o.cls ? ' ' + o.cls : '') + '" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
      (o.icon ? '<div class="modal-ico">' + o.icon + '</div>' : '') +
      '<h3 id="modalTitle">' + o.title + '</h3>' +
      (o.sub ? '<p class="muted small modal-sub">' + o.sub + '</p>' : '') +
      '<div class="modal-body">' + (o.body || '') + '</div>' +
      '<div class="modal-actions">' + (o.actions || []).map(function (a, i) {
        return '<button type="button" class="btn ' + (a.cls || '') + '" data-action="' + i + '">' + a.label + '</button>';
      }).join('') + '</div>' +
    '</div>';
  document.body.appendChild(wrap);
  document.body.classList.add('modal-open');
  requestAnimationFrame(function () { wrap.classList.add('show'); });
  wrap.addEventListener('click', function (e) {
    var b = e.target.closest('[data-action]');
    if (b) { var a = o.actions[+b.dataset.action]; closeModal(); if (a.onClick) a.onClick(); return; }
    if (e.target === wrap && o.dismissable !== false) closeModal();
  });
  var first = wrap.querySelector('.btn.primary') || wrap.querySelector('.btn');
  if (first) first.focus();
  return wrap;
}
function closeModal() {
  var m = document.getElementById('modal');
  if (m) m.remove();
  document.body.classList.remove('modal-open');
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

/* ---------- Toast + beep ---------- */
var _toastTimer;
function toast(msg) {
  var el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2800);
}
/* Short beep for the cashier (browsers allow sound only after a first click on the page). */
function beep() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.value = 0.08;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.18);
  } catch (e) { /* audio blocked, ignore */ }
}

/* ---------- Demo data generators ---------- */
var Demo = {
  pick: function (list, pairs) {
    return pairs.map(function (p) {
      var it = list.filter(function (i) { return i.id === p[0]; })[0];
      return { id: it.id, name: it.name, price: it.price, qty: p[1] };
    });
  },
  /* A handful of live orders so the cashier screen has something to work with. */
  sampleActive: function () {
    var M = MENU_DATA.items, B = MENU_DATA.bulk.items, now = Date.now();
    var list = [
      makeOrder({ table: 3, status: 'cooking', note: 'Extra spicy, no egg', items: this.pick(M, [['r2', 2], ['d1', 2]]), createdAt: now - 9 * 60000 }),
      makeOrder({ table: 5, status: 'new', items: this.pick(M, [['s1', 2], ['k1', 1], ['d3', 1]]), createdAt: now - 60000 }),
      makeOrder({ table: 1, status: 'served', note: 'No wasabi please', billRequested: true, items: this.pick(M, [['r1', 1], ['s3', 1], ['x1', 1]]), createdAt: now - 25 * 60000 }),
      makeOrder({ type: 'bulk', status: 'new', note: 'Office lunch, please label the boxes', createdAt: now - 3 * 60000,
        items: this.pick(B, [['b1', 30], ['b4', 1], ['b9', 2]]),
        customer: { name: 'Budi Santoso', phone: '0812 3456 7890', method: 'delivery', date: isoDate(new Date(now + 864e5)), time: '11:00', address: 'Jl. Surya Kencana No. 1, Pamulang' } })
    ];
    Store.addMany(list);
    return list.length;
  },
  /* A whole day of orders (mostly paid) so the dashboard has real-looking numbers. */
  fullDay: function () {
    var M = MENU_DATA.items, B = MENU_DATA.bulk.items, R = MENU_DATA.restaurant, self = this;
    var day = new Date(); day.setHours(0, 0, 0, 0);
    var base = day.getTime(), now = Date.now(), list = [];
    var perHour = { 10: 2, 11: 3, 12: 6, 13: 5, 14: 2, 15: 2, 16: 2, 17: 3, 18: 5, 19: 6, 20: 4, 21: 2 };
    var notes = ['', '', '', '', 'Extra spicy', 'No wasabi', 'Less salt', 'Allergic to shellfish', 'Extra nori'];
    Object.keys(perHour).forEach(function (h) {
      var count = Math.max(1, perHour[h] + rnd(-1, 1));
      for (var i = 0; i < count; i++) {
        var created = base + h * 3600e3 + rnd(0, 59) * 60e3;
        if (created > now) continue;
        var chosen = {};
        while (Object.keys(chosen).length < rnd(1, 4)) { var it = M[rnd(0, M.length - 1)]; chosen[it.id] = rnd(1, 2); }
        var age = now - created;
        var status = age > 45 * 60e3 ? 'paid' : ['new', 'cooking', 'served'][rnd(0, 2)];
        list.push(makeOrder({
          table: rnd(1, R.tables), status: status, note: notes[rnd(0, notes.length - 1)],
          items: self.pick(M, Object.keys(chosen).map(function (k) { return [k, chosen[k]]; })),
          createdAt: created, updatedAt: created + rnd(15, 40) * 60e3
        }));
      }
    });
    var customers = [['Budi Santoso', '0812 3456 7890'], ['PT Maju Jaya', '021 555 0199'], ['Siti Rahma', '0857 1122 3344'], ['SMA 3 Pamulang', '0821 9988 7766'], ['Dewi Lestari', '0813 2233 4455']];
    customers.forEach(function (c, i) {
      var created = base + rnd(9, 20) * 3600e3 + rnd(0, 59) * 60e3;
      if (created > now) created = now - rnd(5, 300) * 60e3;
      var picks = [[B[rnd(0, 2)].id, rnd(2, 10) * 5]];
      if (Math.random() < 0.6) picks.push([B[rnd(3, B.length - 1)].id, rnd(1, 3)]);
      var upcoming = i >= 3;
      list.push(makeOrder({
        type: 'bulk', status: upcoming ? ['new', 'cooking'][i - 3] : 'paid',
        items: self.pick(B, picks), createdAt: created, updatedAt: created + rnd(30, 120) * 60e3,
        customer: { name: c[0], phone: c[1], method: i % 2 ? 'delivery' : 'pickup',
          date: isoDate(new Date(base + (upcoming ? rnd(1, 3) : 0) * 864e5)), time: ['10:00', '11:30', '12:00', '17:00'][rnd(0, 3)],
          address: i % 2 ? 'Jl. Pajajaran No. ' + rnd(1, 99) + ', Pamulang' : '' }
      }));
    });
    Store.addMany(list);
    return list.length;
  }
};
