/**
 * Shop Service for SuperMall Web Application
 * Handles all shop-related operations
 */
class ShopService {
    constructor(firebaseService) {
        this.firebase = firebaseService;
    }

    /**
     * Create a new shop
     * @param {Object} shopData - Shop data
     * @returns {Promise<string>} Shop ID
     */
    async createShop(shopData) {
        const startTime = performance.now();
        
        try {
            Logger.info('Creating new shop', shopData);
            Logger.userAction('shop_create_attempt', { shopName: shopData.name });

            // Validate shop data
            this.validateShopData(shopData);

            const shopId = await this.firebase.create('shops', {
                ...shopData,
                isActive: true,
                createdBy: this.getCurrentUserId(),
                stats: {
                    totalProducts: 0,
                    totalOffers: 0,
                    views: 0,
                    rating: 0,
                    reviews: 0
                }
            });

            Logger.performance('Shop creation', startTime, { shopId });
            Logger.info('Shop created successfully', { shopId, shopName: shopData.name });
            Logger.userAction('shop_create_success', { shopId, shopName: shopData.name });

            return shopId;
        } catch (error) {
            Logger.error('Failed to create shop', { error: error.message, shopData });
            Logger.userAction('shop_create_failed', { shopName: shopData.name, error: error.message });
            throw error;
        }
    }

    /**
     * Get shops with optional filters
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} Array of shops
     */
    async getShops(filters = {}) {
        const startTime = performance.now();
        
        try {
            Logger.info('Fetching shops', filters);

            const shops = await this.firebase.query('shops', {
                ...filters,
                isActive: filters.includeInactive ? undefined : true
            });

            // Sort shops by relevance
            const sortedShops = this.sortShops(shops, filters.sortBy || 'name');

            Logger.performance('Shop fetch', startTime, { count: sortedShops.length, filters });
            Logger.info('Shops fetched successfully', { count: sortedShops.length });

            return sortedShops;
        } catch (error) {
            Logger.error('Failed to fetch shops', { error: error.message, filters });
            throw error;
        }
    }

    /**
     * Get shop by ID
     * @param {string} shopId - Shop ID
     * @returns {Promise<Object>} Shop object
     */
    async getShopById(shopId) {
        const startTime = performance.now();
        
        try {
            Logger.info('Fetching shop by ID', { shopId });

            const shop = await this.firebase.read('shops', shopId);
            
            if (!shop) {
                throw new Error('Shop not found');
            }

            // Increment view count
            await this.incrementShopViews(shopId);

            Logger.performance('Shop fetch by ID', startTime, { shopId });
            Logger.info('Shop fetched successfully', { shopId, shopName: shop.name });

            return shop;
        } catch (error) {
            Logger.error('Failed to fetch shop', { error: error.message, shopId });
            throw error;
        }
    }

    /**
     * Update shop
     * @param {string} shopId - Shop ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<void>}
     */
    async updateShop(shopId, updateData) {
        const startTime = performance.now();
        
        try {
            Logger.info('Updating shop', { shopId, updateData });
            Logger.userAction('shop_update_attempt', { shopId });

            // Validate update data
            this.validateShopData(updateData, true);

            await this.firebase.update('shops', shopId, {
                ...updateData,
                updatedBy: this.getCurrentUserId()
            });

            Logger.performance('Shop update', startTime, { shopId });
            Logger.info('Shop updated successfully', { shopId });
            Logger.userAction('shop_update_success', { shopId });
        } catch (error) {
            Logger.error('Failed to update shop', { error: error.message, shopId, updateData });
            Logger.userAction('shop_update_failed', { shopId, error: error.message });
            throw error;
        }
    }

    /**
     * Delete shop
     * @param {string} shopId - Shop ID
     * @returns {Promise<void>}
     */
    async deleteShop(shopId) {
        const startTime = performance.now();
        
        try {
            Logger.info('Deleting shop', { shopId });
            Logger.userAction('shop_delete_attempt', { shopId });

            // Check if shop has products
            const products = await this.firebase.query('products', { shopId });
            if (products.length > 0) {
                throw new Error('Cannot delete shop with existing products. Please remove all products first.');
            }

            // Soft delete - mark as inactive instead of hard delete
            await this.firebase.update('shops', shopId, {
                isActive: false,
                deletedAt: new Date().toISOString(),
                deletedBy: this.getCurrentUserId()
            });

            Logger.performance('Shop deletion', startTime, { shopId });
            Logger.info('Shop deleted successfully', { shopId });
            Logger.userAction('shop_delete_success', { shopId });
        } catch (error) {
            Logger.error('Failed to delete shop', { error: error.message, shopId });
            Logger.userAction('shop_delete_failed', { shopId, error: error.message });
            throw error;
        }
    }

    /**
     * Get shops by category
     * @param {string} category - Category name
     * @returns {Promise<Array>} Array of shops
     */
    async getShopsByCategory(category) {
        try {
            Logger.info('Fetching shops by category', { category });

            return await this.getShops({ category });
        } catch (error) {
            Logger.error('Failed to fetch shops by category', { error: error.message, category });
            throw error;
        }
    }

    /**
     * Get shops by floor
     * @param {number} floor - Floor number
     * @returns {Promise<Array>} Array of shops
     */
    async getShopsByFloor(floor) {
        try {
            Logger.info('Fetching shops by floor', { floor });

            return await this.getShops({ floor });
        } catch (error) {
            Logger.error('Failed to fetch shops by floor', { error: error.message, floor });
            throw error;
        }
    }

