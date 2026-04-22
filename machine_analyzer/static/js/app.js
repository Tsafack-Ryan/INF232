let brandChart = null;
let statusChart = null;
let ramChart = null;
let avgPriceChart = null;
let allMachines = [];
let deleteTargetId = null;

const COLORS = [
    '#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1',
    '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4'
];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').innerText =
        new Date().toLocaleDateString('fr-FR', options);

    initNavigation();
    fetchData();
    initForm();
    initDetailPanel();
    initDeleteModal();

    document.getElementById('exportBtn').addEventListener('click', () => {
        window.location.href = '/api/export';
    });

    document.getElementById('addNewBtn').addEventListener('click', () => {
        openModalForAdd();
    });

    document.getElementById('searchInput').addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        const filtered = allMachines.filter(m =>
            m.name.toLowerCase().includes(q) ||
            m.brand.toLowerCase().includes(q) ||
            (m.serial_number && m.serial_number.toLowerCase().includes(q)) ||
            (m.cpu && m.cpu.toLowerCase().includes(q))
        );
        updateTable(filtered);
    });
});

// ===== NAVIGATION =====
function initNavigation() {
    const navLinks = document.querySelectorAll('#sidebar-nav a');

    const views = {
        dashboard: {
            el: document.getElementById('dashboard-view'),
            title: 'Tableau de bord',
            breadcrumb: 'Accueil / Tableau de bord',
            headerActions: 'none'
        },
        inventory: {
            el: document.getElementById('inventory-view'),
            title: 'Inventaire des Machines',
            breadcrumb: 'Accueil / Inventaire',
            headerActions: 'flex'
        },
        about: {
            el: document.getElementById('about-view'),
            title: 'À propos',
            breadcrumb: 'Accueil / À propos',
            headerActions: 'none'
        }
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.classList.contains('disabled')) return;
            e.preventDefault();
            const targetView = link.getAttribute('data-view');
            if (!views[targetView]) return;

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            document.getElementById('view-title').innerText = views[targetView].title;
            document.getElementById('breadcrumb').innerText = views[targetView].breadcrumb;
            document.getElementById('inventory-actions').style.display = views[targetView].headerActions;

            Object.keys(views).forEach(key => {
                views[key].el.classList.toggle('hidden', key !== targetView);
                views[key].el.classList.toggle('active', key === targetView);
            });

            if (targetView === 'dashboard') {
                setTimeout(updateChartsSize, 50);
            }
        });
    });
}

function updateChartsSize() {
    if (brandChart) brandChart.resize();
    if (statusChart) statusChart.resize();
    if (ramChart) ramChart.resize();
    if (avgPriceChart) avgPriceChart.resize();
}

