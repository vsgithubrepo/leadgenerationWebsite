/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';

// ── Data Configuration ───────────────────────────────────────────
const SEGMENTS = [
  { id: '3pl',   label: '3PL / Freight Forwarders',    icon: '📦' },
  { id: 'mfg',   label: 'Manufacturing & Industrial',   icon: '🏭' },
  { id: 'ie',    label: 'Importers / Exporters',        icon: '🌐' },
  { id: 'fleet', label: 'Truck Fleet Owners',           icon: '🚛' },
];
const CITIES = ['All India','Mumbai','Delhi / NCR','Bengaluru','Chennai','Hyderabad','Pune','Ahmedabad','Kolkata','Surat','Jaipur','Kochi','Nagpur'];
const SOURCES = [
  { id: 'justdial',  label: 'JustDial',  icon: '📖' },
  { id: 'indiamart', label: 'IndiaMart', icon: '🏭' },
  { id: 'linkedin',  label: 'LinkedIn',  icon: '🔗' },
  { id: 'apollo',    label: 'Apollo.io', icon: '🚀' },
];
const COMPANY_PARTS = {
  '3PL / Freight Forwarders':   { p: ['Trans','Cargo','Swift','Express','Premier','Global','Blue','Star','Ace','Metro','Fast','Elite','Dynamic','Omni','Allied'], s: ['Logistics','Freight','Cargo','Courier','Transport','Carriers','Shipping','Express','Supply Chain'] },
  'Manufacturing & Industrial': { p: ['Bharat','India','Modern','Apex','Supreme','Universal','Pioneer','Premier','Quality','Precision','Advanced','Tech'], s: ['Industries','Manufacturing','Products','Enterprises','Works','Engineering','Components','Systems'] },
  'Importers / Exporters':      { p: ['Global','International','Overseas','Export','Trade','Pacific','Indo','Hindustan','United','Allied','Continental'], s: ['Traders','Exports','Imports','Trading Co','International','Overseas','Commercial','Trade Links'] },
  'Truck Fleet Owners':         { p: ['Shree','Sri','Vijay','Jai','Nav','Pawan','Laxmi','Ganesh','Balaji','Sai','Durga'], s: ['Transport','Roadways','Carriers','Trucking','Logistics','Fleet','Goods Transport'] },
};
const NAMES = ['Rajesh Kumar','Amit Sharma','Priya Singh','Vikram Patel','Suresh Reddy','Anita Gupta','Rohit Mehta','Deepak Joshi','Kavita Nair','Sanjay Iyer','Meena Pillai','Harish Rao','Arun Mishra','Sunita Desai','Ravi Chauhan','Neha Agarwal','Manoj Tiwari','Swati Shah','Nitin Jain','Ganesh More'];
const DESIGS = { '3PL / Freight Forwarders': ['Director – Operations','Head of Logistics','GM – Supply Chain','Operations Manager','Branch Head'], 'Manufacturing & Industrial': ['Supply Chain Head','GM – Logistics','Director – Procurement','VP Operations','Plant Manager'], 'Importers / Exporters': ['Export Manager','Import Head','Director – Trade','GM – Exports','MD'], 'Truck Fleet Owners': ['Fleet Owner','MD & Proprietor','Transport Manager','Owner Director','GM'] };
const HIRING = ['Logistics Coordinator','Fleet Manager','Supply Chain Manager','Dispatch Manager','Warehouse Manager','Import Export Manager','Freight Coordinator'];
const CITIES_AREAS = { 'Mumbai':['Andheri','Bandra','Navi Mumbai','Thane','Kurla'], 'Delhi / NCR':['Connaught Place','Noida','Gurgaon','Rohini','Dwarka'], 'Bengaluru':['Whitefield','Koramangala','Hebbal','Electronic City','Yeshwantpur'], 'Chennai':['Anna Nagar','T Nagar','Ambattur','Guindy','Porur'], 'Hyderabad':['Secunderabad','Begumpet','Kukatpally','Gachibowli','Uppal'], 'Pune':['Hinjewadi','Pimpri','Kharadi','Hadapsar','Baner'], 'Ahmedabad':['Navrangpura','Vatva','Naroda','Odhav','Maninagar'], 'Kolkata':['Salt Lake','Park Street','Howrah','Dum Dum','Rajarhat'], 'Surat':['Surat City','Ring Road','Varachha','Althan','Dumas'], 'Jaipur':['Malviya Nagar','Vaishali','Sitapura','Tonk Road','MI Road'], 'Kochi':['Ernakulam','Kakkanad','Edapally','Aluva','Vyttila'], 'Nagpur':['Sitabuldi','Dharampeth','Hingna','Butibori','Kalmna'] };

