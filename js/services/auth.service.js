/**
 * Authentication Service for SuperMall Web Application
 * Handles user authentication, registration, and session management
 */
class AuthService {
    constructor(firebaseService) {
        this.firebase = firebaseService;
        this.currentUser = null;
        this.authStateListeners = [];
        this.initializeAuth();
    }

    /**
     * Initialize authentication state
     */
    initializeAuth() {
        // Check for existing user session
        const storedUser = localStorage.getItem('supermall_current_user');
        if (storedUser) {
            try {
                this.currentUser = JSON.parse(storedUser);
                Logger.info('User session restored', { userId: this.currentUser.uid });
            } catch (error) {
                Logger.error('Error restoring user session', error);
                localStorage.removeItem('supermall_current_user');
            }
        }

        // Set up Firebase auth state listener if available
        if (this.firebase.isFirebaseAvailable) {
            this.firebase.auth.onAuthStateChanged((user) => {
                this.handleAuthStateChange(user);
            });
        }
    }

    /**
     * Handle authentication state changes
     * @param {Object} user - Firebase user object
     */
    handleAuthStateChange(user) {
        if (user) {
            this.currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified
            };
            localStorage.setItem('supermall_current_user', JSON.stringify(this.currentUser));
        } else {
            this.currentUser = null;
            localStorage.removeItem('supermall_current_user');
        }

