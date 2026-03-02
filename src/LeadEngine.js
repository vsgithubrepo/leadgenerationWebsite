import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';

// ── Data ─────────────────────────────────────────────────────────
const SEGMENTS = [
  { id: '3pl',   label: '3PL / Freight Forwarders',    icon: '📦' },
  { id: 'mfg',   label: 'Manufacturing & Industrial',   icon: '🏭' },
  { id: 'ie',    label: 'Importers / Exporters',        icon: '🌐' },
  { id: 'fleet', label: 'Truck Fleet Owners',           icon: '🚛' },
];
const CITIES = ['All India','Mumbai','Delhi / NCR','Bengaluru','Chennai','Hyderabad','Pune','Ahmedabad','Kolkata','Surat','Jaipur','Kochi','Nagpur'];

// Segment → Apollo job titles & search keywords
const SEGMENT_CONFIG = {
  '3pl':   { titles: ['Director of Logistics','Head of Operations','Supply Chain Manager','Logistics Manager','Operations Manager','Branch Head'], keywords: 'logistics freight forwarding supply chain 3PL warehousing' },
  'mfg':   { titles: ['Plant Manager','VP Operations','Director of Procurement','Supply Chain Head','GM Logistics'], keywords: 'manufacturing industrial engineering production procurement' },
  'ie':    { titles: ['Export Manager','Import Head','Director of Trade','GM Exports','MD','International Trade Manager'], keywords: 'import export trade international wholesale distribution' },
  'fleet': { titles: ['Fleet Manager','Transport Manager','Owner','MD','Operations Head','Fleet Owner'], keywords: 'trucking fleet transport roadways goods carrier' },
};

// City name → Apollo location string
const CITY_MAP = {
  'Mumbai': 'Mumbai, Maharashtra, India', 'Delhi / NCR': 'New Delhi, Delhi, India',
  'Bengaluru': 'Bengaluru, Karnataka, India', 'Chennai': 'Chennai, Tamil Nadu, India',
  'Hyderabad': 'Hyderabad, Telangana, India', 'Pune': 'Pune, Maharashtra, India',
  'Ahmedabad': 'Ahmedabad, Gujarat, India', 'Kolkata': 'Kolkata, West Bengal, India',
  'Surat': 'Surat, Gujarat, India', 'Jaipur': 'Jaipur, Rajasthan, India',
  'Kochi': 'Kochi, Kerala, India', 'Nagpur': 'Nagpur, Maharashtra, India',
};

// ── Apollo API via secure backend proxy ─────────────────────────
// Calls /api/apollo (our Vercel function) — API key stays on server, never in browser
async function callApollo(endpoint, params) {
  const res = await fetch('/api/apollo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, ...params }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Apollo API error ' + res.status);
  }
  return res.json();
}

async function searchSegment({ segmentId, regions, perPage }) {
  const config   = SEGMENT_CONFIG[segmentId];
  if (!config) return [];
  const cityList = regions.includes('All India') ? Object.values(CITY_MAP) : regions.map(r => CITY_MAP[r]).filter(Boolean);
  const data     = await callApollo('people_search', {
    per_page: Math.min(perPage, 100),
    page: 1,
    person_titles: config.titles,
    person_locations: cityList,
    organization_locations: cityList,
    q_organization_keyword_tags: config.keywords,
  });
  return data.people || [];
}

function mapToLead(person, segmentId) {
  const org        = person.organization || {};
  const hasEmail   = !!person.email;
  const hasPhone   = !!(person.phone_numbers?.length);
  const hasLinkedIn= !!person.linkedin_url;
  const hasHiring  = !!(org.job_postings?.length);
  const score      = Math.min(100, 5 + (hasEmail?20:0) + (hasPhone?15:0) + (hasLinkedIn?12:0) + (hasHiring?18:0) + ({'3pl':25,'ie':22,'mfg':20,'fleet':18}[segmentId]||15));
  return {
    id: person.id || `lead_${Date.now()}_${Math.random()}`, score,
    grade: score>=85?'A+':score>=70?'A':score>=55?'B+':score>=45?'B':score>=30?'C':'D',
    company: org.name||'—', segment: SEGMENTS.find(s=>s.id===segmentId)?.label||segmentId,
    city: person.city||org.city||'—', address: [person.city,person.state,'India'].filter(Boolean).join(', '),
    contact: [person.first_name,person.last_name].filter(Boolean).join(' ')||'—',
    designation: person.title||'—', email: person.email||'',
    phone: person.phone_numbers?.[0]?.sanitized_number||'',
    linkedin: person.linkedin_url||'', website: org.website_url||'',
    hiring: hasHiring?(org.job_postings?.[0]?.title||''):'',
    industry: org.industry||'', employees: org.estimated_num_employees||'',
    source: 'Apollo.io', date: new Date().toLocaleString('en-IN'), status: 'New', notes: '',
  };
}

