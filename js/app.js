/**
 * Main Application File for SuperMall Web Application
 * Initializes and manages the entire application
 */

// Global application state
let app = {
    services: {},
    state: {
        currentUser: null,
        currentSection: 'dashboard',
        isLoading: false
    }
};

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        Logger.info('Initializing SuperMall application');
        
        // Initialize services
        await initializeServices();
        
        // Check authentication state
        await checkAuthState();
        
        // Set up event listeners
        setupEventListeners();
        
        // Hide loading screen
        hideLoadingScreen();
        
        Logger.info('SuperMall application initialized successfully');
        
    } catch (error) {
        Logger.error('Failed to initialize application', error);
        showToast('Failed to initialize application. Please refresh the page.', 'error');
        hideLoadingScreen();
    }
}

/**
 * Initialize all services
 */
async function initializeServices() {
    try {
        Logger.info('Initializing services');
        
        // Initialize Firebase service
        app.services.firebase = new FirebaseService();
        
        Logger.info('All services initialized successfully');
    } catch (error) {
        Logger.error('Failed to initialize services', error);
        throw error;
    }
}

/**
 * Check authentication state
 */
async function checkAuthState() {
    try {
        const storedUser = localStorage.getItem('supermall_current_user');
        
        if (storedUser) {
            app.state.currentUser = JSON.parse(storedUser);
            Logger.info('User authenticated', { userId: app.state.currentUser.uid });
            showMainApp();
            return true;
        } else {
            Logger.info('No authenticated user found');
            showLoginModal();
            return false;
        }
    } catch (error) {
        Logger.error('Error checking auth state', error);
        showLoginModal();
        return false;
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    try {
        Logger.info('Setting up event listeners');
        
        // Authentication event listeners
        setupAuthEventListeners();
        
        // Navigation event listeners
        setupNavigationEventListeners();
        
        Logger.info('Event listeners set up successfully');
    } catch (error) {
        Logger.error('Failed to set up event listeners', error);
        throw error;
    }
}

/**
 * Authentication event listeners
 */
function setupAuthEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Show register modal
    const showRegisterBtn = document.getElementById('showRegister');
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => {
            closeModal('loginModal');
            showModal('registerModal');
        });
    }
    
    // Show login modal
    const showLoginBtn = document.getElementById('showLogin');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            closeModal('registerModal');
            showModal('loginModal');
        });
    }
    
    // Demo login
    const demoLoginBtn = document.getElementById('demoLogin');
    if (demoLoginBtn) {
        demoLoginBtn.addEventListener('click', handleDemoLogin);
    }
}

/**
 * Navigation event listeners
 */
function setupNavigationEventListeners() {
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Navigation items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const section = e.currentTarget.dataset.section;
            if (section) {
                setCurrentSection(section);
            }
        });
    });
}

/**
 * Handle user login
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        showLoadingState(event.target);
        
        // Simple demo authentication
        if (email === 'admin@supermall.com' && password === 'admin123') {
            const user = {
                uid: 'demo-admin-uid',
                email: email,
                displayName: 'Admin User',
                role: 'admin'
            };
            
            app.state.currentUser = user;
            localStorage.setItem('supermall_current_user', JSON.stringify(user));
            
            closeModal('loginModal');
            showMainApp();
            updateUserGreeting();
            toggleAdminElements();
            
            showToast('Login successful!', 'success');
        } else if (email === 'user@supermall.com' && password === 'user123') {
            const user = {
                uid: 'demo-user-uid',
                email: email,
                displayName: 'Demo User',
                role: 'user'
            };
            
            app.state.currentUser = user;
            localStorage.setItem('supermall_current_user', JSON.stringify(user));
            
            closeModal('loginModal');
            showMainApp();
            updateUserGreeting();
            toggleAdminElements();
            
            showToast('Login successful!', 'success');
        } else {
            throw new Error('Invalid email or password');
        }
        
    } catch (error) {
        showToast('Login failed: ' + error.message, 'error');
    } finally {
        hideLoadingState(event.target);
    }
}

/**
 * Handle user registration
 */
