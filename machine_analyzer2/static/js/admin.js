/* ════════════════════════════════════════════════
   STARTECH — admin.js
   ════════════════════════════════════════════════ */
'use strict';

let allMachines    = [];
let deleteTargetId = null;
let charts         = {};
const PALETTE = ['#2563eb','#0ea5e9','#10b981','#f59e0b','#6366f1','#ec4899','#14b8a6','#f97316','#8b5cf6','#06b6d4'];

const fcfa = v => new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' FCFA';
const numFmt = v => new Intl.NumberFormat('fr-FR').format(Math.round(v));

// ════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const d = new Date();
    const dateEl = document.getElementById('dashDate');
    if (dateEl) dateEl.textContent = 'Parc au ' + d.toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    initNav();
    fetchAll();
    initForm();
    initDeleteModal();
    initSearch();
    initLogout();

    document.getElementById('exportBtn')?.addEventListener('click', () => {
        window.location.href = '/api/export/excel';
    });
    document.getElementById('addBtn')?.addEventListener('click', openAdd);
});

// ── Navigation ────────────────────────────────────────────────────
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
            if (view === 'dashboard') setTimeout(resizeCharts, 60);
        });
    });
}
function resizeCharts() { Object.values(charts).forEach(c => c?.resize()); }

function initLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method:'POST' });
        window.location.href = '/login';
    });
}

// ════════════════════════════════════════════════
//  DATA
// ════════════════════════════════════════════════
async function fetchAll() {
    try {
        const [mr, sr] = await Promise.all([fetch('/api/machines'), fetch('/api/stats')]);
        if (mr.status === 401) { window.location.href = '/login'; return; }
        allMachines = await mr.json();
        const stats = await sr.json();
        updateKPIs(allMachines, stats);
        renderCharts(stats);
        renderTable(allMachines);
    } catch { showToast('Erreur de connexion', true); }
}

// ── KPIs ──────────────────────────────────────────────────────────
function updateKPIs(machines, stats) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    // Modèles distincts
    set('kpiModels', machines.length);

    // Total unités en stock
    const totalUnits = machines.reduce((s, m) => s + (m.quantity || 1), 0);
    set('kpiUnits', totalUnits);

    // Valeur totale (prix × quantité)
    const totalValue = machines.reduce((s, m) => s + m.price * (m.quantity || 1), 0);
    set('kpiValue', numFmt(totalValue) + ' F');

    // Marque dominante
    if (stats.brands.length) {
        const top = stats.brands.reduce((a, b) => a.count > b.count ? a : b);
        set('kpiBrand', top.brand);
    }

    // Disponibilité
    const inStock = machines.filter(m => m.status === 'En stock').length;
    const rate = machines.length ? Math.round(inStock / machines.length * 100) : 100;
    set('kpiAvail', rate + '%');

    // Stock moyen par modèle
    const avgQty = machines.length ? (totalUnits / machines.length).toFixed(1) : '—';
    set('kpiAvgQty', avgQty + ' u.');

    // Stock summary in toolbar
    const summary = document.getElementById('stockSummary');
    if (summary) {
        summary.textContent = `${machines.length} modèle(s) · ${totalUnits} unité(s) · Valeur : ${numFmt(totalValue)} FCFA`;
    }
}

// ── Charts ────────────────────────────────────────────────────────
const BASE_OPTS = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position:'bottom', labels:{ boxWidth:10, padding:14, font:{ size:11, family:"'DM Sans',sans-serif", weight:'600' }, color:'#475569' } } }
};

