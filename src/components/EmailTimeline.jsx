import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Mail, RefreshCw, Send, Paperclip, Reply, ReplyAll, Users, ChevronDown, ChevronRight, Forward } from 'lucide-react';
import Modal from './Modal';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
export default function EmailTimeline({ contactId, contactEmail, linkedType = 'contact' }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { state: dataState } = useData();
    const staffList = dataState.staff || [];
    const [selectedStaffUserId, setSelectedStaffUserId] = useState('all');
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [composeOpen, setComposeOpen] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null); // 'reply' | 'replyAll' | null
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [sending, setSending] = useState(false);
    const [isOutlookConnected, setIsOutlookConnected] = useState(false);
    const [checkingConnection, setCheckingConnection] = useState(true);
    const [expandedThreads, setExpandedThreads] = useState({});
    const [expandedEmails, setExpandedEmails] = useState({});
    const [selectedThreadId, setSelectedThreadId] = useState(null);
    const [forwardTo, setForwardTo] = useState('');

    const toggleThread = (cid) => {
        setExpandedThreads(prev => ({ ...prev, [cid]: !prev[cid] }));
    };

    const toggleEmail = (id) => {
        setExpandedEmails(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const fetchEmails = async () => {
        setLoading(true);
        let query = supabase.from('contact_emails').select('*');

        if (linkedType === 'seeker') {
            query = query.eq('recovery_seeker_id', contactId);
        } else {
            query = query.eq('contact_id', contactId);
        }

        const { data, error } = await query.order('timestamp', { ascending: false });

        if (!error && data) {
            setEmails(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        async function checkConnection() {
            if (!user) return;
            setCheckingConnection(true);
            const { data } = await supabase
                .from('user_oauth_connections')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (data) setIsOutlookConnected(true);
            setCheckingConnection(false);
        }
        checkConnection();
    }, [user]);

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
            action: 'sendMail',
            linkedId: contactId,
            linkedType: linkedType,
            toRecipients: [contactEmail],
            subject,
            bodyHtml: body
        };

        if (replyingTo === 'forward') {
            payload.messageId = selectedMessageId;
            payload.toRecipients = [forwardTo];
            payload.action = replyingTo;
        } else if (replyingTo) {
            payload.messageId = selectedMessageId;
            payload.action = replyingTo;
        } else {
            payload.toRecipients = [contactEmail];
            payload.subject = subject;
            payload.action = 'sendMail';
        }

        // Add cc and bcc if present
        if (cc.trim()) {
            payload.ccRecipients = cc.split(',').map(email => email.trim()).filter(e => e);
        }
        if (bcc.trim()) {
            payload.bccRecipients = bcc.split(',').map(email => email.trim()).filter(e => e);
        }

        try {
            console.log("SENDING PAYLOAD TO API:", payload);
            const res = await fetch(`${supabaseUrl}/functions/v1/outlook-api`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                let errText = await res.text();
                let errMsg = `Failed: ${errText}`;
                try {
                    const err = JSON.parse(errText);
                    console.error("API RETURNED JSON ERROR:", err);
                    if (err.error) errMsg = err.error;
                } catch (e) {
                    console.error("API RETURNED NON-JSON ERROR:", errText, e);
                    errMsg = `Server returned ${res.status}: ${errText.substring(0, 100)}`;
                }
                throw new Error(errMsg);
            }

            const successData = await res.json();
            console.log("API SUCCESS:", successData);

            setComposeOpen(false);
            setSubject('');
            setBody('');
            setCc('');
            setBcc('');
            setReplyingTo(null);
            setSelectedMessageId(null);
            setForwardTo('');
            // Wait a moment for webhook to sync the sent email, or fetch manually
            setTimeout(fetchEmails, 2000);
        } catch (error) {
            console.error("CAUGHT ERROR:", error);
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
        setCc('');
        setBcc('');
        setForwardTo('');
        setComposeOpen(true);
    };

    const openReply = (msg, type) => {
        setReplyingTo(type);
        setSelectedMessageId(msg.graph_message_id);
        if (type === 'forward') {
            setSubject(`Fwd: ${msg.subject}`);
            setBody('');
            setCc('');
            setBcc('');
            setForwardTo('');
        } else {
            setSubject(`Re: ${msg.subject}`);
            setBody('');
            setCc('');
            setBcc('');
        }
        setComposeOpen(true);
    };

    // Derived states
    const filteredEmails = emails.filter(e => {
        if (selectedStaffUserId === 'all') return true;
        return e.user_id === selectedStaffUserId;
    });

    const threads = [];
    const threadMap = {}; // conversation_id -> thread

    filteredEmails.forEach(email => {
        const cid = email.conversation_id || email.id; // fallback to ID if no conversation
        if (!threadMap[cid]) {
            threadMap[cid] = {
                conversation_id: cid,
                emails: [],
                subject: email.subject || '(No Subject)',
            };
            threads.push(threadMap[cid]);
        }
        threadMap[cid].emails.push(email);
    });

    // Sort threads so the most recent email thread is at the top
    threads.sort((a, b) => new Date(b.emails[0].timestamp).getTime() - new Date(a.emails[0].timestamp).getTime());

    // Auto-select the first thread if none is selected
    useEffect(() => {
        if (!selectedThreadId && threads.length > 0) {
            setSelectedThreadId(threads[0].conversation_id);
        }
    }, [threads, selectedThreadId]);

    return (
        <div className="card">
            <div className="card-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Mail size={18} /> Email History
                </h3>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                        <Users size={14} style={{ color: 'white' }} />
                        <select
                            style={{ border: 'none', background: 'transparent', fontSize: 13, outline: 'none', cursor: 'pointer', color: 'white' }}
                            value={selectedStaffUserId}
                            onChange={(e) => setSelectedStaffUserId(e.target.value)}
                        >
                            <option value="all">All Staff</option>
                            {staffList.map(s => (
                                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                            ))}
                        </select>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={fetchEmails} disabled={loading} title="Refresh">
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                    </button>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={isOutlookConnected ? openCompose : () => navigate('/settings')}
                        disabled={checkingConnection}
                        title={!isOutlookConnected && !checkingConnection ? "Connect Outlook in Settings to send emails" : ""}
                    >
                        <Send size={14} /> {checkingConnection ? 'Checking connection...' : isOutlookConnected ? 'New Email' : 'Connect Outlook to Send'}
                    </button>
                </div>
            </div>

            <div className="card-body">
                {loading && emails.length === 0 ? (
                    <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-muted)' }}>Loading emails...</div>
                ) : filteredEmails.length === 0 ? (
                    <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                        <Mail />
                        <h3>No emails found</h3>
                        <p>No communications matched your criteria.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 'var(--space-md)', minHeight: 400 }}>
                        {/* LEFT PANE: Thread List */}
                        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', paddingRight: 'var(--space-sm)', overflowY: 'auto' }}>
                            {threads.map(thread => {
                                const latestEmail = thread.emails[0];
                                const isSelected = selectedThreadId === thread.conversation_id;
                                return (
                                    <div
                                        key={thread.conversation_id}
                                        onClick={() => setSelectedThreadId(thread.conversation_id)}
                                        style={{
                                            padding: 'var(--space-md)',
                                            borderRadius: 'var(--radius-md)',
                                            background: isSelected ? 'var(--bg-surface)' : 'var(--bg-card)',
                                            border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 4
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                                                {latestEmail.direction === 'inbound' ? latestEmail.sender_address : (latestEmail.user_id && staffList.find(s => s.id === latestEmail.user_id) ? staffList.find(s => s.id === latestEmail.user_id).firstName : 'You')}
                                            </span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {new Date(latestEmail.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {thread.subject}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {latestEmail.body_html ? latestEmail.body_html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ') : ''}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* RIGHT PANE: Selected Thread Conversation */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', overflowY: 'auto', paddingLeft: 'var(--space-sm)' }}>
                            {threads.filter(t => t.conversation_id === selectedThreadId).map(thread => (
                                <div key={thread.conversation_id} style={{
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--bg-card)',
                                    overflow: 'hidden'
                                }}>
                                    <div
                                        style={{
                                            padding: 'var(--space-md)',
                                            background: 'var(--bg-surface)',
                                            borderBottom: '1px solid var(--border)',
                                            fontWeight: 600,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <span>{thread.subject}</span>
                                        </div>
                                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 12 }}>
                                            {thread.emails.length} message{thread.emails.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {thread.emails.map((email, idx) => {
                                            const isEmailExpanded = expandedEmails[email.id] ?? (idx === 0);
                                            return (
                                                <div key={email.id} style={{
                                                    padding: '0',
                                                    background: email.direction === 'inbound' ? 'var(--bg-body)' : 'var(--bg-card)',
                                                    borderLeft: `3px solid ${email.direction === 'inbound' ? 'var(--primary)' : 'var(--text-muted)'}`,
                                                    borderBottom: idx < thread.emails.length - 1 ? '1px solid var(--border)' : 'none'
                                                }}>
                                                    <div
                                                        onClick={(e) => { e.stopPropagation(); toggleEmail(email.id); }}
                                                        style={{
                                                            padding: 'var(--space-md)',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            cursor: 'pointer',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        <div style={{ fontSize: 13, maxWidth: 'calc(100% - 150px)' }}>
                                                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                {email.direction === 'inbound' ? email.sender_address : (email.user_id && staffList.find(s => s.id === email.user_id) ? staffList.find(s => s.id === email.user_id).firstName : 'You')}
                                                                <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>
                                                                    to {email.direction === 'inbound' ? 'You' : email.recipients.join(', ')}
                                                                </span>
                                                                {email.user_id && staffList.find(s => s.id === email.user_id) && (
                                                                    <span style={{ fontStyle: 'italic', opacity: 0.8, color: 'var(--text-secondary)', fontSize: 11 }}>
                                                                        (Sync via {staffList.find(s => s.id === email.user_id).firstName})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {!isEmailExpanded && email.body_html && (
                                                                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {email.body_html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                                                            {email.has_attachments && <Paperclip size={12} />}
                                                            <span>{new Date(email.timestamp).toLocaleString()}</span>
                                                        </div>
                                                    </div>

                                                    {isEmailExpanded && (
                                                        <div style={{ padding: '0 var(--space-md) var(--space-md) var(--space-md)' }}>
                                                            <div style={{
                                                                fontSize: 13,
                                                                lineHeight: 1.5,
                                                                color: 'var(--text)',
                                                                background: 'var(--bg-input)',
                                                                padding: 'var(--space-sm)',
                                                                borderRadius: 'var(--radius-sm)',
                                                                maxHeight: 200,
                                                                overflowY: 'auto',
                                                                marginBottom: 'var(--space-sm)'
                                                            }}>
                                                                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-sm)', fontSize: 12, color: 'var(--text-secondary)' }}>
                                                                    <div><strong>From:</strong> {email.sender_address}</div>
                                                                    <div><strong>To:</strong> {email.recipients.join(', ')}</div>
                                                                </div>
                                                                <div dangerouslySetInnerHTML={{ __html: email.body_html || '<em>Empty body</em>' }} />
                                                            </div>

                                                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-secondary btn-sm"
                                                                    onClick={(e) => { e.stopPropagation(); openReply(email, 'reply') }}
                                                                    disabled={checkingConnection || !isOutlookConnected}
                                                                    title={!isOutlookConnected ? "Connect Outlook in Settings to reply" : ""}
                                                                >
                                                                    <Reply size={14} /> Reply
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-secondary btn-sm"
                                                                    onClick={(e) => { e.stopPropagation(); openReply(email, 'replyAll') }}
                                                                    disabled={checkingConnection || !isOutlookConnected}
                                                                    title={!isOutlookConnected ? "Connect Outlook in Settings to reply" : ""}
                                                                >
                                                                    <ReplyAll size={14} /> Reply All
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-secondary btn-sm"
                                                                    onClick={(e) => { e.stopPropagation(); openReply(email, 'forward') }}
                                                                    disabled={checkingConnection || !isOutlookConnected}
                                                                    title={!isOutlookConnected ? "Connect Outlook in Settings to forward" : ""}
                                                                >
                                                                    <Forward size={14} /> Forward
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
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
                                <div className="form-group">
                                    <label className="form-label">CC (Optional, comma-separated)</label>
                                    <input className="form-input" value={cc} onChange={e => setCc(e.target.value)} placeholder="email1@example.com, email2@example.com" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">BCC (Optional, comma-separated)</label>
                                    <input className="form-input" value={bcc} onChange={e => setBcc(e.target.value)} placeholder="email1@example.com, email2@example.com" />
                                </div>
                            </>
                        )}
                        {replyingTo === 'forward' && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">To</label>
                                    <input className="form-input" required value={forwardTo} onChange={e => setForwardTo(e.target.value)} placeholder="Email address to forward to..." />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Subject</label>
                                    <input className="form-input" disabled value={subject} />
                                </div>
                            </>
                        )}
                        {replyingTo && replyingTo !== 'forward' && (
                            <div className="form-group">
                                <label className="form-label">Subject</label>
                                <input className="form-input" disabled value={subject} />
                            </div>
                        )}
                        <div className="form-group email-editor-wrapper" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                            <label className="form-label">Message</label>
                            <ReactQuill
                                theme="snow"
                                value={body}
                                onChange={setBody}
                                placeholder="Write your message here..."
                                modules={{
                                    toolbar: [
                                        [{ 'header': [1, 2, false] }],
                                        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
                                        ['link', 'image'],
                                        ['clean']
                                    ],
                                }}
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
