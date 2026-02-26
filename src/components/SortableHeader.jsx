import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

/**
 * A clickable <th> that shows a sort direction indicator.
 *
 * Props:
 *   label      – column display text
 *   sortKey    – the key to sort by
 *   sortConfig – { key, direction } from useTableSort
 *   onSort     – requestSort function from useTableSort
 *   style      – optional extra styles
 */
export default function SortableHeader({ label, sortKey, sortConfig, onSort, style }) {
    const active = sortConfig.key === sortKey;
    const direction = active ? sortConfig.direction : null;

    return (
        <th
            className="sortable-header"
            onClick={() => onSort(sortKey)}
            style={{ cursor: 'pointer', userSelect: 'none', ...style }}
        >
            <div className="sortable-header-inner">
                <span>{label}</span>
                <span className={`sort-icon ${active ? 'active' : ''}`}>
                    {direction === 'asc' && <ChevronUp size={14} />}
                    {direction === 'desc' && <ChevronDown size={14} />}
                    {!direction && <ChevronsUpDown size={14} />}
                </span>
            </div>
        </th>
    );
}
