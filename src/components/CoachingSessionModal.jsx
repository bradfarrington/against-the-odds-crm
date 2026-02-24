import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import Modal from './Modal';
import DateTimePicker from './DateTimePicker';

export default function CoachingSessionModal({ isOpen, onClose, seekerId, session }) {
    const { state, dispatch, ACTIONS } = useData();
    const staffList = state.staff || [];
    const [sessionForm, setSessionForm] = useState({ date: '', durationHours: 1, durationMinutes: 0, staffId: '', notes: '', progressRating: 5 });

    useEffect(() => {
        if (session) {
            let durH = 1;
            let durM = 0;
            if (session.endTime && session.date) {
                const sTime = new Date(session.date).getTime();
                const eTime = new Date(session.endTime).getTime();
                if (!isNaN(sTime) && !isNaN(eTime) && eTime > sTime) {
                    const diffMins = Math.floor((eTime - sTime) / 60000);
                    durH = Math.floor(diffMins / 60);
                    durM = diffMins % 60;
                }
            }

            setSessionForm({
                date: session.date || '',
                durationHours: durH,
                durationMinutes: durM,
                staffId: session.staffId || '',
                notes: session.notes || '',
                progressRating: session.progressRating || 5
            });
        } else {
            setSessionForm({ date: '', durationHours: 1, durationMinutes: 0, staffId: '', notes: '', progressRating: 5 });
        }
    }, [session, isOpen]);

    const handleSaveSession = (e) => {
        e.preventDefault();

        let endTime = null;
        let saveDate = sessionForm.date;
        if (sessionForm.date) {
            const startDateTime = new Date(sessionForm.date);
            if (!isNaN(startDateTime.getTime())) {
                saveDate = startDateTime.toISOString();
                const endDateTime = new Date(startDateTime);
                endDateTime.setHours(endDateTime.getHours() + parseInt(sessionForm.durationHours));
                endDateTime.setMinutes(endDateTime.getMinutes() + parseInt(sessionForm.durationMinutes));
                endTime = endDateTime.toISOString();
            }
        }

        const payloadSession = { ...sessionForm, date: saveDate, endTime, progressRating: parseInt(sessionForm.progressRating) };
        delete payloadSession.durationHours;
        delete payloadSession.durationMinutes;

        if (session) {
            dispatch({
                type: ACTIONS.UPDATE_COACHING_SESSION,
                payload: {
                    seekerId: seekerId,
                    session: { id: session.id, ...payloadSession }
                }
            });
        } else {
            dispatch({
                type: ACTIONS.ADD_COACHING_SESSION,
                payload: {
                    seekerId: seekerId,
                    session: payloadSession
                }
            });
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={session ? 'Edit Session' : 'Log Coaching Session'}>
            <form onSubmit={handleSaveSession}>
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Start Date & Time *</label>
                        <DateTimePicker
                            name="date"
                            required
                            value={sessionForm.date}
                            onChange={e => setSessionForm({ ...sessionForm, date: e.target.value })}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Duration (Hours)</label>
                            <select className="form-input" value={sessionForm.durationHours} onChange={e => {
                                const h = parseInt(e.target.value);
                                let m = sessionForm.durationMinutes;
                                if (h === 0 && m < 15) m = 15;
                                setSessionForm({ ...sessionForm, durationHours: h, durationMinutes: m });
                            }}>
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(h => <option key={h} value={h}>{h} hr{h !== 1 ? 's' : ''}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Duration (Minutes)</label>
                            <select className="form-input" value={sessionForm.durationMinutes} onChange={e => {
                                const m = parseInt(e.target.value);
                                let h = sessionForm.durationHours;
                                if (h === 0 && m < 15) h = 1;
                                setSessionForm({ ...sessionForm, durationMinutes: m, durationHours: h });
                            }}>
                                {[0, 15, 30, 45].map(m => <option key={m} value={m}>{m} mins</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Assigned Member *</label>
                        <select className="form-input" required value={sessionForm.staffId} onChange={e => setSessionForm({ ...sessionForm, staffId: e.target.value })}>
                            <option value="">Select Staff Member</option>
                            {staffList.map(s => (
                                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Progress Rating (1-10)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            <input
                                type="range"
                                min="1" max="10"
                                value={sessionForm.progressRating}
                                onChange={e => setSessionForm({ ...sessionForm, progressRating: e.target.value })}
                                style={{ flex: 1 }}
                            />
                            <span style={{ fontWeight: 600, width: 24, textAlign: 'center' }}>{sessionForm.progressRating}</span>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Session Notes</label>
                        <textarea
                            className="form-textarea"
                            rows={4}
                            value={sessionForm.notes}
                            onChange={e => setSessionForm({ ...sessionForm, notes: e.target.value })}
                            placeholder="Key takeaways, topics discussed, next steps..."
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary">{session ? 'Save Changes' : 'Save Session'}</button>
                </div>
            </form>
        </Modal>
    );
}
