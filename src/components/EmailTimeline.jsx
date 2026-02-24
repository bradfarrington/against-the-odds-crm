import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Mail, RefreshCw, Send, Paperclip, Reply, ReplyAll } from 'lucide-react';
import Modal from './Modal';

export default function EmailTimeline({ contactId, contactEmail }) {
    const { user } = useAuth();
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [composeOpen, setComposeOpen] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null); // 'reply' | 'replyAll' | null
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    const fetchEmails = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('contact_emails')
            .select('*')
            .eq('contact_id', contactId)
            .order('timestamp', { ascending: false });

        if (!error && data) {
            setEmails(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchEmails();

        // Optional: subscribe to real-time changes
        const channel = supabase
            .channel('emails_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_emails', filter: `contact_id=eq.${contactId}` },
                payload => {
                    setEmails(prev => [payload.new, ...prev]);
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [contactId]);

    const handleSend = async (e) => {
        e.preventDefault();
        setSending(true);

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        const payload = {
            userId: user.id,
            action: replyingTo ? replyingTo : 'sendMail',
            bodyHtml: body,
        };

        if (replyingTo) {
            payload.messageId = selectedMessageId;
        } else {
            payload.toRecipients = [contactEmail];
            payload.subject = subject;
        }

        try {
            const res = await fetch(`${supabaseUrl}/functions/v1/outlook-api`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to send email');
            }

            setComposeOpen(false);
            setSubject('');
            setBody('');
            setReplyingTo(null);
            setSelectedMessageId(null);
            // Wait a moment for webhook to sync the sent email, or fetch manually
            setTimeout(fetchEmails, 2000);
        } catch (error) {
            alert(error.message);
        } finally {
            setSending(false);
        }
    };

    const openCompose = () => {
        if (!contactEmail) {
            alert("This contact has no email address.");
            return;
        }
        setReplyingTo(null);
        setSubject('');
        setBody('');
        setComposeOpen(true);
    };

    const openReply = (msg, type) => {
        setReplyingTo(type);
        setSelectedMessageId(msg.graph_message_id);
        setSubject(`Re: ${msg.subject}`);
        setBody('');
        setComposeOpen(true);
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Mail size={18} /> Email History
                </h3>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className="btn btn-secondary btn-sm" onClick={fetchEmails} disabled={loading} title="Refresh">
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={openCompose}>
                        <Send size={14} /> New Email
                    </button>
                </div>
            </div>

            <div className="card-body">
                {loading && emails.length === 0 ? (
                    <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-muted)' }}>Loading emails...</div>
                ) : emails.length === 0 ? (
                    <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                        <Mail />
                        <h3>No emails found</h3>
                        <p>Emails sent or received via Outlook will appear here.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {emails.map(email => (
                            <div key={email.id} style={{
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-md)',
                                background: email.direction === 'inbound' ? 'var(--bg-card)' : 'var(--bg-body)',
                                borderLeft: `3px solid ${email.direction === 'inbound' ? 'var(--primary)' : 'var(--text-muted)'}`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{email.subject || '(No Subject)'}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                            {email.direction === 'inbound' ? `From: ${email.sender_address}` : `To: ${email.recipients.join(', ')}`}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                                        <div>{new Date(email.timestamp).toLocaleString()}</div>
                                        {email.has_attachments && <Paperclip size={12} style={{ marginTop: 4 }} />}
                                    </div>
                                </div>

                                <div style={{
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                    color: 'var(--text)',
                                    background: 'var(--bg-input)',
                                    padding: 'var(--space-sm)',
                                    borderRadius: 'var(--radius-sm)',
                                    maxHeight: 200,
                                    overflowY: 'auto'
                                }} dangerouslySetInnerHTML={{ __html: email.body_html || '<em>Empty body</em>' }} />

                                <div style={{ marginTop: 'var(--space-sm)', display: 'flex', gap: 'var(--space-sm)' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => openReply(email, 'reply')}>
                                        <Reply size={14} /> Reply
                                    </button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => openReply(email, 'replyAll')}>
                                        <ReplyAll size={14} /> Reply All
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal isOpen={composeOpen} onClose={() => setComposeOpen(false)} title={replyingTo ? 'Reply to Email' : 'New Email'} size="lg">
                <form onSubmit={handleSend}>
                    <div className="modal-body">
                        {!replyingTo && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">To</label>
                                    <input className="form-input" disabled value={contactEmail || ''} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Subject</label>
                                    <input className="form-input" required value={subject} onChange={e => setSubject(e.target.value)} />
                                </div>
                            </>
                        )}
                        {replyingTo && (
                            <div className="form-group">
                                <label className="form-label">Subject</label>
                                <input className="form-input" disabled value={subject} />
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Message</label>
                            <textarea
                                className="form-textarea"
                                required
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                style={{ minHeight: 200 }}
                                placeholder="Write your message here..."
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setComposeOpen(false)} disabled={sending}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={sending}>
                            {sending ? 'Sending...' : 'Send Email'} <Send size={14} style={{ marginLeft: 6 }} />
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
