
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBq4Y-zfQvksbFe36vb0pjagNu8poHvjyg",
    authDomain: "speed-dashboard-8a1a9.firebaseapp.com",
    projectId: "speed-dashboard-8a1a9",
    storageBucket: "speed-dashboard-8a1a9.firebasestorage.app",
    messagingSenderId: "650632424816",
    appId: "1:650632424816:web:bd37e796996ad3db9273b5",
    measurementId: "G-WDR0Z2EDHC"
};

class WonderDB {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
        this.auth = getAuth(this.app);
        this.docRef = null;
        this.ready = false;
    }

    async init() {
        try {
            console.log("🔮 Conectando a Wonderwoods Cloud...");
            await signInAnonymously(this.auth);

            // Usaremos un documento fijo para este catálogo para simplificar
            // Colección: 'wonderwoods_catalog' -> Documento: 'master_list'
            this.docRef = doc(this.db, "wonderwoods_catalog", "master_list");

            // Verificar si existe, si no, crearlo vacío
            const snap = await getDoc(this.docRef);
            if (!snap.exists()) {
                await setDoc(this.docRef, {
                    items: [],
                    created: new Date().toISOString()
                });
                console.log("✨ Nuevo catálogo maestro creado.");
            } else {
                console.log("✅ Catálogo maestro cargado.");
            }
            this.ready = true;
            return true;
        } catch (e) {
            console.error("Connection Error:", e);
            return false;
        }
    }

    // --- Data Methods ---

    async getItems() {
        if (!this.ready) await this.init();
        const snap = await getDoc(this.docRef);
        if (snap.exists()) {
            return snap.data().items || [];
        }
        return [];
    }

    async addItem(item) {
        if (!this.ready) await this.init();
        await updateDoc(this.docRef, {
            items: arrayUnion(item)
        });
    }

    async updateItem(updatedItem) {
        if (!this.ready) await this.init();
        const snap = await getDoc(this.docRef);
        if (snap.exists()) {
            const currentItems = snap.data().items || [];
            const newItems = currentItems.map(i => i.id === updatedItem.id ? updatedItem : i);
            await updateDoc(this.docRef, { items: newItems });
        }
    }

    async deleteItem(itemId) {
        if (!this.ready) await this.init();
        // Leemos todo, filtramos y guardamos. 
        // Es más seguro que arrayRemove cuando no tenemos el objeto exacto original.
        const snap = await getDoc(this.docRef);
        if (snap.exists()) {
            const currentItems = snap.data().items || [];
            const newItems = currentItems.filter(i => i.id !== itemId);
            await updateDoc(this.docRef, { items: newItems });
        }
    }

    // --- Image Handling (Optimized) ---
    // Guardamos las imágenes en una subcolección 'images' para no saturar el doc principal

    async saveImage(id, file) {
        if (!this.ready) await this.init();
        try {
            console.log("Comprimiendo imagen...");
            const base64 = await this.optimizeImage(file);
            const imgRef = doc(this.db, "wonderwoods_catalog", "master_list", "images", id);
            await setDoc(imgRef, {
                content: base64,
                uploaded: new Date().toISOString()
            });
            return true;
        } catch (e) {
            console.error("Error guardando imagen:", e);
            return false;
        }
    }

    async getImage(id) {
        if (!this.ready) await this.init();
        try {
            const imgRef = doc(this.db, "wonderwoods_catalog", "master_list", "images", id);
            const snap = await getDoc(imgRef);
            if (snap.exists()) {
                return snap.data().content;
            }
        } catch (e) { console.error(e); }
        return null;
    }

    optimizeImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1024;
                    const MAX_HEIGHT = 1024;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Comprimir a JPEG 0.7
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = (e) => reject(e);
            };
            reader.onerror = (e) => reject(e);
        });
    }
}

export const db = new WonderDB();
