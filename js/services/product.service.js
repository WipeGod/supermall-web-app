/**
 * Product Service for SuperMall Web Application
 * Handles all product-related operations
 */
class ProductService {
    constructor(firebaseService) {
        this.firebase = firebaseService;
    }

    /**
     * Create a new product
     * @param {Object} productData - Product data
     * @returns {Promise<string>} Product ID
     */
    async createProduct(productData) {
        const startTime = performance.now();
        
        try {
            Logger.info('Creating new product', productData);
            Logger.userAction('product_create_attempt', { productName: productData.name });

            // Validate product data
            this.validateProductData(productData);

            const productId = await this.firebase.create('products', {
                ...productData,
                isActive: true,
                createdBy: this.getCurrentUserId(),
                stats: {
                    views: 0,
                    purchases: 0,
                    rating: 0,
                    reviews: 0
                }
            });

            Logger.performance('Product creation', startTime, { productId });
            Logger.info('Product created successfully', { productId, productName: productData.name });
            Logger.userAction('product_create_success', { productId, productName: productData.name });

            return productId;
        } catch (error) {
            Logger.error('Failed to create product', { error: error.message, productData });
            Logger.userAction('product_create_failed', { productName: productData.name, error: error.message });
            throw error;
        }
    }

    /**
     * Get products with optional filters
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} Array of products
     */
    async getProducts(filters = {}) {
        const startTime = performance.now();
        
        try {
            Logger.info('Fetching products', filters);

            const products = await this.firebase.query('products', {
                ...filters,
                isActive: filters.includeInactive ? undefined : true
            });

            // Sort products by relevance
            const sortedProducts = this.sortProducts(products, filters.sortBy || 'name');

            Logger.performance('Product fetch', startTime, { count: sortedProducts.length, filters });
            Logger.info('Products fetched successfully', { count: sortedProducts.length });

            return sortedProducts;
        } catch (error) {
            Logger.error('Failed to fetch products', { error: error.message, filters });
            throw error;
        }
    }

    /**
     * Get product by ID
     * @param {string} productId - Product ID
     * @returns {Promise<Object>} Product object
     */
    async getProductById(productId) {
        const startTime = performance.now();
        
        try {
            Logger.info('Fetching product by ID', { productId });

            const product = await this.firebase.read('products', productId);
            
            if (!product) {
                throw new Error('Product not found');
            }

            // Increment view count
            await this.incrementProductViews(productId);

            Logger.performance('Product fetch by ID', startTime, { productId });
            Logger.info('Product fetched successfully', { productId, productName: product.name });

            return product;
        } catch (error) {
            Logger.error('Failed to fetch product', { error: error.message, productId });
            throw error;
        }
    }

    /**
     * Update product
     * @param {string} productId - Product ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<void>}
     */
    async updateProduct(productId, updateData) {
        const startTime = performance.now();
        
        try {
            Logger.info('Updating product', { productId, updateData });
            Logger.userAction('product_update_attempt', { productId });

            // Validate update data
            this.validateProductData(updateData, true);

            await this.firebase.update('products', productId, {
                ...updateData,
                updatedBy: this.getCurrentUserId()
            });

            Logger.performance('Product update', startTime, { productId });
            Logger.info('Product updated successfully', { productId });
            Logger.userAction('product_update_success', { productId });
        } catch (error) {
            Logger.error('Failed to update product', { error: error.message, productId, updateData });
            Logger.userAction('product_update_failed', { productId, error: error.message });
            throw error;
        }
    }

    /**
     * Delete product
     * @param {string} productId - Product ID
     * @returns {Promise<void>}
     */
    async deleteProduct(productId) {
        const startTime = performance.now();
        
        try {
            Logger.info('Deleting product', { productId });
            Logger.userAction('product_delete_attempt', { productId });

            // Soft delete - mark as inactive instead of hard delete
            await this.firebase.update('products', productId, {
                isActive: false,
                deletedAt: new Date().toISOString(),
                deletedBy: this.getCurrentUserId()
            });

            Logger.performance('Product deletion', startTime, { productId });
            Logger.info('Product deleted successfully', { productId });
            Logger.userAction('product_delete_success', { productId });
        } catch (error) {
            Logger.error('Failed to delete product', { error: error.message, productId });
            Logger.userAction('product_delete_failed', { productId, error: error.message });
            throw error;
        }
    }

