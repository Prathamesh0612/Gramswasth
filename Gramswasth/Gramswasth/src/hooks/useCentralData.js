import { useState, useEffect } from 'react';

// Adjust the base URL if your server runs on a different port or host
const API_BASE_URL = 'http://localhost:5000/api';

/**
 * A hook to read and write variables to the centralized database (PostgreSQL/JSON).
 * 
 * Usage:
 * const { data, loading, error, setVariable, refresh } = useCentralData();
 * 
 * // Access 'theme' variable:
 * console.log(data.theme);
 * 
 * // Update 'theme' variable:
 * await setVariable('theme', 'dark');
 */
export function useCentralData() {
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dbStatus, setDbStatus] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            
            // 1. Get database status (optional, good for debugging)
            const statusRes = await fetch(`${API_BASE_URL}/status`);
            if (statusRes.ok) {
                const statusJson = await statusRes.json();
                setDbStatus(statusJson.mode);
            }

            // 2. Fetch all centralized variables
            const dataRes = await fetch(`${API_BASE_URL}/data`);
            if (!dataRes.ok) throw new Error('Failed to fetch data');
            
            const dataJson = await dataRes.json();
            setData(dataJson);
            setError(null);
        } catch (err) {
            console.error('Error fetching centralized data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    /**
     * Updates a variable in the centralized database and updates local state.
     * @param {string} key - The variable name
     * @param {any} value - The variable value (strings, numbers, objects, arrays)
     */
    const setVariable = async (key, value) => {
        try {
            const res = await fetch(`${API_BASE_URL}/data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ key, value }),
            });

            if (!res.ok) throw new Error('Failed to save variable');

            // Optimistically update local state
            setData(prev => ({ ...prev, [key]: value }));
            return true;
        } catch (err) {
            console.error(`Error saving variable ${key}:`, err);
            setError(err.message);
            return false;
        }
    };

    /**
     * Helper to get a specific variable if you don't want to destructure the whole data object.
     * @param {string} key 
     */
    const getVariable = async (key) => {
        try {
            const res = await fetch(`${API_BASE_URL}/data?key=${key}`);
            if (res.ok) {
                const json = await res.json();
                return json[key];
            }
        } catch (e) {
            console.error(`Error getting variable ${key}:`, e);
        }
        return data[key];
    };

    return { 
        data, 
        loading, 
        error, 
        dbStatus,
        setVariable,
        getVariable, 
        refresh: fetchData 
    };
}
