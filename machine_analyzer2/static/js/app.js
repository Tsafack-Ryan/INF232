/* ════════════════════════════════════════════════
   STARTECH — app.js
   INF232 · Université de Yaoundé 1
   ════════════════════════════════════════════════ */

'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let allMachines    = [];
let deleteTargetId = null;
let brandChart, statusChart, ramChart, avgPriceChart, regressionChart;
let currentView    = 'storefront';

const PALETTE = [
    '#2563eb','#0ea5e9','#10b981','#f59e0b','#6366f1',
    '#ec4899','#14b8a6','#f97316','#8b5cf6','#06b6d4'
];

// ── Brand → emoji ─────────────────────────────────────────────────────────────
const BRAND_ICON = {
    apple:'🍎', dell:'🖥', hp:'🖨', lenovo:'💼', asus:'🔷',
    acer:'🔺', samsung:'📱', msi:'🎮', microsoft:'🪟', dynabook:'📓'
};
function brandIcon(b) {
    return BRAND_ICON[(b || '').toLowerCase()] || '💻';
}

// ── Formatter ─────────────────────────────────────────────────────────────────
function fcfa(v) {
    return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' FCFA';
}
function safe(s) {
    // XSS protection: use textContent assignment instead of innerHTML
    const d = document.createElement('span');
    d.textContent = s ?? '—';
    return d.textContent;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    // Date in topbar
    const d = new Date();
    const el = document.getElementById('topbarDate');
    if (el) el.textContent = d.toLocaleDateString('fr-FR', { weekday:'short', year:'numeric', month:'short', day:'numeric' });

    initNavigation();
    fetchData();
    initForm();
    initDeleteModal();
    initSearch();
    initPredictorUI();

    document.getElementById('exportBtn')?.addEventListener('click', () => {
        window.location.href = '/api/export';
    });
    document.getElementById('addNewBtn')?.addEventListener('click', openModalForAdd);
});

// ═══════════════════════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════
function initNavigation() {
    const btns = document.querySelectorAll('.nav-btn');
    const modePill = document.getElementById('modePill');

    const modeLabels = { client:'Mode Client', admin:'Mode Gestionnaire', info:'Informations' };

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            const mode = btn.dataset.mode;

            // Update active btn
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update mode pill
            if (modePill) modePill.textContent = modeLabels[mode] || '';

            // Show/hide views
            document.querySelectorAll('.view').forEach(v => {
                v.classList.toggle('hidden', v.id !== 'view-' + view);
                v.classList.toggle('active', v.id === 'view-' + view);
            });

            currentView = view;

            // Lazy loads
            if (view === 'market') loadRegressionChart();
            if (view === 'dashboard') setTimeout(resizeCharts, 50);
        });
    });
}

