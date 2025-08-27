/**
 * Offer Service for SuperMall Web Application
 * Handles all offer-related operations
 */
class OfferService {
    constructor(firebaseService) {
        this.firebase = firebaseService;
    }

    /**
     * Create a new offer
     * @param {Object} offerData - Offer data
     * @returns {Promise<string>} Offer ID
     */
    async createOffer(offerData) {
        const startTime = performance.now();
        
        try {
            Logger.info('Creating new offer', offerData);
            Logger.userAction('offer_create_attempt', { offerTitle: offerData.title });

            // Validate offer data
            this.validateOfferData(offerData);

            const offerId = await this.firebase.create('offers', {
                ...offerData,
                isActive: true,
                createdBy: this.getCurrentUserId(),
                stats: {
                    views: 0,
                    clicks: 0,
                    conversions: 0
                }
            });

            Logger.performance('Offer creation', startTime, { offerId });
            Logger.info('Offer created successfully', { offerId, offerTitle: offerData.title });
            Logger.userAction('offer_create_success', { offerId, offerTitle: offerData.title });

            return offerId;
        } catch (error) {
            Logger.error('Failed to create offer', { error: error.message, offerData });
            Logger.userAction('offer_create_failed', { offerTitle: offerData.title, error: error.message });
            throw error;
        }
    }

    /**
     * Get offers with optional filters
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} Array of offers
     */
    async getOffers(filters = {}) {
        const startTime = performance.now();
        
        try {
            Logger.info('Fetching offers', filters);

            const offers = await this.firebase.query('offers', {
                ...filters,
                isActive: filters.includeInactive ? undefined : true
            });

            // Filter by date validity if not explicitly disabled
            const validOffers = filters.includeExpired ? offers : offers.filter(offer => {
                const now = new Date();
                const validFrom = new Date(offer.validFrom);
                const validTo = new Date(offer.validTo);
                return now >= validFrom && now <= validTo;
            });

            // Sort offers by relevance
            const sortedOffers = this.sortOffers(validOffers, filters.sortBy || 'newest');

            Logger.performance('Offer fetch', startTime, { count: sortedOffers.length, filters });
            Logger.info('Offers fetched successfully', { count: sortedOffers.length });

            return sortedOffers;
        } catch (error) {
            Logger.error('Failed to fetch offers', { error: error.message, filters });
            throw error;
        }
    }

    /**
     * Get active offers
     * @param {string} shopId - Optional shop ID filter
     * @returns {Promise<Array>} Array of active offers
     */
    async getActiveOffers(shopId = null) {
        const startTime = performance.now();
        
        try {
            Logger.info('Fetching active offers', { shopId });

            const filters = { isActive: true };
            if (shopId) {
                filters.shopId = shopId;
            }

            const offers = await this.getOffers(filters);
            
            Logger.performance('Active offers fetch', startTime, { count: offers.length, shopId });
            Logger.info('Active offers fetched successfully', { count: offers.length });

            return offers;
        } catch (error) {
            Logger.error('Failed to fetch active offers', { error: error.message, shopId });
            throw error;
        }
    }

    /**
     * Get offer by ID
     * @param {string} offerId - Offer ID
     * @returns {Promise<Object>} Offer object
     */
    async getOfferById(offerId) {
        const startTime = performance.now();
        
        try {
            Logger.info('Fetching offer by ID', { offerId });

            const offer = await this.firebase.read('offers', offerId);
            
            if (!offer) {
                throw new Error('Offer not found');
            }

            // Increment view count
            await this.incrementOfferViews(offerId);

            Logger.performance('Offer fetch by ID', startTime, { offerId });
            Logger.info('Offer fetched successfully', { offerId, offerTitle: offer.title });

            return offer;
        } catch (error) {
            Logger.error('Failed to fetch offer', { error: error.message, offerId });
            throw error;
        }
    }