        // Notify listeners
        this.notifyAuthStateListeners();
    }

    /**
     * Add authentication state listener
     * @param {Function} callback - Callback function
     */
    onAuthStateChanged(callback) {
        this.authStateListeners.push(callback);
        // Immediately call with current state
        callback(this.currentUser);
    }

    /**
     * Remove authentication state listener
     * @param {Function} callback - Callback function to remove
     */
    removeAuthStateListener(callback) {
        const index = this.authStateListeners.indexOf(callback);
        if (index > -1) {
            this.authStateListeners.splice(index, 1);
        }
    }

    /**
     * Notify all authentication state listeners
     */
    notifyAuthStateListeners() {
        this.authStateListeners.forEach(callback => {
            try {
                callback(this.currentUser);
            } catch (error) {
                Logger.error('Error in auth state listener', error);
            }
        });
    }

    /**
     * Login user with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} User object
     */
    async login(email, password) {
        const startTime = performance.now();
        
        try {
            Logger.info('User login attempt', { email });
            Logger.userAction('login_attempt', { email });

            if (this.firebase.isFirebaseAvailable) {
                const userCredential = await this.firebase.auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Get additional user data from Firestore
                const userData = await this.firebase.read('users', user.uid);
                
                this.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || userData?.name,
                    role: userData?.role || 'user',
                    profile: userData?.profile || {}
                };
                
                localStorage.setItem('supermall_current_user', JSON.stringify(this.currentUser));
                
                // Update last login
                await this.firebase.update('users', user.uid, {
                    lastLogin: new Date().toISOString()
                });
                
                Logger.performance('Firebase login', startTime);
                Logger.info('User logged in successfully', { uid: this.currentUser.uid });
                Logger.userAction('login_success', { userId: this.currentUser.uid });
                
                return this.currentUser;
            } else {
                // Demo login logic
                let demoUser = null;
                
                if (email === 'admin@supermall.com' && password === 'admin123') {
                    demoUser = {
                        uid: 'demo-admin-uid',
                        email: email,
                        displayName: 'Admin User',
                        role: 'admin',
                        profile: {
                            name: 'Admin User',
                            phone: '+1-555-0000'
                        }
                    };
                } else if (email === 'user@supermall.com' && password === 'user123') {
                    demoUser = {
                        uid: 'demo-user-uid',
                        email: email,
                        displayName: 'Demo User',
                        role: 'user',
                        profile: {
                            name: 'Demo User',
                            phone: '+1-555-0001'
                        }
                    };
                } else {
                    throw new Error('Invalid email or password');
                }
                
                this.currentUser = demoUser;
                localStorage.setItem('supermall_current_user', JSON.stringify(this.currentUser));
                
                Logger.performance('Demo login', startTime);
                Logger.info('Demo user logged in successfully', { uid: this.currentUser.uid });
                Logger.userAction('demo_login_success', { userId: this.currentUser.uid });
                
                return this.currentUser;
            }
        } catch (error) {
            Logger.error('Login failed', { error: error.message, email });
            Logger.userAction('login_failed', { email, error: error.message });
            throw new Error(this.getAuthErrorMessage(error));
        }
    }

    /**
     * Register new user
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {Object} userData - Additional user data
     * @returns {Promise<Object>} User object
     */
    async register(email, password, userData) {
        const startTime = performance.now();
        
        try {
            Logger.info('User registration attempt', { email, userData: { ...userData, password: '[REDACTED]' } });
            Logger.userAction('registration_attempt', { email });

            // Validate input
            if (!this.isValidEmail(email)) {
                throw new Error('Invalid email format');
            }
            if (!this.isValidPassword(password)) {
                throw new Error('Password must be at least 6 characters long');
            }

            if (this.firebase.isFirebaseAvailable) {
                const userCredential = await this.firebase.auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Update user profile
                await user.updateProfile({
                    displayName: userData.name
                });
                
                // Store additional user data in Firestore
                await this.firebase.create('users', {
                    uid: user.uid,
                    email: email,
                    name: userData.name,
                    phone: userData.phone,
                    role: userData.role || 'user',
                    profile: {
                        name: userData.name,
                        phone: userData.phone,
                        address: userData.address || {}
                    },
                    emailVerified: false,
                    isActive: true
                });
                
                this.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: userData.name,
                    role: userData.role || 'user',
                    profile: {
                        name: userData.name,
                        phone: userData.phone
                    }
                };
                
                localStorage.setItem('supermall_current_user', JSON.stringify(this.currentUser));
                
                // Send email verification
                await user.sendEmailVerification();
                
                Logger.performance('Firebase registration', startTime);
                Logger.info('User registered successfully', { uid: this.currentUser.uid });
                Logger.userAction('registration_success', { userId: this.currentUser.uid });
                
                return this.currentUser;
            } else {
                // Demo registration
                const demoUser = {
                    uid: 'demo-' + Date.now(),
                    email: email,
                    displayName: userData.name,
                    role: userData.role || 'user',
                    profile: {
                        name: userData.name,
                        phone: userData.phone
                    }
                };
                
                this.currentUser = demoUser;
                localStorage.setItem('supermall_current_user', JSON.stringify(this.currentUser));
                
                Logger.performance('Demo registration', startTime);
                Logger.info('Demo user registered successfully', { uid: this.currentUser.uid });
                Logger.userAction('demo_registration_success', { userId: this.currentUser.uid });
                
                return this.currentUser;
            }
        } catch (error) {
            Logger.error('Registration failed', { error: error.message, email });
            Logger.userAction('registration_failed', { email, error: error.message });
            throw new Error(this.getAuthErrorMessage(error));
        }
    }

    /**
     * Logout current user
     * @returns {Promise<void>}
     */
    async logout() {
        const startTime = performance.now();
        
        try {
            const userId = this.currentUser?.uid;
            Logger.info('User logout', { userId });
            Logger.userAction('logout', { userId });

            if (this.firebase.isFirebaseAvailable) {
                await this.firebase.auth.signOut();
                Logger.performance('Firebase logout', startTime);
            } else {
                Logger.performance('Demo logout', startTime);
            }
            
            this.currentUser = null;
            localStorage.removeItem('supermall_current_user');
            
            // Notify listeners
            this.notifyAuthStateListeners();
            
            Logger.info('User logged out successfully');
        } catch (error) {
            Logger.error('Logout failed', error);
            throw error;
        }
    }

    /**
     * Reset password
     * @param {string} email - User email
     * @returns {Promise<void>}
     */
    async resetPassword(email) {
        try {
            Logger.info('Password reset requested', { email });
            Logger.userAction('password_reset_request', { email });

            if (this.firebase.isFirebaseAvailable) {
                await this.firebase.auth.sendPasswordResetEmail(email);
                Logger.info('Password reset email sent', { email });
                Logger.userAction('password_reset_email_sent', { email });
            } else {
                Logger.warn('Password reset not available in demo mode');
                throw new Error('Password reset not available in demo mode');
            }
        } catch (error) {
            Logger.error('Password reset failed', { error: error.message, email });
            Logger.userAction('password_reset_failed', { email, error: error.message });
            throw new Error(this.getAuthErrorMessage(error));
        }
    }

    /**
     * Update user profile
     * @param {Object} profileData - Profile data to update
     * @returns {Promise<void>}
     */
    async updateProfile(profileData) {
        try {
            if (!this.currentUser) {
                throw new Error('No user logged in');
            }

            Logger.info('Updating user profile', { userId: this.currentUser.uid, profileData });
            Logger.userAction('profile_update', { userId: this.currentUser.uid });

            if (this.firebase.isFirebaseAvailable) {
                // Update Firebase Auth profile
                if (profileData.displayName) {
                    await this.firebase.auth.currentUser.updateProfile({
                        displayName: profileData.displayName
                    });
                }
                
                // Update Firestore user document
                await this.firebase.update('users', this.currentUser.uid, {
                    profile: {
                        ...this.currentUser.profile,
                        ...profileData
                    }
                });
            }
            
            // Update local user object
            this.currentUser = {
                ...this.currentUser,
                displayName: profileData.displayName || this.currentUser.displayName,
                profile: {
                    ...this.currentUser.profile,
                    ...profileData
                }
            };
            
            localStorage.setItem('supermall_current_user', JSON.stringify(this.currentUser));
            
            // Notify listeners
            this.notifyAuthStateListeners();
            
            Logger.info('User profile updated successfully', { userId: this.currentUser.uid });
            Logger.userAction('profile_update_success', { userId: this.currentUser.uid });
        } catch (error) {
            Logger.error('Profile update failed', { error: error.message, userId: this.currentUser?.uid });
            Logger.userAction('profile_update_failed', { userId: this.currentUser?.uid, error: error.message });
            throw error;
        }
    }

    /**
     * Change user password
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<void>}
     */
    async changePassword(currentPassword, newPassword) {
        try {
            if (!this.currentUser) {
                throw new Error('No user logged in');
            }

            Logger.info('Password change requested', { userId: this.currentUser.uid });
            Logger.userAction('password_change_request', { userId: this.currentUser.uid });

            if (!this.isValidPassword(newPassword)) {
                throw new Error('New password must be at least 6 characters long');
            }

            if (this.firebase.isFirebaseAvailable) {
                const user = this.firebase.auth.currentUser;
                const credential = firebase.auth.EmailAuthProvider.credential(
                    user.email,
                    currentPassword
                );
                
                // Re-authenticate user
                await user.reauthenticateWithCredential(credential);
                
                // Update password
                await user.updatePassword(newPassword);
                
                Logger.info('Password changed successfully', { userId: this.currentUser.uid });
                Logger.userAction('password_change_success', { userId: this.currentUser.uid });
            } else {
                Logger.warn('Password change not available in demo mode');
                throw new Error('Password change not available in demo mode');
            }
        } catch (error) {
            Logger.error('Password change failed', { error: error.message, userId: this.currentUser?.uid });
            Logger.userAction('password_change_failed', { userId: this.currentUser?.uid, error: error.message });
            throw new Error(this.getAuthErrorMessage(error));
        }
    }

    /**
     * Get current user
     * @returns {Object|null} Current user object
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if user is authenticated
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Check if current user is admin
     * @returns {boolean} True if user is admin
     */
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    /**
     * Check if current user has specific role
     * @param {string} role - Role to check
     * @returns {boolean} True if user has role
     */
    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }

        /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {boolean} True if valid
     */
    isValidPassword(password) {
        return password && password.length >= 6;
    }

    /**
     * Get user-friendly error message
     * @param {Error} error - Error object
     * @returns {string} User-friendly error message
     */
    getAuthErrorMessage(error) {
        const errorCode = error.code || error.message;
        
        switch (errorCode) {
            case 'auth/user-not-found':
                return 'No account found with this email address.';
            case 'auth/wrong-password':
                return 'Incorrect password. Please try again.';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists.';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters long.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/user-disabled':
                return 'This account has been disabled.';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection.';
            default:
                return error.message || 'An error occurred. Please try again.';
        }
    }

    /**
     * Send email verification
     * @returns {Promise<void>}
     */
    async sendEmailVerification() {
        try {
            if (!this.currentUser) {
                throw new Error('No user logged in');
            }

            if (this.firebase.isFirebaseAvailable) {
                const user = this.firebase.auth.currentUser;
                await user.sendEmailVerification();
                Logger.info('Email verification sent', { userId: this.currentUser.uid });
                Logger.userAction('email_verification_sent', { userId: this.currentUser.uid });
            } else {
                throw new Error('Email verification not available in demo mode');
            }
        } catch (error) {
            Logger.error('Failed to send email verification', { error: error.message });
            throw error;
        }
    }

    /**
     * Delete user account
     * @returns {Promise<void>}
     */
    async deleteAccount() {
        try {
            if (!this.currentUser) {
                throw new Error('No user logged in');
            }

            const userId = this.currentUser.uid;
            Logger.info('Account deletion requested', { userId });
            Logger.userAction('account_deletion_request', { userId });

            if (this.firebase.isFirebaseAvailable) {
                // Delete user data from Firestore
                await this.firebase.delete('users', userId);
                
                // Delete Firebase Auth account
                await this.firebase.auth.currentUser.delete();
                
                Logger.info('Account deleted successfully', { userId });
                Logger.userAction('account_deletion_success', { userId });
            } else {
                Logger.warn('Account deletion not available in demo mode');
                throw new Error('Account deletion not available in demo mode');
            }
            
            // Clear local session
            this.currentUser = null;
            localStorage.removeItem('supermall_current_user');
            
            // Notify listeners
            this.notifyAuthStateListeners();
        } catch (error) {
            Logger.error('Account deletion failed', { error: error.message, userId: this.currentUser?.uid });
            Logger.userAction('account_deletion_failed', { userId: this.currentUser?.uid, error: error.message });
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthService;
}
