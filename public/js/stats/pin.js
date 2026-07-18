/* Extracted from statistics.js - methods are verbatim; they are copied onto StatisticsManager.prototype below. */
import { StatisticsManager } from '../statistics.js';

const Methods = class {
    async openPinCodeManager() {
        // Check current PIN status from auth manager or API
        let hasPinCode = false;
        if (this.authManager) {
            hasPinCode = this.authManager.hasPinCode;
        }

        // If not set in auth manager, check from API
        if (hasPinCode === null || hasPinCode === undefined) {
            try {
                const pinStatus = await this.apiClient.get(`/api/statistics/pin-status/${this.guildId}`);
                hasPinCode = pinStatus.hasPinCode;
                if (this.authManager) {
                    this.authManager.hasPinCode = hasPinCode;
                }
            } catch (e) {
                console.log('Failed to check PIN status:', e);
                hasPinCode = false;
            }
        }

        if (!hasPinCode) {
            // No pin code set, show setup form
            this.showPinSetupForm();
        } else {
            // Pin code exists, show management options
            this.showPinManagementForm();
        }
    }

    showPinSetupForm() {
        const body = document.getElementById('statisticsBody');
        body.innerHTML = `
            <div style="max-width: 500px; margin: 0 auto; padding: 40px;">
                <h3>🔒 Set PIN Code</h3>
                <p style="color: var(--text-secondary); margin-bottom: 30px;">Protect your server statistics with a PIN code. This PIN will be required to view statistics and reset data.</p>
                
                <div class="form-group">
                    <label>New PIN Code (4-20 characters)</label>
                    <input type="password" id="newPin" class="form-control" placeholder="Enter new PIN" maxlength="20">
                </div>
                
                <div class="form-group">
                    <label>Confirm PIN Code</label>
                    <input type="password" id="confirmPin" class="form-control" placeholder="Confirm PIN" maxlength="20">
                </div>
                
                <div id="pinSetupError" style="color: #ff5722; margin: 15px 0; min-height: 20px;"></div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.rustplusUI.statisticsManager.saveNewPin()" class="primary-button" style="flex: 1;">💾 Save PIN</button>
                    <button onclick="window.rustplusUI.statisticsManager.loadOverview()" class="primary-button" style="flex: 1; background: var(--bg-secondary);">Cancel</button>
                </div>
            </div>
        `;
    }

    showPinManagementForm() {
        const body = document.getElementById('statisticsBody');
        body.innerHTML = `
            <div style="max-width: 500px; margin: 0 auto; padding: 40px;">
                <h3>🔒 Manage PIN Code</h3>
                <p style="color: var(--text-secondary); margin-bottom: 30px;">Change or remove your statistics PIN code.</p>
                
                <div class="form-group">
                    <label>Current PIN Code</label>
                    <input type="password" id="currentPin" class="form-control" placeholder="Enter current PIN">
                </div>
                
                <div class="form-group">
                    <label>New PIN Code (leave empty to remove PIN)</label>
                    <input type="password" id="newPin" class="form-control" placeholder="Enter new PIN (optional)" maxlength="20">
                </div>
                
                <div class="form-group">
                    <label>Confirm New PIN</label>
                    <input type="password" id="confirmPin" class="form-control" placeholder="Confirm new PIN">
                </div>
                
                <div id="pinManageError" style="color: #ff5722; margin: 15px 0; min-height: 20px;"></div>
                
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button onclick="window.rustplusUI.statisticsManager.updatePin()" class="primary-button" style="flex: 1;">💾 Update PIN</button>
                    <button onclick="window.rustplusUI.statisticsManager.loadOverview()" class="primary-button" style="flex: 1; background: var(--bg-secondary);">Cancel</button>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.rustplusUI.statisticsManager.removePin()" class="primary-button" style="width: 100%; background: #d32f2f;">🗑️ Remove PIN Protection</button>
                </div>
            </div>
        `;
    }

    async saveNewPin() {
        const newPin = document.getElementById('newPin')?.value || '';
        const confirmPin = document.getElementById('confirmPin')?.value || '';
        const errorDiv = document.getElementById('pinSetupError');

        if (!newPin || newPin.length < 4) {
            errorDiv.textContent = 'PIN must be at least 4 characters';
            return;
        }

        if (newPin !== confirmPin) {
            errorDiv.textContent = 'PIN codes do not match';
            return;
        }

        try {
            const result = await this.apiClient.post(`/api/statistics/set-pin/${this.guildId}`, { pin: newPin });

            if (result.success) {
                // Update auth manager
                if (this.authManager) {
                    this.authManager.hasPinCode = true;
                }
                // Update the PIN button text
                const pinBtn = document.getElementById('pinCodeManageBtn');
                if (pinBtn) pinBtn.textContent = '🔒 Change PIN';
                alert('✅ PIN code has been set successfully!');
                await this.loadOverview();
            } else {
                errorDiv.textContent = 'Failed to set PIN code';
            }
        } catch (error) {
            console.error('Error setting pin:', error);
            if (error.message && error.message.includes('404')) {
                errorDiv.textContent = '⚠️ PIN API endpoints not implemented yet on backend. Please add the PIN endpoints to your server.';
            } else {
                errorDiv.textContent = 'Error setting PIN code: ' + error.message;
            }
        }
    }

    async updatePin() {
        const currentPin = document.getElementById('currentPin')?.value || '';
        const newPin = document.getElementById('newPin')?.value || '';
        const confirmPin = document.getElementById('confirmPin')?.value || '';
        const errorDiv = document.getElementById('pinManageError');

        if (!currentPin) {
            errorDiv.textContent = 'Please enter current PIN';
            return;
        }

        if (newPin && newPin.length < 4) {
            errorDiv.textContent = 'New PIN must be at least 4 characters';
            return;
        }

        if (newPin !== confirmPin) {
            errorDiv.textContent = 'New PIN codes do not match';
            return;
        }

        try {
            const result = await this.apiClient.post(`/api/statistics/update-pin/${this.guildId}`, {
                currentPin,
                newPin: newPin || null
            });

            if (result.success) {
                if (!newPin) {
                    // PIN was removed
                    if (this.authManager) {
                        this.authManager.hasPinCode = false;
                        this.authManager.clearAuth(); // Clear session auth
                    }
                    const pinBtn = document.getElementById('pinCodeManageBtn');
                    if (pinBtn) pinBtn.textContent = '🔒 Set PIN';
                    alert('✅ PIN code has been removed successfully!\n\nWebsite is now accessible without authentication.');
                } else {
                    alert('✅ PIN code has been updated successfully!');
                }
                await this.loadOverview();
            } else {
                errorDiv.textContent = result.error || 'Incorrect current PIN';
            }
        } catch (error) {
            console.error('Error updating pin:', error);
            errorDiv.textContent = 'Error updating PIN code';
        }
    }

    async removePin() {
        const currentPin = document.getElementById('currentPin')?.value || '';
        const errorDiv = document.getElementById('pinManageError');

        if (!currentPin) {
            errorDiv.textContent = 'Please enter current PIN to remove it';
            return;
        }

        if (!confirm('⚠️ Are you sure you want to remove PIN protection?\n\nAnyone will be able to view statistics and reset data without authentication.')) {
            return;
        }

        try {
            const result = await this.apiClient.post(`/api/statistics/update-pin/${this.guildId}`, {
                currentPin,
                newPin: null
            });

            if (result.success) {
                if (this.authManager) {
                    this.authManager.hasPinCode = false;
                    this.authManager.clearAuth(); // Clear session auth
                }
                const pinBtn = document.getElementById('pinCodeManageBtn');
                if (pinBtn) pinBtn.textContent = '🔒 Set PIN';
                alert('✅ PIN code has been removed successfully!\n\nWebsite is now accessible without authentication.');
                await this.loadOverview();
            } else {
                errorDiv.textContent = result.error || 'Incorrect PIN';
            }
        } catch (error) {
            console.error('Error removing pin:', error);
            errorDiv.textContent = 'Error removing PIN code';
        }
    }

    async confirmResetStats() {
        // Check if PIN is required
        if (this.hasPinCode) {
            // Show PIN verification modal
            this.showResetPinVerification();
        } else {
            // No PIN, proceed with regular confirmation
            await this.performReset();
        }
    }

    showResetPinVerification() {
        const body = document.getElementById('statisticsBody');
        const currentView = this.currentView;

        body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; padding: 40px;">
                <div style="background: var(--bg-primary); padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 500px; width: 100%;">
                    <h3 style="text-align: center; margin-bottom: 10px; color: #ff5722;">⚠️ Reset Statistics</h3>
                    <p style="text-align: center; color: var(--text-secondary); margin-bottom: 20px;">This will permanently delete ALL statistics data!</p>
                    
                    <div style="background: rgba(255, 87, 34, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #ff5722; margin-bottom: 25px;">
                        <p style="margin: 5px 0; font-size: 13px;">📊 All player sessions</p>
                        <p style="margin: 5px 0; font-size: 13px;">📍 Position history</p>
                        <p style="margin: 5px 0; font-size: 13px;">💀 Death records</p>
                        <p style="margin: 5px 0; font-size: 13px;">💬 Chat history</p>
                    </div>
                    
                    <p style="text-align: center; color: var(--text-primary); font-weight: bold; margin-bottom: 20px;">Enter PIN to confirm:</p>
                    
                    <input type="password" id="resetPinInput" placeholder="Enter PIN Code" maxlength="20" style="width: 100%; padding: 12px; font-size: 16px; border: 2px solid var(--border); border-radius: 6px; background: var(--bg-secondary); color: var(--text-primary); text-align: center; letter-spacing: 2px; margin-bottom: 20px;">
                    <div id="resetPinError" style="color: #ff5722; text-align: center; margin-bottom: 15px; min-height: 20px;"></div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.rustplusUI.statisticsManager.verifyResetPin()" class="reset-stats-button" style="flex: 1;">🗑️ Confirm Reset</button>
                        <button onclick="window.rustplusUI.statisticsManager.switchTab('${currentView}')" class="back-button" style="flex: 1;">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        // Focus input and allow Enter key
        setTimeout(() => {
            const input = document.getElementById('resetPinInput');
            if (input) {
                input.focus();
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.verifyResetPin();
                    }
                });
            }
        }, 100);
    }

    async verifyResetPin() {
        const input = document.getElementById('resetPinInput');
        const errorDiv = document.getElementById('resetPinError');
        const pin = input?.value || '';

        if (!pin) {
            errorDiv.textContent = 'Please enter PIN code';
            return;
        }

        try {
            const result = await this.apiClient.post(`/api/statistics/verify-pin/${this.guildId}`, { pin });

            if (result.success) {
                // PIN verified, proceed with reset
                await this.performReset();
            } else {
                errorDiv.textContent = '❌ Incorrect PIN code';
                input.value = '';
                input.focus();
            }
        } catch (error) {
            console.error('Error verifying pin:', error);
            errorDiv.textContent = '❌ Error verifying PIN';
        }
    }

    async performReset() {
        if (!confirm('⚠️ FINAL WARNING\n\nAre you absolutely sure you want to reset ALL statistics?\n\nThis action cannot be undone!')) {
            await this.switchTab(this.currentView);
            return;
        }

        try {
            const body = document.getElementById('statisticsBody');
            body.innerHTML = '<div class="loading">Resetting statistics...</div>';

            await this.apiClient.post(`/api/statistics/reset/${this.guildId}`, {});
            alert('✅ Statistics have been reset successfully!');

            // Reload current view
            await this.switchTab(this.currentView);
        } catch (error) {
            console.error('Error resetting statistics:', error);
            alert('❌ Failed to reset statistics: ' + error.message);
            await this.switchTab(this.currentView);
        }
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(StatisticsManager.prototype, descriptors);
