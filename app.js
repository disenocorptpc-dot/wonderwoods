import { tablewareData, characterData } from './data.js';

document.addEventListener('DOMContentLoaded', () => {

    // State & DOM
    let currentTab = 'catalog';
    const contentContainer = document.getElementById('appContent');
    const pageTitle = document.getElementById('pageTitle');

    // Render immediately
    renderCatalog();

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tabName = btn.dataset.tab;
            if (tabName === 'catalog') {
                pageTitle.textContent = "Catálogo de Loza";
                renderCatalog();
            } else if (tabName === 'characters') {
                pageTitle.textContent = "Personajes";
                renderCharacters();
            } else if (tabName === 'inventory') {
                pageTitle.textContent = "Inventario y Stock";
                renderInventory();
            }
        });
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        // Simple re-render based on active tab
        if (document.querySelector('.nav-btn.active').dataset.tab === 'catalog') renderCatalog(q);
        else if (document.querySelector('.nav-btn.active').dataset.tab === 'characters') renderCharacters(q);
        else renderInventory(q);
    });

    // Components
    function renderCatalog(filter = '') {
        const items = tablewareData.filter(i => i.name.toLowerCase().includes(filter));

        // Create Container Table/List
        const container = document.createElement('div');
        container.className = 'items-list-container';

        // Header Structure
        container.innerHTML = `
            <div class="list-header">
                <div>Img</div>
                <div>Producto</div>
                <div>Categoría</div>
                <div>Stock</div>
                <div>Estado</div>
                <div style="text-align:center;">Acciones</div>
            </div>
        `;

        const listBody = document.createElement('div');

        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'list-item';

            const statusClass = item.stock.current < item.stock.minLevel ? 'stock-low' : 'stock-ok';

            el.innerHTML = `
                <div><img src="${item.image}" class="list-thumb"></div>
                <div class="item-name">${item.name}</div>
                <div class="item-category">${item.category}</div>
                <div style="font-weight:600;">${item.stock.current} <small style="color:#999; font-weight:normal;">/ ${item.stock.minLevel}</small></div>
                <div><span class="stock-pill ${statusClass}">${item.stock.status}</span></div>
                <div style="display:flex; justify-content:center; gap:8px;">
                     <button class="btn-icon view-btn" title="Ver Detalles"><i class="fa-solid fa-eye"></i></button>
                     <button class="btn-icon edit-btn" title="Editar"><i class="fa-solid fa-pen"></i></button>
                </div>
            `;

            // Bind Actions
            el.querySelector('.view-btn').addEventListener('click', () => showModal(item));
            // Placeholder edit
            el.querySelector('.edit-btn').addEventListener('click', () => alert('Edit feature coming soon!'));

            listBody.appendChild(el);
        });

        container.appendChild(listBody);
        replaceContent(container);
    }

    function renderCharacters(filter = '') {
        const items = characterData.filter(c => c.name.toLowerCase().includes(filter));
        const grid = document.createElement('div');
        grid.className = 'items-grid';

        items.forEach(char => {
            const el = document.createElement('div');
            el.className = 'item-card'; // Reusing card style
            el.innerHTML = `
                <div class="card-img">
                    <img src="${char.image}" alt="">
                </div>
                <div class="card-body">
                    <h3 class="card-title">${char.name}</h3>
                    <span class="card-meta">${char.role}</span>
                    <p style="font-size:0.9rem; margin-bottom:10px;">${char.description}</p>
                    <button class="btn-action">Ver Historia</button>
                </div>
            `;
            // Simplified modal for char
            el.querySelector('button').addEventListener('click', () => {
                showModal({
                    name: char.name,
                    description: char.description,
                    image: char.image,
                    details: [
                        { label: 'Rol', value: char.role },
                        { label: 'Personalidad', value: char.personality },
                        { label: 'Origen', value: char.origin }
                    ]
                }, true);
            });
            grid.appendChild(el);
        });
        replaceContent(grid);
    }

    function renderInventory(filter = '') {
        const items = tablewareData.filter(i => i.name.toLowerCase().includes(filter));

        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <table class="inventory-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Categoría</th>
                        <th>Proveedor</th>
                        <th>Stock Actual</th>
                        <th>Mínimo</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => {
            const statusColor = item.stock.current < item.stock.minLevel ? '#EF6C00' : '#2E7D32';
            return `
                        <tr>
                            <td><strong>${item.name}</strong></td>
                            <td>${item.category}</td>
                            <td>${item.manufacturing.manufacturer}</td>
                            <td>${item.stock.current}</td>
                            <td>${item.stock.minLevel}</td>
                            <td style="color:${statusColor}; font-weight:bold;">${item.stock.status}</td>
                        </tr>`;
        }).join('')}
                </tbody>
            </table>
        `;
        replaceContent(wrapper);
    }

    // Modal Logic
    const modal = document.getElementById('itemModal');
    const addModal = document.getElementById('addModal');

    // Close events for Detail Modal
    document.querySelector('.close-btn').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

    // Add Modal Events
    document.getElementById('btnNewItem').addEventListener('click', () => {
        addModal.classList.remove('hidden');
    });
    document.getElementById('closeAddModal').addEventListener('click', () => addModal.classList.add('hidden'));
    addModal.addEventListener('click', (e) => { if (e.target === addModal) addModal.classList.add('hidden'); });

    // Form Handle
    document.getElementById('addItemForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;

        // Construct New Object
        const newItem = {
            id: Date.now().toString(),
            name: f.name.value,
            category: f.category.value || 'General',
            description: f.description.value,
            dimensions: {
                height: f.dim_h.value,
                width: f.dim_w.value,
                capacity: f.capacity.value
            },
            materials: f.material.value,
            manufacturing: {
                manufacturer: f.manufacturer.value,
                productionFiles: f.files.value || '#'
            },
            stock: {
                current: parseInt(f.stock.value) || 0,
                minLevel: 10,
                status: 'In Stock'
            },
            comments: '',
            image: "https://placehold.co/400x400/5D4037/FFF?text=" + encodeURIComponent(f.name.value)
        };

        // Add to Data
        tablewareData.push(newItem);

        // Refresh View
        addModal.classList.add('hidden');
        f.reset();

        // Check active tab to decide what to render
        const activeTab = document.querySelector('.nav-btn.active').dataset.tab;
        if (activeTab === 'catalog') renderCatalog();
        else if (activeTab === 'inventory') renderInventory();

        alert('Ítem agregado exitosamente');
    });

    function showModal(data, isChar = false) {
        // Construct content dynamically
        if (isChar) {
            // ... simple char render
            document.getElementById('modalTitle').innerText = data.name;
            document.getElementById('modalImg').src = data.image;

            let html = `<p style="margin-bottom:1rem; line-height:1.5;">${data.description}</p>`;
            data.details.forEach(d => {
                html += `<div class="spec-row"><span>${d.label}</span> <strong>${d.value}</strong></div>`;
            });
            document.getElementById('modalDetails').innerHTML = html;
        } else {
            // Item Render
            document.getElementById('modalTitle').innerText = data.name;
            document.getElementById('modalImg').src = data.image;

            let html = `
                <div class="section-title">Especificaciones</div>
                <div class="spec-row"><span>Medidas</span> <strong>${data.dimensions.height || '-'} x ${data.dimensions.width || '-'}</strong></div>
                <div class="spec-row"><span>Capacidad</span> <strong>${data.dimensions.capacity || '-'}</strong></div>
                <div class="spec-row"><span>Material</span> <strong>${data.materials}</strong></div>

                <div class="section-title">Producción</div>
                <div class="spec-row"><span>Fabricante</span> <strong>${data.manufacturing.manufacturer || '-'}</strong></div>
                <div class="spec-row"><span>Archivo CAD</span> <a href="${data.manufacturing.productionFiles}" style="color:var(--primary);">Descargar</a></div>
                
                <div class="section-title">Notas</div>
                <p style="font-size:0.9rem; color:#666;">${data.comments}</p>
            `;
            document.getElementById('modalDetails').innerHTML = html;
        }
        modal.classList.remove('hidden');
    }

    function replaceContent(element) {
        contentContainer.innerHTML = '';
        contentContainer.appendChild(element);
    }
});