async function handleRegister(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('registerName').value,
        email: document.getElementById('registerEmail').value,
        phone: document.getElementById('registerPhone').value,
        role: document.getElementById('registerRole').value,
        password: document.getElementById('registerPassword').value
    };
    
    try {
        showLoadingState(event.target);
        
        // Simple demo registration
        const user = {
            uid: 'demo-' + Date.now(),
            email: formData.email,
            displayName: formData.name,
            role: formData.role
        };
        
        app.state.currentUser = user;
        localStorage.setItem('supermall_current_user', JSON.stringify(user));
        
        closeModal('registerModal');
        showMainApp();
        updateUserGreeting();
        toggleAdminElements();
        
        showToast('Registration successful!', 'success');
        
    } catch (error) {
        showToast('Registration failed: ' + error.message, 'error');
    } finally {
        hideLoadingState(event.target);
    }
}

/**
 * Handle demo login
 */
async function handleDemoLogin() {
    try {
        const user = {
            uid: 'demo-admin-uid',
            email: 'admin@supermall.com',
            displayName: 'Admin User',
            role: 'admin'
        };
        
        app.state.currentUser = user;
        localStorage.setItem('supermall_current_user', JSON.stringify(user));
        
        closeModal('loginModal');
        showMainApp();
        updateUserGreeting();
        toggleAdminElements();
        
        showToast('Demo login successful!', 'success');
        
    } catch (error) {
        showToast('Demo login failed: ' + error.message, 'error');
    }
}

/**
 * Handle user logout
 */
async function handleLogout() {
    try {
        app.state.currentUser = null;
        localStorage.removeItem('supermall_current_user');
        
        // Reset UI
        document.getElementById('appContainer').classList.add('hidden');
        showModal('loginModal');
        
        showToast('Logged out successfully', 'info');
        
    } catch (error) {
        showToast('Logout failed: ' + error.message, 'error');
    }
}

/**
 * Set current section - UPDATED VERSION
 */
function setCurrentSection(section) {
    try {
        Logger.info('Setting current section', { section });
        
        app.state.currentSection = section;
        
        // Hide all sections
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.add('hidden');
        });
        
        // Show current section
        const currentSection = document.getElementById(section + 'Section');
        if (currentSection) {
            currentSection.classList.remove('hidden');
        }
        
        // Update navigation active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(`[data-section="${section}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        
        // Load section data - NEW ADDITION
        loadSectionData(section);
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
        
    } catch (error) {
        Logger.error('Failed to set current section', { error: error.message, section });
    }
}

/**
 * Load section-specific data - NEW FUNCTION
 */
async function loadSectionData(section) {
    try {
        switch (section) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'shops':
                await loadShopsData();
                break;
            case 'products':
                await loadProductsData();
                break;
            case 'offers':
                await loadOffersData();
                break;
            case 'categories':
                await loadCategoriesData();
                break;
        }
    } catch (error) {
        Logger.error('Failed to load section data', { error: error.message, section });
        showToast('Failed to load section data', 'error');
    }
}

/**
 * Load dashboard data - NEW FUNCTION
 */
async function loadDashboardData() {
    try {
        const shops = await app.services.firebase.read('shops');
        const products = await app.services.firebase.read('products');
        const offers = await app.services.firebase.read('offers');
        const categories = await app.services.firebase.read('categories');
        
        // Update dashboard stats
        document.getElementById('totalShops').textContent = shops.length;
        document.getElementById('totalProducts').textContent = products.length;
        document.getElementById('totalOffers').textContent = offers.length;
        document.getElementById('totalCategories').textContent = categories.length;
        
    } catch (error) {
        Logger.error('Failed to load dashboard data', error);
    }
}

/**
 * Load shops data - NEW FUNCTION
 */
