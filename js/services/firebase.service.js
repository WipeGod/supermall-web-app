/**
 * Firebase Service for SuperMall Web Application
 * Handles all Firebase operations including Firestore, Auth, and Storage
 */
class FirebaseService {
    constructor() {
        this.collections = {
            users: 'supermall_users',
            shops: 'supermall_shops',
            products: 'supermall_products',
            categories: 'supermall_categories',
            offers: 'supermall_offers',
            logs: 'supermall_logs'
        };
        
        this.isFirebaseAvailable = false;
        this.initializeFirebase();
        this.initializeDemoData();
    }

    /**
     * Initialize Firebase connection
     */
    initializeFirebase() {
        try {
        // Firebase configuration
            const firebaseConfig = {
                apiKey: "AIzaSyAhzRpaJvGudEsav2jDDOzxkI3HMxKvndQ",
                authDomain: "supermallweb-cd3ad.firebaseapp.com",
                projectId: "supermallweb-cd3ad",
                storageBucket: "supermallweb-cd3ad.firebasestorage.app",
                messagingSenderId: "227162077640",
                appId: "1:227162077640:web:3ab35c2c9d8fca2868e8fd",
                measurementId: "G-V4VHY33P5K"
            };

        // Check if Firebase is available
            if (typeof firebase !== 'undefined') {
                firebase.initializeApp(firebaseConfig);
                this.db = firebase.firestore();
                this.auth = firebase.auth();
                this.storage = firebase.storage();
                this.isFirebaseAvailable = false;
                Logger.info('Firebase initialized successfully');
            } else {
                Logger.warn('Firebase not available, using localStorage fallback');
                this.isFirebaseAvailable = false;
            }
        } catch (error) {
            Logger.error('Firebase initialization failed', error);
            this.isFirebaseAvailable = false;
        }
    }