// ===== MODAL FORM (ADD/EDIT) =====
function initForm() {
    const form = document.getElementById('machineForm');
    const overlay = document.getElementById('editModalOverlay');

    document.getElementById('closeModal').addEventListener('click', () => closeModal('editModalOverlay'));
    document.getElementById('cancelForm').addEventListener('click', () => closeModal('editModalOverlay'));
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal('editModalOverlay'); });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.querySelector('.btn-text').innerText = 'Traitement...';

        const data = {
            name: document.getElementById('name').value,
            brand: document.getElementById('brand').value,
            serial_number: document.getElementById('serial_number').value,
            status: document.getElementById('status').value,
            location: document.getElementById('location').value,
            price: document.getElementById('price').value,
            cpu: document.getElementById('cpu').value,
            ram: document.getElementById('ram').value,
            storage: document.getElementById('storage').value,
            gpu_memory: document.getElementById('gpu_memory').value,
            notes: document.getElementById('notes').value
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/machines/${id}` : '/api/machines';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                closeModal('editModalOverlay');
                showToast(id ? '✓ Machine mise à jour !' : '✓ Machine ajoutée !');
                fetchData();
                if (id) closeDetailPanel();
            } else {
                const err = await res.json();
                showToast('Erreur : ' + err.error, true);
            }
        } catch {
            showToast('Erreur de connexion', true);
        } finally {
            btn.disabled = false;
            btn.querySelector('.btn-text').innerText = 'Enregistrer';
        }
    });
}

function openModalForAdd() {
    document.getElementById('editId').value = '';
    document.getElementById('modalTitle').innerText = 'Ajouter une machine';
    document.getElementById('machineForm').reset();
    openModal('editModalOverlay');
}

function openModalForEdit(machine) {
    document.getElementById('editId').value = machine.id;
    document.getElementById('modalTitle').innerText = 'Modifier la machine';

    document.getElementById('name').value = machine.name;
    document.getElementById('brand').value = machine.brand;
    document.getElementById('serial_number').value = machine.serial_number || '';
    document.getElementById('status').value = machine.status || 'En stock';
    document.getElementById('location').value = machine.location || '';
    document.getElementById('price').value = machine.price;
    document.getElementById('cpu').value = machine.cpu || '';
    document.getElementById('ram').value = machine.ram || '';
    document.getElementById('storage').value = machine.storage || '';
    document.getElementById('gpu_memory').value = machine.gpu_memory || 0;
    document.getElementById('notes').value = machine.notes || '';

    openModal('editModalOverlay');
}

// ===== DETAIL PANEL =====
function initDetailPanel() {
    document.getElementById('closeDetail').addEventListener('click', closeDetailPanel);

    document.getElementById('editFromDetail').addEventListener('click', () => {
        const id = document.getElementById('detailPanel').getAttribute('data-id');
        const machine = allMachines.find(m => m.id == id);
        if (machine) openModalForEdit(machine);
    });

    document.getElementById('deleteFromDetail').addEventListener('click', () => {
        const id = document.getElementById('detailPanel').getAttribute('data-id');
        const machine = allMachines.find(m => m.id == id);
        if (machine) openDeleteModal(machine);
    });
}

function openDetailPanel(machine) {
    const panel = document.getElementById('detailPanel');
    panel.setAttribute('data-id', machine.id);

    const nameEl = document.getElementById('detailMachineName');
    if (nameEl) nameEl.innerText = machine.name;

    const statusClass = 'badge-status status-' + (machine.status || '').toLowerCase().replace(/\s/g, '-').replace(/é/g, 'e');

    document.getElementById('detailContent').innerHTML = `
        <div class="detail-section">
            <h4>Informations Générales</h4>
            <div class="detail-grid">
                <div class="info-item"><label>Nom / Modèle</label><span>${machine.name}</span></div>
                <div class="info-item"><label>Marque</label><span>${machine.brand}</span></div>
                <div class="info-item"><label>Numéro de série</label><span>${machine.serial_number ? `<code style="font-size:0.82rem;">${machine.serial_number}</code>` : '—'}</span></div>
                <div class="info-item"><label>Emplacement</label><span>${machine.location || '—'}</span></div>
            </div>
        </div>
        <div class="detail-section">
            <h4>Spécifications Techniques</h4>
            <div class="detail-grid">
                <div class="info-item"><label>Processeur</label><span>${machine.cpu || '—'}</span></div>
                <div class="info-item"><label>RAM</label><span>${machine.ram ? machine.ram + ' Go' : '—'}</span></div>
                <div class="info-item"><label>Stockage</label><span>${machine.storage ? machine.storage + ' Go' : '—'}</span></div>
                <div class="info-item"><label>GPU Dédié</label><span>${machine.gpu_memory ? machine.gpu_memory + ' Go' : 'Intégré'}</span></div>
            </div>
        </div>
        <div class="detail-section">
            <h4>Gestion & Tarification</h4>
            <div class="detail-grid">
                <div class="info-item"><label>Statut</label><span><span class="${statusClass}">${machine.status}</span></span></div>
                <div class="info-item"><label>Prix d'achat</label><span style="color: var(--primary); font-size:1rem;">${formatFCFA(machine.price)}</span></div>
                <div class="info-item"><label>Date d'entrée</label><span>${new Date(machine.created_at).toLocaleDateString('fr-FR')}</span></div>
            </div>
        </div>
        ${machine.notes ? `
        <div class="detail-section">
            <h4>Notes & Observations</h4>
            <p style="font-size: 0.875rem; color: var(--text-sub); background: var(--bg-subtle); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border); line-height: 1.6;">${machine.notes}</p>
        </div>` : ''}
    `;

    panel.classList.add('open');
}

function closeDetailPanel() {
    document.getElementById('detailPanel').classList.remove('open');
}

// ===== DELETE MODAL =====
function initDeleteModal() {
    document.getElementById('cancelDelete').addEventListener('click', () => closeModal('deleteModalOverlay'));
    document.getElementById('confirmDelete').addEventListener('click', async () => {
        if (!deleteTargetId) return;
        try {
            const res = await fetch(`/api/machines/${deleteTargetId}`, { method: 'DELETE' });
            if (res.ok) {
                closeModal('deleteModalOverlay');
                closeDetailPanel();
                showToast('✓ Machine supprimée !');
                fetchData();
            } else {
                const err = await res.json();
                showToast('Erreur : ' + err.error, true);
            }
        } catch {
            showToast('Erreur de connexion', true);
        }
        deleteTargetId = null;
    });
}

function openDeleteModal(machine) {
    deleteTargetId = machine.id;
    document.getElementById('deleteMachineName').innerText = machine.name;
    openModal('deleteModalOverlay');
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ===== DATA FETCH =====
async function fetchData() {
    try {
        const [machinesRes, statsRes] = await Promise.all([
            fetch('/api/machines'),
            fetch('/api/stats')
        ]);
        allMachines = await machinesRes.json();
        const stats = await statsRes.json();
        updateDashboard(allMachines, stats);
        updateTable(allMachines);
        updateCharts(stats);
    } catch (err) {
        console.error('Erreur:', err);
        showToast('Erreur de connexion au serveur', true);
    }
}

function formatFCFA(value) {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value)) + ' FCFA';
}

function updateDashboard(machines, stats) {
    document.getElementById('totalMachines').innerText = machines.length;

    const totalValue = machines.reduce((s, m) => s + m.price, 0);
    document.getElementById('avgPrice').innerText = formatFCFA(totalValue);

    if (stats.brands.length > 0) {
        const top = stats.brands.reduce((a, b) => a.count > b.count ? a : b);
        document.getElementById('topBrand').innerText = top.brand;
    }

    const inStock = machines.filter(m => m.status === 'En stock').length;
    const rate = machines.length > 0 ? Math.round((inStock / machines.length) * 100) : 100;
    document.getElementById('availabilityRate').innerText = rate + '%';
}

function updateTable(machines) {
    const tbody = document.querySelector('#machineTable tbody');
    tbody.innerHTML = '';

    const countEl = document.getElementById('tableCount');
    if (countEl) countEl.innerText = `${machines.length} machine${machines.length > 1 ? 's' : ''} affichée${machines.length > 1 ? 's' : ''}`;

    if (machines.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:3rem;font-size:0.875rem;">Aucune machine trouvée</td></tr>`;
        return;
    }

    machines.forEach(m => {
        const row = document.createElement('tr');
        const statusKey = (m.status || '').toLowerCase().replace(/\s/g, '-').replace(/é/g, 'e');
        row.innerHTML = `
            <td>
                <div class="machine-name">${m.name}</div>
                <div class="machine-cpu">${m.cpu || ''}</div>
            </td>
            <td><span class="badge-brand">${m.brand}</span></td>
            <td><code>${m.serial_number || '—'}</code></td>
            <td><span class="badge-status status-${statusKey}">${m.status}</span></td>
            <td style="color:var(--text-sub)">${m.location || '—'}</td>
            <td style="font-variant-numeric: tabular-nums;">${m.ram || '—'} Go / ${m.storage || '—'} Go</td>
            <td style="font-weight:700; color:var(--primary); font-variant-numeric: tabular-nums;">${formatFCFA(m.price)}</td>
        `;
        row.addEventListener('click', () => openDetailPanel(m));
        tbody.appendChild(row);
    });
}

