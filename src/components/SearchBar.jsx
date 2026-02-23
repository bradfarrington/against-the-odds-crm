import { Search } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
    return (
        <div className="search-input-wrapper">
            <Search />
            <input
                type="text"
                className="search-input"
                placeholder={placeholder}
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    );
}
