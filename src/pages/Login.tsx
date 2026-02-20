import React, { useState } from 'react';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogIn } from 'lucide-react';

const ALLOWED_DOMAINS = [
    '@bitsom.edu.in',
    '@bitslawschool.edu.in',
    '@bitsdesign.edu.in'
];

export default function Login() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMsg('');

        const isAllowed = ALLOWED_DOMAINS.some(domain => email.endsWith(domain));
        if (!isAllowed) {
            setStatus('error');
            setErrorMsg('Use a valid BITS institution email (@bitsom.edu.in, @bitslawschool.edu.in, or @bitsdesign.edu.in).');
            return;
        }

        try {
            const actionCodeSettings = {
                url: window.location.origin,
                handleCodeInApp: true,
            };
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            setStatus('success');
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMsg(err.message || 'Failed to send login link.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center flex-1 p-6" style={{ height: '100%', display: 'flex' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img src="/logo.png" alt="BITSwipe Logo" className="logo" style={{ marginBottom: '1rem', width: '150px' }} />
                <p className="subtitle" style={{ marginBottom: '2rem' }}>Right Swipe to Upskill</p>

                <form onSubmit={handleLogin} style={{ width: '100%' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <input
                            type="email"
                            required
                            placeholder="Enter your college email"
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={status === 'loading' || status === 'success'}
                        />
                    </div>

                    {status === 'error' && (
                        <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>
                            {errorMsg}
                        </p>
                    )}

                    {status === 'success' ? (
                        <div style={{ backgroundColor: 'var(--color-indigo-50)', padding: '1rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                            <p style={{ color: 'var(--color-indigo-600)', fontWeight: 600 }}>Check your email!</p>
                            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--color-slate-800)' }}>
                                We've sent a magic link to {email}
                            </p>
                        </div>
                    ) : (
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            disabled={status === 'loading'}
                        >
                            <LogIn size={20} style={{ marginRight: '0.5rem' }} />
                            {status === 'loading' ? 'Sending Link...' : 'Send Magic Link'}
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}
