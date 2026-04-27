/* ════════════════════════════════════════════════
   STARTECH — client.js
   ════════════════════════════════════════════════ */
'use strict';

let allMachines = [];
let charts = {};
const PALETTE = ['#2563eb','#0ea5e9','#10b981','#f59e0b','#6366f1','#ec4899','#14b8a6','#f97316','#8b5cf6','#06b6d4'];
const BRAND_ICON = { apple:'🍎',dell:'🖥',hp:'🖨',lenovo:'💼',asus:'🔷',acer:'🔺',samsung:'📱',msi:'🎮',microsoft:'🪟',dynabook:'📓' };

const fcfa = v => new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' FCFA';
const shortFcfa = v => new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' F';
const brandIcon = b => BRAND_ICON[(b||'').toLowerCase()] || '💻';

// ── Navigation ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    fetchMachines();
    initLogout();
    initImgModal();
    initPredictorOpts();
    document.getElementById('btnPredict')?.addEventListener('click', runPredict);
    document.getElementById('storeSearch')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        renderCards(q ? allMachines.filter(m =>
            (m.name||'').toLowerCase().includes(q) ||
            (m.brand||'').toLowerCase().includes(q) ||
            (m.cpu||'').toLowerCase().includes(q)
        ) : allMachines);
    });
});

function initNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.dataset.view;
            document.querySelectorAll('.view').forEach(v => {
                v.classList.toggle('hidden', v.id !== 'view-' + view);
                v.classList.toggle('active', v.id === 'view-' + view);
            });
            if (view === 'market') loadMarket();
        });
    });
}

function initLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    });
}

// ── Data ──────────────────────────────────────────────────────────
async function fetchMachines() {
    try {
        const [mr, sr] = await Promise.all([fetch('/api/machines'), fetch('/api/stats')]);
        if (mr.status === 401) { window.location.href = '/login'; return; }
        allMachines = await mr.json();
        const stats = await sr.json();
        renderCards(allMachines);
        renderFilters(stats.brands);
        updateHeroKpis(allMachines, stats);
    } catch { showToast('Erreur de connexion', true); }
}

// ── Hero KPIs ─────────────────────────────────────────────────────
function updateHeroKpis(machines, stats) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const totalUnits = machines.reduce((s, m) => s + (m.quantity || 1), 0);
    set('hTotal',  totalUnits);
    set('hBrands', stats.brands.length);
    const avg = machines.length ? machines.reduce((s, m) => s + m.price, 0) / machines.length : 0;
    set('hAvg',   shortFcfa(avg));
}

// ── Filters ───────────────────────────────────────────────────────
function renderFilters(brands) {
    const wrap = document.getElementById('brandFilter');
    if (!wrap) return;
    wrap.querySelectorAll('[data-brand]:not([data-brand="all"])').forEach(b => b.remove());
    brands.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'filt';
        btn.dataset.brand = b.brand;
        btn.textContent = b.brand;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filt').forEach(f => f.classList.remove('active'));
            btn.classList.add('active');
            renderCards(allMachines.filter(m => m.brand === b.brand));
        });
        wrap.appendChild(btn);
    });
    const allBtn = wrap.querySelector('[data-brand="all"]');
    allBtn?.addEventListener('click', () => {
        document.querySelectorAll('.filt').forEach(f => f.classList.remove('active'));
        allBtn.classList.add('active');
        renderCards(allMachines);
    });
}

