import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Intercepteur pour ajouter le token à chaque requête
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📡 URL :', config.baseURL + config.url);
        console.log('🔑 Token présent :', !!token);
        console.log('🔑 Token début :', token ? token.substring(0, 10) + '...' : 'AUCUN');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

export default api;