    /**
     * Update offer
     * @param {string} offerId - Offer ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<void>}
     */
    async updateOffer(offerId, updateData) {
        const startTime = performance.now();
        
        try {
            Logger.info('Updating offer', { offerId, updateData });
            Logger.userAction('offer_update_attempt', { offerId });

            // Validate update data
            this.validateOfferData(updateData, true);

            await this.firebase.update('offers', offerId, {
                ...updateData,
                updatedBy: this.getCurrentUserId()
            });

            Logger.performance('Offer update', startTime, { offerId });
            Logger.info('Offer updated successfully', { offerId });
            Logger.userAction('offer_update_success', { offerId });
        } catch (error) {
            Logger.error('Failed to update offer', { error: error.message, offerId, updateData });
            Logger.userAction('offer_update_failed', { offerId, error: error.message });
            throw error;
        }
    }

    /**
     * Delete offer
     * @param {string} offerId - Offer ID
     * @returns {Promise<void>}
     */
    async deleteOffer(offerId) {
        const startTime = performance.now();
        
        try {
            Logger.info('Deleting offer', { offerId });
            Logger.userAction('offer_delete_attempt', { offerId });

            // Soft delete - mark as inactive instead of hard delete
            await this.firebase.update('offers', offerId, {
                isActive: false,
                deletedAt: new Date().toISOString(),
                deletedBy: this.getCurrentUserId()
            });

            Logger.performance('Offer deletion', startTime, { offerId });
            Logger.info('Offer deleted successfully', { offerId });
            Logger.userAction('offer_delete_success', { offerId });
        } catch (error) {
            Logger.error('Failed to delete offer', { error: error.message, offerId });
            Logger.userAction('offer_delete_failed', { offerId, error: error.message });
            throw error;
        }
    }

    /**
     * Get offers by shop
     * @param {string} shopId - Shop ID
     * @returns {Promise<Array>} Array of offers
     */
    async getOffersByShop(shopId) {
        try {
            Logger.info('Fetching offers by shop', { shopId });
            return await this.getOffers({ shopId });
        } catch (error) {
            Logger.error('Failed to fetch offers by shop', { error: error.message, shopId });
            throw error;
        }
    }

    /**
     * Get expiring offers
     * @param {number} days - Number of days to check (default: 7)
     * @returns {Promise<Array>} Array of expiring offers
     */
    async getExpiringOffers(days = 7) {
        try {
            Logger.info('Fetching expiring offers', { days });

            const allOffers = await this.getActiveOffers();
            const expiryThreshold = new Date();
            expiryThreshold.setDate(expiryThreshold.getDate() + days);

            const expiringOffers = allOffers.filter(offer => {
                const validTo = new Date(offer.validTo);
                return validTo <= expiryThreshold;
            });

            Logger.info('Expiring offers fetched', { count: expiringOffers.length, days });
            return expiringOffers;
        } catch (error) {
            Logger.error('Failed to fetch expiring offers', { error: error.message, days });
            throw error;
        }
    }

    /**
     * Get expired offers
     * @returns {Promise<Array>} Array of expired offers
     */
    async getExpiredOffers() {
        try {
            Logger.info('Fetching expired offers');

            const allOffers = await this.getOffers({ includeExpired: true });
            const now = new Date();

            const expiredOffers = allOffers.filter(offer => {
                const validTo = new Date(offer.validTo);
                return validTo < now;
            });

            Logger.info('Expired offers fetched', { count: expiredOffers.length });
            return expiredOffers;
        } catch (error) {
            Logger.error('Failed to fetch expired offers', { error: error.message });
            throw error;
        }
    }

    /**
     * Apply offer to products
     * @param {string} offerId - Offer ID
     * @param {Array} productIds - Array of product IDs
     * @returns {Promise<void>}
     */
    async applyOfferToProducts(offerId, productIds) {
        try {
            Logger.info('Applying offer to products', { offerId, productIds });
            Logger.userAction('offer_apply_to_products', { offerId, productCount: productIds.length });

            await this.firebase.update('offers', offerId, {
                productIds: productIds,
                appliedAt: new Date().toISOString(),
                appliedBy: this.getCurrentUserId()
            });

            Logger.info('Offer applied to products successfully', { offerId, productCount: productIds.length });
            Logger.userAction('offer_apply_success', { offerId, productCount: productIds.length });
        } catch (error) {
            Logger.error('Failed to apply offer to products', { error: error.message, offerId, productIds });
            Logger.userAction('offer_apply_failed', { offerId, error: error.message });
            throw error;
        }
    }