// ── Product Cards ─────────────────────────────────────────────────
function renderCards(machines) {
    const grid = document.getElementById('cardsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!machines.length) {
        const p = document.createElement('p');
        p.style.cssText = 'grid-column:1/-1;text-align:center;padding:60px;color:#94a3b8;font-size:.9rem;';
        p.textContent = 'Aucune machine disponible.';
        grid.appendChild(p);
        return;
    }

    machines.forEach(m => {
        const qty = m.quantity || 1;
        const statusMap = { 'En stock':['s-stock','En stock'], 'Assigné':['s-assign','Assigné'], 'En réparation':['s-repair','En réparation'], 'Vendu':['s-sold','Vendu'] };
        const [sc, sl] = statusMap[m.status] || ['s-stock', m.status];

        const card = document.createElement('article');
        card.className = 'product-card';

        // Image section
        const imgDiv = document.createElement('div');
        imgDiv.className = 'card-img';
        if (m.image_path) {
            const img = document.createElement('img');
            img.src = m.image_path;
            img.alt = '';
            imgDiv.appendChild(img);
            const expand = document.createElement('button');
            expand.className = 'card-img-expand';
            expand.title = 'Agrandir';
            expand.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
            expand.addEventListener('click', e => {
                e.stopPropagation();
                openImgModal(m.image_path, m.name);
            });
            imgDiv.appendChild(expand);
        } else {
            const ph = document.createElement('div');
            ph.className = 'card-img-placeholder';
            ph.textContent = brandIcon(m.brand);
            imgDiv.appendChild(ph);
        }

        // Badges
        const badgesDiv = document.createElement('div');
        badgesDiv.className = 'card-badges';
        const brandBadge = document.createElement('span');
        brandBadge.className = 'card-brand';
        brandBadge.textContent = m.brand;
        const statusBadge = document.createElement('span');
        statusBadge.className = 'cstatus ' + sc;
        statusBadge.textContent = sl;
        badgesDiv.appendChild(brandBadge);
        badgesDiv.appendChild(statusBadge);

        // Body
        const body = document.createElement('div');
        body.className = 'card-body';
        const name = document.createElement('h3');
        name.className = 'card-name';
        name.textContent = m.name;
        const loc = document.createElement('p');
        loc.className = 'card-loc';
        loc.textContent = m.location ? '📍 ' + m.location : '';

        const specs = document.createElement('div');
        specs.className = 'card-specs';
        const specItems = [
            ['<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/></svg>', 'CPU', m.cpu || '—'],
            ['<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 19v-3M10 19v-3M14 19v-3M18 19v-3M8 11V9M16 11V9M12 11V9M2 15h20M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1.1a2 2 0 0 0 0 3.837V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5.1a2 2 0 0 0 0-3.837V7z"/></svg>', 'RAM', m.ram ? m.ram + ' Go' : '—'],
            ['<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>', 'SSD', m.storage ? m.storage + ' Go' : '—'],
            ['<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>', 'GPU', m.gpu_memory ? m.gpu_memory + ' Go' : 'Intégré'],
        ];
        specItems.forEach(([icon, lbl, val]) => {
            const si = document.createElement('div');
            si.className = 'spec-item';
            si.innerHTML = icon;
            const txt = document.createElement('div');
            const sl2 = document.createElement('span');
            sl2.className = 'spec-label';
            sl2.textContent = lbl;
            const sv = document.createElement('span');
            sv.className = 'spec-val';
            sv.textContent = val;
            txt.appendChild(sl2);
            txt.appendChild(sv);
            si.appendChild(txt);
            specs.appendChild(si);
        });

        body.appendChild(name);
        body.appendChild(loc);
        body.appendChild(specs);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'card-footer';
        const priceWrap = document.createElement('div');
        const priceEl = document.createElement('div');
        priceEl.className = 'card-price';
        priceEl.textContent = fcfa(m.price);
        const priceSub = document.createElement('div');
        priceSub.className = 'card-price-sub';
        priceSub.textContent = 'Prix unitaire FCFA';
        priceWrap.appendChild(priceEl);
        priceWrap.appendChild(priceSub);
        const qtyBadge = document.createElement('span');
        qtyBadge.className = 'card-qty-badge';
        qtyBadge.textContent = qty + ' unit.';
        footer.appendChild(priceWrap);
        footer.appendChild(qtyBadge);

        card.appendChild(imgDiv);
        card.appendChild(badgesDiv);
        card.appendChild(body);
        card.appendChild(footer);
        grid.appendChild(card);
    });
}

