import { useState, useEffect } from "react";
const STATUS_LIST = ['근무','야간','오프','연차','반차'];
const STATUS_META = {
  근무: { bg:'#DCFCE7', color:'#166534', border:'#86EFAC', label:'근무' },
  야간: { bg:'#1E1B4B', color:'#C4B5FD', border:'#6366F1', label:'야간' },
  오프: { bg:'#DBEAFE', color:'#1E40AF', border:'#93C5FD', label:'오프' },
  연차: { bg:'#FEF3C7', color:'#92400E', border:'#FCD34D', label:'연차' },
  반차: { bg:'#EDE9FE', color:'#5B21B6', border:'#C4B5FD', label:'반차' },
};
const ROLES = ['총괄실장','데스크 팀장','데스크 코디네이터','진료실 팀장','진료실 치과위생사','치과 기공사','소독실 이모님','파트타임 알바'];
const COLORS = ['#0EA5E9','#10B981','#8B5CF6','#F59E0B','#EF4444','#EC4899','#14B8A6','#F97316','#6366F1','#84CC16','#06B6D4'];
const DOW_KR = ['일','월','화','수','목','금','토'];
const HOLIDAYS = {
  '2025-01-01':'신정','2025-01-28':'설날','2025-01-29':'설날','2025-01-30':'설날',
  '2025-03-01':'삼일절','2025-05-05':'어린이날','2025-05-06':'부처님오신날',
  '2025-06-06':'현충일','2025-08-15':'광복절','2025-10-03':'개천절',
  '2025-10-05':'추석','2025-10-06':'추석','2025-10-07':'추석',
  '2025-10-09':'한글날','2025-12-25':'성탄절',
  '2026-01-01':'신정','2026-01-27':'설날','2026-01-28':'설날','2026-01-29':'설날',
  '2026-03-01':'삼일절','2026-05-05':'어린이날','2026-08-15':'광복절',
  '2026-10-03':'개천절','2026-12-25':'성탄절',
};
function dStr(y,m,d){ return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function getDow(y,m,d){ return new Date(y,m-1,d).getDay(); }
function daysInMonth(y,m){ return new Date(y,m,0).getDate(); }
function lsGet(k){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):null; }catch(_){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(_){} }
export default function App() {
  const [tab,setTab]             = useState('calendar');
  const [employees,setEmployees] = useState([]);
  const [schedule,setSchedule]   = useState({});
  const [year,setYear]   = useState(new Date().getFullYear());
  const [month,setMonth] = useState(new Date().getMonth()+1);
  const [minStaff,setMinStaff]   = useState({0:3,1:5,2:5,3:5,4:5,5:5,6:3});
  const [minNight,setMinNight]   = useState(2);
  const [sundayCount,setSundayCount] = useState(3);
  const [newEmp,setNewEmp] = useState({name:'',role:'진료실 치과위생사',preferredOff:[],offPerMonth:4});
  const [loaded,setLoaded]   = useState(false);
  const [toast,setToast]     = useState(null);
  const [confirmDel,setConfirmDel] = useState(null);
  const [calFilter,setCalFilter] = useState('all'); // all | 근무 | 오프 | 연차 | 야간
  useEffect(()=>{
    const e=lsGet('mc3_emp');  if(e) setEmployees(e);
    const s=lsGet('mc3_sch');  if(s) setSchedule(s);
    const ms=lsGet('mc3_ms');  if(ms) setMinStaff(ms);
    const mn=lsGet('mc3_mn');  if(mn) setMinNight(mn);
    const sc=lsGet('mc3_sc');  if(sc) setSundayCount(sc);
    setLoaded(true);
  },[]);
  useEffect(()=>{ if(loaded){ lsSet('mc3_emp',employees); } },[employees,loaded]);
  useEffect(()=>{ if(loaded){ lsSet('mc3_sch',schedule);  } },[schedule,loaded]);
  useEffect(()=>{ if(loaded){ lsSet('mc3_ms',minStaff);   } },[minStaff,loaded]);
  useEffect(()=>{ if(loaded){ lsSet('mc3_mn',minNight);   } },[minNight,loaded]);
  useEffect(()=>{ if(loaded){ lsSet('mc3_sc',sundayCount);} },[sundayCount,loaded]);
  const showToast=(msg,type='success')=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2800); };
  const dims=daysInMonth(year,month);
  const allDays=Array.from({length:dims},(_,i)=>i+1);
  const getStatus=(id,d)=> schedule[id]?.[dStr(year,month,d)]||'근무';
  const cycleStatus=(id,d)=>{
    const ds=dStr(year,month,d); if(HOLIDAYS[ds]) return;
    const cur=getStatus(id,d);
    const next=STATUS_LIST[(STATUS_LIST.indexOf(cur)+1)%STATUS_LIST.length];
    setSchedule(p=>({...p,[id]:{...(p[id]||{}),[ds]:next}}));
  };
  const getWorkCount=d=> employees.filter(e=>{ const s=getStatus(e.id,d); return s==='근무'||s==='야간'; }).length;
  const getNightCount=d=> employees.filter(e=> getStatus(e.id,d)==='야간').length;
  const isUnderMin=d=>{ const ds=dStr(year,month,d); if(HOLIDAYS[ds]) return false; const dw=getDow(year,month,d); return getWorkCount(d)<(minStaff[dw]??0); };
  const isUnderNight=d=>{ const ds=dStr(year,month,d); if(HOLIDAYS[ds]) return false; const dw=getDow(year,month,d); if(dw!==2&&dw!==4) return false; return getNightCount(d)<minNight; };
  const addEmployee=()=>{
    if(!newEmp.name.trim()){ showToast('이름을 입력해주세요','error'); return; }
    const emp={id:Date.now().toString(),name:newEmp.name.trim(),role:newEmp.role,
      preferredOff:newEmp.preferredOff,offPerMonth:newEmp.offPerMonth,color:COLORS[employees.length%COLORS.length]};
    setEmployees(p=>[...p,emp]);
    setNewEmp({name:'',role:'진료실 치과위생사',preferredOff:[],offPerMonth:4});
    showToast(`${emp.name} 등록 완료`);
  };
  const removeEmployee=(id)=>{
    setEmployees(p=>p.filter(e=>e.id!==id));
    setSchedule(p=>{ const n={...p}; delete n[id]; return n; });
    setConfirmDel(null); showToast('삭제 완료');
  };
  const prevMonth=()=>{ if(month===1){setMonth(12);setYear(y=>y-1)}else setMonth(m=>m-1); };
  const nextMonth=()=>{ if(month===12){setMonth(1);setYear(y=>y+1)}else setMonth(m=>m+1); };
  // Calendar grid: fill leading empty cells
  const firstDow = getDow(year,month,1); // 0=Sun
  const leadingEmpties = Array(firstDow).fill(null);
  const today = new Date();
  const isToday = d => today.getFullYear()===year && today.getMonth()+1===month && today.getDate()===d;
  const getFairness=()=>employees.map(e=>{
    let work=0,night=0,off=0,annual=0,half=0,sunWork=0;
    allDays.forEach(d=>{
      const s=getStatus(e.id,d); const dw=getDow(year,month,d);
      if(s==='근무'){work++;if(dw===0)sunWork++;}
      else if(s==='야간') night++;
      else if(s==='오프') off++;
      else if(s==='연차') annual++;
      else if(s==='반차') half++;
    });
    return {...e,work,night,off,annual,half,sunWork,restDays:off+annual,totalWork:work+night};
  });
  // ── week rows for grid schedule ──
  const weekMap={};
  allDays.forEach(d=>{ const wi=Math.floor((d-1+firstDow)/7); if(!weekMap[wi])weekMap[wi]=[]; weekMap[wi].push(d); });
  const tableCols=allDays.flatMap(d=>{ const dw=getDow(year,month,d); const c=[{type:'day',d}]; if(dw===0&&d<dims) c.push({type:'sep',id:`s${d}`}); return c; });
  const S={
    wrap:{fontFamily:"'Noto Sans KR',system-ui,sans-serif",minHeight:'100vh',background:'#F0F4F8'},
    header:{background:'linear-gradient(135deg,#0EA5E9,#0284C7)',padding:'0 1.5rem',position:'sticky',top:0,zIndex:50,boxShadow:'0 2px 12px rgba(14,165,233,0.3)'},
    hInner:{display:'flex',alignItems:'center',justifyContent:'space-between',height:'56px',gap:'8px'},
    tabs:{display:'flex',gap:'2px',background:'rgba(255,255,255,0.15)',padding:'4px',borderRadius:'10px'},
    tab:(a)=>({padding:'6px 14px',borderRadius:'7px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:a?'700':'400',
      background:a?'#fff':'transparent',color:a?'#0284C7':'rgba(255,255,255,0.85)',
      boxShadow:a?'0 1px 4px rgba(0,0,0,0.1)':'none',transition:'all 0.15s',whiteSpace:'nowrap'}),
    body:{padding:'1.25rem',maxWidth:'1300px',margin:'0 auto'},
    card:{background:'#fff',borderRadius:'14px',border:'1px solid #E2E8F0',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'},
    btn:(v='primary')=>({
      padding:'8px 16px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'13px',fontWeight:'600',
      display:'inline-flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap',transition:'all 0.15s',
      ...(v==='primary'?{background:'#0EA5E9',color:'#fff',boxShadow:'0 2px 8px rgba(14,165,233,0.3)'}:
         v==='danger'?{background:'#FEF2F2',color:'#DC2626',border:'1px solid #FECACA'}:
         {background:'#F8FAFC',color:'#374151',border:'1px solid #E2E8F0'})
    }),
    numBtn:{width:'28px',height:'28px',borderRadius:'50%',border:'1px solid #E2E8F0',background:'#F8FAFC',
      cursor:'pointer',fontSize:'16px',fontWeight:'700',display:'flex',alignItems:'center',justifyContent:'center',color:'#374151'},
  };
  if(!loaded) return <div style={{padding:'2rem',color:'#64748B',fontFamily:'Noto Sans KR,sans-serif'}}>불러오는 중...</div>;
  // ── CALENDAR DAY CELL ──────────────────────────────────────
  const CalDayCell = ({d}) => {
    if(!d) return <div style={{background:'transparent'}}></div>;
    const ds=dStr(year,month,d);
    const isHol=!!HOLIDAYS[ds];
    const dw=getDow(year,month,d);
    const isSun=dw===0; const isSat=dw===6; const isNight=dw===2||dw===4;
    const underMin=isUnderMin(d); const underNight=isUnderNight(d);
    const todayFlag=isToday(d);
    // Group employees by status
    const groups={근무:[],야간:[],오프:[],연차:[],반차:[]};
    employees.forEach(e=>{
      const s=isHol?null:getStatus(e.id,d);
      if(s&&groups[s]) groups[s].push(e);
    });
    const workCnt=groups['근무'].length+groups['야간'].length;
    const req=minStaff[dw]??0;
    // Border color based on alerts
    const borderColor = underMin||underNight ? '#FCA5A5' : isHol ? '#FECACA' : todayFlag ? '#0EA5E9' : '#E2E8F0';
    const headerBg = isHol ? '#FEF2F2' : isSun ? '#FFFBEB' : isSat ? '#F5F3FF' : isNight ? '#F0F0FF' : '#F8FAFC';
    const filterOk = s => calFilter==='all' || calFilter===s;
    return (
      <div style={{
        background:'#fff',borderRadius:'10px',border:`1.5px solid ${borderColor}`,
        overflow:'hidden',minHeight:'140px',display:'flex',flexDirection:'column',
        boxShadow: todayFlag?'0 0 0 2px #0EA5E9':underMin||underNight?'0 0 0 1px #FCA5A5':'none',
      }}>
        {/* Day header */}
        <div style={{background:headerBg,padding:'5px 8px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${borderColor}`}}>
          <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
            <div style={{
              width:'24px',height:'24px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:'12px',fontWeight:'800',
              background: todayFlag?'#0EA5E9':'transparent',
              color: todayFlag?'#fff': isHol?'#DC2626': isSun?'#D97706': isSat?'#7C3AED':'#0F172A',
            }}>{d}</div>
            <span style={{fontSize:'9px',fontWeight:'600',
              color:isHol?'#DC2626':isSun?'#D97706':isSat?'#7C3AED':'#94A3B8'}}>
              {isHol?'🎌':isSun?'🌞':isNight?'🌙':''} {DOW_KR[dw]}
            </span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
            {isHol && <span style={{fontSize:'9px',color:'#DC2626',fontWeight:'700',background:'#FEE2E2',padding:'1px 5px',borderRadius:'4px'}}>{HOLIDAYS[ds]}</span>}
            {!isHol && (underMin||underNight) && <span style={{fontSize:'9px',color:'#DC2626',fontWeight:'700',background:'#FEE2E2',padding:'1px 5px',borderRadius:'4px'}}>⚠️인원부족</span>}
            {!isHol && <span style={{fontSize:'9px',fontWeight:'700',color:underMin?'#DC2626':'#64748B'}}>{workCnt}/{req}</span>}
          </div>
        </div>
        {/* Staff chips */}
        <div style={{padding:'5px 6px',flex:1,display:'flex',flexDirection:'column',gap:'2px',overflowY:'auto'}}>
          {isHol ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',flex:1}}>
              <span style={{fontSize:'11px',color:'#EF4444',fontWeight:'600'}}>공휴일 🎌</span>
            </div>
          ) : (
            <>
              {/* 근무 그룹 */}
              {filterOk('근무') && groups['근무'].map(e=>(
                <div key={e.id} style={{display:'flex',alignItems:'center',gap:'4px',padding:'2px 5px',
                  background:'#DCFCE7',borderRadius:'5px',border:'1px solid #86EFAC'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:e.color,flexShrink:0}}></div>
                  <span style={{fontSize:'10px',fontWeight:'600',color:'#166534',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.name}</span>
                  <span style={{fontSize:'9px',color:'#4ADE80'}}>근무</span>
                </div>
              ))}
              {/* 야간 그룹 */}
              {filterOk('야간') && groups['야간'].map(e=>(
                <div key={e.id} style={{display:'flex',alignItems:'center',gap:'4px',padding:'2px 5px',
                  background:'#1E1B4B',borderRadius:'5px',border:'1px solid #6366F1'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:e.color,flexShrink:0}}></div>
                  <span style={{fontSize:'10px',fontWeight:'600',color:'#C4B5FD',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.name}</span>
                  <span style={{fontSize:'9px',color:'#818CF8'}}>🌙</span>
                </div>
              ))}
              {/* 연차 그룹 */}
              {filterOk('연차') && groups['연차'].map(e=>(
                <div key={e.id} style={{display:'flex',alignItems:'center',gap:'4px',padding:'2px 5px',
                  background:'#FEF3C7',borderRadius:'5px',border:'1px solid #FCD34D'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:e.color,flexShrink:0}}></div>
                  <span style={{fontSize:'10px',fontWeight:'600',color:'#92400E',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.name}</span>
                  <span style={{fontSize:'9px',color:'#F59E0B'}}>연차</span>
                </div>
              ))}
              {/* 반차 그룹 */}
              {filterOk('반차') && groups['반차'].map(e=>(
                <div key={e.id} style={{display:'flex',alignItems:'center',gap:'4px',padding:'2px 5px',
                  background:'#EDE9FE',borderRadius:'5px',border:'1px solid #C4B5FD'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:e.color,flexShrink:0}}></div>
                  <span style={{fontSize:'10px',fontWeight:'600',color:'#5B21B6',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.name}</span>
                  <span style={{fontSize:'9px',color:'#8B5CF6'}}>반차</span>
                </div>
              ))}
              {/* 오프 그룹 — 접어두기 (이름만 회색으로) */}
              {filterOk('오프') && groups['오프'].length>0 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:'2px',marginTop:'2px',paddingTop:'2px',borderTop:'1px dashed #E2E8F0'}}>
                  {groups['오프'].map(e=>(
                    <span key={e.id} style={{fontSize:'9px',padding:'1px 5px',background:'#DBEAFE',
                      color:'#1E40AF',borderRadius:'4px',fontWeight:'500'}}>
                      {e.name}오프
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };
  return (
    <div style={S.wrap}>
      {toast&&(
        <div style={{position:'fixed',top:'16px',left:'50%',transform:'translateX(-50%)',zIndex:200,
          background:toast.type==='error'?'#DC2626':'#059669',color:'#fff',
          padding:'10px 22px',borderRadius:'24px',fontSize:'13px',fontWeight:'600',
          boxShadow:'0 4px 20px rgba(0,0,0,0.2)',whiteSpace:'nowrap'}}>
          {toast.msg}
        </div>
      )}
      {confirmDel&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:90,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{...S.card,padding:'1.5rem',width:'300px',textAlign:'center'}}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>🗑️</div>
            <div style={{fontSize:'15px',fontWeight:'700',marginBottom:'6px',color:'#0F172A'}}>직원 삭제</div>
            <div style={{fontSize:'13px',color:'#64748B',marginBottom:'1.25rem',lineHeight:1.6}}>
              <b style={{color:'#0F172A'}}>{confirmDel.name}</b>을(를) 삭제하면<br/>모든 근무 데이터도 삭제됩니다.
            </div>
            <div style={{display:'flex',gap:'8px',justifyContent:'center'}}>
              <button onClick={()=>setConfirmDel(null)} style={S.btn('secondary')}>취소</button>
              <button onClick={()=>removeEmployee(confirmDel.id)} style={S.btn('danger')}>삭제</button>
            </div>
          </div>
        </div>
      )}
      {/* ── HEADER ── */}
      <div style={S.header}>
        <div style={S.hInner}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',flexShrink:0}}>
            <div style={{width:'32px',height:'32px',background:'rgba(255,255,255,0.2)',borderRadius:'9px',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>🦷</div>
            <span style={{fontWeight:'800',fontSize:'15px',color:'#fff',whiteSpace:'nowrap',letterSpacing:'-0.3px'}}>맑은플란트 근무표</span>
          </div>
          <div style={S.tabs}>
            {[['calendar','📅 캘린더'],['schedule','🗂 근무표'],['employees','👥 직원'],['settings','⚙️ 설정'],['fairness','📊 공정성']].map(([t,l])=>(
              <button key={t} onClick={()=>setTab(t)} style={S.tab(tab===t)}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={S.body}>
        {/* ══ CALENDAR TAB ══════════════════════════════════════ */}
        {tab==='calendar'&&(
          <div>
            {/* Month nav + filter */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <button onClick={prevMonth} style={{...S.btn('secondary'),padding:'7px 12px',fontSize:'16px'}}>◀</button>
                <span style={{fontWeight:'800',fontSize:'20px',color:'#0F172A',minWidth:'130px',textAlign:'center'}}>{year}년 {month}월</span>
                <button onClick={nextMonth} style={{...S.btn('secondary'),padding:'7px 12px',fontSize:'16px'}}>▶</button>
              </div>
              {/* Filter chips */}
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap',alignItems:'center'}}>
                <span style={{fontSize:'11px',color:'#94A3B8',marginRight:'2px'}}>필터:</span>
                {[['all','전체','#F1F5F9','#374151'],['근무','✅ 근무','#DCFCE7','#166534'],
                  ['야간','🌙 야간','#EEF2FF','#4338CA'],['연차','📅 연차','#FEF3C7','#92400E'],
                  ['오프','☁️ 오프','#DBEAFE','#1E40AF']].map(([v,l,bg,c])=>(
                  <button key={v} onClick={()=>setCalFilter(v)}
                    style={{fontSize:'11px',padding:'5px 11px',borderRadius:'20px',border:`1.5px solid ${calFilter===v?c:'transparent'}`,
                      background:calFilter===v?bg:'#fff',color:c,fontWeight:calFilter===v?'700':'400',cursor:'pointer',transition:'all 0.15s'}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {/* Legend */}
            <div style={{display:'flex',gap:'8px',marginBottom:'12px',flexWrap:'wrap'}}>
              {[['#DCFCE7','#86EFAC','#166534','근무'],['#1E1B4B','#6366F1','#C4B5FD','야간'],
                ['#FEF3C7','#FCD34D','#92400E','연차'],['#EDE9FE','#C4B5FD','#5B21B6','반차'],
                ['#DBEAFE','#93C5FD','#1E40AF','오프'],['#FEF2F2','#FECACA','#DC2626','공휴일']].map(([bg,br,c,l])=>(
                <div key={l} style={{display:'flex',alignItems:'center',gap:'5px'}}>
                  <div style={{width:'14px',height:'14px',borderRadius:'3px',background:bg,border:`1.5px solid ${br}`}}></div>
                  <span style={{fontSize:'11px',color:'#64748B',fontWeight:'500'}}>{l}</span>
                </div>
              ))}
              <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                <div style={{width:'14px',height:'14px',borderRadius:'50%',background:'#0EA5E9'}}></div>
                <span style={{fontSize:'11px',color:'#64748B',fontWeight:'500'}}>오늘</span>
              </div>
              <span style={{fontSize:'11px',color:'#EF4444',fontWeight:'500'}}>⚠️=최소인원 미달</span>
            </div>
            {employees.length===0?(
              <div style={{...S.card,padding:'5rem',textAlign:'center'}}>
                <div style={{fontSize:'56px',marginBottom:'16px'}}>👥</div>
                <div style={{color:'#94A3B8',fontSize:'15px',marginBottom:'16px'}}>직원을 먼저 등록해주세요</div>
                <button onClick={()=>setTab('employees')} style={S.btn('primary')}>직원 등록하기</button>
              </div>
            ):(
              <>
                {/* Day-of-week header */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'6px',marginBottom:'6px'}}>
                  {['일','월','화','수','목','금','토'].map((d,i)=>(
                    <div key={d} style={{textAlign:'center',fontSize:'12px',fontWeight:'700',padding:'6px 0',
                      color:i===0?'#DC2626':i===6?'#7C3AED':'#374151',
                      background:i===2||i===4?'#F0F0FF':i===0?'#FFFBEB':'transparent',borderRadius:'6px'}}>
                      {i===2||i===4?'🌙':i===0?'🌞':''}{d}
                    </div>
                  ))}
                </div>
                {/* Calendar grid */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'6px'}}>
                  {leadingEmpties.map((_,i)=>(
                    <div key={`e${i}`} style={{minHeight:'140px',background:'transparent'}}></div>
                  ))}
                  {allDays.map(d=><CalDayCell key={d} d={d}/>)}
                </div>
                {/* Monthly stat summary */}
                <div style={{...S.card,padding:'1.25rem',marginTop:'16px'}}>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'#0F172A',marginBottom:'12px'}}>📊 {month}월 근무 현황 요약</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:'8px'}}>
                    {[
                      {label:'진료일수',value:`${allDays.filter(d=>!HOLIDAYS[dStr(year,month,d)]&&getDow(year,month,d)!==0).length}일`,c:'#0EA5E9',bg:'#EFF6FF'},
                      {label:'공휴일',value:`${Object.keys(HOLIDAYS).filter(k=>k.startsWith(`${year}-${String(month).padStart(2,'0')}`)).length}일`,c:'#DC2626',bg:'#FEF2F2'},
                      {label:'일요일',value:`${allDays.filter(d=>getDow(year,month,d)===0).length}일`,c:'#D97706',bg:'#FEF3C7'},
                      {label:'야간(화/목)',value:`${allDays.filter(d=>{ const dw=getDow(year,month,d); return (dw===2||dw===4)&&!HOLIDAYS[dStr(year,month,d)]; }).length}일`,c:'#4338CA',bg:'#EEF2FF'},
                      {label:'인원부족일',value:`${allDays.filter(d=>isUnderMin(d)||isUnderNight(d)).length}일`,c:'#DC2626',bg:'#FEF2F2'},
                    ].map(item=>(
                      <div key={item.label} style={{background:item.bg,borderRadius:'10px',padding:'12px',textAlign:'center'}}>
                        <div style={{fontSize:'20px',fontWeight:'800',color:item.c}}>{item.value}</div>
                        <div style={{fontSize:'11px',color:'#64748B',marginTop:'3px'}}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        {/* ══ SCHEDULE (GRID) TAB ══════════════════════════════ */}
        {tab==='schedule'&&(
          <div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px',flexWrap:'wrap',gap:'10px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <button onClick={prevMonth} style={{...S.btn('secondary'),padding:'6px 10px'}}>◀</button>
                <span style={{fontWeight:'800',fontSize:'17px',color:'#0F172A',minWidth:'110px',textAlign:'center'}}>{year}년 {month}월</span>
                <button onClick={nextMonth} style={{...S.btn('secondary'),padding:'6px 10px'}}>▶</button>
              </div>
              <div style={{fontSize:'11px',color:'#94A3B8'}}>셀 클릭으로 상태 변경 | 공휴일은 변경 불가</div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px',flexWrap:'wrap'}}>
              {Object.entries(STATUS_META).map(([k,v])=>(
                <div key={k} style={{display:'flex',alignItems:'center',gap:'4px'}}>
                  <div style={{width:'16px',height:'11px',borderRadius:'3px',background:v.bg,border:`1px solid ${v.border}`}}></div>
                  <span style={{fontSize:'11px',color:'#64748B'}}>{k}</span>
                </div>
              ))}
              <span style={{fontSize:'11px',color:'#EF4444'}}>🔴=인원부족</span>
            </div>
            {employees.length===0?(
              <div style={{...S.card,padding:'4rem',textAlign:'center'}}>
                <div style={{fontSize:'48px',marginBottom:'12px'}}>👥</div>
                <div style={{color:'#94A3B8',marginBottom:'12px'}}>직원을 먼저 등록해주세요</div>
                <button onClick={()=>setTab('employees')} style={S.btn('primary')}>직원 등록하기</button>
              </div>
            ):(
              <div style={{...S.card,overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'#F8FAFC',borderBottom:'2px solid #E2E8F0'}}>
                      <th style={{padding:'8px 12px',textAlign:'left',fontSize:'11px',color:'#94A3B8',fontWeight:'600',
                        position:'sticky',left:0,background:'#F8FAFC',borderRight:'2px solid #E2E8F0',zIndex:2,minWidth:'90px'}}>직원</th>
                      {tableCols.map(col=>{
                        if(col.type==='sep') return <th key={col.id} style={{width:'4px',background:'#CBD5E1',padding:0}}></th>;
                        const {d}=col; const dw=getDow(year,month,d); const ds=dStr(year,month,d);
                        const isHol=!!HOLIDAYS[ds]; const isSun=dw===0; const isSat=dw===6; const isNight=dw===2||dw===4;
                        const under=!isHol&&(isUnderMin(d)||isUnderNight(d));
                        const bg=under?'#FEF2F2':isSun?'#FFFBEB':isNight?'#F0F0FF':'transparent';
                        const tc=isHol?'#DC2626':under?'#DC2626':isSun?'#D97706':isSat?'#7C3AED':'#64748B';
                        return (
                          <th key={d} style={{padding:'3px 1px',textAlign:'center',minWidth:'32px',background:bg}}>
                            <div style={{fontSize:'9px',color:tc,fontWeight:'500',lineHeight:1.2}}>{under?'🔴':isSun?'🌞':isNight?'🌙':''}{DOW_KR[dw]}</div>
                            <div style={{fontSize:'12px',fontWeight:'800',color:isToday(d)?'#0EA5E9':tc}}>{d}</div>
                            {isHol&&<div style={{fontSize:'8px',color:'#DC2626',lineHeight:1}}>{HOLIDAYS[ds].slice(0,3)}</div>}
                            {!isHol&&<div style={{fontSize:'8px',color:under?'#DC2626':'#94A3B8',lineHeight:1}}>{getWorkCount(d)}/{minStaff[dw]??0}</div>}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp=>(
                      <tr key={emp.id} style={{borderBottom:'1px solid #F1F5F9'}}>
                        <td style={{padding:'4px 10px',position:'sticky',left:0,background:'#fff',borderRight:'2px solid #E2E8F0',zIndex:1,minWidth:'90px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                            <div style={{width:'24px',height:'24px',borderRadius:'50%',background:emp.color,flexShrink:0,
                              display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',color:'#fff',fontWeight:'700'}}>{emp.name[0]}</div>
                            <div style={{overflow:'hidden'}}>
                              <div style={{fontSize:'11px',fontWeight:'700',color:'#0F172A',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'55px'}}>{emp.name}</div>
                              <div style={{fontSize:'9px',color:'#94A3B8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'55px'}}>{emp.role}</div>
                            </div>
                          </div>
                        </td>
                        {tableCols.map(col=>{
                          if(col.type==='sep') return <td key={col.id} style={{width:'4px',background:'#CBD5E1',padding:0}}></td>;
                          const {d}=col; const ds=dStr(year,month,d);
                          const isHol=!!HOLIDAYS[ds]; const dw=getDow(year,month,d);
                          const isSun=dw===0; const isNight=dw===2||dw===4;
                          const s=isHol?'공휴일':getStatus(emp.id,d);
                          const meta=STATUS_META[s]||STATUS_META['근무'];
                          return (
                            <td key={d} style={{padding:'2px 1px',textAlign:'center',background:isSun?'#FFFEF7':isNight?'#F7F7FF':'#fff'}}>
                              <button onClick={()=>cycleStatus(emp.id,d)}
                                style={{width:'30px',height:'25px',borderRadius:'5px',
                                  border:`1px solid ${isHol?'#FECACA':meta.border}`,
                                  background:isHol?'#FEF2F2':meta.bg,color:isHol?'#DC2626':meta.color,
                                  fontSize:'9px',fontWeight:'700',cursor:isHol?'default':'pointer',lineHeight:1}}>
                                {isHol?'공휴':s==='근무'?'·':s==='야간'?'야간':s}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Summary cards */}
            {employees.length>0&&(
              <div style={{marginTop:'12px',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'8px'}}>
                {employees.map(emp=>{
                  const st={근무:0,야간:0,오프:0,연차:0,일요일:0};
                  allDays.forEach(d=>{ const s=getStatus(emp.id,d); const dw=getDow(year,month,d);
                    if(st[s]!==undefined) st[s]++;
                    if(s==='근무'&&dw===0) st['일요일']++;
                  });
                  return (
                    <div key={emp.id} style={{...S.card,padding:'10px 12px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'8px'}}>
                        <div style={{width:'22px',height:'22px',borderRadius:'50%',background:emp.color,flexShrink:0,
                          display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',color:'#fff',fontWeight:'700'}}>{emp.name[0]}</div>
                        <div>
                          <div style={{fontSize:'12px',fontWeight:'700',color:'#0F172A'}}>{emp.name}</div>
                          <div style={{fontSize:'10px',color:'#94A3B8'}}>{st['근무']+st['야간']}일 근무</div>
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px'}}>
                        {[{k:'근무',bg:'#DCFCE7',c:'#166534'},{k:'야간',bg:'#EEF2FF',c:'#4338CA'},
                          {k:'오프',bg:'#DBEAFE',c:'#1E40AF'},{k:'연차',bg:'#FEF3C7',c:'#92400E'},
                          {k:'일요일',bg:'#FEF3C7',c:'#D97706'}].map(({k,bg,c})=>(
                          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 6px',background:bg,borderRadius:'4px'}}>
                            <span style={{fontSize:'10px',color:c}}>{k}</span>
                            <span style={{fontSize:'11px',fontWeight:'800',color:c}}>{st[k]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {/* ══ EMPLOYEES TAB ══════════════════════════════════ */}
        {tab==='employees'&&(
          <div>
            <div style={{...S.card,padding:'1.25rem',marginBottom:'1rem'}}>
              <div style={{fontSize:'14px',fontWeight:'700',color:'#0F172A',marginBottom:'1rem'}}>👤 직원 추가</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',color:'#64748B',marginBottom:'4px',display:'block',fontWeight:'500'}}>이름 *</label>
                  <input value={newEmp.name} onChange={e=>setNewEmp(p=>({...p,name:e.target.value}))}
                    onKeyDown={e=>e.key==='Enter'&&addEmployee()} placeholder="예: 김수진"
                    style={{width:'100%',padding:'8px 12px',border:'1px solid #E2E8F0',borderRadius:'8px',fontSize:'13px',boxSizing:'border-box',outline:'none'}}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',color:'#64748B',marginBottom:'4px',display:'block',fontWeight:'500'}}>직책</label>
                  <select value={newEmp.role} onChange={e=>setNewEmp(p=>({...p,role:e.target.value}))}
                    style={{width:'100%',padding:'8px 12px',border:'1px solid #E2E8F0',borderRadius:'8px',fontSize:'13px',boxSizing:'border-box',outline:'none',background:'#fff'}}>
                    {ROLES.map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div style={{marginBottom:'14px'}}>
                <label style={{fontSize:'11px',color:'#64748B',marginBottom:'6px',display:'block',fontWeight:'500'}}>월 오프 목표일수</label>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <input type="range" min={2} max={10} value={newEmp.offPerMonth}
                    onChange={e=>setNewEmp(p=>({...p,offPerMonth:+e.target.value}))} style={{flex:1}}/>
                  <span style={{fontSize:'15px',fontWeight:'800',color:'#0EA5E9',minWidth:'30px'}}>{newEmp.offPerMonth}일</span>
                </div>
              </div>
              <button onClick={addEmployee} style={S.btn('primary')}>+ 직원 추가</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {employees.length===0&&<div style={{...S.card,padding:'3rem',textAlign:'center',color:'#94A3B8'}}>등록된 직원이 없습니다</div>}
              {employees.map((emp,idx)=>(
                <div key={emp.id} style={{...S.card,padding:'1rem 1.25rem',display:'flex',alignItems:'center',gap:'14px'}}>
                  <div style={{width:'44px',height:'44px',borderRadius:'50%',background:emp.color,flexShrink:0,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',color:'#fff',fontWeight:'700'}}>{emp.name[0]}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'14px',fontWeight:'700',color:'#0F172A'}}>{emp.name}</div>
                    <div style={{fontSize:'12px',color:'#94A3B8',marginTop:'1px'}}>{emp.role} · 월 {emp.offPerMonth}일 오프 목표</div>
                  </div>
                  <button onClick={()=>setConfirmDel(emp)} style={{...S.btn('danger'),padding:'7px 12px'}}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ══ SETTINGS TAB ══════════════════════════════════ */}
        {tab==='settings'&&(
          <div>
            <div style={{fontSize:'15px',fontWeight:'700',color:'#0F172A',marginBottom:'1rem'}}>⚙️ 근무 기준 설정</div>
            <div style={{...S.card,padding:'1.5rem',marginBottom:'1rem'}}>
              <div style={{fontSize:'14px',fontWeight:'700',color:'#0F172A',marginBottom:'4px'}}>👥 요일별 최소 근무인원</div>
              <div style={{fontSize:'12px',color:'#94A3B8',marginBottom:'14px'}}>해당 요일 최소 근무 인원 수 · 미달 시 캘린더에서 ⚠️ 표시</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:'10px'}}>
                {[0,1,2,3,4,5,6].map(dw=>{
                  const isSun=dw===0; const isSat=dw===6; const isNight=dw===2||dw===4;
                  const bg=isSun?'#FEF3C7':isNight?'#EEF2FF':isSat?'#F5F3FF':'#F8FAFC';
                  const bc=isSun?'#FDE68A':isNight?'#C7D2FE':isSat?'#DDD6FE':'#E2E8F0';
                  const tc=isSun?'#92400E':isNight?'#4338CA':isSat?'#6D28D9':'#374151';
                  return (
                    <div key={dw} style={{background:bg,border:`1px solid ${bc}`,borderRadius:'10px',padding:'12px',textAlign:'center'}}>
                      <div style={{fontSize:'13px',fontWeight:'700',color:tc,marginBottom:'10px'}}>
                        {isSun?'🌞':isNight?'🌙':isSat?'🗓':''} {DOW_KR[dw]}
                      </div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                        <button onClick={()=>setMinStaff(p=>({...p,[dw]:Math.max(0,(p[dw]??0)-1)}))} style={{...S.numBtn,borderColor:bc}}>−</button>
                        <span style={{fontSize:'22px',fontWeight:'800',color:tc,minWidth:'28px'}}>{minStaff[dw]??0}</span>
                        <button onClick={()=>setMinStaff(p=>({...p,[dw]:(p[dw]??0)+1}))} style={{...S.numBtn,borderColor:bc}}>＋</button>
                      </div>
                      <div style={{fontSize:'11px',color:tc,opacity:0.7,marginTop:'6px'}}>최소 {minStaff[dw]??0}명</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{...S.card,padding:'1.5rem',marginBottom:'1rem'}}>
              <div style={{fontSize:'14px',fontWeight:'700',color:'#0F172A',marginBottom:'4px'}}>🌙 야간 최소 인원 (화/목)</div>
              <div style={{fontSize:'12px',color:'#94A3B8',marginBottom:'14px'}}>화요일·목요일 야간근무 최소 인원</div>
              <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                <div style={{background:'#EEF2FF',border:'1px solid #C7D2FE',borderRadius:'10px',padding:'14px 20px',display:'flex',alignItems:'center',gap:'12px'}}>
                  <button onClick={()=>setMinNight(n=>Math.max(1,n-1))} style={{...S.numBtn,width:'32px',height:'32px',fontSize:'18px'}}>−</button>
                  <span style={{fontSize:'28px',fontWeight:'800',color:'#4338CA',minWidth:'36px',textAlign:'center'}}>{minNight}</span>
                  <button onClick={()=>setMinNight(n=>n+1)} style={{...S.numBtn,width:'32px',height:'32px',fontSize:'18px'}}>＋</button>
                </div>
                <span style={{fontSize:'13px',color:'#374151'}}>야간 최소 <b style={{color:'#4338CA'}}>{minNight}명</b></span>
              </div>
            </div>
            <div style={{...S.card,padding:'1.5rem'}}>
              <div style={{fontSize:'14px',fontWeight:'700',color:'#0F172A',marginBottom:'4px'}}>🌞 일요일 순환 근무인원</div>
              <div style={{fontSize:'12px',color:'#94A3B8',marginBottom:'14px'}}>매주 일요일 순환 근무 인원 수</div>
              <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                <div style={{background:'#FEF3C7',border:'1px solid #FDE68A',borderRadius:'10px',padding:'14px 20px',display:'flex',alignItems:'center',gap:'12px'}}>
                  <button onClick={()=>setSundayCount(c=>Math.max(1,c-1))} style={{...S.numBtn,width:'32px',height:'32px',fontSize:'18px'}}>−</button>
                  <span style={{fontSize:'28px',fontWeight:'800',color:'#92400E',minWidth:'36px',textAlign:'center'}}>{sundayCount}</span>
                  <button onClick={()=>setSundayCount(c=>c+1)} style={{...S.numBtn,width:'32px',height:'32px',fontSize:'18px'}}>＋</button>
                </div>
                <span style={{fontSize:'13px',color:'#374151'}}>일요일 <b style={{color:'#92400E'}}>{sundayCount}명</b> 근무</span>
              </div>
            </div>
          </div>
        )}
        {/* ══ FAIRNESS TAB ════════════════════════════════ */}
        {tab==='fairness'&&(
          <div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
              <div style={{fontSize:'15px',fontWeight:'700',color:'#0F172A'}}>📊 공정성 현황</div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <button onClick={prevMonth} style={{...S.btn('secondary'),padding:'5px 10px'}}>◀</button>
                <span style={{fontSize:'13px',fontWeight:'700',color:'#0F172A'}}>{year}년 {month}월</span>
                <button onClick={nextMonth} style={{...S.btn('secondary'),padding:'5px 10px'}}>▶</button>
              </div>
            </div>
            {employees.length===0?(
              <div style={{...S.card,padding:'3rem',textAlign:'center',color:'#94A3B8'}}>직원을 등록해주세요</div>
            ):(()=>{
              const stats=getFairness();
              const avg=key=>(stats.reduce((a,e)=>a+e[key],0)/stats.length).toFixed(1);
              const maxW=Math.max(...stats.map(e=>e.totalWork));
              const minW=Math.min(...stats.map(e=>e.totalWork));
              const diff=maxW-minW;
              const fairLabel=diff<=1?'매우 균등':diff<=3?'균등':'불균등';
              const fairColor=diff<=1?'#059669':diff<=3?'#D97706':'#DC2626';
              return (
                <>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:'10px',marginBottom:'1rem'}}>
                    {[
                      {label:'평균 근무',value:`${avg('totalWork')}일`,bg:'#F0FDF4',c:'#166534'},
                      {label:'평균 야간',value:`${avg('night')}회`,bg:'#EEF2FF',c:'#4338CA'},
                      {label:'평균 오프',value:`${avg('off')}일`,bg:'#DBEAFE',c:'#1E40AF'},
                      {label:'평균 일요일',value:`${avg('sunWork')}회`,bg:'#FEF3C7',c:'#D97706'},
                      {label:'균등도',value:fairLabel,bg:'#F8FAFC',c:fairColor},
                    ].map(card=>(
                      <div key={card.label} style={{background:card.bg,border:'1px solid #E2E8F0',borderRadius:'10px',padding:'14px',textAlign:'center'}}>
                        <div style={{fontSize:'16px',fontWeight:'800',color:card.c,marginBottom:'4px'}}>{card.value}</div>
                        <div style={{fontSize:'11px',color:'#94A3B8'}}>{card.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                    {stats.sort((a,b)=>b.totalWork-a.totalWork).map(emp=>{
                      const workPct=Math.round((emp.totalWork/Math.max(dims,1))*100);
                      const isOver = emp.totalWork > parseFloat(avg('totalWork'))+2;
                      const isUnder = emp.totalWork < parseFloat(avg('totalWork'))-2;
                      return (
                        <div key={emp.id} style={{...S.card,padding:'1.25rem',border:`1px solid ${isOver||isUnder?'#FCA5A5':'#E2E8F0'}`}}>
                          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
                            <div style={{width:'42px',height:'42px',borderRadius:'50%',background:emp.color,flexShrink:0,
                              display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',color:'#fff',fontWeight:'700'}}>{emp.name[0]}</div>
                            <div style={{flex:1}}>
                              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                                <span style={{fontSize:'14px',fontWeight:'700',color:'#0F172A'}}>{emp.name}</span>
                                {isOver&&<span style={{fontSize:'10px',padding:'2px 7px',background:'#FEE2E2',color:'#DC2626',borderRadius:'10px',fontWeight:'600'}}>근무 많음</span>}
                                {isUnder&&<span style={{fontSize:'10px',padding:'2px 7px',background:'#DBEAFE',color:'#1E40AF',borderRadius:'10px',fontWeight:'600'}}>근무 적음</span>}
                              </div>
                              <div style={{fontSize:'12px',color:'#94A3B8'}}>{emp.role}</div>
                            </div>
                            <div style={{textAlign:'right'}}>
                              <div style={{fontSize:'24px',fontWeight:'800',color:'#0EA5E9'}}>{emp.totalWork}<span style={{fontSize:'12px',color:'#94A3B8',fontWeight:'400'}}>일</span></div>
                              <div style={{fontSize:'11px',color:'#94A3B8'}}>총 근무</div>
                            </div>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'6px',marginBottom:'10px'}}>
                            {[{k:'근무',v:emp.work,bg:'#DCFCE7',c:'#166534'},{k:'야간',v:emp.night,bg:'#EEF2FF',c:'#4338CA'},
                              {k:'오프',v:emp.off,bg:'#DBEAFE',c:'#1E40AF'},{k:'연차',v:emp.annual,bg:'#FEF3C7',c:'#92400E'},
                              {k:'일요일',v:emp.sunWork,bg:'#FEF3C7',c:'#D97706'}].map(({k,v,bg,c})=>(
                              <div key={k} style={{background:bg,borderRadius:'8px',padding:'8px 4px',textAlign:'center'}}>
                                <div style={{fontSize:'18px',fontWeight:'800',color:c}}>{v}</div>
                                <div style={{fontSize:'10px',color:'#94A3B8',marginTop:'1px'}}>{k}</div>
                              </div>
                            ))}
                          </div>
                          <div>
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#94A3B8',marginBottom:'4px'}}>
                              <span>근무 비율</span><span style={{fontWeight:'700',color:'#374151'}}>{workPct}%</span>
                            </div>
                            <div style={{height:'7px',background:'#F1F5F9',borderRadius:'99px',overflow:'hidden'}}>
                              <div style={{width:`${workPct}%`,height:'100%',background:`linear-gradient(90deg,${emp.color},${emp.color}99)`,borderRadius:'99px'}}></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