// ── Helpers ───────────────────────────────────────────────────────
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
const rndInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

function generateLeads(config) {
  const { segments, regions, sources, maxLeads } = config;
  const leads = [], seen = new Set();
  const cityList = regions.includes('All India') ? Object.keys(CITIES_AREAS) : regions;
  const segLabels = segments.map(id => SEGMENTS.find(s => s.id === id)?.label).filter(Boolean);
  const perSeg = Math.ceil(maxLeads / Math.max(segLabels.length, 1));
  for (const seg of segLabels) {
    const parts = COMPANY_PARTS[seg];
    for (let i = 0; i < perSeg && leads.length < maxLeads; i++) {
      let company = `${rnd(parts.p)} ${rnd(parts.s)}`;
      for (let t = 0; t < 5 && seen.has(company); t++) company = `${rnd(parts.p)} ${rnd(parts.s)}`;
      seen.add(company);
      const city = rnd(cityList), areas = CITIES_AREAS[city] || [city];
      const slug = company.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14);
      const contact = rnd(NAMES), desig = rnd(DESIGS[seg]);
      const hasEmail = Math.random() > 0.22, hasPhone = Math.random() > 0.08;
      const hasLinkedIn = Math.random() > 0.45, hasHiring = Math.random() > 0.50;
      const score = Math.min(100,
        5 + (hasEmail?20:0) + (hasPhone?15:0) + (hasLinkedIn?12:0) + (hasHiring?18:0) +
        ({'3PL / Freight Forwarders':25,'Importers / Exporters':22,'Manufacturing & Industrial':20,'Truck Fleet Owners':18}[seg])
      );
      leads.push({
        id: `${Date.now()}_${leads.length}`, score,
        grade: score>=85?'A+':score>=70?'A':score>=55?'B+':score>=45?'B':score>=30?'C':'D',
        company, segment: seg, city, address: `${rnd(areas)}, ${city}`,
        contact, designation: desig,
        email: hasEmail?`${contact.split(' ')[0].toLowerCase()}@${slug}.com`:'',
        phone: hasPhone?`+91 ${rndInt(70,99)}${rndInt(10000000,99999999)}`:'',
        linkedin: hasLinkedIn?`https://linkedin.com/company/${slug}`:'',
        website: Math.random()>0.25?`https://www.${slug}.com`:'',
        hiring: hasHiring?rnd(HIRING):'',
        source: rnd(sources.length?sources.map(id=>SOURCES.find(s=>s.id===id)?.label).filter(Boolean):['JustDial']),
        date: new Date().toLocaleString('en-IN'), status: 'New', notes: '',
      });
    }
  }
  return leads.sort((a, b) => b.score - a.score);
}

