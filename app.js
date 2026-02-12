import { db } from './db.js';
// Fallback data
import { tablewareData as localData, characterData } from './data.js';

document.addEventListener('DOMContentLoaded', async () => {

    // State
    let activeTab = 'catalog'; // catalog | characters
    let tablewareData = [];

    // Init Logic
    try {
        await db.init();
        let remoteItems = await db.getItems();
        if (remoteItems.length === 0) {
            // Seed logic here if needed, or skipped
            console.log("DB Empty");
        }
        tablewareData = remoteItems;
    } catch (e) {
        console.error("Error loading DB", e);
        tablewareData = localData;
    }

    // References
    const pageTitle = document.getElementById('pageTitle');
    const searchInput = document.getElementById('searchInput');

    // Initial Render
    renderCatalog();

    // --- Navigation ---
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update UI
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update State
            activeTab = btn.dataset.tab;

            // Render
            if (activeTab === 'catalog') {
                pageTitle.textContent = "Fun Dishes";
            } else if (activeTab === 'characters') {
                pageTitle.textContent = "Personajes";
            }
            renderCatalog();
        });
    });

    // --- Search ---
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderCatalog(e.target.value.toLowerCase());
        });
    }

    // --- Add/Edit Form Handling ---
    const addModal = document.getElementById('addModal');
    const addItemForm = document.getElementById('addItemForm');

    // Open New Modal
    const btnNewItem = document.getElementById('btnNewItem');
    if (btnNewItem) {
        btnNewItem.addEventListener('click', () => {
            openEditModal(null);
        });
    }

    // Close Modal
    const closeAddModalBtn = document.getElementById('closeAddModal');
    if (closeAddModalBtn) {
        closeAddModalBtn.addEventListener('click', () => {
            addModal.classList.add('hidden');
        });
    }

    // Submit Handler
    addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('editId').value;
        const formData = new FormData(addItemForm);
        const name = formData.get('name');

        // Determine Category
        let category = formData.get('category');
        if (activeTab === 'characters') {
            category = 'Personajes';
        }

        const description = formData.get('description');
        const history = formData.get('history'); // New Field
        const stock = parseInt(formData.get('stock')) || 0;

        // Image Handling
        const imageFile = formData.get('imageUpload');
        let imageUrl = null;

        if (imageFile && imageFile.size > 0) {
            try {
                const optimizedImage = await db.optimizeImage(imageFile);
                imageUrl = optimizedImage; // Base64 or URL
            } catch (err) {
                console.error("Image error", err);
                alert("Error procesando imagen");
            }
        }

        const newItem = {
            id: id || Date.now().toString(),
            name,
            category,
            image: imageUrl, // Will be updated if imageUrl is new, logic below handles preservation
            description,
            history: history, // Save History
            stock: {
                current: stock,
                minLevel: 5,
                status: stock < 5 ? 'Low Stock' : 'In Stock'
            },
            dimensions: {
                width: formData.get('dim_w'),
                height: formData.get('dim_h'),
                depth: formData.get('dim_d'),
                capacity: formData.get('capacity')
            },
            materials: formData.get('material'),
            manufacturing: {
                manufacturer: formData.get('manufacturer'),
                productionFiles: formData.get('files')
            },
            logs: [], // Init empty logs
            comments: '' // Legacy
        };

        // If updating, preserve existing data not in form (like logs, old image if no new one)
        if (id) {
            const existing = tablewareData.find(i => i.id === id);
            if (existing) {
                newItem.logs = existing.logs || [];
                newItem.comments = existing.comments || '';
                if (!imageUrl && existing.image) {
                    newItem.image = existing.image;
                }
            }
            await db.updateItem(newItem);
            // Update Local State
            tablewareData = tablewareData.map(i => i.id === id ? newItem : i);
        } else {
            await db.addItem(newItem);
            tablewareData.push(newItem);
        }

        addModal.classList.add('hidden');
        addItemForm.reset();
        renderCatalog(searchInput ? searchInput.value : '');
        alert('Guardado correctamente');
    });

    // --- Core Functions ---
    async function resolveImage(item) {
        if (item.image && item.image.startsWith('DB_IMAGE:')) {
            const id = item.image.split(':')[1];
            const content = await db.getImage(id);
            return content || 'https://placehold.co/100x100?text=No+Img';
        }
        return item.image || 'https://placehold.co/100x100?text=No+Img';
    }

    function renderCatalog(filter = '') {
        let items = tablewareData;

        // FILTER BY TAB
        if (activeTab === 'catalog') {
            items = items.filter(i => i.category !== 'Personajes');
        } else if (activeTab === 'characters') {
            items = items.filter(i => i.category === 'Personajes');
        }

        // FILTER BY SEARCH
        if (filter) {
            items = items.filter(i => i.name.toLowerCase().includes(filter));
        }

        const container = document.createElement('div');
        container.className = 'items-list-container';

        // Dynamic Header
        let headerHTML;
        if (activeTab === 'characters') {
            headerHTML = `<div class="list-header" style="grid-template-columns: 80px 2fr 1fr;">
                 <div>Img</div>
                 <div>Nombre</div>
                 <div style="text-align:center;">Acciones</div>
               </div>`;
        } else {
            headerHTML = `<div class="list-header">
                <div>Img</div>
                <div>Producto</div>
                <div>Categoría</div>
                <div>Stock</div>
                <div>Estado</div>
                <div style="text-align:center;">Acciones</div>
            </div>`;
        }

        container.innerHTML = headerHTML;
        const listBody = document.createElement('div');

        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'list-item';

            if (activeTab === 'characters') {
                el.style.gridTemplateColumns = '80px 2fr 1fr';
            }

            el.style.cursor = 'pointer';
            el.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                showModal(item);
            });

            const statusClass = item.stock.current < item.stock.minLevel ? 'stock-low' : 'stock-ok';
            const imgId = `img-${item.id}`;

            if (activeTab === 'characters') {
                el.innerHTML = `
                    <div><img id="${imgId}" src="https://placehold.co/400x400/eee/999?text=..." class="list-thumb"></div>
                    <div class="item-name" style="font-size:1.1rem;">${item.name}</div>
                    <div style="display:flex; justify-content:center; gap:8px;">
                        <button class="btn-icon view-btn" title="Ver Detalles"><i class="fa-solid fa-eye"></i></button>
                        <button class="btn-icon edit-btn" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon delete-btn" title="Eliminar" style="color:#d32f2f; border-color:#ef9a9a;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
            } else {
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
            }

            el.querySelector('.view-btn').addEventListener('click', (e) => { e.stopPropagation(); showModal(item); });
            el.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); openEditModal(item); });
            el.querySelector('.delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('¿Eliminar permanentemente?')) {
                    try {
                        await db.deleteItem(item.id);
                        tablewareData = tablewareData.filter(i => i.id !== item.id);
                        renderCatalog(searchInput ? searchInput.value : '');
                    } catch (err) { console.error(err); alert('Error al eliminar'); }
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

    function openEditModal(item) {
        const modal = document.getElementById('addModal');
        const form = document.getElementById('addItemForm');
        form.reset();

        const isCharMode = currentTab === 'characters' || (item && item.category === 'Personajes');
        const techFields = document.getElementById('techFields');
        const charFields = document.getElementById('charFields');

        // Toggle Fields
        if (isCharMode) {
            techFields.classList.add('hidden');
            charFields.classList.remove('hidden');
            document.getElementById('formModeTitle').innerText = item ? "Editar Personaje" : "Nuevo Personaje";
            // Pre-set category hidden specific logic will be handled on save or by user context
        } else {
            techFields.classList.remove('hidden');
            charFields.classList.add('hidden');
            document.getElementById('formModeTitle').innerText = item ? "Editar: " + item.name : "Nuevo Artefacto";
        }

        // Fill Data
        if (item) {
            document.getElementById('editId').value = item.id;
            form.name.value = item.name;
            form.description.value = item.description;

            if (isCharMode) {
                form.history.value = item.history || '';
                form.category.value = 'Personajes'; // Ensure category is set for characters
            } else {
                form.category.value = item.category;
                form.stock.value = item.stock.current;

                if (item.dimensions) {
                    form.dim_h.value = item.dimensions.height || '';
                    form.dim_w.value = item.dimensions.width || '';
                    form.dim_d.value = item.dimensions.depth || '';
                    form.capacity.value = item.dimensions.capacity || '';
                }
                form.material.value = item.materials || '';
                if (item.manufacturing) {
                    form.manufacturer.value = item.manufacturing.manufacturer || '';
                    form.files.value = item.manufacturing.productionFiles || '';
                }
            }
        } else {
            document.getElementById('editId').value = "";
            if (isCharMode) {
                form.category.value = 'Personajes'; // Default for new characters
            } else {
                form.category.value = 'General'; // Default for new items
            }
        }
        modal.classList.remove('hidden');
    }

    // --- Modal Logic (Utilities) ---
    const detailModal = document.getElementById('itemModal');
    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal || e.target.classList.contains('close-btn')) {
                detailModal.classList.add('hidden');
            }
        });
    }

    // --- Detail Modal with Logs ---
    let currentDetailItem = null;

    function showModal(item) {
        currentDetailItem = item; // Critical for Logs
        const modal = document.getElementById('itemModal');
        const modalImg = document.getElementById('modalImg');
        const modalTitle = document.getElementById('modalTitle');
        const modalDetails = document.getElementById('modalDetails');

        modalTitle.innerText = item.name;
        // const logContainer = ... (already retrieved inside renderLogs)

        // Handle Image
        if (item.image && item.image.startsWith('DB_IMAGE:')) {
            modalImg.src = 'https://placehold.co/400x400/eee/999?text=Cargando...';
            resolveImage(item).then(url => modalImg.src = url);
        } else {
            modalImg.src = item.image || 'https://placehold.co/400x400?text=No+Img';
        }

        // Render Logs
        renderLogs(item.logs || [], item.comments);

        // Basic Info
        // Info Content based on Type
        let html;
        if (item.category === 'Personajes') {
            html = `
                <div class="section-title" style="margin-top:0;">Descripción</div>
                <p style="margin-bottom:15px; line-height:1.5;">${item.description || 'Sin descripción.'}</p>
                
                <div class="section-title">Historia / Lore</div>
                <p style="white-space: pre-line; line-height:1.6;">${item.history || 'Sin historia registrada.'}</p>
            `;
        } else {
            html = `
                <div style="margin-bottom:15px;">${item.description || ''}</div>

                <div class="section-title" style="margin-top:0;">Estado</div>
                <div class="spec-row">
                    <span>Disponibilidad</span> 
                    <strong style="color:${item.stock.current < item.stock.minLevel ? '#d32f2f' : '#2e7d32'};">
                        ${item.stock.status} (${item.stock.current} unid.)
                    </strong>
                </div>

                <div class="section-title">Especificaciones</div>
                <div class="spec-row">
                    <span>Medidas</span> 
                    <strong>${item.dimensions ? (item.dimensions.width || '-') + ' x ' + (item.dimensions.height || '-') + ' x ' + (item.dimensions.depth || '-') + ' cm' : '-'}</strong>
                </div>
                <div class="spec-row"><span>Capacidad</span> <strong>${item.dimensions?.capacity || '-'}</strong></div>
                <div class="spec-row"><span>Material</span> <strong>${item.materials || '-'}</strong></div>

                <div class="section-title">Producción</div>
                <div class="spec-row"><span>Fabricante</span> <strong>${item.manufacturing?.manufacturer || '-'}</strong></div>
                <div class="spec-row"><span>Archivo CAD</span> ${item.manufacturing?.productionFiles ? `<a href="${item.manufacturing.productionFiles}" target="_blank" rel="noopener noreferrer" style="color:var(--primary);">Descargar</a>` : '-'}</div>
            `;
        }
        modalDetails.innerHTML = html;
        modal.classList.remove('hidden');
    }

    function renderLogs(logs, legacyComment) {
        const container = document.getElementById('logContainer');
        container.innerHTML = '';

        let allLogs = [...(logs || [])];

        // If legacy comment exists and not in logs, show it as first entry
        if (legacyComment && allLogs.length === 0) {
            allLogs.push({ date: new Date().toISOString(), author: 'Sistema', text: legacyComment });
        }

        if (allLogs.length === 0) {
            container.innerHTML = '<p style="color:#999; text-align:center;">Sin comentarios aún.</p>';
            return;
        }

        // Sort by date desc
        allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

        allLogs.forEach(log => {
            const dateStr = new Date(log.date).toLocaleDateString() + ' ' + new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const div = document.createElement('div');
            div.style.marginBottom = '8px';
            div.style.borderBottom = '1px solid #eee';
            div.style.paddingBottom = '4px';
            div.innerHTML = `
                <div style="font-weight:bold; font-size:0.8rem; color:var(--primary); display:flex; justify-content:space-between;">
                    <span>${log.author || 'Anónimo'}</span>
                    <span style="font-weight:normal; color:#999;">${dateStr}</span>
                </div>
                <div style="color:#444;">${log.text}</div>
            `;
            container.appendChild(div);
        });
    }

    // Add Log Listener
    document.getElementById('btnAddLog').addEventListener('click', async () => {
        if (!currentDetailItem) return;

        const authorInput = document.getElementById('logAuthor');
        const textInput = document.getElementById('logText');

        const author = authorInput.value.trim();
        const text = textInput.value.trim();

        if (!text) {
            alert("Escribe un mensaje");
            return;
        }
        if (!author) {
            alert("Escribe tu nombre (autor)");
            return;
        }

        const newLog = {
            date: new Date().toISOString(),
            author: author,
            text: text
        };

        // Update Local
        if (!currentDetailItem.logs) currentDetailItem.logs = [];
        currentDetailItem.logs.push(newLog);

        // Update DB
        try {
            await db.updateItem(currentDetailItem);
            renderLogs(currentDetailItem.logs);
            textInput.value = '';
            // Optional: keep author or clear
        } catch (e) {
            console.error(e);
            alert("Error al guardar comentario");
        }
    });

    function replaceContent(element) {
        const contentContainer = document.getElementById('appContent');
        if (!contentContainer) return;
        contentContainer.innerHTML = '';
        contentContainer.appendChild(element);
    }
});