function resizeCharts() {
    [brandChart, statusChart, ramChart, avgPriceChart].forEach(c => c?.resize());
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DATA FETCH
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchData() {
    try {
        const [mRes, sRes] = await Promise.all([
            fetch('/api/machines'),
            fetch('/api/stats')
        ]);
        allMachines = await mRes.json();
        const stats = await sRes.json();

        renderStorefront(allMachines);
        renderFilters(stats.brands);
        updateHeroStats(allMachines, stats);
        renderTable(allMachines);
        updateKPIs(allMachines, stats);
        renderAdminCharts(stats);
    } catch (err) {
        console.error(err);
        showToast('Erreur de connexion au serveur', true);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STOREFRONT — Product Cards
// ═══════════════════════════════════════════════════════════════════════════════
function renderStorefront(machines) {
    const grid = document.getElementById('cardsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!machines.length) {
        const p = document.createElement('p');
        p.style.cssText = 'grid-column:1/-1;text-align:center;padding:60px;color:#94a3b8;';
        p.textContent = 'Aucune machine disponible.';
        grid.appendChild(p);
        return;
    }

    machines.forEach((m, i) => {
        const statusMap = {
            'En stock': ['s-stock','En stock'],
            'Assigné':  ['s-assign','Assigné'],
            'En réparation': ['s-repair','En réparation'],
            'Vendu':    ['s-sold','Vendu']
        };
        const [sc, sl] = statusMap[m.status] || ['s-stock', m.status];

        const card = document.createElement('article');
        card.className = 'product-card';
        card.style.animationDelay = (i * 0.04) + 's';

        // Use textContent for all user data (XSS protection)
        card.innerHTML = `
            <div class="card-header">
                <span class="card-brand-badge"></span>
                <div class="card-icon"></div>
                <span class="card-status ${sc}"></span>
            </div>
            <div class="card-body">
                <h3 class="card-name"></h3>
                <p class="card-location"></p>
                <div class="card-specs">
                    <div class="spec-item">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/></svg>
                        <div><span class="spec-label">CPU</span><span class="spec-val spec-cpu"></span></div>
                    </div>
                    <div class="spec-item">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 19v-3"/><path d="M10 19v-3"/><path d="M14 19v-3"/><path d="M18 19v-3"/><path d="M8 11V9"/><path d="M16 11V9"/><path d="M12 11V9"/><path d="M2 15h20"/><path d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1.1a2 2 0 0 0 0 3.837V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5.1a2 2 0 0 0 0-3.837V7z"/></svg>
                        <div><span class="spec-label">RAM</span><span class="spec-val spec-ram"></span></div>
                    </div>
                    <div class="spec-item">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        <div><span class="spec-label">Stockage</span><span class="spec-val spec-sto"></span></div>
                    </div>
                    <div class="spec-item">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                        <div><span class="spec-label">GPU</span><span class="spec-val spec-gpu"></span></div>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <div>
                    <div class="card-price"></div>
                    <div class="card-price-sub">Prix marché FCFA</div>
                </div>
                <span class="card-chip"></span>
            </div>
        `;

        // XSS-safe textContent assignments
        card.querySelector('.card-brand-badge').textContent = m.brand || '—';
        card.querySelector('.card-icon').textContent         = brandIcon(m.brand);
        card.querySelector('.card-status').textContent       = sl;
        card.querySelector('.card-name').textContent         = m.name || '—';
        card.querySelector('.card-location').textContent     = m.location ? '📍 ' + m.location : '';
        card.querySelector('.spec-cpu').textContent          = m.cpu    || '—';
        card.querySelector('.spec-ram').textContent          = m.ram    ? m.ram + ' Go'    : '—';
        card.querySelector('.spec-sto').textContent          = m.storage ? m.storage + ' Go' : '—';
        card.querySelector('.spec-gpu').textContent          = m.gpu_memory ? m.gpu_memory + ' Go' : 'Intégré';
        card.querySelector('.card-price').textContent        = fcfa(m.price);
        card.querySelector('.card-chip').textContent         = m.brand || '';

        grid.appendChild(card);
    });
}

// ── Filters ───────────────────────────────────────────────────────────────────
function renderFilters(brands) {
    const wrap = document.querySelector('.storefront-filters');
    if (!wrap) return;

    // Keep "Tous" button, rebuild brand buttons
    wrap.querySelectorAll('[data-brand]:not([data-brand="all"])').forEach(b => b.remove());

    brands.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.brand = b.brand;
        btn.textContent = b.brand;
        btn.addEventListener('click', () => filterByBrand(b.brand, btn));
        wrap.appendChild(btn);
    });

    // "Tous" handler
    const allBtn = wrap.querySelector('[data-brand="all"]');
    allBtn?.addEventListener('click', () => filterByBrand('all', allBtn));
}

function filterByBrand(brand, clickedBtn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    clickedBtn.classList.add('active');
    const filtered = brand === 'all' ? allMachines : allMachines.filter(m => m.brand === brand);
    renderStorefront(filtered);
}

// ── Hero Stats ────────────────────────────────────────────────────────────────
function updateHeroStats(machines, stats) {
    const tot = document.getElementById('hTotalMachines');
    const br  = document.getElementById('hBrands');
    const avg = document.getElementById('hAvgPrice');
    if (tot) tot.textContent = machines.length;
    if (br)  br.textContent  = stats.brands.length;
    if (avg) {
        const a = machines.reduce((s, m) => s + m.price, 0) / (machines.length || 1);
        avg.textContent = new Intl.NumberFormat('fr-FR').format(Math.round(a)) + ' F';
    }
}

// ── Live search (storefront) ──────────────────────────────────────────────────
function initSearch() {
    document.getElementById('storeSearch')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        renderStorefront(q ? allMachines.filter(m =>
            (m.name  || '').toLowerCase().includes(q) ||
            (m.brand || '').toLowerCase().includes(q) ||
            (m.cpu   || '').toLowerCase().includes(q)
        ) : allMachines);
    });

    document.getElementById('searchInput')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        renderTable(q ? allMachines.filter(m =>
            (m.name         || '').toLowerCase().includes(q) ||
            (m.brand        || '').toLowerCase().includes(q) ||
            (m.serial_number|| '').toLowerCase().includes(q) ||
            (m.cpu          || '').toLowerCase().includes(q)
        ) : allMachines);
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN — Table
// ═══════════════════════════════════════════════════════════════════════════════
function renderTable(machines) {
    const tbody = document.getElementById('tableBody');
    const cnt   = document.getElementById('invCount');
    if (!tbody) return;

    if (cnt) cnt.textContent = `${machines.length} machine${machines.length !== 1 ? 's' : ''} affichée${machines.length !== 1 ? 's' : ''}`;

    tbody.innerHTML = '';

    if (!machines.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 9;
        td.style.cssText = 'text-align:center;color:#94a3b8;padding:2.5rem';
        td.textContent = 'Aucune machine trouvée';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    machines.forEach(m => {
        const statusClass = 's-' + (m.status || '').toLowerCase()
            .replace(/\s/g, '-')
            .replace(/é/g, 'e')
            .replace(/è/g, 'e')
            .replace(/ê/g, 'e');

        const tr = document.createElement('tr');

        // Build cells with textContent (XSS protection)
        const cells = [
            { cls: '', html: false },   // model (special)
            { val: m.brand },
            { val: m.cpu },
            { val: m.ram    ? m.ram    + ' Go' : '—', mono: true },
            { val: m.storage ? m.storage + ' Go' : '—', mono: true },
            { val: m.gpu_memory ? m.gpu_memory + ' Go' : 'Intégré', mono: true },
            { val: fcfa(m.price), mono: true, bold: true },
            { cls: 'status' },          // status badge (special)
            { cls: 'actions' },         // actions (special)
        ];

        // Model cell
        const tdModel = document.createElement('td');
        const nameEl  = document.createElement('div');
        nameEl.className = 'td-name';
        nameEl.textContent = m.name;
        const cpuEl  = document.createElement('div');
        cpuEl.className = 'td-cpu';
        cpuEl.textContent = m.cpu || '';
        tdModel.appendChild(nameEl);
        tdModel.appendChild(cpuEl);
        tr.appendChild(tdModel);

        // Brand
        const tdBrand = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'badge-b';
        badge.textContent = m.brand;
        tdBrand.appendChild(badge);
        tr.appendChild(tdBrand);

        // CPU
        const tdCpu = document.createElement('td');
        tdCpu.textContent = m.cpu || '—';
        tr.appendChild(tdCpu);

        // RAM
        const tdRam = document.createElement('td');
        tdRam.className = 'spec-cell';
        tdRam.textContent = m.ram ? m.ram + ' Go' : '—';
        tr.appendChild(tdRam);

        // Storage
        const tdSto = document.createElement('td');
        tdSto.className = 'spec-cell';
        tdSto.textContent = m.storage ? m.storage + ' Go' : '—';
        tr.appendChild(tdSto);

        // GPU
        const tdGpu = document.createElement('td');
        tdGpu.className = 'spec-cell';
        tdGpu.textContent = m.gpu_memory ? m.gpu_memory + ' Go' : 'Intégré';
        tr.appendChild(tdGpu);

        // Price
        const tdPrice = document.createElement('td');
        tdPrice.className = 'spec-cell';
        tdPrice.style.fontWeight = '700';
        tdPrice.style.color = 'var(--primary)';
        tdPrice.textContent = fcfa(m.price);
        tr.appendChild(tdPrice);

        // Status badge
        const tdStatus = document.createElement('td');
        const sBadge = document.createElement('span');
        sBadge.className = 'badge-s ' + statusClass;
        sBadge.textContent = m.status;
        tdStatus.appendChild(sBadge);
        tr.appendChild(tdStatus);

        // Action buttons
        const tdAct  = document.createElement('td');
        const aWrap  = document.createElement('div');
        aWrap.className = 'action-btns';

        const editBtn = document.createElement('button');
        editBtn.className = 'act-btn';
        editBtn.title = 'Modifier';
        editBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        editBtn.addEventListener('click', e => { e.stopPropagation(); openModalForEdit(m); });

        const delBtn = document.createElement('button');
        delBtn.className = 'act-btn del';
        delBtn.title = 'Supprimer';
        delBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>';
        delBtn.addEventListener('click', e => { e.stopPropagation(); openDeleteModal(m); });

        aWrap.appendChild(editBtn);
        aWrap.appendChild(delBtn);
        tdAct.appendChild(aWrap);
        tr.appendChild(tdAct);

        tbody.appendChild(tr);
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN — KPIs
// ═══════════════════════════════════════════════════════════════════════════════
function updateKPIs(machines, stats) {
    const setKPI = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    setKPI('kpiTotal', machines.length);
    const total = machines.reduce((s, m) => s + m.price, 0);
    setKPI('kpiValue', new Intl.NumberFormat('fr-FR').format(total) + ' F');
    if (stats.brands.length) {
        const top = stats.brands.reduce((a, b) => a.count > b.count ? a : b);
        setKPI('kpiBrand', top.brand);
    }
    const inStock = machines.filter(m => m.status === 'En stock').length;
    const rate = machines.length ? Math.round(inStock / machines.length * 100) : 100;
    setKPI('kpiAvail', rate + '%');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN — Charts (dashboard)
// ═══════════════════════════════════════════════════════════════════════════════
const BASE_OPTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: { boxWidth:10, padding:14, font:{ size:11, family:"'DM Sans',sans-serif", weight:'600' }, color:'#475569' }
        }
    }
};

function renderAdminCharts(stats) {
    // Brand Doughnut
    const bCtx = document.getElementById('brandChart')?.getContext('2d');
    if (bCtx) {
        brandChart?.destroy();
        brandChart = new Chart(bCtx, {
            type:'doughnut',
            data:{
                labels: stats.brands.map(b => b.brand),
                datasets:[{ data: stats.brands.map(b => b.count), backgroundColor:PALETTE, borderWidth:3, borderColor:'#fff' }]
            },
            options:{ ...BASE_OPTS, cutout:'72%' }
        });
    }

    // Status Doughnut
    const sCtx = document.getElementById('statusChart')?.getContext('2d');
    if (sCtx) {
        statusChart?.destroy();
        statusChart = new Chart(sCtx, {
            type:'doughnut',
            data:{
                labels: stats.status_distribution.map(s => s.status),
                datasets:[{ data:stats.status_distribution.map(s => s.count), backgroundColor:['#10b981','#2563eb','#f59e0b','#94a3b8'], borderWidth:3, borderColor:'#fff' }]
            },
            options:{ ...BASE_OPTS, cutout:'68%' }
        });
    }

    // RAM Bar
    const rCtx = document.getElementById('ramChart')?.getContext('2d');
    if (rCtx) {
        ramChart?.destroy();
        ramChart = new Chart(rCtx, {
            type:'bar',
            data:{
                labels: stats.ram_distribution.map(r => r.ram + ' Go'),
                datasets:[{ label:'Machines', data:stats.ram_distribution.map(r => r.count), backgroundColor:PALETTE.map(c=>c+'cc'), borderColor:PALETTE, borderWidth:1.5, borderRadius:6, borderSkipped:false }]
            },
            options:{ ...BASE_OPTS, scales:{ y:{ beginAtZero:true, grid:{color:'#f1f5f9'}, ticks:{stepSize:1,color:'#94a3b8',font:{size:11}} }, x:{ grid:{display:false}, ticks:{color:'#94a3b8',font:{size:11}} } }, plugins:{ ...BASE_OPTS.plugins, legend:{display:false} } }
        });
    }

    // Avg Price Horizontal Bar
    const pCtx = document.getElementById('avgPriceChart')?.getContext('2d');
    if (pCtx) {
        avgPriceChart?.destroy();
        const sorted = [...stats.brands].sort((a,b) => b.avg_price - a.avg_price);
        avgPriceChart = new Chart(pCtx, {
            type:'bar',
            data:{
                labels: sorted.map(b => b.brand),
                datasets:[{ label:'Prix moyen', data:sorted.map(b => Math.round(b.avg_price)), backgroundColor:PALETTE.map(c=>c+'bb'), borderColor:PALETTE, borderWidth:1.5, borderRadius:5, borderSkipped:false }]
            },
            options:{
                indexAxis:'y', ...BASE_OPTS,
                scales:{
                    x:{ ticks:{ callback:v => new Intl.NumberFormat('fr-FR').format(v)+' F', font:{size:10}, color:'#94a3b8' }, grid:{color:'#f1f5f9'} },
                    y:{ ticks:{ font:{size:11}, color:'#475569' }, grid:{display:false} }
                },
                plugins:{ ...BASE_OPTS.plugins, legend:{display:false} }
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MARKET ANALYSIS — Regression Chart
// ═══════════════════════════════════════════════════════════════════════════════
async function loadRegressionChart() {
    try {
        const res  = await fetch('/api/regression');
        const data = await res.json();

        if (data.error) {
            showToast(data.error, true);
            return;
        }

        // Update stat badges
        const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setText('statA',  new Intl.NumberFormat('fr-FR').format(data.a));
        setText('statB',  new Intl.NumberFormat('fr-FR').format(Math.round(data.b)));
        setText('statR2', (data.r2 * 100).toFixed(1) + '%');
        setText('statN',  data.n);
        setText('r2Badge', 'R² = ' + data.r2.toFixed(4));

        const sub = document.getElementById('regressionSub');
        if (sub) sub.textContent = `Prix = ${new Intl.NumberFormat('fr-FR').format(data.a)} × RAM + ${new Intl.NumberFormat('fr-FR').format(Math.round(data.b))} FCFA · n = ${data.n} machines`;

        // Chart
        const ctx = document.getElementById('regressionChart')?.getContext('2d');
        if (!ctx) return;
        regressionChart?.destroy();

        regressionChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Machines (données réelles)',
                        type: 'scatter',
                        data: data.scatter,
                        backgroundColor: 'rgba(37,99,235,.55)',
                        borderColor: 'rgba(37,99,235,.8)',
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        borderWidth: 1.5
                    },
                    {
                        label: `Droite de régression (R²=${data.r2.toFixed(3)})`,
                        type: 'line',
                        data: data.line,
                        borderColor: '#ef4444',
                        borderWidth: 2.5,
                        pointRadius: 0,
                        fill: false,
                        tension: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display:true, text:'RAM (Go)', font:{size:12,weight:'700'}, color:'#475569' },
                        ticks: { color:'#94a3b8', font:{size:11} },
                        grid:  { color:'#f1f5f9' }
                    },
                    y: {
                        title: { display:true, text:'Prix (FCFA)', font:{size:12,weight:'700'}, color:'#475569' },
                        ticks: { callback: v => new Intl.NumberFormat('fr-FR').format(v)+' F', color:'#94a3b8', font:{size:11} },
                        grid:  { color:'#f1f5f9' }
                    }
                },
                plugins: {
                    legend: { position:'top', labels:{font:{size:12},padding:20} },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                if (ctx.dataset.type === 'scatter')
                                    return ` RAM: ${ctx.parsed.x} Go — Prix: ${new Intl.NumberFormat('fr-FR').format(ctx.parsed.y)} FCFA`;
                                return ` Régression: ${new Intl.NumberFormat('fr-FR').format(Math.round(ctx.parsed.y))} FCFA`;
                            }
                        }
                    }
                }
            }
        });

    } catch (err) {
        console.error('Regression error:', err);
        showToast('Erreur lors du calcul de régression', true);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PREDICTOR UI
// ═══════════════════════════════════════════════════════════════════════════════
function initPredictorUI() {
    // RAM quick-select buttons
    document.querySelectorAll('.ram-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ram-opt').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const inp = document.getElementById('ramCustom');
            if (inp) inp.value = btn.dataset.val;
        });
    });

    document.getElementById('btnPredict')?.addEventListener('click', runPrediction);
}