async function loadShopsData() {
    try {
        const shops = await app.services.firebase.read('shops');
        const shopsList = document.getElementById('shopsList');
        
        if (shops.length === 0) {
            shopsList.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-store text-6xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">No Shops Found</h3>
                    <p class="text-gray-500">Start by adding your first shop to the marketplace.</p>
                </div>
            `;
            return;
        }
        
        shopsList.innerHTML = shops.map(shop => `
            <div class="modern-card group">
                <div class="card-image">
                    <img src="${shop.images?.[0] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400'}" 
                         alt="${shop.name}" class="w-full h-48 object-cover">
                    <div class="card-overlay">
                        <button class="action-btn" onclick="viewShop('${shop.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="card-title">${shop.name}</h3>
                        <span class="floor-badge">Floor ${shop.floor}</span>
                    </div>
                    <p class="card-description">${truncateText(shop.description, 100)}</p>
                    <div class="card-meta">
                        <span class="category-tag">${shop.category}</span>
                        <span class="contact-info">
                            <i class="fas fa-phone text-xs"></i>
                            ${shop.contact?.phone || 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        Logger.error('Failed to load shops data', error);
        showToast('Failed to load shops', 'error');
    }
}

/**
 * Load products data - NEW FUNCTION
 */
async function loadProductsData() {
    try {
        const products = await app.services.firebase.read('products');
        const productsList = document.getElementById('productsList');
        
        if (products.length === 0) {
            productsList.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-box text-6xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">No Products Found</h3>
                    <p class="text-gray-500">Start by adding your first product to the catalog.</p>
                </div>
            `;
            return;
        }
        
        productsList.innerHTML = products.map(product => `
            <div class="modern-card group">
                <div class="card-image">
                    <img src="${product.images?.[0] || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400'}" 
                         alt="${product.name}" class="w-full h-48 object-cover">
                    <div class="card-overlay">
                        <button class="action-btn" onclick="viewProduct('${product.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" onclick="addToCompare('${product.id}')">
                            <i class="fas fa-balance-scale"></i>
                        </button>
                    </div>
                    ${product.stock <= 5 ? '<div class="stock-warning">Low Stock</div>' : ''}
                </div>
                <div class="card-content">
                    <h3 class="card-title">${product.name}</h3>
                    <p class="card-description">${truncateText(product.description, 80)}</p>
                    <div class="card-meta">
                                                <span class="price-tag">${formatCurrency(product.price)}</span>
                        <span class="stock-info">
                            <i class="fas fa-cube text-xs"></i>
                            ${product.stock} in stock
                        </span>
                    </div>
                    <div class="category-tag">${product.category}</div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        Logger.error('Failed to load products data', error);
        showToast('Failed to load products', 'error');
    }
}

/**
 * Load offers data - NEW FUNCTION
 */
async function loadOffersData() {
    try {
        const offers = await app.services.firebase.read('offers');
        const offersList = document.getElementById('offersList');
        
        if (offers.length === 0) {
            offersList.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-tags text-6xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">No Offers Found</h3>
                    <p class="text-gray-500">Create exciting offers to attract more customers.</p>
                </div>
            `;
            return;
        }
        
        offersList.innerHTML = offers.map(offer => `
            <div class="modern-card offer-card group">
                <div class="offer-header">
                    <div class="discount-badge">${offer.discount}% OFF</div>
                    <div class="offer-validity">
                        Valid until ${formatDate(offer.validTo)}
                    </div>
                </div>
                <div class="card-content">
                    <h3 class="card-title">${offer.title}</h3>
                    <p class="card-description">${offer.description}</p>
                    <div class="card-meta">
                        <span class="offer-type">
                            <i class="fas fa-store text-xs"></i>
                            Shop Offer
                        </span>
                        <button class="claim-btn" onclick="claimOffer('${offer.id}')">
                            Claim Offer
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        Logger.error('Failed to load offers data', error);
        showToast('Failed to load offers', 'error');
    }
}

/**
 * Load categories data - NEW FUNCTION
 */
async function loadCategoriesData() {
    try {
        const categories = await app.services.firebase.read('categories');
        const categoriesList = document.getElementById('categoriesList');
        
        if (categories.length === 0) {
            categoriesList.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-th-large text-6xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">No Categories Found</h3>
                    <p class="text-gray-500">Organize your products by creating categories.</p>
                </div>
            `;
            return;
        }
        
        categoriesList.innerHTML = categories.map(category => `
            <div class="modern-card category-card group">
                <div class="category-icon-wrapper">
                    <i class="${category.icon} category-icon"></i>
                </div>
                <div class="card-content">
                    <h3 class="card-title">${category.name}</h3>
                    <p class="card-description">${category.description}</p>
                    <div class="card-meta">
                        <span class="floor-info">
                            <i class="fas fa-building text-xs"></i>
                            Floor ${category.floor}
                        </span>
                        <button class="explore-btn" onclick="exploreCategory('${category.id}')">
                            Explore
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        Logger.error('Failed to load categories data', error);
        showToast('Failed to load categories', 'error');
    }
}

/**
 * Show main application
 */
function showMainApp() {
    document.getElementById('appContainer').classList.remove('hidden');
    setCurrentSection('dashboard');
}

/**
 * Update user greeting
 */
function updateUserGreeting() {
    const userGreeting = document.getElementById('userGreeting');
    if (userGreeting && app.state.currentUser) {
        const name = app.state.currentUser.displayName || app.state.currentUser.email;
        userGreeting.textContent = `Welcome, ${name}`;
        userGreeting.classList.remove('hidden');
    }
}

/**
 * Toggle admin elements visibility
 */
function toggleAdminElements() {
    const adminElements = document.querySelectorAll('.admin-only');
    const adminNav = document.getElementById('adminOnlyNav');
    
    if (app.state.currentUser && app.state.currentUser.role === 'admin') {
        adminElements.forEach(el => el.classList.remove('hidden'));
        if (adminNav) adminNav.classList.remove('hidden');
    } else {
        adminElements.forEach(el => el.classList.add('hidden'));
        if (adminNav) adminNav.classList.add('hidden');
    }
}

/**
 * Show loading screen
 */
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
}

/**
 * Hide loading screen
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }
}

/**
 * Show login modal
 */
function showLoginModal() {
    showModal('loginModal');
}

/**
 * Show modal
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Close modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

/**
 * Toggle sidebar
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('closed');
    }
}

/**
 * Close sidebar
 */
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.add('closed');
    }
}

/**
 * Show loading state for forms
 */
function showLoadingState(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
    }
}

/**
 * Hide loading state for forms
 */
function hideLoadingState(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        // Restore original text
        const originalText = submitBtn.textContent.includes('Login') ? 'Login' : 'Register';
        submitBtn.innerHTML = originalText;
    }
}

