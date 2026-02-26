import { useState, useCallback, useMemo } from 'react';

/**
 * Generic table sort hook.
 * @param {string} defaultKey   – initial sort column key (optional)
 * @param {'asc'|'desc'} defaultDir – initial direction (default 'asc')
 *
 * Returns { sortConfig, requestSort, sortedData }
 *   sortConfig  – { key, direction } or { key: null, direction: null }
 *   requestSort – (key) => toggle asc → desc → none
 *   sortedData  – (data, getters?) => sorted copy
 *
 * `getters` is an optional map of  key → (row) => value
 * that lets callers pull derived / nested values (e.g. company name from id).
 */
export default function useTableSort(defaultKey = null, defaultDir = 'asc') {
    const [sortConfig, setSortConfig] = useState({
        key: defaultKey,
        direction: defaultKey ? defaultDir : null,
    });

    const requestSort = useCallback((key) => {
        setSortConfig((prev) => {
            if (prev.key !== key) return { key, direction: 'asc' };
            if (prev.direction === 'asc') return { key, direction: 'desc' };
            return { key: null, direction: null }; // reset
        });
    }, []);

    /**
     * Sort an array by the current sortConfig.
     * @param {Array} data
     * @param {Object} [getters] – optional map key → (row) => value
     */
    const sortedData = useCallback(
        (data, getters) => {
            if (!sortConfig.key || !sortConfig.direction) return data;

            const getter = getters?.[sortConfig.key] || ((row) => row[sortConfig.key]);

            return [...data].sort((a, b) => {
                let valA = getter(a);
                let valB = getter(b);

                // Normalise nulls / undefined to bottom
                if (valA == null && valB == null) return 0;
                if (valA == null) return 1;
                if (valB == null) return -1;

                // Dates
                if (valA instanceof Date && valB instanceof Date) {
                    return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
                }

                // Numbers
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
                }

                // Strings (case-insensitive)
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        },
        [sortConfig],
    );

    return { sortConfig, requestSort, sortedData };
}
