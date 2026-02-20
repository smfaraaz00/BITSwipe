import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowLeft, Phone, Star, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MatchDetails {
    id: string; // The match document ID
    partnerProfile: any;
    wantedSkill: string;
}

export default function Matches() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [matches, setMatches] = useState<MatchDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMatch, setSelectedMatch] = useState<MatchDetails | null>(null);

    // Rating state
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submittingRating, setSubmittingRating] = useState(false);

    useEffect(() => {
        const fetchMatches = async () => {
            if (!user) return;
            try {
                const q = query(collection(db, 'matches'), where('users', 'array-contains', user.uid));
                const matchSnaps = await getDocs(q);

                let fetchedMatches: MatchDetails[] = [];

                for (const matchDoc of matchSnaps.docs) {
                    const matchData = matchDoc.data();
                    const partnerId = matchData.users.find((id: string) => id !== user.uid);

                    if (partnerId) {
                        const partnerSnap = await getDoc(doc(db, 'users', partnerId));
                        if (partnerSnap.exists()) {
                            // Also find out which skill the user wanted from the partner (or vice versa).
                            // For simplicity, we just fetch one 'like' interest between them
                            const interestQ = query(
                                collection(db, 'interests'),
                                where('from', 'in', [user.uid, partnerId]),
                                where('to', 'in', [user.uid, partnerId]),
                                where('type', '==', 'like')
                            );
                            const interestSnaps = await getDocs(interestQ);
                            let wantedSkill = 'Various Skills';
                            if (!interestSnaps.empty) {
                                wantedSkill = interestSnaps.docs[0].data().wantedSkill || wantedSkill;
                            }

                            fetchedMatches.push({
                                id: matchDoc.id,
                                partnerProfile: { id: partnerId, ...partnerSnap.data() },
                                wantedSkill
                            });
                        }
                    }
                }
                setMatches(fetchedMatches);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchMatches();
    }, [user]);

    const submitRating = async () => {
        if (!user || !selectedMatch || rating === 0) return;
        setSubmittingRating(true);
        try {
            // Save the rating and comment to a feedback collection
            const feedbackRef = doc(db, 'feedback', `${user.uid}_${selectedMatch.partnerProfile.id}`);
            await setDoc(feedbackRef, {
                from: user.uid,
                to: selectedMatch.partnerProfile.id,
                matchId: selectedMatch.id,
                rating,
                comment,
                timestamp: serverTimestamp()
            });

            // Update partner's profile ratingSum and ratingCount
            const partnerRef = doc(db, 'users', selectedMatch.partnerProfile.id);
            const partnerSnap = await getDoc(partnerRef);
            if (partnerSnap.exists()) {
                const pData = partnerSnap.data();
                await updateDoc(partnerRef, {
                    ratingSum: (pData.ratingSum || 0) + rating,
                    ratingCount: (pData.ratingCount || 0) + 1
                });
            }

            alert('Feedback submitted!');
            setRating(0);
            setComment('');
            setSelectedMatch(null); // Go back to list
        } catch (err) {
            console.error(err);
            alert('Failed to submit rating.');
        } finally {
            setSubmittingRating(false);
        }
    };

    if (loading) return <div className="flex-1 p-6 flex justify-center items-center">Loading...</div>;

    if (selectedMatch) {
        // Detail View
        const partner = selectedMatch.partnerProfile;
        return (
            <div className="flex flex-col flex-1" style={{ backgroundColor: 'var(--color-slate-50)' }}>
                <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', backgroundColor: 'white', borderBottom: '1px solid var(--color-slate-200)' }}>
                    <button onClick={() => setSelectedMatch(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '1rem' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Match Profile</h2>
                </div>

                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.5rem' }}>
                        {partner.photoURL ? (
                            <img src={partner.photoURL} alt="Profile" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem', border: '4px solid var(--color-indigo-50)' }} />
                        ) : (
                            <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--color-slate-200)', marginBottom: '1rem' }} />
                        )}
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{partner.name}</h1>
                        <p style={{ color: 'var(--color-slate-500)', marginTop: '0.25rem' }}>Connecting to learn: <strong style={{ color: 'var(--color-indigo-600)' }}>{selectedMatch.wantedSkill}</strong></p>

                        <a href={`tel:${partner.phone}`} className="btn btn-primary" style={{ marginTop: '1.5rem', width: '100%', display: 'flex', gap: '0.5rem' }}>
                            <Phone size={20} /> Call to Schedule
                        </a>
                    </div>

                    {/* Rating Section */}
                    <div className="card">
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Leave Feedback</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-500)', marginBottom: '1rem' }}>Your comment is private and helps keep the community safe.</p>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    <Star size={32} fill={star <= rating ? '#fbbf24' : 'transparent'} color={star <= rating ? '#fbbf24' : 'var(--color-slate-300)'} />
                                </button>
                            ))}
                        </div>

                        <textarea
                            className="input-field"
                            placeholder="Private comment..."
                            rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            style={{ resize: 'none', marginBottom: '1rem' }}
                        />

                        <button
                            onClick={submitRating}
                            className="btn btn-primary"
                            style={{ width: '100%', display: 'flex', gap: '0.5rem' }}
                            disabled={submittingRating || rating === 0}
                        >
                            <Send size={18} /> {submittingRating ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // List View
    return (
        <div className="flex flex-col flex-1 pb-[80px]">
            <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-slate-200)' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-slate-500)' }}>
                    <ArrowLeft size={24} />
                </button>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Your Matches</h2>
                <div style={{ width: 24 }} />
            </div>

            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
                {matches.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-slate-500)', marginTop: '3rem' }}>
                        <p>No matches yet. Keep swiping!</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {matches.map(match => (
                            <div
                                key={match.id}
                                className="card"
                                style={{ display: 'flex', alignItems: 'center', padding: '1rem', cursor: 'pointer', transition: 'transform 0.2s' }}
                                onClick={() => setSelectedMatch(match)}
                            >
                                <img
                                    src={match.partnerProfile.photoURL || 'https://via.placeholder.com/60'}
                                    alt={match.partnerProfile.name}
                                    style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-indigo-100)', marginRight: '1rem' }}
                                />
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{match.partnerProfile.name}</h3>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-500)' }}>Wants to learn {match.wantedSkill}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
