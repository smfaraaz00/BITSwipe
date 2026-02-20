import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { LogOut, Star, Edit2, Check, X } from 'lucide-react';

interface ProfileData {
    name: string;
    phone: string;
    photoURL: string;
    skills: string[];
    ratingSum: number;
    ratingCount: number;
    availability?: string;
}

interface SwipedUser {
    id: string;
    name: string;
    photoURL: string;
    wantedSkill: string;
}

export default function Profile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [swipedList, setSwipedList] = useState<SwipedUser[]>([]);
    const [matchesCount, setMatchesCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<ProfileData>>({});

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!user) return;
            try {
                // Fetch own profile
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setProfile(docSnap.data() as ProfileData);
                }

                // Fetch Matches Count
                const matchQ = query(collection(db, 'matches'), where('users', 'array-contains', user.uid));
                const matchSnaps = await getDocs(matchQ);
                setMatchesCount(matchSnaps.size);

                // Fetch people the user has "Right Swiped" (type: 'like')
                const interestQ = query(collection(db, 'interests'), where('from', '==', user.uid), where('type', '==', 'like'));
                const interestSnaps = await getDocs(interestQ);

                let fetchedSwiped: SwipedUser[] = [];
                for (const interestDoc of interestSnaps.docs) {
                    const data = interestDoc.data();
                    const targetId = data.to;
                    const targetUserSnap = await getDoc(doc(db, 'users', targetId));
                    if (targetUserSnap.exists()) {
                        const tData = targetUserSnap.data();
                        fetchedSwiped.push({
                            id: targetId,
                            name: tData.name,
                            photoURL: tData.photoURL,
                            wantedSkill: data.wantedSkill
                        });
                    }
                }
                setSwipedList(fetchedSwiped);

            } catch (e) {
                console.error("Error fetching profile data", e);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, [user]);

    const handleSignOut = async () => {
        await signOut(auth);
    };

    const handleEditToggle = () => {
        if (!isEditing && profile) {
            setEditForm({
                name: profile.name,
                phone: profile.phone,
                photoURL: profile.photoURL,
                skills: profile.skills,
                availability: profile.availability || ''
            });
        }
        setIsEditing(!isEditing);
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const docRef = doc(db, 'users', user.uid);
            await updateDoc(docRef, {
                name: editForm.name,
                phone: editForm.phone,
                photoURL: editForm.photoURL,
                skills: editForm.skills,
                availability: editForm.availability || ''
            });
            setProfile(prev => prev ? { ...prev, ...editForm } as ProfileData : null);
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile", error);
            alert("Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    if (loading || !profile) {
        return <div className="flex-1 p-6 flex justify-center items-center">Loading...</div>;
    }

    const avgRating = profile.ratingCount > 0 ? (profile.ratingSum / profile.ratingCount).toFixed(1) : 'New';

    return (
        <div className="flex flex-col flex-1 pb-[80px]" style={{ backgroundColor: 'var(--color-slate-50)' }}>
            {/* Header */}
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderBottom: '1px solid var(--color-slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>My Profile</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {!isEditing && (
                        <button onClick={handleEditToggle} style={{ background: 'none', border: 'none', color: 'var(--color-indigo-600)', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontWeight: 500 }}>
                            <Edit2 size={18} /> Edit
                        </button>
                    )}
                    <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontWeight: 500 }}>
                        <LogOut size={18} /> Sign Out
                    </button>
                </div>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>

                {isEditing ? (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Edit Profile</h3>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-slate-700)', marginBottom: '0.5rem' }}>Name</label>
                            <input type="text" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-slate-200)' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-slate-700)', marginBottom: '0.5rem' }}>Phone Number</label>
                            <input type="tel" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-slate-200)' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-slate-700)', marginBottom: '0.5rem' }}>Photo URL (Optional)</label>
                            <input type="url" value={editForm.photoURL || ''} onChange={e => setEditForm({ ...editForm, photoURL: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-slate-200)' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-slate-700)', marginBottom: '0.5rem' }}>Availability Time</label>
                            <input type="text" placeholder="e.g. Weekends, Evenings, Mon-Fri 6-9PM" value={editForm.availability || ''} onChange={e => setEditForm({ ...editForm, availability: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-slate-200)' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-slate-700)', marginBottom: '0.5rem' }}>Skills (comma separated)</label>
                            <input type="text" value={editForm.skills?.join(', ') || ''} onChange={e => setEditForm({ ...editForm, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-slate-200)' }} />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button onClick={handleSave} style={{ flex: 1, backgroundColor: 'var(--color-indigo-600)', color: 'white', padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer' }}>
                                <Check size={18} /> Save
                            </button>
                            <button onClick={handleEditToggle} style={{ flex: 1, backgroundColor: 'white', color: 'var(--color-slate-700)', padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--color-slate-200)', cursor: 'pointer' }}>
                                <X size={18} /> Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Profile Card */}
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            {profile.photoURL ? (
                                <img src={profile.photoURL} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem', border: '4px solid var(--color-indigo-50)' }} />
                            ) : (
                                <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--color-slate-200)', marginBottom: '1rem' }} />
                            )}
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{profile.name}</h1>
                            <p style={{ color: 'var(--color-slate-500)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{profile.phone}</p>

                            {profile.availability && (
                                <p style={{ color: 'var(--color-indigo-600)', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 500, backgroundColor: 'var(--color-indigo-50)', padding: '0.25rem 0.75rem', borderRadius: '1rem' }}>
                                    Available: {profile.availability}
                                </p>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', marginTop: '1rem', backgroundColor: 'var(--color-slate-100)', padding: '0.5rem 1rem', borderRadius: '2rem' }}>
                                <Star size={16} fill="#fbbf24" color="#fbbf24" style={{ marginRight: '0.5rem' }} />
                                <span style={{ fontWeight: 600 }}>{avgRating} Average Rating</span>
                            </div>

                            <div style={{ width: '100%', marginTop: '1.5rem', borderTop: '1px solid var(--color-slate-100)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-around' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-indigo-600)' }}>{matchesCount}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Matches</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-slate-800)' }}>{swipedList.length}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Right Swipes</div>
                                </div>
                            </div>
                        </div>

                        {/* Skills Section */}
                        <div className="card">
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Tags / Skills</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {profile.skills.map(skill => (
                                    <span key={skill} style={{ backgroundColor: 'var(--color-indigo-50)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.875rem', color: 'var(--color-indigo-600)', fontWeight: 500 }}>
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Who I've Right Swiped */}
                        <div className="card">
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Your Right Swipes</h3>
                            {swipedList.length === 0 ? (
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-500)' }}>You haven't ticked anyone yet. Go to Explore!</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {swipedList.map((user, index) => (
                                        <div key={user.id} style={{ display: 'flex', alignItems: 'center', borderBottom: index === swipedList.length - 1 ? 'none' : '1px solid var(--color-slate-100)', paddingBottom: index === swipedList.length - 1 ? 0 : '1rem' }}>
                                            <img src={user.photoURL || 'https://via.placeholder.com/40'} alt={user.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', marginRight: '1rem' }} />
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{user.name}</h4>
                                                <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-500)' }}>Voted to learn: {user.wantedSkill}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}