function renderCharts(stats) {
    const make = (id, config) => {
        const ctx = document.getElementById(id)?.getContext('2d');
        if (!ctx) return;
        charts[id]?.destroy();
        charts[id] = new Chart(ctx, config);
    };

    make('brandChart', {
        type: 'doughnut',
        data: { labels: stats.brands.map(b => b.brand), datasets:[{ data:stats.brands.map(b=>b.count), backgroundColor:PALETTE, borderWidth:3, borderColor:'#fff' }] },
        options: { ...BASE_OPTS, cutout:'72%' }
    });

    make('statusChart', {
        type: 'doughnut',
        data: { labels: stats.status_distribution.map(s=>s.status), datasets:[{ data:stats.status_distribution.map(s=>s.count), backgroundColor:['#10b981','#2563eb','#f59e0b','#94a3b8'], borderWidth:3, borderColor:'#fff' }] },
        options: { ...BASE_OPTS, cutout:'68%' }
    });

    make('ramChart', {
        type: 'bar',
        data: {
            labels: stats.ram_distribution.map(r=>r.ram+' Go'),
            datasets:[{ label:'Modèles', data:stats.ram_distribution.map(r=>r.count), backgroundColor:PALETTE.map(c=>c+'cc'), borderColor:PALETTE, borderWidth:1.5, borderRadius:6, borderSkipped:false }]
        },
        options: { ...BASE_OPTS, scales:{ y:{ beginAtZero:true, grid:{color:'#f1f5f9'}, ticks:{stepSize:1,color:'#94a3b8',font:{size:11}} }, x:{ grid:{display:false}, ticks:{color:'#94a3b8',font:{size:11}} } }, plugins:{ ...BASE_OPTS.plugins, legend:{display:false} } }
    });

    const sorted = [...stats.brands].sort((a,b) => b.avg_price - a.avg_price);
    make('avgPriceChart', {
        type: 'bar',
        data: {
            labels: sorted.map(b=>b.brand),
            datasets:[{ label:'Prix moyen', data:sorted.map(b=>Math.round(b.avg_price)), backgroundColor:PALETTE.map(c=>c+'bb'), borderColor:PALETTE, borderWidth:1.5, borderRadius:5, borderSkipped:false }]
        },
        options: {
            indexAxis:'y', ...BASE_OPTS,
            scales: {
                x:{ ticks:{ callback:v=>numFmt(v)+' F', font:{size:10}, color:'#94a3b8' }, grid:{color:'#f1f5f9'} },
                y:{ ticks:{ font:{size:11}, color:'#475569' }, grid:{display:false} }
            },
            plugins:{ ...BASE_OPTS.plugins, legend:{display:false} }
        }
    });
}

// ── Table ─────────────────────────────────────────────────────────
function initSearch() {
    document.getElementById('searchInput')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        renderTable(q ? allMachines.filter(m =>
            (m.name||'').toLowerCase().includes(q) ||
            (m.brand||'').toLowerCase().includes(q) ||
            (m.serial_number||'').toLowerCase().includes(q) ||
            (m.cpu||'').toLowerCase().includes(q)
        ) : allMachines);
    });
}

function renderTable(machines) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!machines.length) {
        const tr = tbody.insertRow();
        const td = tr.insertCell();
        td.colSpan = 11;
        td.style.cssText = 'text-align:center;color:#94a3b8;padding:2.5rem;';
        td.textContent = 'Aucune machine trouvée';
        return;
    }

    machines.forEach(m => {
        const qty        = m.quantity || 1;
        const stockVal   = m.price * qty;
        const statusCls  = 's-' + (m.status||'').toLowerCase().replace(/\s/g,'-').replace(/[éè]/g,'e');
        const tr         = document.createElement('tr');

        // Modèle
        const tdName = document.createElement('td');
        const nameD  = document.createElement('div');
        nameD.className = 'td-name';
        nameD.textContent = m.name;
        const cpuD = document.createElement('div');
        cpuD.className = 'td-cpu';
        cpuD.textContent = m.cpu || '';
        tdName.appendChild(nameD);
        tdName.appendChild(cpuD);
        tr.appendChild(tdName);

        // Marque
        const tdBrand = document.createElement('td');
        const bBadge  = document.createElement('span');
        bBadge.className = 'badge-b';
        bBadge.textContent = m.brand;
        tdBrand.appendChild(bBadge);
        tr.appendChild(tdBrand);

        // CPU (génération)
        const tdCpu = document.createElement('td');
        tdCpu.textContent = m.cpu_gen || m.cpu || '—';
        tr.appendChild(tdCpu);

        // RAM
        const tdRam = document.createElement('td');
        tdRam.className = 'spec-cell';
        tdRam.textContent = m.ram ? m.ram + ' Go' : '—';
        tr.appendChild(tdRam);

        // Stockage
        const tdSto = document.createElement('td');
        tdSto.className = 'spec-cell';
        tdSto.textContent = m.storage ? m.storage + ' Go' : '—';
        tr.appendChild(tdSto);

        // GPU
        const tdGpu = document.createElement('td');
        tdGpu.className = 'spec-cell';
        tdGpu.textContent = m.gpu_memory ? m.gpu_memory + ' Go' : 'Int.';
        tr.appendChild(tdGpu);

        // Quantité — mise en rouge si = 0
        const tdQty = document.createElement('td');
        tdQty.className = 'qty-cell' + (qty === 0 ? ' qty-low' : '');
        tdQty.textContent = qty;
        tr.appendChild(tdQty);

        // Prix unitaire
        const tdPrice = document.createElement('td');
        tdPrice.className = 'spec-cell';
        tdPrice.style.fontWeight = '700';
        tdPrice.style.color = 'var(--primary)';
        tdPrice.textContent = fcfa(m.price);
        tr.appendChild(tdPrice);

        // Valeur stock = prix × qté
        const tdVal = document.createElement('td');
        tdVal.className = 'val-cell';
        tdVal.textContent = numFmt(stockVal) + ' F';
        tr.appendChild(tdVal);

        // Statut
        const tdStat = document.createElement('td');
        const sBadge = document.createElement('span');
        sBadge.className = 'badge-s ' + statusCls;
        sBadge.textContent = m.status;
        tdStat.appendChild(sBadge);
        tr.appendChild(tdStat);

        // Actions
        const tdAct  = document.createElement('td');
        const aWrap  = document.createElement('div');
        aWrap.className = 'action-btns';

        const editBtn = document.createElement('button');
        editBtn.className = 'act-btn';
        editBtn.title = 'Modifier';
        editBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        editBtn.addEventListener('click', () => openEdit(m));

        const delBtn = document.createElement('button');
        delBtn.className = 'act-btn del';
        delBtn.title = 'Supprimer';
        delBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>';
        delBtn.addEventListener('click', () => openDelete(m));

        aWrap.appendChild(editBtn);
        aWrap.appendChild(delBtn);
        tdAct.appendChild(aWrap);
        tr.appendChild(tdAct);

        tbody.appendChild(tr);
    });
}

