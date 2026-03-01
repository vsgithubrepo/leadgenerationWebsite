import { ClerkProvider, SignIn, useUser, useClerk } from '@clerk/clerk-react';
import LeadEngine from './LeadEngine';

const CLERK_KEY     = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
const ALLOWED_DOMAIN = process.env.REACT_APP_ALLOWED_DOMAIN || '';
const COMPANY_NAME  = process.env.REACT_APP_COMPANY_NAME || 'Your Company';

// ── Domain Guard ────────────────────────────────────────────────
function DomainGuard({ children }) {
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress || '';
  const domain = email.split('@')[1] || '';
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
          <div style={{marginBottom:32}}>
            {/* Logo with filter to make it white */}
            <img src="/logo.svg" alt="Logo" style={{height:40, filter:'brightness(0) invert(1)'}} />
          </div>
          <h1 style={styles.loginTitle}>Sign in to LeadEngine</h1>
          <p style={styles.loginSub}>Enter your {COMPANY_NAME} credentials to access the sales intelligence platform.</p>
          
          <SignIn 
            appearance={{
              elements: {
                rootBox: { width: '100%' },
                card: { background: 'transparent', boxShadow: 'none', padding: 0 },
                headerTitle: { display: 'none' },
                headerSubtitle: { display: 'none' },
                socialButtonsBlockButton: {
                  background: '#334155', border: '1px solid #475569', color: '#fff', fontSize: '14px', borderRadius:'8px'
                },
                dividerLine: { background: '#475569' },
                dividerText: { color: '#94a3b8' },
                formFieldInput: { background: '#1e293b', border: '1px solid #475569', color: '#fff' },
                formButtonPrimary: { background: '#3b82f6', border: 'none' },
                footerActionLink: { color: '#3b82f6' }
              },
              variables: { colorText: '#fff', colorPrimary: '#3b82f6' }
            }}
          />
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

const styles = {
  loading: { display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#0f172a', color:'#fff', fontFamily:'sans-serif' },
  loginPage: { display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', background:'#0f172a', fontFamily:"'Inter', sans-serif" },
  loginCard: { width:'100%', maxWidth:400, padding:40, background:'#1e293b', borderRadius:16, border:'1px solid #334155', textAlign:'center' },
  loginTitle: { fontSize:24, fontWeight:700, color:'#fff', marginBottom:12 },
  loginSub: { fontSize:14, color:'#94a3b8', lineHeight:1.5, marginBottom:32 },
  blocker: { display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0f172a', color:'#fff' },
  blockerCard: { background:'#1e293b', padding:40, borderRadius:12, textAlign:'center', border:'1px solid #334155' },
  blockerIcon: { fontSize:40, marginBottom:16 },
  blockerTitle: { fontSize:20, fontWeight:700, marginBottom:8 },
  blockerText: { color:'#94a3b8', marginBottom:24 },
  blockerBtn: { background:'#3b82f6', color:'#fff', border:'none', padding:'10px 20px', borderRadius:8, cursor:'pointer' },
};