async function runPrediction() {
    const ram = parseFloat(document.getElementById('ramCustom')?.value || 8);
    if (!ram || ram <= 0) { showToast('Veuillez saisir une valeur de RAM valide', true); return; }

    const btn = document.getElementById('btnPredict');
    if (btn) { btn.disabled = true; btn.textContent = 'Calcul en cours...'; }

    try {
        const res  = await fetch(`/api/predict?ram=${ram}`);
        const data = await res.json();

        if (data.error) { showToast(data.error, true); return; }

        const panel = document.getElementById('predictorResult');
        if (!panel) return;

        // Build result DOM safely (XSS protection via textContent)
        panel.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'result-content';

        const lbl = document.createElement('p');
        lbl.className = 'result-ram';
        lbl.textContent = `Pour ${data.ram} Go de RAM`;

        const price = document.createElement('div');
        price.className = 'result-price';
        price.textContent = new Intl.NumberFormat('fr-FR').format(data.predicted_price) + ' FCFA';

        const formula = document.createElement('div');
        formula.className = 'result-formula';
        formula.textContent = data.formula;

        const r2el = document.createElement('p');
        r2el.className = 'result-r2';
        r2el.textContent = `Coefficient R² = ${(data.r2 * 100).toFixed(1)}%`;

        // Interpretation
        const interp = document.createElement('div');
        interp.className = 'result-interpretation';
        let msg = '';
        if (data.r2 >= 0.7)       msg = `✅ Modèle fiable (R²=${(data.r2*100).toFixed(0)}%). La RAM explique bien le prix sur ce marché.`;
        else if (data.r2 >= 0.4)  msg = `⚠️ Modèle modéré (R²=${(data.r2*100).toFixed(0)}%). D'autres facteurs (CPU, GPU, marque) influencent aussi le prix.`;
        else                       msg = `ℹ️ Modèle faible (R²=${(data.r2*100).toFixed(0)}%). Le prix dépend fortement d'autres caractéristiques.`;
        interp.textContent = msg;

        div.appendChild(lbl);
        div.appendChild(price);
        div.appendChild(formula);
        div.appendChild(r2el);
        div.appendChild(interp);
        panel.appendChild(div);

    } catch (err) {
        showToast('Erreur de prédiction', true);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="13 2 13 9 20 9"/><path d="M21 2l-9 9"/><path d="M3 15v4a2 2 0 0 0 2 2h4"/><path d="M13 22l9-9-4-4"/></svg> Calculer le prix prédit'; }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CRUD FORM
// ═══════════════════════════════════════════════════════════════════════════════
function initForm() {
    const overlay = document.getElementById('formModalOverlay');
    document.getElementById('closeFormModal')?.addEventListener('click', () => closeModal('formModalOverlay'));
    document.getElementById('cancelForm')?.addEventListener('click',     () => closeModal('formModalOverlay'));
    overlay?.addEventListener('click', e => { if (e.target === overlay) closeModal('formModalOverlay'); });

    document.getElementById('machineForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const id  = document.getElementById('editId').value;
        const btn = document.getElementById('submitBtn');
        const txt = document.getElementById('submitBtnText');
        btn.disabled = true;
        if (txt) txt.textContent = 'Traitement...';

        const data = {
            name:          document.getElementById('fname').value,
            brand:         document.getElementById('fbrand').value,
            serial_number: document.getElementById('fserial').value,
            status:        document.getElementById('fstatus').value,
            location:      document.getElementById('flocation').value,
            price:         document.getElementById('fprice').value,
            cpu:           document.getElementById('fcpu').value,
            ram:           document.getElementById('fram').value,
            storage:       document.getElementById('fstorage').value,
            gpu_memory:    document.getElementById('fgpu').value,
            notes:         document.getElementById('fnotes').value
        };

        try {
            const res = await fetch(id ? `/api/machines/${id}` : '/api/machines', {
                method: id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                closeModal('formModalOverlay');
                showToast(id ? 'Machine mise à jour !' : 'Machine ajoutée !');
                fetchData();
            } else {
                const err = await res.json();
                showToast('Erreur : ' + (err.error || 'inconnue'), true);
            }
        } catch { showToast('Erreur de connexion', true); }
        finally {
            btn.disabled = false;
            if (txt) txt.textContent = 'Enregistrer';
        }
    });
}

function openModalForAdd() {
    document.getElementById('editId').value = '';
    const t = document.getElementById('modalTitle');
    if (t) t.textContent = 'Ajouter une machine';
    document.getElementById('machineForm').reset();
    openModal('formModalOverlay');
}

function openModalForEdit(m) {
    document.getElementById('editId').value    = m.id;
    const t = document.getElementById('modalTitle');
    if (t) t.textContent = 'Modifier la machine';
    document.getElementById('fname').value     = m.name    || '';
    document.getElementById('fbrand').value    = m.brand   || '';
    document.getElementById('fserial').value   = m.serial_number || '';
    document.getElementById('fstatus').value   = m.status  || 'En stock';
    document.getElementById('flocation').value = m.location|| '';
    document.getElementById('fprice').value    = m.price   || '';
    document.getElementById('fcpu').value      = m.cpu     || '';
    document.getElementById('fram').value      = m.ram     || '';
    document.getElementById('fstorage').value  = m.storage || '';
    document.getElementById('fgpu').value      = m.gpu_memory || 0;
    document.getElementById('fnotes').value    = m.notes   || '';
    openModal('formModalOverlay');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE
// ═══════════════════════════════════════════════════════════════════════════════
function initDeleteModal() {
    document.getElementById('cancelDelete')?.addEventListener('click',  () => closeModal('deleteModalOverlay'));
    document.getElementById('confirmDelete')?.addEventListener('click', async () => {
        if (!deleteTargetId) return;
        try {
            const res = await fetch(`/api/machines/${deleteTargetId}`, { method:'DELETE' });
            if (res.ok) {
                closeModal('deleteModalOverlay');
                showToast('Machine supprimée !');
                fetchData();
            } else {
                const err = await res.json();
                showToast('Erreur : ' + (err.error||''), true);
            }
        } catch { showToast('Erreur de connexion', true); }
        deleteTargetId = null;
    });
}

function openDeleteModal(m) {
    deleteTargetId = m.id;
    const el = document.getElementById('deleteTarget');
    if (el) el.textContent = m.name;
    openModal('deleteModalOverlay');
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

// ═══════════════════════════════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════════════════════════════
function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMsg');
    if (msgEl) msgEl.textContent = msg;
    toast?.classList.toggle('error', isError);
    toast?.classList.add('visible');
    setTimeout(() => toast?.classList.remove('visible'), 3200);
}