// ===== CHARTS =====
const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                boxWidth: 10,
                padding: 16,
                font: { size: 11, family: "'Plus Jakarta Sans', sans-serif", weight: '600' },
                color: '#475569'
            }
        }
    }
};

function updateCharts(stats) {
    // Brand Chart - Doughnut
    const brandCtx = document.getElementById('brandChart').getContext('2d');
    if (brandChart) brandChart.destroy();
    brandChart = new Chart(brandCtx, {
        type: 'doughnut',
        data: {
            labels: stats.brands.map(b => b.brand),
            datasets: [{
                data: stats.brands.map(b => b.count),
                backgroundColor: COLORS,
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverBorderWidth: 3
            }]
        },
        options: {
            ...chartDefaults,
            cutout: '72%',
            plugins: {
                ...chartDefaults.plugins,
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.parsed} machine${ctx.parsed > 1 ? 's' : ''}`
                    }
                }
            }
        }
    });

    // Status Chart - Doughnut
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    if (statusChart) statusChart.destroy();
    statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: stats.status_distribution.map(s => s.status),
            datasets: [{
                data: stats.status_distribution.map(s => s.count),
                backgroundColor: ['#10b981', '#2563eb', '#f59e0b', '#94a3b8'],
                borderWidth: 3,
                borderColor: '#ffffff'
            }]
        },
        options: { ...chartDefaults, cutout: '65%' }
    });

    // RAM Chart - Bar
    const ramCtx = document.getElementById('ramChart').getContext('2d');
    if (ramChart) ramChart.destroy();
    ramChart = new Chart(ramCtx, {
        type: 'bar',
        data: {
            labels: stats.ram_distribution.map(r => r.ram + ' Go'),
            datasets: [{
                label: 'Machines',
                data: stats.ram_distribution.map(r => r.count),
                backgroundColor: COLORS.map(c => c + 'cc'),
                borderColor: COLORS,
                borderWidth: 1.5,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            ...chartDefaults,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, font: { size: 11 }, color: '#94a3b8' },
                    grid: { color: '#f1f5f9' }
                },
                x: {
                    ticks: { font: { size: 11 }, color: '#94a3b8' },
                    grid: { display: false }
                }
            },
            plugins: { ...chartDefaults.plugins, legend: { display: false } }
        }
    });

    // Avg Price Chart - Horizontal Bar
    const avgCtx = document.getElementById('avgPriceChart').getContext('2d');
    if (avgPriceChart) avgPriceChart.destroy();
    const sortedBrands = [...stats.brands].sort((a, b) => b.avg_price - a.avg_price);
    avgPriceChart = new Chart(avgCtx, {
        type: 'bar',
        data: {
            labels: sortedBrands.map(b => b.brand),
            datasets: [{
                label: 'Prix moyen',
                data: sortedBrands.map(b => Math.round(b.avg_price)),
                backgroundColor: COLORS.map(c => c + 'bb'),
                borderColor: COLORS,
                borderWidth: 1.5,
                borderRadius: 5,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            ...chartDefaults,
            scales: {
                x: {
                    ticks: {
                        callback: v => new Intl.NumberFormat('fr-FR').format(v) + ' F',
                        font: { size: 10 },
                        color: '#94a3b8'
                    },
                    grid: { color: '#f1f5f9' }
                },
                y: {
                    ticks: { font: { size: 11 }, color: '#475569' },
                    grid: { display: false }
                }
            },
            plugins: { ...chartDefaults.plugins, legend: { display: false } }
        }
    });
}

// ===== TOAST =====
function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMsg');
    if (msgEl) msgEl.innerText = msg;
    else toast.innerText = msg;

    toast.style.background = isError ? '#ef4444' : '#0f172a';
    toast.classList.toggle('error', isError);
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3200);
}
