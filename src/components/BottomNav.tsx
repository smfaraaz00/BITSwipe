import { NavLink } from 'react-router-dom';
import { Compass, MessageCircleHeart, User as UserIcon } from 'lucide-react';
import clsx from 'clsx';

export default function BottomNav() {
    return (
        <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'white',
            borderTop: '1px solid var(--color-slate-200)',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '0.75rem 0',
            paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
            zIndex: 40
        }}>
            <NavLink
                to="/"
                className={({ isActive }) => clsx("nav-item", isActive && "active")}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', transition: 'color 0.2s', width: '33%' }}
            >
                <Compass size={24} />
                <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Explore</span>
            </NavLink>

            <NavLink
                to="/matches"
                className={({ isActive }) => clsx("nav-item", isActive && "active")}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', transition: 'color 0.2s', width: '33%' }}
            >
                <MessageCircleHeart size={24} />
                <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Matches</span>
            </NavLink>

            <NavLink
                to="/profile"
                className={({ isActive }) => clsx("nav-item", isActive && "active")}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', transition: 'color 0.2s', width: '33%' }}
            >
                <UserIcon size={24} />
                <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Profile</span>
            </NavLink>
        </div>
    );
}