// NEW PLACEHOLDER FUNCTIONS FOR INTERACTIONS
function viewShop(shopId) {
    showToast(`Viewing shop: ${shopId}`, 'info');
    Logger.info('Shop viewed', { shopId });
}

function viewProduct(productId) {
    showToast(`Viewing product: ${productId}`, 'info');
    Logger.info('Product viewed', { productId });
}

function addToCompare(productId) {
    showToast(`Added product ${productId} to comparison`, 'success');
    Logger.info('Product added to comparison', { productId });
}

function claimOffer(offerId) {
    showToast(`Claimed offer: ${offerId}`, 'success');
    Logger.info('Offer claimed', { offerId });
}

function exploreCategory(categoryId) {
    showToast(`Exploring category: ${categoryId}`, 'info');
    Logger.info('Category explored', { categoryId });
}

function debugData() {
    console.log('=== DEBUG DATA ===');
    console.log('Shops:', JSON.parse(localStorage.getItem('supermall_shops') || '[]'));
    console.log('Products:', JSON.parse(localStorage.getItem('supermall_products') || '[]'));
    console.log('Offers:', JSON.parse(localStorage.getItem('supermall_offers') || '[]'));
    console.log('Categories:', JSON.parse(localStorage.getItem('supermall_categories') || '[]'));
}

window.debugData = debugData;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Make app globally available for debugging
window.SuperMallApp = app;
