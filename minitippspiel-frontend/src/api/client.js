import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Authentication & Users
export const registerUser = (userData) => api.post('/users', {
    username: userData.username,
    email: userData.email,
    role: userData.role || 'USER',
    totalPoints: 0,
    hasClaimedTrikot: false
});
export const loginUser = (username) => api.get(`/users/search?username=${username}`);
export const getLeaderboard = () => api.get('/users/leaderboard');

// Matches & Admin
export const getMatches = () => api.get('/matches');
export const createMatch = (matchData) => api.post('/matches/admin', matchData);
export const updateMatchScore = (matchId, scoreData) => api.put(`/matches/admin/${matchId}/score`, scoreData);
export const evaluateMatch = (matchId) => api.post(`/matches/admin/${matchId}/evaluate`);

// Predictions & Queue
export const submitPrediction = (dto) => api.post('/predictions', dto);
export const joinTrikotQueue = (userId) => api.post(`/trikot/queue/join?userId=${userId}`);
export const getQueueStatus = (userId) => api.get(`/trikot/queue/status?userId=${userId}`);

// Fetch predictions by User ID
export const getUserPredictions = (userId) => api.get(`/predictions/user/${userId}`);

export default api;