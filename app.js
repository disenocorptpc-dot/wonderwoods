import { db } from './db.js';
// Fallback data
import { tablewareData as localData, characterData } from './data.js';

let tablewareData = []; // Will be populated from DB

document.addEventListener('DOMContentLoaded', async () => {

    // Init DB & Load
    try {
        await db.init();
        let remoteItems = await db.getItems();

        // Seeding Logic
        if (remoteItems.length === 0) {
            const hasSeeded = localStorage.getItem('ww_seeded');
            if (!hasSeeded) {
                console.log("🌱 Sembrando datos iniciales en la Nube...");
                for (const item of localData) {
                    await db.addItem(item);
                }
                localStorage.setItem('ww_seeded', 'true');
                remoteItems = localData;
            }
        }
        tablewareData = remoteItems;

    } catch (e) {
        console.error("Error cargando DB:", e);
        tablewareData = localData;
    }

    // State & DOM
    let currentTab = 'catalog';
    const contentContainer = document.getElementById('appContent');
    const pageTitle = document.getElementById('pageTitle');

    // Render initial view
    renderCatalog();

    // Navigation Logic
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

    // Search Logic
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const activeTab = document.querySelector('.nav-btn.active').dataset.tab;
            if (activeTab === 'catalog') renderCatalog(q);
            else if (activeTab === 'characters') renderCharacters(q);
            else renderInventory(q);
        });
    }

    // --- Renderers ---

    async function resolveImage(item) {
        if (item.image && item.image.startsWith('DB_IMAGE:')) {
            const id = item.image.split(':')[1];
            const content = await db.getImage(id);
            return content || 'https://placehold.co/100x100?text=No+Img';
        }
        return item.image || 'https://placehold.co/100x100?text=No+Img';
    }

    function renderCatalog(filter = '') {
        const items = tablewareData.filter(i => i.name.toLowerCase().includes(filter));

        const container = document.createElement('div');
        container.className = 'items-list-container';

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

            // Allow clicking the row to view details
            el.style.cursor = 'pointer';
            el.addEventListener('click', (e) => {
                // If clicking any button inside row, do not trigger row click
                if (e.target.closest('button')) return;
                showModal(item);
            });

            const statusClass = item.stock.current < item.stock.minLevel ? 'stock-low' : 'stock-ok';
            const imgId = `img-${item.id}`;

            el.innerHTML = `
                <div><img id="${imgId}" src="https://placehold.co/400x400/eee/999?text=..." class="list-thumb"></div>
                <div class="item-name">${item.name}</div>
                <div class="item-category">${item.category}</div>
                <div style="font-weight:600;">${item.stock.current} <small style="color:#999; font-weight:normal;">/ ${item.stock.minLevel}</small></div>
                <div><span class="stock-pill ${statusClass}">${item.stock.status}</span></div>
                <div style="display:flex; justify-content:center; gap:8px;">
                     <button class="btn-icon view-btn" title="Ver Detalles"><i class="fa-solid fa-eye"></i></button>
                     <button class="btn-icon edit-btn" title="Editar"><i class="fa-solid fa-pen"></i></button>
                     <button class="btn-icon delete-btn" title="Eliminar" style="color:#d32f2f; border-color:#ef9a9a;"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;

            // Bind Actions with stopPropagation
            el.querySelector('.view-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                showModal(item);
            });
            el.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openEditModal(item);
            });

            el.querySelector('.delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('¿Seguro que deseas eliminar este ítem permanentemente?')) {
                    el.style.opacity = '0.5';
                    try {
                        await db.deleteItem(item.id);
                        tablewareData = tablewareData.filter(i => i.id !== item.id);
                        renderCatalog(searchInput ? searchInput.value : '');
                    } catch (err) {
                        console.error(err);
                        alert('Error al eliminar');
                        el.style.opacity = '1';
                    }
                }
            });

            resolveImage(item).then(url => {
                const imgEl = el.querySelector(`#${imgId}`);
                if (imgEl) imgEl.src = url;
            });

            listBody.appendChild(el);
        });

        container.appendChild(listBody);
        replaceContent(container);
    }

    // --- Edit Logic ---
    function openEditModal(item) {
        const modal = document.getElementById('addModal');
        const form = document.getElementById('addItemForm');
        form.reset();

        // Metadata for Edit Mode
        document.getElementById('editId').value = item.id;
        document.getElementById('formModeTitle').innerText = "Editar: " + item.name;

        // Fill Fields
        form.name.value = item.name;
        form.category.value = item.category;
        form.stock.value = item.stock.current;
        form.description.value = item.description;

        if (item.dimensions) {
            form.dim_h.value = item.dimensions.height || '';
            form.dim_w.value = item.dimensions.width || '';
            form.dim_d.value = item.dimensions.depth || '';
            form.capacity.value = item.dimensions.capacity || '';
        }
        form.material.value = item.materials || '';

        // Populate manufacturing & files safely
        if (item.manufacturing) {
            form.manufacturer.value = item.manufacturing.manufacturer || '';
            form.files.value = item.manufacturing.productionFiles || '';
        } else {
            form.manufacturer.value = '';
            form.files.value = '';
        }

        modal.classList.remove('hidden');
    }

    function renderCharacters(filter = '') {
        const items = characterData.filter(c => c.name.toLowerCase().includes(filter));
        const grid = document.createElement('div');
        grid.className = 'items-grid';

        items.forEach(char => {
            const el = document.createElement('div');
            el.className = 'item-card';
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

    // Modal Logic for Detail & Add/Edit
    const modal = document.getElementById('itemModal');
    const addModal = document.getElementById('addModal');

    if (modal) {
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    }

    if (addModal) {
        document.getElementById('btnNewItem').addEventListener('click', () => {
            // New Item Mode logic
            const f = document.getElementById('addItemForm');
            f.reset();
            document.getElementById('editId').value = ""; // Clear ID
            document.getElementById('formModeTitle').innerText = "Agregar Nuevo Artefacto";
            addModal.classList.remove('hidden');
        });
        document.getElementById('closeAddModal').addEventListener('click', () => addModal.classList.add('hidden'));
        addModal.addEventListener('click', (e) => { if (e.target === addModal) addModal.classList.add('hidden'); });

        // Form Handle (Add OR Edit)
        const form = document.getElementById('addItemForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const f = e.target;

                // UI Feedback
                const btn = f.querySelector('button[type="submit"]');
                const isEdit = document.getElementById('editId').value !== "";
                btn.textContent = isEdit ? "Actualizando... ☁️" : "Guardando... ☁️";
                btn.disabled = true;

                const editIdStr = document.getElementById('editId').value;
                const newId = isEdit ? editIdStr : Date.now().toString();

                // Keep old image logic if edit
                let imgUrl = "https://placehold.co/400x400/5D3A5D/FFF?text=" + encodeURIComponent(f.name.value);
                if (isEdit) {
                    const existing = tablewareData.find(i => i.id === newId);
                    // Preserve existing image if no new one selected, OR if new one selected we update URL below
                    if (existing) imgUrl = existing.image;
                }

                // Upload Image (Overwrite/New)
                if (f.imageUpload && f.imageUpload.files.length > 0) {
                    try {
                        await db.saveImage(newId, f.imageUpload.files[0]);
                        imgUrl = "DB_IMAGE:" + newId;
                    } catch (err) {
                        console.error("Error subiendo imagen", err);
                    }
                }

                // Construct Object
                const newItem = {
                    id: newId,
                    name: f.name.value,
                    category: f.category.value || 'General',
                    description: f.description.value,
                    dimensions: {
                        height: f.dim_h.value,
                        width: f.dim_w.value,
                        depth: f.dim_d.value,
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
                    image: imgUrl
                };

                // Save to DB & Local State
                if (isEdit) {
                    tablewareData = tablewareData.map(i => i.id === newId ? newItem : i);
                    await db.updateItem(newItem);
                    console.log("Updated", newItem);
                } else {
                    tablewareData.push(newItem);
                    await db.addItem(newItem);
                    console.log("Created", newItem);
                }

                // Refresh View
                addModal.classList.add('hidden');
                f.reset();
                btn.textContent = "Guardar en Inventario";
                btn.disabled = false;

                const activeTab = document.querySelector('.nav-btn.active').dataset.tab;
                if (activeTab === 'catalog') renderCatalog();
                else if (activeTab === 'inventory') renderInventory();

                alert(isEdit ? '¡Ítem actualizado!' : '¡Ítem guardado!');
            });
        }
    }

    function showModal(data, isChar = false) {
        const modalImg = document.getElementById('modalImg');
        const modalTitle = document.getElementById('modalTitle');
        const modalDetails = document.getElementById('modalDetails');

        modalTitle.innerText = data.name;

        // Handle Image
        if (data.image.startsWith('DB_IMAGE:')) {
            modalImg.src = 'https://placehold.co/400x400/eee/999?text=Cargando...';
            resolveImage(data).then(url => modalImg.src = url);
        } else {
            modalImg.src = data.image;
        }

        if (isChar) {
            let html = `<p style="margin-bottom:1rem; line-height:1.5;">${data.description}</p>`;
            if (data.details) {
                data.details.forEach(d => {
                    html += `<div class="spec-row"><span>${d.label}</span> <strong>${d.value}</strong></div>`;
                });
            }
            modalDetails.innerHTML = html;
        } else {
            let html = `
                <div class="section-title" style="margin-top:0;">Estado</div>
                <div class="spec-row">
                    <span>Disponibilidad</span> 
                    <strong style="color:${data.stock.current < data.stock.minLevel ? '#d32f2f' : '#2e7d32'};">
                        ${data.stock.status} (${data.stock.current} unid.)
                    </strong>
                </div>

                <div class="section-title">Especificaciones</div>
                <div class="spec-row">
                    <span>Medidas</span> 
                    <strong>${data.dimensions.width || '-'} x ${data.dimensions.height || '-'} x ${data.dimensions.depth || '-'} cm</strong>
                </div>
                <!-- Combined Depth into Measures -->
                <div class="spec-row"><span>Capacidad</span> <strong>${data.dimensions.capacity || '-'}</strong></div>
                <div class="spec-row"><span>Material</span> <strong>${data.materials}</strong></div>

                <div class="section-title">Producción</div>
                <div class="spec-row"><span>Fabricante</span> <strong>${data.manufacturing.manufacturer || '-'}</strong></div>
                <div class="spec-row"><span>Archivo CAD</span> <a href="${data.manufacturing.productionFiles}" target="_blank" rel="noopener noreferrer" style="color:var(--primary);">Descargar</a></div>
                
                <div class="section-title">Notas</div>
                <p style="font-size:0.9rem; color:#666;">${data.comments}</p>
            `;
            modalDetails.innerHTML = html;
        }
        modal.classList.remove('hidden');
    }

    function replaceContent(element) {
        contentContainer.innerHTML = '';
        contentContainer.appendChild(element);
    }
});
