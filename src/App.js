--- START OF CODE FILE ---

import { ClerkProvider, SignIn, useUser, useClerk } from '@clerk/clerk-react';
import LeadEngine from './LeadEngine';

const CLERK_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
const ALLOWED_DOMAIN = process.env.REACT_APP_ALLOWED_DOMAIN || '';
const COMPANY_NAME = process.env.REACT_APP_COMPANY_NAME || 'eTechCube';

// ── Domain Guard ────────────────────────────────────────────────
function DomainGuard({ children }) {
const { user } = useUser();
const { signOut } = useClerk();

if (!user) return null;

const email = user.primaryEmailAddress?.emailAddress || '';
const domain = email.split('@')[1] || '';
// If NO domain is set in .env, allow everyone. If domain IS set, enforce it.
const allowed = !ALLOWED_DOMAIN || domain === ALLOWED_DOMAIN;

if (!allowed) {
return (

<div style={styles.blocker}>
<div style={styles.blockerCard}>
<div style={styles.blockerIcon}>🔒</div>
<h2 style={styles.blockerTitle}>Access Restricted</h2>
<p style={styles.blockerText}>
LeadEngine is only available to <strong style={{ color: '#3b82f6' }}>@{ALLOWED_DOMAIN}</strong> email addresses.
</p>
<button style={styles.blockerBtn} onClick={() => signOut()}>Sign Out</button>
</div>
</div>
);
}
return children;
}

// ── Auth Gate ────────────────────────────────────────────────────
function AuthGate() {
const { isSignedIn, isLoaded } = useUser();

if (!isLoaded) return <div style={styles.loading}>Loading...</div>;

if (!isSignedIn) {
return (

<div style={styles.loginPage}>
<div style={styles.loginCard}>
{/* Header Section */}
<div style={styles.loginHeader}>
<img src="/logo.svg" alt="Logo" style={styles.logo} />
<h1 style={styles.loginTitle}>Welcome Back</h1>
<p style={styles.loginSub}>Sign in to <strong>{COMPANY_NAME}</strong> Lead Engine</p>
</div>

{/* Clerk Component - Styled to blend in */}

<div style={{ width: '100%' }}>
<SignIn
appearance={{
elements: {
rootBox: { width: '100%', boxSizing: 'border-box' },
card: {
background: 'transparent',
boxShadow: 'none',
border: 'none',
width: '100%',
padding: 0,
margin: 0
},
headerTitle: { display: 'none' },
headerSubtitle: { display: 'none' },
socialButtonsBlockButton: {
background: 'rgba(255,255,255,0.05)',
border: '1px solid rgba(255,255,255,0.1)',
color: '#e2e8f0',
fontSize: '14px',
borderRadius:'8px',
padding: '12px'
},
dividerLine: { background: 'rgba(255,255,255,0.1)' },
dividerText: { color: '#64748b' },
formFieldLabel: { color: '#94a3b8', fontSize: '13px' },
formFieldInput: {
background: 'rgba(15, 23, 42, 0.6)',
border: '1px solid rgba(255,255,255,0.1)',
color: '#fff',
padding: '12px',
borderRadius: '8px'
},
formButtonPrimary: {
background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
border: 'none',
padding: '12px',
fontSize: '14px',
fontWeight: '600',
boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
},
footerActionLink: { color: '#3b82f6' },
footer: { display: 'none' }
},
layout: {
shimmer: false
}
}}
/>
</div>
</div>
</div>
);
}

return (
<DomainGuard>
<LeadEngine />
</DomainGuard>
);
}

// ── Root ────────────────────────────────────────────────────────
export default function App() {
if (!CLERK_KEY) return <div style={styles.loading}>Missing Clerk Key</div>;
return (
<ClerkProvider publishableKey={CLERK_KEY}>
<AuthGate />
</ClerkProvider>
);
}

// ── Styles ──────────────────────────────────────────────────────
const styles = {
loading: { display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#0f172a', color:'#fff', fontFamily:'sans-serif' },

// New Background: Dark Radial Gradient
loginPage: {
display:'flex',
justifyContent:'center',
alignItems:'center',
minHeight:'100vh',
background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)',
fontFamily:"'Inter', sans-serif",
padding: '20px'
},

// Glassmorphism Card
loginCard: {
width:'100%',
maxWidth: 420,
padding: '40px 32px',
background: 'rgba(30, 41, 59, 0.4)', // Semi-transparent
backdropFilter: 'blur(16px)', // Blurs the background behind it
borderRadius: 24,
border: '1px solid rgba(255,255,255,0.08)',
textAlign: 'center',
boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5)'
},

loginHeader: { marginBottom: 24 },
logo: { height: 42, width: 'auto', marginBottom: 20, filter: 'brightness(0) invert(1)' }, // White Logo
loginTitle: { fontSize: 26, fontWeight: 700, color: '#f8fafc', marginBottom: 8, letterSpacing: '-0.5px' },
loginSub: { fontSize: 14, color: '#94a3b8', lineHeight: 1.5 },

// Blocked Screen
blocker: { display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0f172a', color:'#fff' },
blockerCard: { background:'#1e293b', padding:40, borderRadius:12, textAlign:'center', border:'1px solid #334155' },
blockerIcon: { fontSize:40, marginBottom:16 },
blockerTitle: { fontSize:20, fontWeight:700, marginBottom:8 },
blockerText: { color:'#94a3b8', marginBottom:24 },
blockerBtn: { background:'#3b82f6', color:'#fff', border:'none', padding:'10px 20px', borderRadius:8, cursor:'pointer' },
};

--- END OF CODE FILE ---