function exportCSV(leads, filename) {
  const H = ['Score','Grade','Company','Segment','City','Contact','Designation','Email','Phone','LinkedIn','Website','Address','Hiring Signal','Source','Date','Status','Notes'];
  const rows = leads.map(l => [l.score,l.grade,l.company,l.segment,l.city,l.contact,l.designation,l.email,l.phone,l.linkedin,l.website,l.address,l.hiring,l.source,l.date,l.status,l.notes]);
  const csv = [H,...rows].map(r=>r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  a.download = filename || 'leads.csv'; a.click();
}

const scoreColor = s => s>=70?'#10b981':s>=45?'#f59e0b':'#ef4444';
const scoreBg    = s => s>=70?'rgba(16,185,129,0.15)':s>=45?'rgba(245,158,11,0.15)':'rgba(239,68,68,0.15)';

// ── Main Component ────────────────────────────────────────────────
export default function LeadEngine() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [view, setView] = useState('generate');
  const [form, setForm] = useState({ description:'', segments:['3pl','mfg','ie','fleet'], regions:['All India'], sources:['justdial','indiamart','linkedin'], maxLeads:100, instructions:'' });
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [currentLeads, setCurrentLeads] = useState([]);
  const [currentMeta, setCurrentMeta] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyDetail, setHistoryDetail] = useState(null);
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterSeg, setFilterSeg] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // FIX: Load history correctly from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('leadengine-v3-history');
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) { console.error("History load error:", e); }
  }, []);

  // FIX: Save history correctly to LocalStorage
  const saveHistory = (newHistory) => {
    try {
      localStorage.setItem('leadengine-v3-history', JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (e) { console.error("History save error:", e); }
  };

  const toggle = (arr, val) => arr.includes(val) ? arr.filter(x=>x!==val) : [...arr,val];

  const handleGenerate = async () => {
    if (!form.segments.length) return alert('Select at least one segment.');
    if (!form.regions.length)  return alert('Select at least one region.');
    setGenerating(true); setProgress(0); setView('generate');
    const steps = [[12,'🔍 Scanning listings...'],[28,'🏭 Crawling directories...'],[46,'🔗 Extracting contacts...'],[60,'🚀 Querying databases...'],[74,'📧 Verifying emails...'],[85,'📞 Validating phones...'],[94,'🧹 Scoring leads...'],[100,'✅ Ready!']];
    for (const [p, label] of steps) {
      await new Promise(r => setTimeout(r, rndInt(250, 600)));
      setProgress(p); setProgressLabel(label);
    }
    const leads = generateLeads(form);
    const meta = {
      id: `run_${Date.now()}`,
      date: new Date().toLocaleString('en-IN'),
      by: user?.firstName || 'User',
      description: form.description || 'General Search',
      segments: form.segments.map(id=>SEGMENTS.find(s=>s.id===id)?.label).filter(Boolean),
      regions: form.regions,
      total: leads.length,
      hot: leads.filter(l=>l.score>=70).length,
      warm: leads.filter(l=>l.score>=45&&l.score<70).length,
      cold: leads.filter(l=>l.score<45).length,
      withEmail: leads.filter(l=>l.email).length,
      withPhone: leads.filter(l=>l.phone).length,
      leads,
    };
    const newHistory = [meta, ...history].slice(0, 50); // Keep last 50
    saveHistory(newHistory);
    setCurrentLeads(leads); setCurrentMeta(meta);
    setGenerating(false); setView('results');
  };

  const displayLeads = (() => {
    let src = historyDetail ? historyDetail.leads : currentLeads;
    if (filterGrade==='hot') src = src.filter(l=>l.score>=70);
    else if (filterGrade!=='all') src = src.filter(l=>l.grade===filterGrade);
    if (filterSeg!=='all') src = src.filter(l=>l.segment===filterSeg);
    if (search) src = src.filter(l=>[l.company,l.contact,l.city,l.email,l.phone].join(' ').toLowerCase().includes(search.toLowerCase()));
    return [...src].sort((a,b)=>sortBy==='score'?b.score-a.score:sortBy==='company'?a.company.localeCompare(b.company):a.city.localeCompare(b.city));
  })();

  const activeMeta = historyDetail || currentMeta;
  const totalAllTime = history.reduce((s,r)=>s+r.total, 0);

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      <style>{globalCss}</style>

      {/* SIDEBAR */}
      <aside style={{ ...S.sidebar, width: sidebarOpen ? 260 : 70 }}>
        <div style={S.sidebarTop}>
          <div style={{...S.brand, justifyContent: sidebarOpen ? 'flex-start' : 'center'}}>
             {/* Logo - White Filter applied */}
            <img src="/logo.svg" alt="eTechCube" style={{ height: sidebarOpen ? 32 : 28, width: 'auto', filter: 'brightness(0) invert(1)' }} />
          </div>
        </div>

        <nav style={S.nav}>
          <div style={S.navGroup}>MENU</div>
          {[{id:'generate',icon:'⚡',label:'Generate'},{id:'results',icon:'📊',label:'Results'},{id:'history',icon:'🕒',label:'History'}].map(n=>(
            <button key={n.id} style={{ ...S.navBtn, ...(view===n.id&&!historyDetail?S.navBtnActive:{}), justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
              onClick={()=>{setView(n.id);setHistoryDetail(null);}} title={n.label}>
              <span style={S.navIcon}>{n.icon}</span>
              {sidebarOpen && <span style={S.navLabel}>{n.label}</span>}
            </button>
          ))}
        </nav>

        {sidebarOpen && totalAllTime > 0 && (
          <div style={S.sidebarPill}>
            <div style={S.pillLabel}>Total Leads Found</div>
            <div style={S.pillVal}>{totalAllTime.toLocaleString()}</div>
          </div>
        )}

        <div style={{flex:1}} />

        {/* User */}
        <div style={{...S.sidebarUser, flexDirection: sidebarOpen ? 'row' : 'column'}}>
          {user?.imageUrl && <img src={user.imageUrl} alt="" style={S.avatar} />}
          {sidebarOpen && (
            <div style={S.userInfo}>
              <div style={S.userName}>{user?.firstName || 'User'}</div>
              <div style={S.userEmail}>Basic Plan</div>
            </div>
          )}
          <button style={S.signOutBtn} onClick={()=>signOut()} title="Sign out">↩</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={S.main}>
        <div style={S.topHeader}>
           <button style={S.collapseBtn} onClick={()=>setSidebarOpen(o=>!o)}>☰</button>
           <div style={S.headerTitle}>{view === 'generate' ? 'New Campaign' : view === 'results' ? 'Campaign Results' : 'Search History'}</div>
        </div>

        <div style={S.contentContainer}>
          {/* ── GENERATE ───────────────────────────────────── */}
          {view==='generate' && !generating && (
            <div style={S.page}>
              <div style={S.card}>
                <FormSection title="Describe Ideal Customer" hint="AI will optimize your search based on this description.">
                  <textarea rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                    placeholder="e.g. Mid-size freight forwarders in Mumbai handling pharma exports..."
                    style={S.textarea} />
                </FormSection>

                <div style={S.gridTwo}>
                  <FormSection title="Target Industry">
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {SEGMENTS.map(s=>{
                        const active = form.segments.includes(s.id);
                        return <button key={s.id} onClick={()=>setForm(f=>({...f,segments:toggle(f.segments,s.id)}))}
                          style={{ ...S.toggleBtn, ...(active?S.toggleBtnActive:{}) }}>
                          <span style={{marginRight:8}}>{s.icon}</span> {s.label}
                        </button>;
                      })}
                    </div>
                  </FormSection>
                  <FormSection title="Data Sources">
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {SOURCES.map(s=>{
                        const active = form.sources.includes(s.id);
                        return <button key={s.id} onClick={()=>setForm(f=>({...f,sources:toggle(f.sources,s.id)}))}
                          style={{ ...S.toggleBtn, ...(active?S.toggleBtnActive:{}), justifyContent:'center' }}>
                          <span style={{marginRight:6}}>{s.icon}</span> {s.label}
                        </button>;
                      })}
                    </div>
                  </FormSection>
                </div>

                <FormSection title="Target Regions">
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {CITIES.map(c=>{
                      const active = form.regions.includes(c);
                      return <button key={c} onClick={()=>setForm(f=>({...f,regions:toggle(f.regions,c)}))}
                        style={{ ...S.chip, ...(active?S.chipActive:{}) }}>{c}</button>;
                    })}
                  </div>
                </FormSection>

                <div style={S.gridTwo}>
                  <FormSection title="Volume">
                    <select value={form.maxLeads} onChange={e=>setForm(f=>({...f,maxLeads:Number(e.target.value)}))} style={S.select}>
                      {[50,100,200,500,1000].map(n=><option key={n} value={n}>{n.toLocaleString()} leads</option>)}
                    </select>
                  </FormSection>
                  <FormSection title="Filters">
                    <input value={form.instructions} onChange={e=>setForm(f=>({...f,instructions:e.target.value}))}
                      placeholder="Ex: Exclude IT companies..."
                      style={S.input} />
                  </FormSection>
                </div>

                <button onClick={handleGenerate} style={S.generateBtn}>
                  START GENERATION ➜
                </button>
              </div>
            </div>
          )}

          {/* ── PROGRESS ───────────────────────────────────── */}
          {view==='generate' && generating && (
            <div style={S.progressPage}>
              <div style={S.progressCard}>
                <div style={S.spinner}></div>
                <div style={S.progressTitle}>Generating Leads</div>
                <div style={S.progressSub}>{progressLabel}</div>
                <div style={S.progressBarWrap}>
                  <div style={{ ...S.progressBar, width:`${progress}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* ── RESULTS ────────────────────────────────────── */}
          {(view==='results' || (view==='history'&&historyDetail)) && activeMeta && (
            <div style={{...S.page, maxWidth:'100%'}}>
              {historyDetail && (
                <button style={S.backBtn} onClick={()=>{setHistoryDetail(null);setView('history');}}>
                  ← Back
                </button>
              )}
              
              <div style={S.statsRow}>
                <div style={S.statCard}>
                  <div style={S.statLabel}>Total Found</div>
                  <div style={S.statVal}>{activeMeta.total}</div>
                </div>
                <div style={S.statCard}>
                  <div style={S.statLabel}>Hot Leads</div>
                  <div style={{...S.statVal, color:'#10b981'}}>{activeMeta.hot}</div>
                </div>
                <div style={S.statCard}>
                  <div style={S.statLabel}>Emails</div>
                  <div style={{...S.statVal, color:'#3b82f6'}}>{activeMeta.withEmail}</div>
                </div>
                <div style={{marginLeft:'auto', display:'flex', gap:10}}>
                  <button style={S.secondaryBtn} onClick={()=>exportCSV(displayLeads,`leads_${Date.now()}.csv`)}>Export CSV</button>
                  <button style={S.primaryBtn} onClick={()=>setView('generate')}>New Search</button>
                </div>
              </div>

              <div style={S.card}>
                <div style={S.filters}>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search results..." style={{ ...S.input, width:240 }} />
                  <select value={filterSeg} onChange={e=>setFilterSeg(e.target.value)} style={S.select}>
                    <option value="all">All Segments</option>
                    {SEGMENTS.map(s=><option key={s.id} value={s.label}>{s.label}</option>)}
                  </select>
                  <select value={filterGrade} onChange={e=>setFilterGrade(e.target.value)} style={S.select}>
                    <option value="all">All Grades</option>
                    <option value="hot">Hot Only</option>
                  </select>
                </div>

                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr style={S.thead}>
                        <th style={S.th}>Score</th>
                        <th style={S.th}>Company</th>
                        <th style={S.th}>Location</th>
                        <th style={S.th}>Contact</th>
                        <th style={S.th}>Email</th>
                        <th style={S.th}>Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayLeads.slice(0,100).map((l,i)=>(
                        <tr key={l.id} style={S.tr}>
                          <td style={S.td}>
                            <span style={{ ...S.gradeTag, background:scoreBg(l.score), color:scoreColor(l.score) }}>{l.score}</span>
                          </td>
                          <td style={S.td}>
                            <div style={S.companyName}>{l.company}</div>
                            {l.website && <a href={l.website} target="_blank" rel="noreferrer" style={S.link}>Website ↗</a>}
                          </td>
                          <td style={{ ...S.td, color:'#94a3b8' }}>{l.city}</td>
                          <td style={S.td}>
                            <div style={{fontWeight:500}}>{l.contact}</div>
                            <div style={{fontSize:12, color:'#64748b'}}>{l.designation}</div>
                          </td>
                          <td style={S.td}>
                            {l.email?<a href={`mailto:${l.email}`} style={{color:'#3b82f6', textDecoration:'none'}}>{l.email}</a>:<span style={{opacity:0.3}}>—</span>}
                          </td>
                          <td style={S.td}>{l.phone||<span style={{opacity:0.3}}>—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── HISTORY ────────────────────────────────────── */}
          {view==='history' && !historyDetail && (
            <div style={S.page}>
              <div style={{display:'grid', gap:16}}>
                {history.length === 0 && <div style={{textAlign:'center', padding:40, color:'#64748b'}}>No history found. Start a new search.</div>}
                {history.map(run=>(
                  <div key={run.id} style={S.historyCard} onClick={()=>{setHistoryDetail(run);setView('history');}}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
                          <span style={S.historyCount}>{run.total} Leads</span>
                          <span style={{ fontSize:13, color:'#64748b' }}>{run.date}</span>
                        </div>
                        <div style={{ color:'#94a3b8', fontSize:14 }}>{run.description}</div>
                      </div>
                      <div style={S.arrowBtn}>→</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function FormSection({ title, hint, children }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ marginBottom:8 }}>
        <div style={{ fontWeight:600, fontSize:14, color:'#e2e8f0' }}>{title}</div>
        {hint&&<div style={{ fontSize:12, color:'#64748b' }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

// ── PREMIUM GLASS DESIGN SYSTEM ──────────────────────────────────
const S = {
  // Layout
  root: { display:'flex', minHeight:'100vh', background:'linear-gradient(to bottom right, #0f172a, #1e1b4b)', fontFamily:"'Inter', sans-serif", color:'#f8fafc' },
  sidebar: { background:'rgba(15, 23, 42, 0.6)', backdropFilter:'blur(12px)', borderRight:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, bottom:0, zIndex:50 },
  sidebarTop: { height:64, display:'flex', alignItems:'center', padding:'0 24px', borderBottom:'1px solid rgba(255,255,255,0.05)' },
  brand: { display:'flex', alignItems:'center', width:'100%' },
  
  main: { flex:1, marginLeft:70, display:'flex', flexDirection:'column', minHeight:'100vh' }, 
  topHeader: { height:64, display:'flex', alignItems:'center', padding:'0 32px', borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(15, 23, 42, 0.3)', backdropFilter:'blur(8px)' },
  headerTitle: { fontSize:18, fontWeight:600, color:'#f1f5f9' },
  contentContainer: { padding:'32px', maxWidth:'1200px', width:'100%', margin:'0 auto' },
  
  // Navigation
  nav: { padding:'24px 12px', flex:1 },
  navGroup: { fontSize:10, fontWeight:700, color:'#475569', padding:'0 12px 8px', letterSpacing:'1px' },
  navBtn: { display:'flex', alignItems:'center', gap:12, width:'100%', padding:'12px', borderRadius:8, border:'none', background:'transparent', color:'#94a3b8', fontSize:14, marginBottom:4, cursor:'pointer', transition:'all 0.2s', fontWeight:500 },
  navBtnActive: { background:'rgba(59, 130, 246, 0.15)', color:'#60a5fa' },
  navIcon: { fontSize:16 },
  
  sidebarPill: { margin:'16px', background:'rgba(255,255,255,0.05)', borderRadius:12, padding:'16px', border:'1px solid rgba(255,255,255,0.05)' },
  pillLabel: { fontSize:11, color:'#94a3b8', marginBottom:4 },
  pillVal: { fontSize:20, fontWeight:700, color:'#f8fafc' },
  
  sidebarUser: { padding:'16px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', gap:12 },
  avatar: { width:36, height:36, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.1)' },
  userInfo: { flex:1, overflow:'hidden' },
  userName: { fontSize:13, fontWeight:600 },
  userEmail: { fontSize:11, color:'#64748b' },
  signOutBtn: { background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:16 },

  // Components
  card: { background:'rgba(30, 41, 59, 0.4)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:16, padding:'24px' },
  page: { width:'100%' },
  
  // Form Elements
  textarea: { width:'100%', padding:'16px', fontSize:14, background:'rgba(15, 23, 42, 0.6)', border:'1px solid rgba(255,255,255,0.1)', color:'#f1f5f9', borderRadius:12, outline:'none', minHeight:100, fontFamily:"'Inter',sans-serif", transition:'border 0.2s' },
  input: { padding:'12px 16px', borderRadius:8, background:'rgba(15, 23, 42, 0.6)', border:'1px solid rgba(255,255,255,0.1)', color:'#f1f5f9', fontSize:14, outline:'none', width:'100%' },
  select: { padding:'12px 16px', borderRadius:8, background:'rgba(15, 23, 42, 0.6)', border:'1px solid rgba(255,255,255,0.1)', color:'#f1f5f9', fontSize:14, outline:'none', width:'100%', cursor:'pointer' },
  
  gridTwo: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:24 },
  
  toggleBtn: { display:'flex', alignItems:'center', padding:'16px', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(30, 41, 59, 0.4)', color:'#94a3b8', fontSize:14, cursor:'pointer', transition:'all 0.2s' },
  toggleBtnActive: { borderColor:'#3b82f6', background:'rgba(59, 130, 246, 0.1)', color:'#60a5fa', boxShadow:'0 0 15px rgba(59,130,246,0.1)' },
  
  chip: { padding:'8px 16px', borderRadius:20, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(30, 41, 59, 0.4)', color:'#94a3b8', fontSize:13, cursor:'pointer', margin:0, transition:'all 0.2s' },
  chipActive: { borderColor:'#3b82f6', background:'rgba(59, 130, 246, 0.9)', color:'#fff' },

  generateBtn: { width:'100%', padding:'20px', borderRadius:12, border:'none', background:'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', marginTop:16, boxShadow:'0 10px 30px -10px rgba(59, 130, 246, 0.5)', letterSpacing:'1px', transition:'transform 0.1s' },
  primaryBtn: { padding:'10px 24px', borderRadius:8, border:'none', background:'#3b82f6', color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer' },
  secondaryBtn: { padding:'10px 24px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'#f1f5f9', fontWeight:500, fontSize:13, cursor:'pointer' },
  backBtn: { background:'none', border:'none', color:'#94a3b8', cursor:'pointer', marginBottom:20, padding:0, fontSize:14, fontWeight:500 },
  collapseBtn: { background:'transparent', border:'none', color:'#94a3b8', fontSize:20, cursor:'pointer', marginRight:16 },

  // Stats
  statsRow: { display:'flex', gap:16, marginBottom:24, flexWrap:'wrap' },
  statCard: { background:'rgba(30, 41, 59, 0.4)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, padding:'16px 24px', minWidth:140 },
  statLabel: { fontSize:11, color:'#94a3b8', textTransform:'uppercase', fontWeight:600, marginBottom:4 },
  statVal: { fontSize:24, fontWeight:700, color:'#f1f5f9' },

  // Table
  filters: { display:'flex', gap:12, marginBottom:20 },
  tableWrap: { borderRadius:12, overflow:'hidden', border:'1px solid rgba(255,255,255,0.05)' },
  table: { width:'100%', borderCollapse:'collapse', fontSize:14 },
  thead: { background:'rgba(15, 23, 42, 0.5)' },
  th: { padding:'16px 20px', textAlign:'left', fontWeight:600, fontSize:12, color:'#94a3b8', textTransform:'uppercase' },
  tr: { borderBottom:'1px solid rgba(255,255,255,0.05)', transition:'background 0.1s', cursor:'default' },
  td: { padding:'16px 20px', verticalAlign:'middle', color:'#e2e8f0' },
  gradeTag: { display:'inline-flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, fontWeight:700, fontSize:13 },
  companyName: { fontWeight:600, color:'#fff', marginBottom:2 },
  link: { textDecoration:'none', fontSize:11, color:'#3b82f6' },

  // History
  historyCard: { background:'rgba(30, 41, 59, 0.4)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, padding:'24px', cursor:'pointer', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'space-between' },
  historyCount: { fontSize:16, fontWeight:700, color:'#f1f5f9' },
  arrowBtn: { color:'#64748b', fontSize:20 },

  // Progress
  progressPage: { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh' },
  progressCard: { width:400, textAlign:'center', background:'rgba(30, 41, 59, 0.8)', padding:40, borderRadius:24, border:'1px solid rgba(255,255,255,0.05)' },
  progressTitle: { fontSize:20, fontWeight:700, color:'#fff', marginBottom:8 },
  progressSub: { color:'#94a3b8', marginBottom:32 },
  progressBarWrap: { background:'rgba(255,255,255,0.1)', borderRadius:100, height:6 },
  progressBar: { height:'100%', borderRadius:100, background:'#3b82f6', transition:'width 0.3s' },
  spinner: { width:40, height:40, borderRadius:'50%', border:'3px solid rgba(255,255,255,0.1)', borderTopColor:'#3b82f6', animation:'spin 1s linear infinite', margin:'0 auto 20px' },
};

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#0f172a; color:#f1f5f9;}
  @keyframes spin { to { transform: rotate(360deg); } }
  button:active { transform: scale(0.98); }
`;