// API Client for RustPlus WebUI

class APIClient {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    /* Session expired or missing: send the user to the login page */
    handleUnauthorized(response) {
        if (response.status === 401) {
            window.location.href = 'login.html';
            throw new Error('Authentication required');
        }
    }

    async get(endpoint) {
        const response = await fetch(this.baseUrl + endpoint);
        this.handleUnauthorized(response);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }
        return await response.json();
    }

    async post(endpoint, data) {
        const response = await fetch(this.baseUrl + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        this.handleUnauthorized(response);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }
        return await response.json();
    }
}