    /**
     * Search products
     * @param {string} query - Search query
     * @param {Object} filters - Additional filters
     * @returns {Promise<Array>} Array of matching products
     */
    async searchProducts(query, filters = {}) {
        const startTime = performance.now();
        
        try {
            Logger.info('Searching products', { query, filters });
            Logger.userAction('product_search', { query });

            const allProducts = await this.getProducts(filters);
            
            if (!query || query.trim() === '') {
                return allProducts;
            }

            const searchTerm = query.toLowerCase().trim();
            const matchingProducts = allProducts.filter(product => {
                return (
                    product.name.toLowerCase().includes(searchTerm) ||
                    product.description.toLowerCase().includes(searchTerm) ||
                    product.category.toLowerCase().includes(searchTerm) ||
                    (product.specifications && 
                     Object.values(product.specifications).some(spec => 
                         spec.toString().toLowerCase().includes(searchTerm)
                     ))
                );
            });

            Logger.performance('Product search', startTime, { query, resultCount: matchingProducts.length });
            Logger.info('Product search completed', { query, resultCount: matchingProducts.length });

            return matchingProducts;
        } catch (error) {
            Logger.error('Product search failed', { error: error.message, query, filters });
            throw error;
        }
    }

    /**
     * Compare products
     * @param {Array} productIds - Array of product IDs to compare
     * @returns {Promise<Object>} Comparison data
     */
    async compareProducts(productIds) {
        const startTime = performance.now();
        
        try {
            Logger.info('Comparing products', { productIds });
            Logger.userAction('product_compare', { productIds, count: productIds.length });

            if (productIds.length < 2) {
                throw new Error('At least 2 products are required for comparison');
            }

            if (productIds.length > 4) {
                throw new Error('Maximum 4 products can be compared at once');
            }

            const products = await Promise.all(
                productIds.map(id => this.firebase.read('products', id))
            );
            
            const validProducts = products.filter(p => p !== null);
            
            if (validProducts.length < 2) {
                throw new Error('At least 2 valid products are required for comparison');
            }

            const comparison = {
                products: validProducts,
                comparison: {
                    priceRange: {
                        min: Math.min(...validProducts.map(p => p.price)),
                        max: Math.max(...validProducts.map(p => p.price)),
                        average: validProducts.reduce((sum, p) => sum + p.price, 0) / validProducts.length
                    },
                    features: this.extractCommonFeatures(validProducts),
                    categories: [...new Set(validProducts.map(p => p.category))],
                    shops: [...new Set(validProducts.map(p => p.shopId))],
                    availability: {
                        inStock: validProducts.filter(p => p.stock > 0).length,
                        outOfStock: validProducts.filter(p => p.stock === 0).length
                    }
                },
                metadata: {
                    comparedAt: new Date().toISOString(),
                    comparedBy: this.getCurrentUserId()
                }
            };
            
            Logger.performance('Product comparison', startTime, { productCount: validProducts.length });
            Logger.info('Product comparison completed', { productCount: validProducts.length });
            
            return comparison;
        } catch (error) {
            Logger.error('Failed to compare products', { error: error.message, productIds });
            throw error;
        }
    }

    /**
     * Get products by category
     * @param {string} category - Category name
     * @returns {Promise<Array>} Array of products
     */
    async getProductsByCategory(category) {
        try {
            Logger.info('Fetching products by category', { category });
            return await this.getProducts({ category });
        } catch (error) {
            Logger.error('Failed to fetch products by category', { error: error.message, category });
            throw error;
        }
    }

    /**
     * Get products by shop
     * @param {string} shopId - Shop ID
     * @returns {Promise<Array>} Array of products
     */
    async getProductsByShop(shopId) {
        try {
            Logger.info('Fetching products by shop', { shopId });
            return await this.getProducts({ shopId });
        } catch (error) {
            Logger.error('Failed to fetch products by shop', { error: error.message, shopId });
            throw error;
        }
    }

    /**
     * Get products in price range
     * @param {number} minPrice - Minimum price
     * @param {number} maxPrice - Maximum price
     * @returns {Promise<Array>} Array of products
     */
    async getProductsByPriceRange(minPrice, maxPrice) {
        try {
            Logger.info('Fetching products by price range', { minPrice, maxPrice });
            return await this.getProducts({ priceRange: { min: minPrice, max: maxPrice } });
        } catch (error) {
            Logger.error('Failed to fetch products by price range', { error: error.message, minPrice, maxPrice });
            throw error;
        }
    }

    /**
     * Update product stock
     * @param {string} productId - Product ID
     * @param {number} quantity - New stock quantity
     * @returns {Promise<void>}
     */
    async updateStock(productId, quantity) {
        try {
            Logger.info('Updating product stock', { productId, quantity });
            Logger.userAction('product_stock_update', { productId, quantity });

            if (quantity < 0) {
                throw new Error('Stock quantity cannot be negative');
            }

            await this.firebase.update('products', productId, {
                stock: quantity,
                stockUpdatedAt: new Date().toISOString(),
                stockUpdatedBy: this.getCurrentUserId()
            });

            Logger.info('Product stock updated successfully', { productId, quantity });
            Logger.userAction('product_stock_update_success', { productId, quantity });
        } catch (error) {
            Logger.error('Failed to update product stock', { error: error.message, productId, quantity });
            Logger.userAction('product_stock_update_failed', { productId, error: error.message });
            throw error;
        }
    }

