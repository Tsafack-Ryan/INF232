let brandChart = null;
let priceRangeChart = null;
let ramChart = null;
let avgPriceChart = null;
let allMachines = [];
let deleteTargetId = null;

const COLORS = [
    '#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6',
    '#ec4899','#06b6d4','#84cc16','#f97316','#14b8a6'
];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').innerText =
        new Date().toLocaleDateString('fr-FR', options);

    initNavigation();
    fetchData();
    initAddForm();
    initEditModal();
    initDeleteModal();

    // Live search
    document.getElementById('searchInput').addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        const filtered = allMachines.filter(m =>
            m.name.toLowerCase().includes(q) ||
            m.brand.toLowerCase().includes(q) ||
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
            title: 'Tableau de bord'
        },
        inventory: {
            el: document.getElementById('inventory-view'),
            title: 'Inventaire des Machines'
        }
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = link.getAttribute('data-view');

            // Update nav active state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Update View Title
            document.getElementById('view-title').innerText = views[targetView].title;

            // Toggle views
            Object.keys(views).forEach(key => {
                if (key === targetView) {
                    views[key].el.classList.remove('hidden');
                } else {
                    views[key].el.classList.add('hidden');
                }
            });

            // If switching to dashboard, ensure charts resize
            if (targetView === 'dashboard') {
                updateChartsSize();
            }
        });
    });
}

function updateChartsSize() {
    if (brandChart) brandChart.resize();
    if (priceRangeChart) priceRangeChart.resize();
    if (ramChart) ramChart.resize();
    if (avgPriceChart) avgPriceChart.resize();
}

// ===== ADD FORM =====
function initAddForm() {
    document.getElementById('machineForm').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        btn.classList.add('loading');
        btn.querySelector('.btn-text').innerText = 'Enregistrement...';

        const data = {
            name: document.getElementById('name').value,
            brand: document.getElementById('brand').value,
            cpu: document.getElementById('cpu').value,
            cpu_gen: document.getElementById('cpu_gen').value,
            cpu_speed: document.getElementById('cpu_speed').value,
            ram: document.getElementById('ram').value,
            storage: document.getElementById('storage').value,
            gpu_memory: document.getElementById('gpu_memory').value,
            price: document.getElementById('price').value
        };

        try {
            const res = await fetch('/api/machines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                e.target.reset();
                showToast('Machine ajoutee avec succes !');
                fetchData();
            } else {
                const err = await res.json();
                showToast('Erreur : ' + err.error, true);
            }
        } catch {
            showToast('Erreur de connexion', true);
        } finally {
            btn.classList.remove('loading');
            btn.querySelector('.btn-text').innerText = 'Enregistrer la machine';
        }
    });
}