// ── Image Lightbox ────────────────────────────────────────────────
function initImgModal() {
    document.getElementById('imgModalClose')?.addEventListener('click', closeImgModal);
    document.getElementById('imgModalOverlay')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeImgModal();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeImgModal(); });
}
function openImgModal(src, caption) {
    const overlay = document.getElementById('imgModalOverlay');
    const img     = document.getElementById('imgModalSrc');
    const cap     = document.getElementById('imgModalCaption');
    if (!overlay || !img) return;
    img.src = src;
    if (cap) cap.textContent = caption || '';
    overlay.classList.add('active');
}
function closeImgModal() {
    document.getElementById('imgModalOverlay')?.classList.remove('active');
}

// ════════════════════════════════════════════════
//  MARKET — Regression
// ════════════════════════════════════════════════
let marketLoaded = false;
async function loadMarket() {
    if (marketLoaded) return;
    marketLoaded = true;
    try {
        const [mRes, sRes] = await Promise.all([
            fetch('/api/regression/multiple'),
            fetch('/api/regression/simple')
        ]);
        const mult   = await mRes.json();
        const simple = await sRes.json();

        if (!mult.error) renderMultiple(mult);
        renderSimple(simple);
    } catch { showToast('Erreur lors du chargement des régressions', true); }
}

function renderMultiple(d) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const fmt = v => new Intl.NumberFormat('fr-FR').format(Math.round(v));

    const formula = `Prix = ${fmt(d.a_ram)}·RAM + ${fmt(d.a_storage)}·Stockage + ${fmt(d.a_gpu)}·GPU + ${fmt(d.a_gen)}·Génération + ${fmt(d.b)}`;
    set('modelFormula', formula);
    set('modelR2', (d.r2 * 100).toFixed(1) + '%');

    const r2Interp = document.getElementById('modelR2Interp');
    if (r2Interp) {
        if (d.r2 >= 0.7)      r2Interp.textContent = '— Modèle fiable ✅';
        else if (d.r2 >= 0.4) r2Interp.textContent = '— Modèle modéré ⚠️';
        else                   r2Interp.textContent = '— Modèle faible ℹ️';
    }
}

function renderSimple(data) {
    const configs = [
        { key: 'ram',        canvasId: 'chartRam', r2Id: 'r2Ram', label: 'RAM (Go)' },
        { key: 'storage',    canvasId: 'chartSto', r2Id: 'r2Sto', label: 'Stockage (Go)' },
        { key: 'gpu_memory', canvasId: 'chartGpu', r2Id: 'r2Gpu', label: 'GPU (Go)' },
        { key: 'cpu_gen',    canvasId: 'chartGen', r2Id: 'r2Gen', label: 'Génération CPU' },
    ];

    configs.forEach(({ key, canvasId, r2Id, label }) => {
        const d   = data[key];
        const r2El = document.getElementById(r2Id);
        if (!d || d.error) { if (r2El) r2El.textContent = 'Données insuffisantes'; return; }

        if (r2El) r2El.textContent = `R² = ${d.r2.toFixed(3)} · n=${d.n}`;

        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;

        charts[canvasId]?.destroy();
        charts[canvasId] = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Machines',
                        type: 'scatter',
                        data: d.scatter,
                        backgroundColor: 'rgba(37,99,235,.5)',
                        borderColor:     'rgba(37,99,235,.8)',
                        pointRadius: 5, pointHoverRadius: 7, borderWidth: 1.5
                    },
                    {
                        label: `y = ${d.a}x + ${Math.round(d.b)}`,
                        type: 'line',
                        data: d.line,
                        borderColor: '#ef4444', borderWidth: 2.5,
                        pointRadius: 0, fill: false, tension: 0
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { title:{ display:true, text: label, font:{size:11,weight:'700'}, color:'#475569' }, ticks:{color:'#94a3b8',font:{size:10}}, grid:{color:'#f1f5f9'} },
                    y: { title:{ display:true, text:'Prix (FCFA)', font:{size:11,weight:'700'}, color:'#475569' }, ticks:{ callback: v => new Intl.NumberFormat('fr-FR').format(v)+' F', color:'#94a3b8', font:{size:10} }, grid:{color:'#f1f5f9'} }
                },
                plugins: {
                    legend:{ display:false },
                    tooltip:{ callbacks:{ label: ctx => ` ${label}: ${ctx.parsed.x} — Prix: ${new Intl.NumberFormat('fr-FR').format(ctx.parsed.y)} FCFA` } }
                }
            }
        });
    });
}

