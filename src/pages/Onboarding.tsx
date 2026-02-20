import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Onboarding() {
    const { user, checkProfile } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>('');

    const [skillInput, setSkillInput] = useState('');
    const [skills, setSkills] = useState<string[]>([]);

    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
        if ('key' in e && e.key !== 'Enter') return;
        e.preventDefault();
        if (skillInput.trim() && skills.length < 5 && !skills.includes(skillInput.trim())) {
            setSkills([...skills, skillInput.trim()]);
            setSkillInput('');
        }
    };

    const removeSkill = (skillToRemove: string) => {
        setSkills(skills.filter(s => s !== skillToRemove));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!name || !phone || skills.length === 0) {
            setStatus('error');
            setErrorMsg('Please fill all required fields and add at least one skill.');
            return;
        }

        setStatus('loading');
        setErrorMsg('');

        try {
            let photoURL = '';
            if (photo) {
                const storageRef = ref(storage, `profiles/${user.uid}/${photo.name}`);
                const snapshot = await uploadBytes(storageRef, photo);
                photoURL = await getDownloadURL(snapshot.ref);
            }

            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                name,
                phone,
                photoURL,
                skills,
                ratingSum: 0,
                ratingCount: 0,
                createdAt: new Date().toISOString()
            });

            await checkProfile(user.uid);
            navigate('/');
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMsg(err.message || 'Failed to save profile.');
        }
    };

    return (
        <div className="flex flex-col flex-1 pb-6" style={{ overflowY: 'auto' }}>
            <div style={{ backgroundColor: 'var(--color-indigo-600)', padding: '2rem 1rem', color: 'white', borderBottomLeftRadius: 'var(--radius-2xl)', borderBottomRightRadius: 'var(--radius-2xl)', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Complete Profile</h1>
                <p style={{ opacity: 0.9 }}>Let others know what you can teach and learn.</p>
            </div>

            <div style={{ padding: '0 1rem' }}>
                <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <label htmlFor="photo-upload" style={{ position: 'relative', cursor: 'pointer' }}>
                            <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--color-slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px dashed var(--color-slate-200)' }}>
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <Camera size={32} color="var(--color-slate-400)" />
                                )}
                            </div>
                        </label>
                        <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-slate-500)' }}>Tap to add photo (optional)</span>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Full Name</label>
                        <input type="text" className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Doe" required disabled={status === 'loading'} />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Phone Number</label>
                        <input type="tel" className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" required disabled={status === 'loading'} />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Skills to Teach (Max 5)</label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input
                                type="text"
                                className="input-field"
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                onKeyDown={handleAddSkill}
                                placeholder="Type a skill & press Enter"
                                disabled={skills.length >= 5 || status === 'loading'}
                            />
                            <button type="button" onClick={handleAddSkill} className="btn" style={{ backgroundColor: 'var(--color-slate-200)' }} disabled={skills.length >= 5 || status === 'loading'}>
                                Add
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {skills.map(skill => (
                                <div key={skill} style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: 'var(--color-indigo-50)', color: 'var(--color-indigo-600)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 500 }}>
                                    {skill}
                                    <button type="button" onClick={() => removeSkill(skill)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '0.25rem', color: 'inherit' }} disabled={status === 'loading'}>
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {status === 'error' && (
                        <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{errorMsg}</p>
                    )}

                    <button type="submit" className="btn btn-primary" disabled={status === 'loading' || skills.length === 0 || !name || !phone}>
                        {status === 'loading' ? 'Saving...' : 'Complete Profile'}
                    </button>
                </form>
            </div>
        </div>
    );
}