async function generateLeads(config, onProgress) {
  const { segments, regions, maxLeads } = config;
  const perSegment = Math.ceil(maxLeads / Math.max(segments.length, 1));
  const allLeads   = [];
  for (let i = 0; i < segments.length; i++) {
    const segId = segments[i];
    onProgress(Math.round(10 + (i/segments.length)*75), `🔍 Searching Apollo for ${SEGMENTS.find(s=>s.id===segId)?.label}...`);
    try {
      const people = await searchSegment({ segmentId: segId, regions, perPage: perSegment });
      onProgress(Math.round(10 + ((i+0.6)/segments.length)*75), `✅ Found ${people.length} contacts`);
      for (const p of people) allLeads.push(mapToLead(p, segId));
    } catch(err) { console.error(`Segment ${segId} failed:`, err); }
  }
  onProgress(90, '🧹 Deduplicating & scoring...');
  const seen = new Set();
  const deduped = allLeads.filter(l => { const k=`${l.company}_${l.contact}`.toLowerCase(); if(seen.has(k))return false; seen.add(k); return true; });
  onProgress(100, '✅ Export ready!');
  return deduped.sort((a,b)=>b.score-a.score).slice(0,maxLeads);
}

function exportCSV(leads, filename) {
  const H = ['Score','Grade','Company','Segment','City','Contact','Designation','Email','Phone','LinkedIn','Website','Address','Industry','Employees','Hiring Signal','Source','Date','Status','Notes'];
  const rows = leads.map(l=>[l.score,l.grade,l.company,l.segment,l.city,l.contact,l.designation,l.email,l.phone,l.linkedin,l.website,l.address,l.industry,l.employees,l.hiring,l.source,l.date,l.status,l.notes]);
  const csv = [H,...rows].map(r=>r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  a.download = filename||'leads.csv'; a.click();
}

const scoreColor = s => s>=70?'#22c55e':s>=45?'#f59e0b':'#ef4444';
const scoreBg    = s => s>=70?'rgba(34,197,94,.12)':s>=45?'rgba(245,158,11,.12)':'rgba(239,68,68,.12)';
// ── Main Component ────────────────────────────────────────────────
export default function LeadEngine({ Logo }) {
  if (!Logo) Logo = ({ height=44, style={} }) => (
    <img src="/etechcube-logo.jpg" alt="eTechCube"
      style={{ height, width:'auto', objectFit:'contain', display:'block', ...style }} />
  );
  const { user } = useUser();
  const { signOut } = useClerk();
  const [view, setView] = useState('generate');
  const [form, setForm] = useState({ description:'', segments:['3pl','mfg','ie','fleet'], regions:['All India'], sources:['apollo'], maxLeads:100, instructions:'' });
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
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get('leadengine-v2-history');
        if (res?.value) setHistory(JSON.parse(res.value));
      } catch {}
    })();
  }, []);

  const saveHistory = async h => {
    try { await window.storage.set('leadengine-v2-history', JSON.stringify(h)); } catch {}
  };

  const toggle = (arr, val) => arr.includes(val) ? arr.filter(x=>x!==val) : [...arr,val];

  const handleGenerate = async () => {
    if (!form.segments.length) return alert('Select at least one segment.');
    if (!form.regions.length)  return alert('Select at least one region.');
    setGenerating(true);
    setProgress(0);
    setApiError('');
    setView('generate');

    const onProgress = (pct, label) => {
      setProgress(pct);
      setProgressLabel(label);
    };

    try {
      onProgress(5, '🚀 Connecting to Apollo.io...');
      const leads = await generateLeads(form, onProgress);

      if (leads.length === 0) {
        setApiError('No leads returned from Apollo. Try broadening your search (more segments, All India, etc.)');
        setGenerating(false);
        return;
      }

      const meta = {
        id: `run_${Date.now()}`,
        date: new Date().toLocaleString('en-IN'),
        by: user?.firstName || user?.primaryEmailAddress?.emailAddress || 'User',
        description: form.description || '(No description)',
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

      const newHistory = [meta, ...history].slice(0, 100);
      setHistory(newHistory);
      await saveHistory(newHistory);
      setCurrentLeads(leads);
      setCurrentMeta(meta);
      setGenerating(false);
      setView('results');
    } catch (err) {
      console.error(err);
      setApiError(`Error: ${err.message}`);
      setGenerating(false);
    }
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

  return (
    <div style={S.root}>
      <style>{globalCss}</style>

      {/* SIDEBAR */}
      <aside style={{ ...S.sidebar, width: sidebarOpen ? 230 : 64, transition: 'width 0.25s ease' }}>
        <div style={S.sidebarTop}>
          {sidebarOpen && (
            <div style={S.brand}>
              <Logo height={40} />
            </div>
          )}
          {!sidebarOpen && (
            <img src="/etechcube-logo.jpg" alt="e"
              style={{ width:36, height:36, objectFit:'cover', objectPosition:'center top', borderRadius:6 }} />
          )}
          <button style={S.collapseBtn} onClick={()=>setSidebarOpen(o=>!o)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav style={S.nav}>
          {[{id:'generate',icon:'⚡',label:'Generate'},{id:'results',icon:'📋',label:'Results'},{id:'history',icon:'🕐',label:'History'}].map(n=>(
            <button key={n.id} style={{ ...S.navBtn, ...(view===n.id&&!historyDetail?S.navBtnActive:{}) }}
              onClick={()=>{setView(n.id);setHistoryDetail(null);}} title={n.label}>
              <span style={S.navIcon}>{n.icon}</span>
              {sidebarOpen && <span style={S.navLabel}>{n.label}</span>}
            </button>
          ))}
        </nav>

        {sidebarOpen && totalAllTime > 0 && (
          <div style={S.sidebarPill}>
            <div style={S.pillLabel}>All-Time Leads</div>
            <div style={S.pillVal}>{totalAllTime.toLocaleString()}</div>
            <div style={S.pillSub}>{history.length} searches</div>
          </div>
        )}

        <div style={S.sidebarUser}>
          {user?.imageUrl && <img src={user.imageUrl} alt="" style={S.avatar} />}
          {sidebarOpen && (
            <div style={S.userInfo}>
              <div style={S.userName}>{user?.firstName || 'User'}</div>
              <div style={S.userEmail}>{user?.primaryEmailAddress?.emailAddress?.split('@')[0]}</div>
            </div>
          )}
          {sidebarOpen && (
            <button style={S.signOutBtn} onClick={()=>signOut()} title="Sign out">↪</button>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ ...S.main, marginLeft: sidebarOpen ? 230 : 64, width: `calc(100% - ${sidebarOpen ? 230 : 64}px)` }}>

        {/* ── GENERATE ───────────────────────────────────── */}
        {view==='generate' && !generating && (
          <div style={S.page}>
            <div style={S.pageHeader}>
              <h1 style={S.pageTitle}>Generate Leads</h1>
              <p style={S.pageSubtitle}>Live data powered by Apollo.io — real companies, real contacts</p>
            </div>

            {apiError && (
              <div style={{ ...S.warningBanner, borderColor: '#ef4444', background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                ❌ {apiError}
              </div>
            )}

            <FormSection title="Describe Your Ideal Prospect" hint="Plain English — industry focus, company size, pain points, anything specific">
              <textarea rows={4} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                placeholder="e.g. Mid-size freight forwarders in Mumbai with 50+ employees still using Excel for shipment tracking..."
                style={S.textarea} />
            </FormSection>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:20, marginBottom:24 }}>
              <FormSection title="Business Segments" hint="Target one or more">
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {SEGMENTS.map(s=>{
                    const active = form.segments.includes(s.id);
                    return <button key={s.id} onClick={()=>setForm(f=>({...f,segments:toggle(f.segments,s.id)}))}
                      style={{ ...S.toggleBtn, ...(active?S.toggleBtnActive:{}) }}>
                      <span>{s.icon}</span> {s.label}
                    </button>;
                  })}
                </div>
              </FormSection>
              <FormSection title="Data Source" hint="Live Apollo.io database">
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ ...S.toggleBtn, ...S.toggleBtnActive }}>
                    <span>🚀</span> Apollo.io (Live)
                    <span style={{ marginLeft:'auto', fontSize:10, color:'#6b7280', background:'rgba(34,197,94,0.1)', color:'#22c55e', padding:'2px 7px', borderRadius:4 }}>CONNECTED</span>
                  </div>
                  <div style={{ fontSize:12, color:'#6b7280', padding:'8px 12px', background:'rgba(255,255,255,0.02)', borderRadius:8, lineHeight:1.6 }}>
                    ℹ️ Apollo search is free. Email/phone reveal uses credits (1 credit per contact).
                  </div>
                </div>
              </FormSection>
            </div>

            <FormSection title="Target Cities" hint="Select regions to focus on">
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {CITIES.map(c=>{
                  const active = form.regions.includes(c);
                  return <button key={c} onClick={()=>setForm(f=>({...f,regions:toggle(f.regions,c)}))}
                    style={{ ...S.chip, ...(active?S.chipActive:{}) }}>{c}</button>;
                })}
              </div>
            </FormSection>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
              <FormSection title="Lead Count" hint="How many leads to fetch from Apollo">
                <select value={form.maxLeads} onChange={e=>setForm(f=>({...f,maxLeads:Number(e.target.value)}))} style={S.select}>
                  {[25,50,100,200,500].map(n=><option key={n} value={n}>{n.toLocaleString()} leads</option>)}
                </select>
              </FormSection>
              <FormSection title="Special Instructions" hint="Additional filters or focus areas">
                <textarea rows={3} value={form.instructions} onChange={e=>setForm(f=>({...f,instructions:e.target.value}))}
                  placeholder="e.g. Only 100+ employee companies, exclude IT sector..."
                  style={{ ...S.textarea, minHeight:80, fontSize:13 }} />
              </FormSection>
            </div>

            <button onClick={handleGenerate} style={S.generateBtn}>
              ⚡ FETCH {form.maxLeads.toLocaleString()} REAL LEADS FROM APOLLO
            </button>
          </div>
        )}

        {/* ── PROGRESS ───────────────────────────────────── */}
        {view==='generate' && generating && (
          <div style={S.progressPage}>
            <div style={S.progressInner}>
              <div style={S.progressTitle}>Fetching Real Leads...</div>
              <div style={S.progressSub}>Querying Apollo.io live database across {form.regions.slice(0,3).join(', ')}{form.regions.length>3?` +${form.regions.length-3} more`:''}</div>
              <div style={S.progressBarWrap}>
                <div style={{ ...S.progressBar, width:`${progress}%` }} />
              </div>
              <div style={S.progressMeta}>
                <span style={{ color:'#9ca3af', fontSize:13 }}>{progressLabel}</span>
                <span style={{ color:'#f59e0b', fontWeight:700, fontSize:14 }}>{progress}%</span>
              </div>
              <div style={S.dots}>
                {[0,1,2].map(i=><div key={i} style={{ ...S.dot, animationDelay:`${i*0.2}s` }} />)}
              </div>
            </div>
          </div>
        )}

        {/* ── RESULTS ────────────────────────────────────── */}
        {(view==='results' || (view==='history'&&historyDetail)) && activeMeta && (
          <div style={S.page}>
            {historyDetail && (
              <button style={S.backBtn} onClick={()=>{setHistoryDetail(null);setView('history');}}>
                ← Back to History
              </button>
            )}
            <div style={S.resultsHeader}>
              <div>
                <h1 style={S.pageTitle}>{activeMeta.total.toLocaleString()} Real Leads Found</h1>
                <p style={S.pageSubtitle}>{activeMeta.date} · by {activeMeta.by} · {activeMeta.description.slice(0,70)}{activeMeta.description.length>70?'…':''}</p>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button style={S.secondaryBtn} onClick={()=>exportCSV(displayLeads,`leads_${Date.now()}.csv`)}>📥 Export CSV</button>
                <button style={S.primaryBtn} onClick={()=>setView('generate')}>⚡ New Search</button>
              </div>
            </div>

            <div style={S.statsRow}>
              {[
                {label:'🔥 Hot (A/A+)',val:activeMeta.hot,c:'#22c55e'},
                {label:'🟡 Warm (B/B+)',val:activeMeta.warm,c:'#f59e0b'},
                {label:'🔵 Cold',val:activeMeta.cold,c:'#6b7280'},
                {label:'📧 With Email',val:activeMeta.withEmail,c:'#f59e0b'},
                {label:'📞 With Phone',val:activeMeta.withPhone,c:'#f59e0b'},
              ].map(s=>(
                <div key={s.label} style={S.statCard}>
                  <div style={S.statLabel}>{s.label}</div>
                  <div style={{ ...S.statVal, color:s.c }}>{s.val.toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div style={S.filters}>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="🔍 Search company, contact, city..."
                style={{ ...S.input, width:240 }} />
              <select value={filterGrade} onChange={e=>setFilterGrade(e.target.value)} style={S.select}>
                <option value="all">All Grades</option>
                <option value="hot">🔥 Hot (A/A+)</option>
                <option value="B+">B+</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
              <select value={filterSeg} onChange={e=>setFilterSeg(e.target.value)} style={S.select}>
                <option value="all">All Segments</option>
                {SEGMENTS.map(s=><option key={s.id} value={s.label}>{s.label}</option>)}
              </select>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={S.select}>
                <option value="score">Sort: Score</option>
                <option value="company">Sort: Company</option>
                <option value="city">Sort: City</option>
              </select>
              <span style={{ marginLeft:'auto', color:'#6b7280', fontSize:12 }}>{displayLeads.length} leads</span>
            </div>

            <div style={S.tableWrap}>
              <div style={{ overflowX:'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr style={S.thead}>
                      {['Score','Company','Industry','City','Contact','Email','Phone','Segment','Hiring','Source'].map(h=>(
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayLeads.slice(0,200).map((l,i)=>(
                      <tr key={l.id} style={{ ...S.tr, background: i%2===0?'transparent':'rgba(255,255,255,0.015)' }}>
                        <td style={S.td}>
                          <span style={{ ...S.gradeTag, background:scoreBg(l.score), color:scoreColor(l.score) }}>{l.grade}</span>
                          <span style={{ color:scoreColor(l.score), fontWeight:600, fontSize:12, marginLeft:6 }}>{l.score}</span>
                        </td>
                        <td style={{ ...S.td, maxWidth:190 }}>
                          <div style={S.companyName}>{l.company}</div>
                          {l.website && <a href={l.website} target="_blank" rel="noreferrer" style={S.link}>🌐 website</a>}
                          {l.employees && <div style={{ color:'#6b7280', fontSize:11 }}>👥 {l.employees} emp</div>}
                        </td>
                        <td style={{ ...S.td, maxWidth:130, color:'#9ca3af', fontSize:11 }}>
                          <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.industry || '—'}</div>
                        </td>
                        <td style={{ ...S.td, whiteSpace:'nowrap', color:'#9ca3af' }}>{l.city}</td>
                        <td style={{ ...S.td, maxWidth:150 }}>
                          <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12 }}>{l.contact||'—'}</div>
                          {l.designation && <div style={{ color:'#6b7280', fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.designation}</div>}
                          {l.linkedin && <a href={l.linkedin} target="_blank" rel="noreferrer" style={{ ...S.link, color:'#3b82f6' }}>🔗 LinkedIn</a>}
                        </td>
                        <td style={{ ...S.td, maxWidth:180 }}>
                          {l.email?<a href={`mailto:${l.email}`} style={{ ...S.link, color:'#f59e0b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>{l.email}</a>:<span style={{ color:'#4b5563', fontSize:12 }}>—</span>}
                        </td>
                        <td style={{ ...S.td, whiteSpace:'nowrap', fontSize:12 }}>{l.phone||<span style={{color:'#4b5563'}}>—</span>}</td>
                        <td style={S.td}>
                          <span style={S.segTag}>{l.segment.split(' / ')[0]}</span>
                        </td>
                        <td style={S.td}>
                          {l.hiring?<span style={S.hiringTag}>📢 {l.hiring.split(' ')[0]}</span>:<span style={{color:'#4b5563',fontSize:12}}>—</span>}
                        </td>
                        <td style={{ ...S.td, color:'#6b7280', fontSize:11, whiteSpace:'nowrap' }}>{l.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {displayLeads.length>200&&<div style={S.tableFooter}>Showing 200 of {displayLeads.length} — Export CSV to see all</div>}
            </div>
          </div>
        )}

        {view==='results' && !activeMeta && (
          <div style={S.emptyState}>
            <div style={S.emptyIcon}>📋</div>
            <div style={S.emptyTitle}>No results yet</div>
            <div style={S.emptySub}>Run a lead generation search to see results here.</div>
            <button style={S.primaryBtn} onClick={()=>setView('generate')}>⚡ Generate Leads</button>
          </div>
        )}

        {/* ── HISTORY ────────────────────────────────────── */}
        {view==='history' && !historyDetail && (
          <div style={S.page}>
            <div style={S.pageHeader}>
              <h1 style={S.pageTitle}>Search History</h1>
              <p style={S.pageSubtitle}>All previous searches — click any run to browse its leads</p>
            </div>
            {history.length===0 ? (
              <div style={S.emptyState}>
                <div style={S.emptyIcon}>🕐</div>
                <div style={S.emptyTitle}>No history yet</div>
                <div style={S.emptySub}>Your first lead generation run will appear here.</div>
                <button style={S.primaryBtn} onClick={()=>setView('generate')}>⚡ Generate Leads</button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {history.map(run=>(
                  <div key={run.id} style={S.historyCard}
                    onClick={()=>{setHistoryDetail(run);setSearch('');setFilterGrade('all');setFilterSeg('all');}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(245,158,11,0.35)';e.currentTarget.style.background='rgba(245,158,11,0.03)';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.07)';e.currentTarget.style.background='#111418';}}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                          <span style={S.historyCount}>{run.total.toLocaleString()}</span>
                          <span style={{ color:'#9ca3af', fontSize:13 }}>leads</span>
                          <span style={S.hotBadge}>🔥 {run.hot} hot</span>
                          <span style={{ fontSize:11, color:'#6b7280' }}>by {run.by}</span>
                        </div>
                        <div style={{ color:'#e8e4dc', fontSize:13.5, fontWeight:500, marginBottom:8 }}>{run.description}</div>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {run.segments?.map(s=><span key={s} style={S.historyTag}>{s.split(' / ')[0]}</span>)}
                          {run.regions?.slice(0,3).map(r=><span key={r} style={S.historyRegionTag}>{r}</span>)}
                          {run.regions?.length>3&&<span style={{fontSize:11,color:'#6b7280'}}>+{run.regions.length-3}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
                        <div style={{ color:'#6b7280', fontSize:11 }}>{run.date}</div>
                        <div style={{ display:'flex', gap:16 }}>
                          <MiniStat label="Email" val={run.withEmail} />
                          <MiniStat label="Phone" val={run.withPhone} />
                        </div>
                        <button style={S.downloadBtn}
                          onClick={e=>{e.stopPropagation();exportCSV(run.leads,`leads_${run.id}.csv`);}}>
                          📥 Download
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function FormSection({ title, hint, children }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ marginBottom:10 }}>
        <div style={{ fontWeight:600, fontSize:13.5, color:'#e8e4dc', marginBottom:2 }}>{title}</div>
        {hint&&<div style={{ fontSize:12, color:'#6b7280' }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, val }) {
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:'#e8e4dc' }}>{val}</div>
      <div style={{ fontSize:10, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</div>
    </div>
  );
}

const S = {
  root:         { display:'flex', minHeight:'100vh', width:'100%', background:'#0a0c0f', fontFamily:"'DM Sans',sans-serif", color:'#e8e4dc', overflowX:'hidden' },
  sidebar:      { background:'#0d1117', borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, bottom:0, zIndex:100, overflow:'hidden' },
  sidebarTop:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px 16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', minHeight:80 },
  brand:        { flex:1 },
  collapseBtn:  { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'#6b7280', borderRadius:6, width:28, height:28, fontSize:10, cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' },
  nav:          { padding:'16px 10px', flex:1 },
  navBtn:       { display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 10px', borderRadius:8, border:'none', background:'transparent', color:'#9ca3af', fontSize:13, marginBottom:2, cursor:'pointer', textAlign:'left', transition:'all 0.15s', whiteSpace:'nowrap' },
  navBtnActive: { background:'rgba(245,158,11,0.12)', color:'#f59e0b', fontWeight:600 },
  navIcon:      { fontSize:15, flexShrink:0 },
  navLabel:     {},
  sidebarPill:  { margin:'0 10px 16px', background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:10, padding:'14px' },
  pillLabel:    { fontSize:9, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 },
  pillVal:      { fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:'#f59e0b' },
  pillSub:      { fontSize:11, color:'#6b7280', marginTop:2 },
  sidebarUser:  { display:'flex', alignItems:'center', gap:8, padding:'14px 12px', borderTop:'1px solid rgba(255,255,255,0.06)', minHeight:60 },
  avatar:       { width:30, height:30, borderRadius:'50%', flexShrink:0 },
  userInfo:     { flex:1, minWidth:0 },
  userName:     { fontSize:12, fontWeight:600, color:'#e8e4dc', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  userEmail:    { fontSize:10, color:'#6b7280', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  signOutBtn:   { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'#6b7280', borderRadius:6, width:26, height:26, fontSize:13, cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' },
  main:         { marginLeft:230, flex:1, minHeight:'100vh', minWidth:0, width:'calc(100% - 230px)', transition:'margin-left 0.25s ease, width 0.25s ease', overflowX:'hidden' },
  page:         { padding:'32px 48px', width:'100%', boxSizing:'border-box' },
  pageHeader:   { marginBottom:32 },
  pageTitle:    { fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28, letterSpacing:'-0.8px' },
  pageSubtitle: { color:'#9ca3af', fontSize:13.5, marginTop:6 },
  textarea:     { width:'100%', padding:'13px 15px', fontSize:14, resize:'vertical', lineHeight:1.6, minHeight:100, background:'#111418', border:'1px solid rgba(255,255,255,0.1)', color:'#e8e4dc', borderRadius:10, fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' },
  toggleBtn:    { display:'flex', alignItems:'center', gap:9, padding:'11px 14px', borderRadius:9, border:'1.5px solid rgba(255,255,255,0.1)', background:'#111418', color:'#9ca3af', fontWeight:400, fontSize:13.5, cursor:'pointer', textAlign:'left', transition:'all 0.15s' },
  toggleBtnActive:{ borderColor:'#f59e0b', background:'rgba(245,158,11,0.1)', color:'#fbbf24', fontWeight:600 },
  chip:         { padding:'7px 13px', borderRadius:20, border:'1.5px solid rgba(255,255,255,0.1)', background:'#111418', color:'#9ca3af', fontSize:12.5, cursor:'pointer', transition:'all 0.15s' },
  chipActive:   { borderColor:'#f59e0b', background:'rgba(245,158,11,0.1)', color:'#fbbf24', fontWeight:600 },
  select:       { padding:'10px 12px', borderRadius:8, background:'#111418', border:'1px solid rgba(255,255,255,0.1)', color:'#e8e4dc', fontSize:13, cursor:'pointer', outline:'none', fontFamily:"'DM Sans',sans-serif" },
  input:        { padding:'9px 13px', borderRadius:8, background:'#111418', border:'1px solid rgba(255,255,255,0.1)', color:'#e8e4dc', fontSize:13, outline:'none', fontFamily:"'DM Sans',sans-serif" },
  generateBtn:  { width:'100%', padding:'18px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#0a0c0f', fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, cursor:'pointer', boxShadow:'0 8px 28px rgba(245,158,11,0.28)', letterSpacing:'0.3px', marginTop:8, boxSizing:'border-box' },
  primaryBtn:   { padding:'10px 20px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#0a0c0f', fontWeight:700, fontSize:13, cursor:'pointer' },
  secondaryBtn: { padding:'10px 18px', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'#111418', color:'#e8e4dc', fontSize:13, fontWeight:500, cursor:'pointer' },
  backBtn:      { display:'flex', alignItems:'center', gap:6, color:'#9ca3af', background:'none', border:'none', fontSize:13, cursor:'pointer', marginBottom:16, padding:0 },
  progressPage: { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' },
  progressInner:{ maxWidth:560, width:'100%', textAlign:'center', padding:'0 40px' },
  progressTitle:{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28, letterSpacing:'-0.5px', marginBottom:10 },
  progressSub:  { color:'#9ca3af', fontSize:13.5, marginBottom:44 },
  progressBarWrap:{ background:'#111418', borderRadius:100, height:8, marginBottom:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)' },
  progressBar:  { height:'100%', borderRadius:100, background:'linear-gradient(90deg,#f59e0b,#fbbf24)', transition:'width 0.45s ease', boxShadow:'0 0 14px rgba(245,158,11,0.5)' },
  progressMeta: { display:'flex', justifyContent:'space-between', fontSize:12, color:'#6b7280', marginBottom:36 },
  dots:         { display:'flex', justifyContent:'center', gap:8 },
  dot:          { width:8, height:8, borderRadius:'50%', background:'#f59e0b', animation:'dotPulse 1.2s ease-in-out infinite alternate', opacity:0.4 },
  resultsHeader:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:16 },
  statsRow:     { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:10, marginBottom:20 },
  statCard:     { background:'#111418', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'13px 15px' },
  statLabel:    { fontSize:10, color:'#6b7280', marginBottom:5 },
  statVal:      { fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22 },
  filters:      { display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' },
  tableWrap:    { background:'#111418', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' },
  table:        { width:'100%', borderCollapse:'collapse', fontSize:13 },
  thead:        { background:'#161b22', borderBottom:'1px solid rgba(255,255,255,0.08)' },
  th:           { padding:'11px 13px', textAlign:'left', fontWeight:600, fontSize:10.5, color:'#6b7280', letterSpacing:'0.07em', textTransform:'uppercase', whiteSpace:'nowrap' },
  tr:           { borderBottom:'1px solid rgba(255,255,255,0.05)' },
  td:           { padding:'11px 13px', verticalAlign:'middle' },
  gradeTag:     { display:'inline-flex', alignItems:'center', justifyContent:'center', width:32, height:20, borderRadius:5, fontWeight:700, fontSize:11 },
  companyName:  { overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500, fontSize:13 },
  link:         { color:'#6b7280', fontSize:11, textDecoration:'none' },
  segTag:       { fontSize:11, padding:'3px 7px', borderRadius:4, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'#9ca3af', whiteSpace:'nowrap' },
  hiringTag:    { fontSize:11, color:'#22c55e', background:'rgba(34,197,94,0.1)', padding:'3px 7px', borderRadius:4, whiteSpace:'nowrap' },
  tableFooter:  { padding:'13px 20px', background:'#161b22', borderTop:'1px solid rgba(255,255,255,0.07)', color:'#6b7280', fontSize:12, textAlign:'center' },
  emptyState:   { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', textAlign:'center', padding:40 },
  emptyIcon:    { fontSize:52, marginBottom:16 },
  emptyTitle:   { fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:20, color:'#e8e4dc', marginBottom:8 },
  emptySub:     { fontSize:14, color:'#6b7280', marginBottom:24 },
  historyCard:  { background:'#111418', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'20px 24px', cursor:'pointer', transition:'border-color 0.15s, background 0.15s' },
  historyCount: { fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:'#f59e0b' },
  hotBadge:     { fontSize:11, padding:'3px 8px', borderRadius:5, background:'rgba(34,197,94,0.1)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.18)' },
  historyTag:   { fontSize:11, padding:'2px 8px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:4, color:'#9ca3af' },
  historyRegionTag:{ fontSize:11, padding:'2px 8px', background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.18)', borderRadius:4, color:'#f59e0b' },
  downloadBtn:  { padding:'6px 14px', borderRadius:6, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'#9ca3af', fontSize:12, cursor:'pointer' },
  warningBanner:{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:10, padding:'12px 16px', marginBottom:24, color:'#f59e0b', fontSize:13, lineHeight:1.6 },
};

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
  *, *::before, *::after {box-sizing:border-box;margin:0;padding:0;}
  html, body, #root { height:100%; width:100%; overflow-x:hidden; }
  body{background:#0a0c0f;color:#e8e4dc;-webkit-font-smoothing:antialiased;}
  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-track{background:#0d1117;}
  ::-webkit-scrollbar-thumb{background:#1e2530;border-radius:3px;}
  input:focus,textarea:focus,select:focus{outline:none;border-color:#f59e0b !important;box-shadow:0 0 0 3px rgba(245,158,11,0.1);}
  @keyframes dotPulse{to{opacity:1;transform:scale(1.4);}}
`;
