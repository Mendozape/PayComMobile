import axios from 'axios';

// IMPORTANT: Double check this is your current PC IP (use ipconfig in cmd)
export const PC_IP = '192.168.1.16'; 

const api = axios.create({
    baseURL: `http://${PC_IP}:8000/api`, // Note the /api here for routes in api.php
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

export default api;