// ===== EDIT MODAL =====
function initEditModal() {
    const overlay = document.getElementById('editModalOverlay');

    document.getElementById('closeModal').addEventListener('click', () => closeModal('editModalOverlay'));
    document.getElementById('cancelEdit').addEventListener('click', () => closeModal('editModalOverlay'));
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal('editModalOverlay'); });

    document.getElementById('editForm').addEventListener('submit', async e => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const btn = document.getElementById('saveEdit');
        btn.classList.add('loading');
        btn.querySelector('.btn-text').innerText = 'Enregistrement...';

        const data = {
            name: document.getElementById('editName').value,
            brand: document.getElementById('editBrand').value,
            cpu: document.getElementById('editCpu').value,
            cpu_gen: document.getElementById('editCpuGen').value,
            cpu_speed: document.getElementById('editCpuSpeed').value,
            ram: document.getElementById('editRam').value,
            storage: document.getElementById('editStorage').value,
            gpu_memory: document.getElementById('editGpu').value,
            price: document.getElementById('editPrice').value
        };

        try {
            const res = await fetch(`/api/machines/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                closeModal('editModalOverlay');
                showToast('Machine mise a jour avec succes !');
                fetchData();
            } else {
                const err = await res.json();
                showToast('Erreur : ' + err.error, true);
            }
        } catch {
            showToast('Erreur de connexion', true);
        } finally {
            btn.classList.remove('loading');
            btn.querySelector('.btn-text').innerText = 'Enregistrer les modifications';
        }
    });
}

// ===== DELETE MODAL =====
function initDeleteModal() {
    document.getElementById('closeDeleteModal').addEventListener('click', () => closeModal('deleteModalOverlay'));
    document.getElementById('cancelDelete').addEventListener('click', () => closeModal('deleteModalOverlay'));

    document.getElementById('deleteModalOverlay').addEventListener('click', e => {
        if (e.target === document.getElementById('deleteModalOverlay'))
            closeModal('deleteModalOverlay');
    });

    document.getElementById('confirmDelete').addEventListener('click', async () => {
        if (!deleteTargetId) return;
        try {
            const res = await fetch(`/api/machines/${deleteTargetId}`, { method: 'DELETE' });
            if (res.ok) {
                closeModal('deleteModalOverlay');
                showToast('Machine supprimee avec succes !');
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

// ===== OPEN MODALS =====
function openEditModal(machine) {
    document.getElementById('editId').value = machine.id;
    document.getElementById('editName').value = machine.name;
    document.getElementById('editBrand').value = machine.brand;
    document.getElementById('editCpu').value = machine.cpu || '';
    document.getElementById('editCpuGen').value = machine.cpu_gen || '';
    document.getElementById('editCpuSpeed').value = machine.cpu_speed || '';
    document.getElementById('editRam').value = machine.ram || '';
    document.getElementById('editStorage').value = machine.storage || '';
    document.getElementById('editGpu').value = machine.gpu_memory || 0;
    document.getElementById('editPrice').value = machine.price;
    openModal('editModalOverlay');
}

function openDeleteModal(machine) {
    deleteTargetId = machine.id;
    document.getElementById('deleteMachineName').innerText = machine.name;
    openModal('deleteModalOverlay');
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

// ===== DATA FETCH =====
async function fetchData() {
    try {
        const [machinesRes, statsRes] = await Promise.all([
            fetch('/api/machines'),
            fetch('/api/stats')
        ]);
        allMachines = await machinesRes.json();
        const stats = await statsRes.json();
        updateStats(allMachines, stats);
        updateTable(allMachines);
        updateCharts(stats);
    } catch (err) {
        console.error('Erreur:', err);
    }
}

function formatFCFA(value) {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value)) + ' FCFA';
}

function updateStats(machines, stats) {
    document.getElementById('totalMachines').innerText = machines.length;
    document.getElementById('uniqueBrands').innerText = stats.brands.length;
    if (machines.length > 0) {
        const avg = machines.reduce((s, m) => s + m.price, 0) / machines.length;
        document.getElementById('avgPrice').innerText = formatFCFA(avg);
        if (stats.brands.length > 0) {
            const top = stats.brands.reduce((a, b) => a.count > b.count ? a : b);
            document.getElementById('topBrand').innerText = top.brand;
        }
    }
}

function updateTable(machines) {
    const tbody = document.querySelector('#machineTable tbody');
    tbody.innerHTML = '';

    if (machines.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#94a3b8;padding:2rem;">Aucune machine trouvee</td></tr>`;
        return;
    }

    machines.forEach(m => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${m.name}</strong></td>
            <td><span class="badge">${m.brand}</span></td>
            <td>${m.cpu || '-'}</td>
            <td>${m.cpu_gen || '-'}</td>
            <td>${m.cpu_speed ? m.cpu_speed + ' GHz' : '-'}</td>
            <td>${m.ram ? m.ram + ' Go' : '-'}</td>
            <td>${m.storage ? m.storage + ' Go' : '-'}</td>
            <td>${m.gpu_memory ? m.gpu_memory + ' Go' : 'Integre'}</td>
            <td><strong>${formatFCFA(m.price)}</strong></td>
            <td>
                <div class="actions-cell">
                    <button class="btn-icon btn-edit" title="Modifier">✏️</button>
                    <button class="btn-icon btn-delete" title="Supprimer">🗑️</button>
                </div>
            </td>
        `;
        row.querySelector('.btn-edit').addEventListener('click', () => openEditModal(m));
        row.querySelector('.btn-delete').addEventListener('click', () => openDeleteModal(m));
        tbody.appendChild(row);
    });
}

function updateCharts(stats) {
    const brandCtx = document.getElementById('brandChart').getContext('2d');
    if (brandChart) brandChart.destroy();
    brandChart = new Chart(brandCtx, {
        type: 'doughnut',
        data: {
            labels: stats.brands.map(b => b.brand),
            datasets: [{
                data: stats.brands.map(b => b.count),
                backgroundColor: COLORS,
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: { legend: { position: 'bottom', labels: { padding: 14, font: { size: 10 } } } }
        }
    });

    const priceCtx = document.getElementById('priceRangeChart').getContext('2d');
    if (priceRangeChart) priceRangeChart.destroy();
    priceRangeChart = new Chart(priceCtx, {
        type: 'bar',
        data: {
            labels: stats.price_ranges.map(p => p.category),
            datasets: [{
                label: 'Machines',
                data: stats.price_ranges.map(p => p.count),
                backgroundColor: ['#6366f1','#10b981','#f59e0b'],
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });

    const ramCtx = document.getElementById('ramChart').getContext('2d');
    if (ramChart) ramChart.destroy();
    ramChart = new Chart(ramCtx, {
        type: 'polarArea',
        data: {
            labels: stats.ram_distribution.map(r => r.ram + ' Go RAM'),
            datasets: [{
                data: stats.ram_distribution.map(r => r.count),
                backgroundColor: COLORS.map(c => c + 'cc'),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 10 } } } }
        }
    });

    const avgCtx = document.getElementById('avgPriceChart').getContext('2d');
    if (avgPriceChart) avgPriceChart.destroy();
    const sortedBrands = [...stats.brands].sort((a, b) => b.avg_price - a.avg_price);
    avgPriceChart = new Chart(avgCtx, {
        type: 'bar',
        data: {
            labels: sortedBrands.map(b => b.brand),
            datasets: [{
                label: 'Prix moyen (FCFA)',
                data: sortedBrands.map(b => Math.round(b.avg_price)),
                backgroundColor: COLORS,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { callback: v => new Intl.NumberFormat('fr-FR').format(v) },
                    grid: { color: '#f1f5f9' }
                },
                y: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.style.borderLeftColor = isError ? '#ef4444' : '#22c55e';
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3500);
}