// ── Predictor ─────────────────────────────────────────────────────
function initPredictorOpts() {
    const groups = [
        { wrapId: 'predRam', inputId: 'inRam' },
        { wrapId: 'predSto', inputId: 'inSto' },
        { wrapId: 'predGpu', inputId: 'inGpu' },
        { wrapId: 'predGen', inputId: 'inGen' },
    ];
    groups.forEach(({ wrapId, inputId }) => {
        document.getElementById(wrapId)?.querySelectorAll('.popt').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById(wrapId).querySelectorAll('.popt').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const inp = document.getElementById(inputId);
                if (inp) inp.value = btn.dataset.val;
            });
        });
    });
}

async function runPredict() {
    const ram     = parseFloat(document.getElementById('inRam')?.value || 8);
    const storage = parseFloat(document.getElementById('inSto')?.value || 512);
    const gpu     = parseFloat(document.getElementById('inGpu')?.value || 0);
    const gen     = parseFloat(document.getElementById('inGen')?.value || 12);

    const btn = document.getElementById('btnPredict');
    if (btn) { btn.disabled = true; btn.textContent = 'Calcul…'; }

    try {
        const res  = await fetch(`/api/predict/multiple?ram=${ram}&storage=${storage}&gpu=${gpu}&gen=${gen}`);
        const data = await res.json();
        if (data.error) { showToast(data.error, true); return; }

        const panel = document.getElementById('predResult');
        if (!panel) return;
        panel.innerHTML = '';

        const div = document.createElement('div');
        div.className = 'pred-out';

        const lbl = document.createElement('p');
        lbl.className = 'pred-out-ram';
        lbl.textContent = `RAM ${ram}Go · SSD ${storage}Go · GPU ${gpu}Go · Gén. ${gen}`;

        const price = document.createElement('div');
        price.className = 'pred-out-price';
        price.textContent = new Intl.NumberFormat('fr-FR').format(data.predicted_price) + ' FCFA';

        const formula = document.createElement('div');
        formula.className = 'pred-out-formula';
        formula.textContent = data.formula;

        const r2 = document.createElement('p');
        r2.className = 'pred-out-r2';
        r2.textContent = `R² multiple = ${(data.r2 * 100).toFixed(1)}%`;

        const interp = document.createElement('div');
        interp.className = 'pred-out-interp';
        interp.textContent = data.r2 >= 0.7
            ? `✅ Bonne fiabilité (R²=${(data.r2*100).toFixed(0)}%). Le modèle explique bien la variation des prix.`
            : data.r2 >= 0.4
                ? `⚠️ Fiabilité modérée (R²=${(data.r2*100).toFixed(0)}%). D'autres facteurs (marque, GPU) influencent le prix.`
                : `ℹ️ Fiabilité limitée (R²=${(data.r2*100).toFixed(0)}%). Le marché camerounais présente une forte dispersion.`;

        div.appendChild(lbl);
        div.appendChild(price);
        div.appendChild(formula);
        div.appendChild(r2);
        div.appendChild(interp);
        panel.appendChild(div);

    } catch { showToast('Erreur de prédiction', true); }
    finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="13 2 13 9 20 9"/><path d="M21 2l-9 9"/><path d="M3 15v4a2 2 0 0 0 2 2h4"/><path d="M13 22l9-9-4-4"/></svg> Prédire le prix';
        }
    }
}

// ── Toast ─────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
    const t   = document.getElementById('toast');
    const msg_el = document.getElementById('toastMsg');
    if (msg_el) msg_el.textContent = msg;
    t?.classList.toggle('error',   isError);
    t?.classList.toggle('success', !isError);
    t?.classList.add('visible');
    setTimeout(() => t?.classList.remove('visible'), 3200);
}
