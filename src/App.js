import { ClerkProvider, SignIn, useUser, useClerk } from '@clerk/clerk-react';
import LeadEngine from './LeadEngine';

const CLERK_KEY      = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
const ALLOWED_DOMAIN = process.env.REACT_APP_ALLOWED_DOMAIN || '';
const COMPANY_NAME   = process.env.REACT_APP_COMPANY_NAME || 'eTechCube';

// ── Global Styles ───────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; width: 100%; overflow-x: hidden; }
  body { background: #0a0c0f; color: #e8e4dc; -webkit-font-smoothing: antialiased; font-family: 'DM Sans', sans-serif; }

  /* Hide Clerk "Secured by Clerk" floating side badge */
  .cl-internal-b3fm6y,
  [class*="cl-powered"],
  .cl-footer,
  .cl-userButtonPopoverFooter { display: none !important; }

  /* Clerk card overrides */
  .cl-rootBox { width: 100% !important; }
  .cl-card { background: transparent !important; box-shadow: none !important; padding: 0 !important; border: none !important; width: 100% !important; }
  .cl-header { display: none !important; }
  .cl-socialButtonsBlockButton {
    background: rgba(255,255,255,0.06) !important;
    border: 1.5px solid rgba(255,255,255,0.12) !important;
    color: #e8e4dc !important; border-radius: 10px !important;
    height: 48px !important; font-size: 14px !important;
    font-weight: 500 !important; font-family: 'DM Sans', sans-serif !important;
    transition: all 0.2s !important;
  }
  .cl-socialButtonsBlockButton:hover { background: rgba(255,255,255,0.1) !important; border-color: rgba(245,158,11,0.4) !important; }
  .cl-socialButtonsBlockButtonText { color: #e8e4dc !important; }
  .cl-dividerLine { background: rgba(255,255,255,0.08) !important; }
  .cl-dividerText { color: #6b7280 !important; font-size: 12px !important; }
  .cl-formFieldInput {
    background: rgba(255,255,255,0.05) !important;
    border: 1.5px solid rgba(255,255,255,0.1) !important;
    color: #e8e4dc !important; border-radius: 10px !important;
    height: 48px !important; font-family: 'DM Sans', sans-serif !important; font-size: 14px !important;
  }
  .cl-formFieldInput:focus { border-color: #f59e0b !important; box-shadow: 0 0 0 3px rgba(245,158,11,0.12) !important; }
  .cl-formFieldLabel { color: #9ca3af !important; font-size: 13px !important; }
  .cl-formButtonPrimary {
    background: linear-gradient(135deg, #f59e0b, #d97706) !important;
    color: #0a0c0f !important; font-weight: 700 !important;
    border-radius: 10px !important; height: 48px !important;
    font-size: 14px !important; border: none !important;
    font-family: 'DM Sans', sans-serif !important;
    box-shadow: 0 4px 20px rgba(245,158,11,0.3) !important;
  }
  .cl-footerActionLink { color: #f59e0b !important; }
  .cl-identityPreviewText { color: #e8e4dc !important; }
  .cl-alertText { color: #fca5a5 !important; }

  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeIn  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes dotPulse{ to { opacity:1; transform:scale(1.4); } }
`;

// ── Logo Mark ───────────────────────────────────────────────────
export function LogoMark({ size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.25),
      background: 'linear-gradient(135deg, #32BFCA 0%, #F1770C 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, boxShadow: '0 4px 16px rgba(241,119,12,0.35)',
    }}>
      <span style={{
        fontFamily: "'Syne', sans-serif", fontWeight: 900,
        fontSize: Math.round(size * 0.46), color: 'white', lineHeight: 1,
      }}>e</span>
    </div>
  );
}

// ── Domain Guard ────────────────────────────────────────────────
function DomainGuard({ children }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  if (!user) return null;
  const email  = user.primaryEmailAddress?.emailAddress || '';
  const domain = email.split('@')[1] || '';
  const allowed = !ALLOWED_DOMAIN || domain === ALLOWED_DOMAIN;
  if (!allowed) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0c0f' }}>
        <div style={{ background:'#111418', border:'1px solid rgba(239,68,68,0.25)', borderRadius:16, padding:'48px 40px', textAlign:'center', maxWidth:400 }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:'#e8e4dc', marginBottom:12 }}>Access Restricted</h2>
          <p style={{ color:'#9ca3af', fontSize:14, lineHeight:1.7, marginBottom:8 }}>
            This tool is only available to <strong style={{ color:'#f59e0b' }}>@{ALLOWED_DOMAIN}</strong> accounts.
          </p>
          <p style={{ color:'#6b7280', fontSize:13, marginBottom:28 }}>Signed in as <strong style={{ color:'#e8e4dc' }}>{email}</strong></p>
          <button onClick={() => signOut()} style={{ padding:'11px 28px', borderRadius:8, border:'none', background:'#1e2530', color:'#e8e4dc', fontWeight:600, fontSize:13, cursor:'pointer' }}>
            Sign Out & Try Again
          </button>
        </div>
      </div>
    );
  }
  return children;
}

// ── Login Page ──────────────────────────────────────────────────
function LoginPage() {
  return (
    <div style={S.page}>

      {/* ─── LEFT PANEL ─── */}
      <div style={S.left}>
        <div style={S.blob1} /><div style={S.blob2} /><div style={S.blob3} />
        <div style={S.leftInner}>

          {/* Logo */}
          <div style={S.logoRow}>
            <LogoMark size={52} />
            <div>
              <div style={S.logoName}>
                <span style={{ color:'#32BFCA' }}>eTech</span><span style={{ color:'#F1770C' }}>Cube</span>
              </div>
              <div style={S.logoTagline}>Intelligence Combined with Technology</div>
            </div>
          </div>

          {/* Headline */}
          <h1 style={S.h1}>
            Find 1,000+<br/>
            <span style={{ color:'#f59e0b' }}>qualified leads</span><br/>
            in minutes.
          </h1>
          <p style={S.desc}>
            AI-powered B2B lead generation for your logistics software sales team.
            Scrapes JustDial, IndiaMart, LinkedIn & Apollo — at zero cost.
          </p>

          {/* Stats grid */}
          <div style={S.statsGrid}>
            {[['1,000+','Leads per run'],['4','Live sources'],['₹0','Cost per lead'],['All India','Coverage']].map(([v,l]) => (
              <div key={l} style={S.statBox}>
                <div style={S.statV}>{v}</div>
                <div style={S.statL}>{l}</div>
              </div>
            ))}
          </div>

          {/* Features list */}
          <div style={S.features}>
            {['Search history saved permanently','One-click CSV export for CRM','Grade A/B/C lead scoring','All 4 segments × 13 cities'].map(f => (
              <div key={f} style={S.feature}><span style={{ color:'#f59e0b', marginRight:8 }}>✓</span>{f}</div>
            ))}
          </div>

          {ALLOWED_DOMAIN && (
            <div style={S.domainBadge}>🔒 Restricted to <strong style={{ color:'#fbbf24' }}>@{ALLOWED_DOMAIN}</strong> accounts</div>
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div style={S.right}>
        <div style={S.card}>
          <LogoMark size={44} />
          <h2 style={S.cardH2}>Sign in to LeadEngine</h2>
          <p style={S.cardSub}>Use your {COMPANY_NAME} Google account to continue</p>

          <div style={{ width:'100%', position:'relative' }}>
            <SignIn
              appearance={{
                elements: {
                  rootBox: { width:'100%' },
                  card:    { background:'transparent', boxShadow:'none', padding:0, border:'none', width:'100%' },
                  header:  { display:'none' },
                  footer:  { display:'none' },
                },
                variables: {
                  colorBackground:    '#0f1318',
                  colorText:          '#e8e4dc',
                  colorPrimary:       '#f59e0b',
                  colorTextSecondary: '#9ca3af',
                  borderRadius:       '10px',
                  fontFamily:         "'DM Sans', sans-serif",
                },
              }}
              redirectUrl="/"
            />
          </div>

          <div style={S.cardFooter}>
            <span style={{ color:'#374151' }}>🔐 Secured by Clerk · HTTPS encrypted</span>
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Auth Gate ───────────────────────────────────────────────────
function AuthGate() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0c0f', gap:16 }}>
      <div style={{ width:36, height:36, border:'3px solid rgba(245,158,11,0.15)', borderTop:'3px solid #f59e0b', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ color:'#6b7280', fontSize:13 }}>Loading...</div>
    </div>
  );

  if (!isSignedIn) return <LoginPage />;
  return <DomainGuard><LeadEngine LogoMark={LogoMark} /></DomainGuard>;
}

// ── Root ────────────────────────────────────────────────────────
export default function App() {
  if (!CLERK_KEY) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0a0c0f' }}>
      <div style={{ background:'#111418', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'48px 40px', textAlign:'center', maxWidth:440, color:'#e8e4dc' }}>
        <div style={{ fontSize:40, marginBottom:16 }}>⚙️</div>
        <h2 style={{ fontFamily:"'Syne',sans-serif", marginBottom:8, fontWeight:800 }}>Setup Required</h2>
        <p style={{ color:'#9ca3af', fontSize:14, marginBottom:16 }}>Add your Clerk key to <code style={{ background:'#1e2530', padding:'2px 6px', borderRadius:4 }}>.env.local</code></p>
        <code style={{ display:'block', background:'#1e2530', padding:'10px 16px', borderRadius:8, fontSize:12, color:'#f59e0b', border:'1px solid rgba(245,158,11,0.2)' }}>
          REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_...
        </code>
      </div>
    </div>
  );

  return (
    <>
      <style>{globalStyles}</style>
      <ClerkProvider publishableKey={CLERK_KEY}>
        <AuthGate />
      </ClerkProvider>
    </>
  );
}

// ── Login Page Styles ───────────────────────────────────────────
const S = {
  page:        { display:'flex', minHeight:'100vh', width:'100%', background:'#0a0c0f', overflow:'hidden' },

  /* Left panel */
  left:        { flex:1, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 64px', overflow:'hidden', borderRight:'1px solid rgba(255,255,255,0.05)' },
  leftInner:   { position:'relative', zIndex:2, maxWidth:540, width:'100%', animation:'fadeIn 0.5s ease' },
  blob1:       { position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(50,191,202,0.07) 0%, transparent 65%)', top:-150, left:-150, pointerEvents:'none', zIndex:1 },
  blob2:       { position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(241,119,12,0.06) 0%, transparent 65%)', bottom:-100, right:-100, pointerEvents:'none', zIndex:1 },
  blob3:       { position:'absolute', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(245,158,11,0.03) 0%, transparent 65%)', top:'40%', right:'5%', pointerEvents:'none', zIndex:1 },

  logoRow:     { display:'flex', alignItems:'center', gap:16, marginBottom:52 },
  logoName:    { fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, letterSpacing:'-0.5px', lineHeight:1.1 },
  logoTagline: { fontSize:9, color:'#4b5563', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:4 },

  h1:          { fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:50, lineHeight:1.09, letterSpacing:'-2px', color:'#e8e4dc', marginBottom:20 },
  desc:        { color:'#9ca3af', fontSize:15, lineHeight:1.75, marginBottom:40, maxWidth:460 },

  statsGrid:   { display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:20, marginBottom:36 },
  statBox:     { display:'flex', flexDirection:'column', gap:3 },
  statV:       { fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:'#f59e0b' },
  statL:       { fontSize:10, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.08em' },

  features:    { display:'flex', flexDirection:'column', gap:10, marginBottom:36 },
  feature:     { fontSize:13.5, color:'#9ca3af', display:'flex', alignItems:'center' },

  domainBadge: { fontSize:12, color:'#6b7280', padding:'10px 14px', background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:8, display:'inline-flex', alignItems:'center', gap:4 },

  /* Right panel */
  right:       { width:460, flexShrink:0, background:'#0d1117', display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 44px' },
  card:        { width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:0, animation:'fadeIn 0.5s ease 0.1s both' },
  cardH2:      { fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, color:'#e8e4dc', marginTop:24, marginBottom:6, letterSpacing:'-0.5px' },
  cardSub:     { color:'#6b7280', fontSize:13.5, marginBottom:32, lineHeight:1.5 },
  cardFooter:  { marginTop:28, fontSize:11, color:'#374151', textAlign:'center' },
};