        /**
     * Track offer click
     * @param {string} offerId - Offer ID
     * @returns {Promise<void>}
     */
    async trackOfferClick(offerId) {
        try {
            Logger.info('Tracking offer click', { offerId });
            Logger.userAction('offer_click', { offerId });

            const offer = await this.firebase.read('offers', offerId);
            if (offer) {
                const currentClicks = offer.stats?.clicks || 0;
                await this.firebase.update('offers', offerId, {
                    'stats.clicks': currentClicks + 1,
                    'stats.lastClicked': new Date().toISOString()
                });
            }
        } catch (error) {
            Logger.error('Failed to track offer click', { error: error.message, offerId });
            // Don't throw error as this is not critical
        }
    }

    /**
     * Increment offer view count
     * @param {string} offerId - Offer ID
     * @returns {Promise<void>}
     */
    async incrementOfferViews(offerId) {
        try {
            const offer = await this.firebase.read('offers', offerId);
            if (offer) {
                const currentViews = offer.stats?.views || 0;
                await this.firebase.update('offers', offerId, {
                    'stats.views': currentViews + 1,
                    'stats.lastViewed': new Date().toISOString()
                });
            }
        } catch (error) {
            Logger.error('Failed to increment offer views', { error: error.message, offerId });
            // Don't throw error as this is not critical
        }
    }

    /**
     * Validate offer data
     * @param {Object} offerData - Offer data to validate
     * @param {boolean} isUpdate - Whether this is an update operation
     */
    validateOfferData(offerData, isUpdate = false) {
        const requiredFields = isUpdate ? [] : ['title', 'description', 'discount', 'shopId', 'validFrom', 'validTo'];
        
        for (const field of requiredFields) {
            if (!offerData[field]) {
                throw new Error(`${field} is required`);
            }
        }

        if (offerData.title && offerData.title.trim().length < 3) {
            throw new Error('Offer title must be at least 3 characters long');
        }

        if (offerData.description && offerData.description.trim().length < 10) {
            throw new Error('Offer description must be at least 10 characters long');
        }

        if (offerData.discount !== undefined && (offerData.discount < 0 || offerData.discount > 100)) {
            throw new Error('Discount must be between 0 and 100 percent');
        }

        if (offerData.validFrom && offerData.validTo) {
            const validFrom = new Date(offerData.validFrom);
            const validTo = new Date(offerData.validTo);
            
            if (validFrom >= validTo) {
                throw new Error('Valid from date must be before valid to date');
            }
            
            if (validTo <= new Date()) {
                throw new Error('Valid to date must be in the future');
            }
        }
    }

    /**
     * Sort offers based on criteria
     * @param {Array} offers - Array of offers
     * @param {string} sortBy - Sort criteria
     * @returns {Array} Sorted offers
     */
    sortOffers(offers, sortBy) {
        switch (sortBy) {
            case 'title':
                return offers.sort((a, b) => a.title.localeCompare(b.title));
            case 'discount_high':
                return offers.sort((a, b) => b.discount - a.discount);
            case 'discount_low':
                return offers.sort((a, b) => a.discount - b.discount);
            case 'newest':
                return offers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            case 'oldest':
                return offers.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            case 'expiry':
                return offers.sort((a, b) => new Date(a.validTo) - new Date(b.validTo));
            case 'views':
                return offers.sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0));
            case 'clicks':
                return offers.sort((a, b) => (b.stats?.clicks || 0) - (a.stats?.clicks || 0));
            default:
                return offers;
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
    module.exports = OfferService;
}