    /**
     * Initialize demo data if collections are empty
     */
    initializeDemoData() {
        Logger.info('Initializing demo data');
        
        // Initialize categories
        if (!localStorage.getItem(this.collections.categories)) {
            const demoCategories = [
                {
                    id: '1',
                    name: 'Electronics',
                    description: 'Electronic gadgets and devices',
                    floor: 1,
                    icon: 'fas fa-laptop',
                    isActive: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    name: 'Clothing',
                    description: 'Fashion and apparel',
                    floor: 2,
                    icon: 'fas fa-tshirt',
                    isActive: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '3',
                    name: 'Food & Beverages',
                    description: 'Fresh food and drinks',
                    floor: 3,
                    icon: 'fas fa-utensils',
                    isActive: true,
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem(this.collections.categories, JSON.stringify(demoCategories));
        }

        // Initialize shops
        if (!localStorage.getItem(this.collections.shops)) {
            const demoShops = [
                {
                    id: '1',
                    name: 'Rural Electronics Hub',
                    description: 'Best electronic devices from rural manufacturers',
                    category: 'Electronics',
                    floor: 1,
                    location: {
                        address: '123 Main St, Rural Town',
                        coordinates: { lat: 40.7128, lng: -74.0060 }
                    },
                    contact: {
                        phone: '+1-555-0123',
                        email: 'info@ruralelectronics.com'
                    },
                    images: ['https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400'],
                    isActive: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    name: 'Village Textiles',
                    description: 'Handwoven textiles and traditional clothing',
                    category: 'Clothing',
                    floor: 2,
                    location: {
                        address: '456 Village Rd, Rural Town',
                        coordinates: { lat: 40.7589, lng: -73.9851 }
                    },
                    contact: {
                        phone: '+1-555-0456',
                        email: 'orders@villagetextiles.com'
                    },
                    images: ['https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400'],
                    isActive: true,
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem(this.collections.shops, JSON.stringify(demoShops));
        }

                // Initialize products
        if (!localStorage.getItem(this.collections.products)) {
            const demoProducts = [
                {
                    id: '1',
                    name: 'Organic Smartphone Case',
                    description: 'Eco-friendly smartphone case made from bamboo fiber',
                    price: 29.99,
                    category: 'Electronics',
                    shopId: '1',
                    images: ['https://images.unsplash.com/photo-1601593346740-925612772716?w=300'],
                    specifications: {
                        Material: 'Bamboo Fiber',
                        Compatibility: 'iPhone/Android',
                        Weight: '50g'
                    },
                    stock: 50,
                    isActive: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    name: 'Handwoven Cotton Shirt',
                    description: 'Traditional handwoven cotton shirt with modern design',
                    price: 45.00,
                    category: 'Clothing',
                    shopId: '2',
                    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300'],
                    specifications: {
                        Material: '100% Cotton',
                        Size: 'M/L/XL',
                        Care: 'Hand Wash'
                    },
                    stock: 25,
                    isActive: true,
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem(this.collections.products, JSON.stringify(demoProducts));
        }

        // Initialize offers
        if (!localStorage.getItem(this.collections.offers)) {
            const demoOffers = [
                {
                    id: '1',
                    title: 'Summer Sale - Electronics',
                    description: '20% off on all electronic items',
                    discount: 20,
                    shopId: '1',
                    productIds: ['1'],
                    validFrom: new Date().toISOString(),
                    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    isActive: true,
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem(this.collections.offers, JSON.stringify(demoOffers));
        }

        Logger.info('Demo data initialization completed');
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Create a new document
     * @param {string} collection - Collection name
     * @param {Object} data - Document data
     * @returns {Promise<string>} Document ID
     */
    async create(collection, data) {
        try {
            Logger.info(`Creating document in ${collection}`, data);
            
            if (this.isFirebaseAvailable) {
                const docRef = await this.db.collection(collection).add({
                    ...data,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                return docRef.id;
            } else {
                // localStorage fallback
                const collectionKey = this.collections[collection];
                const items = JSON.parse(localStorage.getItem(collectionKey) || '[]');
                
                const newItem = {
                    ...data,
                    id: this.generateId(),
                    createdAt: new Date().toISOString()
                };
                
                items.push(newItem);
                localStorage.setItem(collectionKey, JSON.stringify(items));
                
                return newItem.id;
            }
        } catch (error) {
            Logger.error(`Error creating document in ${collection}`, { error, data });
            throw error;
        }
    }

    /**
     * Read document(s) from collection
     * @param {string} collection - Collection name
     * @param {string} id - Document ID (optional)
     * @returns {Promise<Object|Array>} Document or array of documents
     */
    async read(collection, id = null) {
        try {
            if (this.isFirebaseAvailable) {
                if (id) {
                    const doc = await this.db.collection(collection).doc(id).get();
                    return doc.exists ? { id: doc.id, ...doc.data() } : null;
                } else {
                    const snapshot = await this.db.collection(collection).get();
                    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                }
            } else {
                // localStorage fallback
                const collectionKey = this.collections[collection];
                const items = JSON.parse(localStorage.getItem(collectionKey) || '[]');
                
                if (id) {
                    return items.find(item => item.id === id) || null;
                } else {
                    return items;
                }
            }
        } catch (error) {
            Logger.error(`Error reading from ${collection}`, { error, id });
            throw error;
        }
    }

    /**
     * Update a document
     * @param {string} collection - Collection name
     * @param {string} id - Document ID
     * @param {Object} data - Update data
     * @returns {Promise<void>}
     */
    async update(collection, id, data) {
        try {
            Logger.info(`Updating document ${id} in ${collection}`, data);
            
            if (this.isFirebaseAvailable) {
                await this.db.collection(collection).doc(id).update({
                    ...data,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // localStorage fallback
                const collectionKey = this.collections[collection];
                const items = JSON.parse(localStorage.getItem(collectionKey) || '[]');
                
                const index = items.findIndex(item => item.id === id);
                if (index !== -1) {
                    items[index] = {
                        ...items[index],
                        ...data,
                        updatedAt: new Date().toISOString()
                    };
                    localStorage.setItem(collectionKey, JSON.stringify(items));
                } else {
                    throw new Error('Document not found');
                }
            }
        } catch (error) {
            Logger.error(`Error updating document ${id} in ${collection}`, { error, data });
            throw error;
        }
    }

    /**
     * Query collection with filters
     * @param {string} collection - Collection name
     * @param {Object} filters - Query filters
     * @returns {Promise<Array>} Filtered documents
     */
    async query(collection, filters = {}) {
        try {
            Logger.info(`Querying ${collection}`, filters);
            
            const items = await this.read(collection);
            let filteredItems = [...items];

            // Apply filters
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                    filteredItems = filteredItems.filter(item => {
                        if (key === 'priceRange') {
                            const { min, max } = filters[key];
                            return (!min || item.price >= min) && (!max || item.price <= max);
                        } else if (key === 'isActive') {
                            return item[key] === filters[key];
                        } else {
                            return item[key] === filters[key];
                        }
                    });
                }
            });

            return filteredItems;
        } catch (error) {
            Logger.error(`Error querying ${collection}`, { error, filters });
            throw error;
        }
    }
}

// Make FirebaseService globally available
window.FirebaseService = FirebaseService;
