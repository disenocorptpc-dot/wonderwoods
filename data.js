export const tablewareData = [
    {
        id: "woodrow-bowl-001",
        name: "Tree Stump Character Bowl",
        category: "Fun Dishes",
        description: "A ceramic bowl shaped like a friendly tree stump, featuring the face of Woodrow. Used for soups and cereals.",
        dimensions: {
            height: "15cm",
            width: "18cm",
            depth: "14cm",
            capacity: "450ml",
            weight: "550g"
        },
        materials: "High-quality stoneware ceramic, food-safe glaze.",
        manufacturing: {
            process: "Slip casting with hand-painted detailing. Kiln fired at 1200°C.",
            manufacturer: "ForestClay Creations",
            currentProvider: "Global Imports Ltd.",
            productionFiles: "#"
        },
        stock: {
            current: 120,
            minLevel: 50,
            status: "In Stock"
        },
        image: "https://placehold.co/400x400/5D4037/FFF?text=Woodrow+Bowl",
        comments: "Handle with care, especially the branch handles. Dishwasher safe."
    },
    {
        id: "mushroom-plate-002",
        name: "Enchanted Mushroom Platter",
        category: "Main Courses",
        description: "Large serving platter with distinct red and white mushroom cap patterns on the rim.",
        dimensions: {
            diameter: "30cm",
            height: "3cm",
            weight: "700g"
        },
        materials: "Porcelain, high-gloss finish.",
        manufacturing: {
            process: "Press molding.",
            manufacturer: "Mystic Tableware Co.",
            currentProvider: "Mystic Tableware Co.",
            productionFiles: "#"
        },
        stock: {
            current: 45,
            minLevel: 60,
            status: "Low Stock"
        },
        image: "https://placehold.co/400x400/2E7D32/FFF?text=Mushroom+Plate",
        comments: "Glaze can chip if stacked too high. Maximum stack: 10."
    }
];

export const characterData = [
    {
        id: "char-woodrow",
        name: "Woodrow the Wandering Oak",
        role: "Guardian of the Grove",
        description: "A wise and ancient oak brought to life. He shares ancient tales and secrets with curious travelers.",
        personality: "Gentle giant, patient, wise, playful. Speaks in rhymes.",
        origin: "Brought to life by the Heart of the Forest.",
        relatedItems: ["woodrow-bowl-001"],
        image: "https://placehold.co/400x600/3E2723/FFF?text=Woodrow",
        details: [
            { label: 'Rol', value: 'Guardian of the Grove' },
            { label: 'Personalidad', value: 'Gentle giant, patient, wise' },
            { label: 'Origen', value: 'Heart of the Forest' }
        ]
    },
    {
        id: "char-pixel",
        name: "Pixel the Firefly",
        role: "Navigator",
        description: "A hyperactive firefly that lights up the darkest paths of Wonderwoods.",
        personality: "Energetic, easily distracted, loyal.",
        origin: "Born from a fallen star fragment.",
        relatedItems: [],
        image: "https://placehold.co/400x600/FFD700/000?text=Pixel",
        details: [
            { label: 'Rol', value: 'Navigator' },
            { label: 'Personalidad', value: 'Energetic, loyal' },
            { label: 'Origen', value: 'Star fragment' }
        ]
    }
];
