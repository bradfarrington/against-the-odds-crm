import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, ACTIONS } from '../context/DataContext';
import { Users, Plus, Mail, Phone, Edit2, Trash2 } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import StatusBadge from '../components/StatusBadge';
import RecoverySeekerModal from '../components/RecoverySeekerModal';

export default function RecoverySeekersList() {
    const { state, dispatch } = useData();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [editingSeeker, setEditingSeeker] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    const filtered = state.recoverySeekers.filter(s => {
        const matchesSearch = (
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
            (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
            (s.status && s.status.toLowerCase().includes(search.toLowerCase()))
        );
        return matchesSearch;
    });

    const handleOpenEdit = (seeker, e) => {
        e.stopPropagation();
        setEditingSeeker(seeker);
    };

    const handleDelete = (seekerId, e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this recovery seeker?')) {
            dispatch({ type: ACTIONS.DELETE_SEEKER, payload: seekerId });
        }
    };

    return (
        <>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Recovery Seekers</h1>
                    <div className="page-header-subtitle">Manage all active and past treatment clients</div>
                </div>
                <div className="page-header-actions">
                    <SearchBar value={search} onChange={setSearch} placeholder="Search seekers..." />
                    <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
                        <Plus size={16} />
                        New Intake
                    </button>
                </div>
            </div>

            <div className="page-body">
                <div className="card">
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Treatment Stage</th>
                                    <th>Risk Level</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(seeker => (
                                    <tr key={seeker.id} onClick={() => navigate(`/recovery-seekers/${seeker.id}`)}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                                <div style={{
                                                    width: 34, height: 34, borderRadius: 'var(--radius-full)',
                                                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 13, fontWeight: 600, color: 'white', flexShrink: 0
                                                }}>
                                                    {seeker.firstName?.[0]}{seeker.lastName?.[0]}
                                                </div>
                                                <div className="table-cell-main">
                                                    {seeker.firstName} {seeker.lastName}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                                                <span className="table-cell-secondary">{seeker.email || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="table-cell-secondary">{seeker.phone || '—'}</td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex', padding: '4px 10px', borderRadius: 12,
                                                fontSize: 12, fontWeight: 500, background: 'var(--surface-active)'
                                            }}>{seeker.status}</span>
                                        </td>
                                        <td>
                                            <StatusBadge status={seeker.riskLevel || 'Medium'} />
                                        </td>
                                        <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={e => handleOpenEdit(seeker, e)} title="Edit">
                                                <Edit2 size={14} />
                                            </button>
                                            <button className="btn btn-ghost btn-sm" onClick={e => handleDelete(seeker.id, e)} title="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6}>
                                            <div className="empty-state">
                                                <Users />
                                                <h3>No recovery seekers found</h3>
                                                <p>Try adjusting your search or add a new intake</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <RecoverySeekerModal
                isOpen={!!editingSeeker || isCreating}
                onClose={() => {
                    setEditingSeeker(null);
                    setIsCreating(false);
                }}
                item={editingSeeker}
            />
        </>
    );
}