    /**
     * Search shops
     * @param {string} query - Search query
     * @param {Object} filters - Additional filters
     * @returns {Promise<Array>} Array of matching shops
     */
    async searchShops(query, filters = {}) {
        const startTime = performance.now();
        
        try {
            Logger.info('Searching shops', { query, filters });
            Logger.userAction('shop_search', { query });

            const allShops = await this.getShops(filters);
            
            if (!query || query.trim() === '') {
                return allShops;
            }

            const searchTerm = query.toLowerCase().trim();
            const matchingShops = allShops.filter(shop => {
                return (
                    shop.name.toLowerCase().includes(searchTerm) ||
                    shop.description.toLowerCase().includes(searchTerm) ||
                    shop.category.toLowerCase().includes(searchTerm) ||
                    (shop.contact && shop.contact.email.toLowerCase().includes(searchTerm))
                );
            });

            Logger.performance('Shop search', startTime, { query, resultCount: matchingShops.length });
            Logger.info('Shop search completed', { query, resultCount: matchingShops.length });

            return matchingShops;
        } catch (error) {
            Logger.error('Shop search failed', { error: error.message, query, filters });
            throw error;
        }
    }

    /**
     * Get shop statistics
     * @param {string} shopId - Shop ID
     * @returns {Promise<Object>} Shop statistics
     */
    async getShopStats(shopId) {
        try {
            Logger.info('Fetching shop statistics', { shopId });

            const [shop, products, offers] = await Promise.all([
                this.firebase.read('shops', shopId),
                this.firebase.query('products', { shopId, isActive: true }),
                this.firebase.query('offers', { shopId, isActive: true })
            ]);

            if (!shop) {
                throw new Error('Shop not found');
            }

            const stats = {
                totalProducts: products.length,
                totalOffers: offers.length,
                activeProducts: products.filter(p => p.stock > 0).length,
                outOfStockProducts: products.filter(p => p.stock === 0).length,
                averagePrice: products.length > 0 ? 
                    products.reduce((sum, p) => sum + p.price, 0) / products.length : 0,
                totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0),
                views: shop.stats?.views || 0,
                rating: shop.stats?.rating || 0,
                reviews: shop.stats?.reviews || 0
            };

            Logger.info('Shop statistics fetched', { shopId, stats });
            return stats;
        } catch (error) {
            Logger.error('Failed to fetch shop statistics', { error: error.message, shopId });
            throw error;
        }
    }

    /**
     * Increment shop view count
     * @param {string} shopId - Shop ID
     * @returns {Promise<void>}
     */
    async incrementShopViews(shopId) {
        try {
            const shop = await this.firebase.read('shops', shopId);
            if (shop) {
                const currentViews = shop.stats?.views || 0;
                await this.firebase.update('shops', shopId, {
                    'stats.views': currentViews + 1,
                    'stats.lastViewed': new Date().toISOString()
                });
            }
        } catch (error) {
            Logger.error('Failed to increment shop views', { error: error.message, shopId });
            // Don't throw error as this is not critical
        }
    }

    /**
     * Validate shop data
     * @param {Object} shopData - Shop data to validate
     * @param {boolean} isUpdate - Whether this is an update operation
     */
    validateShopData(shopData, isUpdate = false) {
        const requiredFields = isUpdate ? [] : ['name', 'description', 'category', 'floor', 'contact'];
        
        for (const field of requiredFields) {
            if (!shopData[field]) {
                throw new Error(`${field} is required`);
            }
        }

        if (shopData.name && shopData.name.trim().length < 2) {
            throw new Error('Shop name must be at least 2 characters long');
        }

        if (shopData.description && shopData.description.trim().length < 10) {
            throw new Error('Shop description must be at least 10 characters long');
        }

        if (shopData.floor && (shopData.floor < 1 || shopData.floor > 10)) {
            throw new Error('Floor must be between 1 and 10');
        }

                if (shopData.contact) {
            if (shopData.contact.email && !isValidEmail(shopData.contact.email)) {
                throw new Error('Invalid email format');
            }
            if (shopData.contact.phone && !isValidPhone(shopData.contact.phone)) {
                throw new Error('Invalid phone number format');
            }
        }
    }

    /**
     * Sort shops based on criteria
     * @param {Array} shops - Array of shops
     * @param {string} sortBy - Sort criteria
     * @returns {Array} Sorted shops
     */
    sortShops(shops, sortBy) {
        switch (sortBy) {
            case 'name':
                return shops.sort((a, b) => a.name.localeCompare(b.name));
            case 'category':
                return shops.sort((a, b) => a.category.localeCompare(b.category));
            case 'floor':
                return shops.sort((a, b) => a.floor - b.floor);
            case 'newest':
                return shops.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            case 'oldest':
                return shops.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            case 'views':
                return shops.sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0));
            case 'rating':
                return shops.sort((a, b) => (b.stats?.rating || 0) - (a.stats?.rating || 0));
            default:
                return shops;
        }
    }

    /**
     * Get current user ID
     * @returns {string} Current user ID
     */
    getCurrentUserId() {
        try {
            const user = JSON.parse(localStorage.getItem('supermall_current_user') || '{}');
            return user.uid || 'anonymous';
        } catch {
            return 'anonymous';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShopService;
}
