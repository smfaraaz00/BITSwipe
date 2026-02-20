import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, Check, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
    id: string;
    name: string;
    photoURL: string;
    skills: string[];
    ratingSum: number;
    ratingCount: number;
}

export default function Explore() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showSkillModal, setShowSkillModal] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfiles = async () => {
            if (!user) return;
            try {
                const q = query(collection(db, 'users'), where('uid', '!=', user.uid));
                const querySnapshot = await getDocs(q);
                const fetched: UserProfile[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    fetched.push({
                        id: doc.id,
                        name: data.name,
                        photoURL: data.photoURL,
                        skills: data.skills || [],
                        ratingSum: data.ratingSum || 0,
                        ratingCount: data.ratingCount || 0,
                    });
                });

                // Simple filter to remove already interacted profiles (would ideally be done server-side or via a subcollection query, but done client-side for simplicity in this prototype)
                const myInterestsQuery = query(collection(db, 'interests'), where('from', '==', user.uid));
                const myInterestsSnapshot = await getDocs(myInterestsQuery);
                const interactedIds = myInterestsSnapshot.docs.map(d => d.data().to);

                const available = fetched.filter(p => !interactedIds.includes(p.id));
                setProfiles(available);
            } catch (err) {
                console.error("Error fetching profiles", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfiles();
    }, [user]);

    const handleSwipe = (direction: 'left' | 'right') => {
        if (currentIndex >= profiles.length) return;

        const currentProfile = profiles[currentIndex];

        if (direction === 'right') {
            setSelectedProfileId(currentProfile.id);
            setShowSkillModal(true);
        } else {
            // Record rejection (optional, but good for filtering future queries)
            if (user) {
                addDoc(collection(db, 'interests'), {
                    from: user.uid,
                    to: currentProfile.id,
                    type: 'reject',
                    timestamp: serverTimestamp()
                }).catch(console.error);
            }
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handleSkillSelect = async (skill: string) => {
        if (!user || !selectedProfileId) return;

        try {
            await addDoc(collection(db, 'interests'), {
                from: user.uid,
                to: selectedProfileId,
                type: 'like',
                wantedSkill: skill,
                timestamp: serverTimestamp()
            });

            // Check for mutual match
            const checkMatchQ = query(
                collection(db, 'interests'),
                where('from', '==', selectedProfileId),
                where('to', '==', user.uid),
                where('type', '==', 'like')
            );
            const matchSnap = await getDocs(checkMatchQ);

            if (!matchSnap.empty) {
                // It's a match! Create an entry in a matches collection
                await addDoc(collection(db, 'matches'), {
                    users: [user.uid, selectedProfileId],
                    timestamp: serverTimestamp()
                });
                alert("It's a Match! Check your Matches tab.");
            }

        } catch (err) {
            console.error("Error saving interest", err);
        } finally {
            setShowSkillModal(false);
            setSelectedProfileId(null);
            setCurrentIndex(prev => prev + 1);
        }
    };

    if (loading) return <div className="flex-1 p-6 flex items-center justify-center">Loading...</div>;

    return (
        <div className="flex flex-col flex-1 pb-[80px]" style={{ position: 'relative', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-slate-200)' }}>
                <img src="/logo.png" alt="Logo" style={{ height: '32px' }} />
                <button className="btn" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--color-indigo-50)', color: 'var(--color-indigo-600)' }} onClick={() => navigate('/matches')}>
                    Matches
                </button>
            </div>

            {/* Card Stack Area */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '1rem' }}>
                <AnimatePresence>
                    {currentIndex < profiles.length ? (
                        <motion.div
                            key={profiles[currentIndex].id}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ x: showSkillModal ? 0 : -300, opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                            className="card"
                            style={{
                                position: 'absolute',
                                width: '100%',
                                maxWidth: '360px',
                                height: '65vh',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: 'var(--shadow-xl)',
                                overflow: 'hidden',
                                padding: 0
                            }}
                        >
                            {/* Card Photo */}
                            <div style={{ flex: 1, backgroundColor: 'var(--color-slate-100)', position: 'relative' }}>
                                {profiles[currentIndex].photoURL ? (
                                    <img src={profiles[currentIndex].photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profile" />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-slate-400)' }}>No Photo</div>
                                )}

                                {/* Info Overlay */}
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', color: 'white' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                        <div>
                                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{profiles[currentIndex].name}</h2>
                                            <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.25rem' }}>
                                                <Star size={16} fill="white" style={{ marginRight: '0.25rem' }} />
                                                <span>
                                                    {profiles[currentIndex].ratingCount > 0
                                                        ? (profiles[currentIndex].ratingSum / profiles[currentIndex].ratingCount).toFixed(1)
                                                        : 'New'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Details / Skills */}
                            <div style={{ padding: '1.5rem', backgroundColor: 'white' }}>
                                <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-slate-500)', marginBottom: '0.75rem', fontWeight: 600 }}>Skills they teach</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {profiles[currentIndex].skills.map(skill => (
                                        <span key={skill} style={{ backgroundColor: 'var(--color-slate-100)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.875rem', color: 'var(--color-slate-800)', fontWeight: 500 }}>
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--color-slate-500)' }}>
                            <h2>No more profiles to show.</h2>
                            <p>Check back later!</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Action Buttons */}
            {currentIndex < profiles.length && !showSkillModal && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', padding: '1.5rem' }}>
                    <button
                        onClick={() => handleSwipe('left')}
                        style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'white', border: 'none', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer' }}
                    >
                        <X size={32} strokeWidth={3} />
                    </button>
                    <button
                        onClick={() => handleSwipe('right')}
                        style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'white', border: 'none', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', cursor: 'pointer' }}
                    >
                        <Check size={32} strokeWidth={3} />
                    </button>
                </div>
            )}

            {/* Skill Selection Modal Overlay */}
            {showSkillModal && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '320px', animation: 'scaleIn 0.2s ease-out' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', textAlign: 'center' }}>Which skill do you want to learn?</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {profiles[currentIndex].skills.map(skill => (
                                <button
                                    key={skill}
                                    onClick={() => handleSkillSelect(skill)}
                                    className="btn btn-primary"
                                    style={{ width: '100%', backgroundColor: 'var(--color-indigo-50)', color: 'var(--color-indigo-600)' }}
                                >
                                    {skill}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => { setShowSkillModal(false); setCurrentIndex(prev => prev + 1); }}
                            className="btn"
                            style={{ width: '100%', marginTop: '1rem', color: 'var(--color-slate-500)' }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