    /**
     * Get low stock products
     * @param {number} threshold - Stock threshold (default: 10)
     * @returns {Promise<Array>} Array of low stock products
     */
    async getLowStockProducts(threshold = 10) {
        try {
            Logger.info('Fetching low stock products', { threshold });

            const allProducts = await this.getProducts();
            const lowStockProducts = allProducts.filter(product => 
                product.stock <= threshold && product.stock > 0
            );

            Logger.info('Low stock products fetched', { count: lowStockProducts.length, threshold });
            return lowStockProducts;
        } catch (error) {
            Logger.error('Failed to fetch low stock products', { error: error.message, threshold });
            throw error;
        }
    }

    /**
     * Get out of stock products
     * @returns {Promise<Array>} Array of out of stock products
     */
    async getOutOfStockProducts() {
        try {
            Logger.info('Fetching out of stock products');

            const allProducts = await this.getProducts();
            const outOfStockProducts = allProducts.filter(product => product.stock === 0);

            Logger.info('Out of stock products fetched', { count: outOfStockProducts.length });
            return outOfStockProducts;
        } catch (error) {
            Logger.error('Failed to fetch out of stock products', { error: error.message });
            throw error;
        }
    }

        /**
     * Extract common features from products for comparison
     * @param {Array} products - Array of products
     * @returns {Object} Common features
     */
    extractCommonFeatures(products) {
        const allFeatures = products.reduce((acc, product) => {
            if (product.specifications) {
                Object.keys(product.specifications).forEach(key => {
                    if (!acc[key]) acc[key] = [];
                    acc[key].push({
                        productId: product.id,
                        productName: product.name,
                        value: product.specifications[key]
                    });
                });
            }
            return acc;
        }, {});
        
        // Only return features that exist in at least 2 products
        const commonFeatures = {};
        Object.keys(allFeatures).forEach(key => {
            if (allFeatures[key].length >= 2) {
                commonFeatures[key] = allFeatures[key];
            }
        });
        
        return commonFeatures;
    }

    /**
     * Increment product view count
     * @param {string} productId - Product ID
     * @returns {Promise<void>}
     */
    async incrementProductViews(productId) {
        try {
            const product = await this.firebase.read('products', productId);
            if (product) {
                const currentViews = product.stats?.views || 0;
                await this.firebase.update('products', productId, {
                    'stats.views': currentViews + 1,
                    'stats.lastViewed': new Date().toISOString()
                });
            }
        } catch (error) {
            Logger.error('Failed to increment product views', { error: error.message, productId });
            // Don't throw error as this is not critical
        }
    }

    /**
     * Validate product data
     * @param {Object} productData - Product data to validate
     * @param {boolean} isUpdate - Whether this is an update operation
     */
    validateProductData(productData, isUpdate = false) {
        const requiredFields = isUpdate ? [] : ['name', 'description', 'price', 'category', 'shopId', 'stock'];
        
        for (const field of requiredFields) {
            if (productData[field] === undefined || productData[field] === null) {
                throw new Error(`${field} is required`);
            }
        }

        if (productData.name && productData.name.trim().length < 2) {
            throw new Error('Product name must be at least 2 characters long');
        }

        if (productData.description && productData.description.trim().length < 10) {
            throw new Error('Product description must be at least 10 characters long');
        }

        if (productData.price !== undefined && (productData.price < 0 || isNaN(productData.price))) {
            throw new Error('Price must be a valid positive number');
        }

        if (productData.stock !== undefined && (productData.stock < 0 || !Number.isInteger(productData.stock))) {
            throw new Error('Stock must be a valid non-negative integer');
        }
    }

    /**
     * Sort products based on criteria
     * @param {Array} products - Array of products
     * @param {string} sortBy - Sort criteria
     * @returns {Array} Sorted products
     */
    sortProducts(products, sortBy) {
        switch (sortBy) {
            case 'name':
                return products.sort((a, b) => a.name.localeCompare(b.name));
            case 'price_low':
                return products.sort((a, b) => a.price - b.price);
            case 'price_high':
                return products.sort((a, b) => b.price - a.price);
            case 'category':
                return products.sort((a, b) => a.category.localeCompare(b.category));
            case 'newest':
                return products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            case 'oldest':
                return products.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            case 'stock':
                return products.sort((a, b) => b.stock - a.stock);
            case 'views':
                return products.sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0));
            case 'rating':
                return products.sort((a, b) => (b.stats?.rating || 0) - (a.stats?.rating || 0));
            default:
                return products;
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
    module.exports = ProductService;
}