// ════════════════════════════════════════════════
//  FORM — ADD / EDIT
// ════════════════════════════════════════════════
function initForm() {
    const overlay = document.getElementById('formOverlay');
    document.getElementById('closeForm')?.addEventListener('click',  () => closeModal('formOverlay'));
    document.getElementById('cancelForm')?.addEventListener('click', () => closeModal('formOverlay'));
    overlay?.addEventListener('click', e => { if (e.target === overlay) closeModal('formOverlay'); });

    // Valeur stock live preview
    const calcVal = () => {
        const price = parseFloat(document.getElementById('fprice')?.value || 0);
        const qty   = parseInt(document.getElementById('fqty')?.value   || 1);
        const el    = document.getElementById('valeurStock');
        if (el) el.textContent = (!isNaN(price) && !isNaN(qty))
            ? numFmt(price * qty) + ' FCFA'
            : '— FCFA';
    };
    document.getElementById('fprice')?.addEventListener('input', calcVal);
    document.getElementById('fqty')?.addEventListener('input',   calcVal);

    // Image picker
    const imgInput  = document.getElementById('fimage');
    const preview   = document.getElementById('uploadPreview');
    const removeBtn = document.getElementById('btnRemoveImg');

    document.getElementById('btnChooseImg')?.addEventListener('click', () => imgInput?.click());

    imgInput?.addEventListener('change', () => {
        const file = imgInput.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Image trop lourde (max 5 Mo)', true); imgInput.value = ''; return; }
        const reader = new FileReader();
        reader.onload = () => {
            if (!preview) return;
            preview.innerHTML = '';
            const img = document.createElement('img');
            img.src = reader.result;
            preview.appendChild(img);
            removeBtn?.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    });

    removeBtn?.addEventListener('click', () => {
        if (imgInput) imgInput.value = '';
        if (preview) {
            preview.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p>Cliquez ou glissez une image</p><span>JPG, PNG, WebP · max 5 Mo</span>';
        }
        removeBtn.classList.add('hidden');
    });

    // Submit
    document.getElementById('machineForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const id  = document.getElementById('editId').value;
        const btn = document.getElementById('submitBtn');
        const txt = document.getElementById('submitTxt');
        btn.disabled = true;
        if (txt) txt.textContent = 'Enregistrement…';

        const payload = {
            name:          document.getElementById('fname').value,
            brand:         document.getElementById('fbrand').value,
            serial_number: document.getElementById('fserial').value,
            status:        document.getElementById('fstatus').value,
            location:      document.getElementById('flocation').value,
            quantity:      parseInt(document.getElementById('fqty').value || 1),
            price:         parseFloat(document.getElementById('fprice').value),
            cpu:           document.getElementById('fcpu').value,
            cpu_gen:       document.getElementById('fcpugen').value,
            cpu_speed:     parseFloat(document.getElementById('fcpuspeed').value || 0),
            ram:           parseInt(document.getElementById('fram').value || 0),
            storage:       parseInt(document.getElementById('fstorage').value || 0),
            gpu_memory:    parseInt(document.getElementById('fgpu').value || 0),
            notes:         document.getElementById('fnotes').value
        };

        try {
            const res = await fetch(id ? `/api/machines/${id}` : '/api/machines', {
                method:  id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) { showToast(data.error || 'Erreur', true); return; }

            // Upload image if chosen
            const newId   = id || (await (await fetch('/api/machines')).json())[0]?.id;
            const imgFile = document.getElementById('fimage')?.files[0];
            if (imgFile && newId) {
                const fd = new FormData();
                fd.append('image', imgFile);
                await fetch(`/api/machines/${newId}/image`, { method:'POST', body:fd });
            }

            closeModal('formOverlay');
            showToast(id ? 'Machine mise à jour !' : 'Machine ajoutée !');
            fetchAll();
        } catch { showToast('Erreur de connexion', true); }
        finally { btn.disabled = false; if (txt) txt.textContent = 'Enregistrer'; }
    });
}

function openAdd() {
    const titleEl = document.getElementById('modalTitle');
    if (titleEl) titleEl.textContent = 'Ajouter une machine';
    document.getElementById('editId').value = '';
    document.getElementById('machineForm').reset();
    document.getElementById('valeurStock').textContent = '— FCFA';
    document.getElementById('imageBlock').style.display = 'block';
    document.getElementById('uploadPreview').innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p>Cliquez ou glissez une image</p><span>JPG, PNG, WebP · max 5 Mo</span>';
    document.getElementById('btnRemoveImg')?.classList.add('hidden');
    document.getElementById('fqty').value = 1;
    openModal('formOverlay');
}

function openEdit(m) {
    const titleEl = document.getElementById('modalTitle');
    if (titleEl) titleEl.textContent = 'Modifier la machine';
    document.getElementById('editId').value    = m.id;
    document.getElementById('fname').value     = m.name || '';
    document.getElementById('fbrand').value    = m.brand || '';
    document.getElementById('fserial').value   = m.serial_number || '';
    document.getElementById('fstatus').value   = m.status || 'En stock';
    document.getElementById('flocation').value = m.location || '';
    document.getElementById('fqty').value      = m.quantity || 1;
    document.getElementById('fprice').value    = m.price || '';
    document.getElementById('fcpu').value      = m.cpu || '';
    document.getElementById('fcpugen').value   = m.cpu_gen || '';
    document.getElementById('fcpuspeed').value = m.cpu_speed || '';
    document.getElementById('fram').value      = m.ram || '';
    document.getElementById('fstorage').value  = m.storage || '';
    document.getElementById('fgpu').value      = m.gpu_memory || 0;
    document.getElementById('fnotes').value    = m.notes || '';

    const stockEl = document.getElementById('valeurStock');
    if (stockEl) stockEl.textContent = numFmt(m.price * (m.quantity || 1)) + ' FCFA';

    // Show image section with current preview
    const imgBlock   = document.getElementById('imageBlock');
    const preview    = document.getElementById('uploadPreview');
    const removeBtn  = document.getElementById('btnRemoveImg');
    if (imgBlock) imgBlock.style.display = 'block';
    if (preview) {
        if (m.image_path) {
            preview.innerHTML = '';
            const img = document.createElement('img');
            img.src = m.image_path;
            preview.appendChild(img);
            removeBtn?.classList.remove('hidden');
        } else {
            preview.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p>Cliquez ou glissez une image</p><span>JPG, PNG, WebP · max 5 Mo</span>';
            removeBtn?.classList.add('hidden');
        }
    }

    openModal('formOverlay');
}

// ════════════════════════════════════════════════
//  DELETE
// ════════════════════════════════════════════════
function initDeleteModal() {
    document.getElementById('cancelDelete')?.addEventListener('click',  () => closeModal('deleteOverlay'));
    document.getElementById('confirmDelete')?.addEventListener('click', async () => {
        if (!deleteTargetId) return;
        try {
            const res = await fetch(`/api/machines/${deleteTargetId}`, { method:'DELETE' });
            if (res.ok) {
                closeModal('deleteOverlay');
                showToast('Machine supprimée !');
                fetchAll();
            } else {
                const err = await res.json();
                showToast(err.error || 'Erreur', true);
            }
        } catch { showToast('Erreur de connexion', true); }
        deleteTargetId = null;
    });
}

function openDelete(m) {
    deleteTargetId = m.id;
    const t = document.getElementById('deleteTarget');
    const q = document.getElementById('deleteQty');
    if (t) t.textContent = m.name;
    if (q) q.textContent = m.quantity || 1;
    openModal('deleteOverlay');
}

// ── Modal helpers ─────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

// ── Toast ─────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
    const t   = document.getElementById('toast');
    const mel = document.getElementById('toastMsg');
    if (mel) mel.textContent = msg;
    t?.classList.toggle('error',   isError);
    t?.classList.toggle('success', !isError);
    t?.classList.add('visible');
    setTimeout(() => t?.classList.remove('visible'), 3200);
}
