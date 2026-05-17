import { useState, useEffect } from "react";

const STATUS_LIST = ['근무','야간','오프','연차','반차'];
const STATUS_META = {
  근무: { bg:'#F0FDF4', color:'#166534', border:'#BBF7D0' },
  야간: { bg:'#1E1B4B', color:'#A5B4FC', border:'#6366F1' },
  오프: { bg:'#EFF6FF', color:'#1D4ED8', border:'#BFDBFE' },
  연차: { bg:'#FFFBEB', color:'#92400E', border:'#FDE68A' },
  반차: { bg:'#F5F3FF', color:'#6D28D9', border:'#DDD6FE' },
};
const ROLES = ['총괄실장','데스크 팀장','데스크 코디네이터','진료실 팀장','진료실 치과위생사','치과 기공사','소독실 이모님','파트타임 알바'];
const COLORS = ['#0EA5E9','#10B981','#8B5CF6','#F59E0B','#EF4444','#EC4899','#14B8A6','#F97316'];
const DOW_KR = ['일','월','화','수','목','금','토'];

const HOLIDAYS = {
  '2025-01-01':'신정','2025-01-28':'설','2025-01-29':'설','2025-01-30':'설',
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
function getWeekIdx(y,m,d){
  const firstDow = new Date(y,m-1,1).getDay();
  const offset = firstDow===0?6:firstDow-1;
  return Math.floor((d-1+offset)/7);
}

export default function App() {
  const [tab,setTab]               = useState('schedule');
  const [employees,setEmployees]   = useState([]);
  const [schedule,setSchedule]     = useState({});
  const [sundayCount,setSundayCount]= useState(3);
  const [year,setYear]   = useState(new Date().getFullYear());
  const [month,setMonth] = useState(new Date().getMonth()+1);
  const [newEmp,setNewEmp] = useState({name:'',role:'진료실 치과위생사',preferredOff:[],offPerMonth:4});
  const [loaded,setLoaded]     = useState(false);
  const [toast,setToast]       = useState(null);
  const [confirmDel,setConfirmDel] = useState(null);

  useEffect(()=>{
    (async()=>{
      try {
        const e=await window.storage.get('mc2_employees'); if(e) setEmployees(JSON.parse(e.value));
        const s=await window.storage.get('mc2_schedule');  if(s) setSchedule(JSON.parse(s.value));
        const c=await window.storage.get('mc2_sunCnt');    if(c) setSundayCount(JSON.parse(c.value));
      }catch(_){}
      setLoaded(true);
    })();
  },[]);
  useEffect(()=>{ if(loaded) window.storage.set('mc2_employees',JSON.stringify(employees)).catch(()=>{}); },[employees,loaded]);
  useEffect(()=>{ if(loaded) window.storage.set('mc2_schedule', JSON.stringify(schedule)).catch(()=>{});  },[schedule,loaded]);
  useEffect(()=>{ if(loaded) window.storage.set('mc2_sunCnt',  JSON.stringify(sundayCount)).catch(()=>{}); },[sundayCount,loaded]);

  const showToast=(msg,type='success')=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2800); };

  const dims    = daysInMonth(year,month);
  const allDays = Array.from({length:dims},(_,i)=>i+1);

  // Group into Mon-Sun weeks
  const weekMap={};
  allDays.forEach(d=>{ const wi=getWeekIdx(year,month,d); if(!weekMap[wi])weekMap[wi]=[]; weekMap[wi].push(d); });
  const weeks=Object.values(weekMap);

  // Flat column list with separators after Sunday
  const tableCols = allDays.flatMap(d=>{
    const dw=getDow(year,month,d);
    const cells=[{type:'day',d}];
    if(dw===0&&d<dims) cells.push({type:'sep',id:`s${d}`});
    return cells;
  });

  const getStatus=(id,d)=> schedule[id]?.[dStr(year,month,d)]||'근무';

  const cycleStatus=(id,d)=>{
    const ds=dStr(year,month,d);
    if(HOLIDAYS[ds]) return;
    const cur=getStatus(id,d);
    const next=STATUS_LIST[(STATUS_LIST.indexOf(cur)+1)%STATUS_LIST.length];
    setSchedule(p=>({...p,[id]:{...(p[id]||{}),[ds]:next}}));
  };

  // ── AUTO DISTRIBUTE ──────────────────────────────────────────
  const autoDistribute=()=>{
    if(!employees.length){ showToast('직원을 먼저 등록해주세요','error'); return; }
    const upd={};
    employees.forEach(e=>{ upd[e.id]={}; });
    // Preserve 연차/반차
    employees.forEach(e=>{
      allDays.forEach(d=>{
        const ds=dStr(year,month,d);
        const cur=schedule[e.id]?.[ds];
        if(cur==='연차'||cur==='반차') upd[e.id][ds]=cur;
      });
    });

    const sunCnt={};
    employees.forEach(e=>{ sunCnt[e.id]=0; });

    weeks.forEach((weekDays,wIdx)=>{
      const sunDays    = weekDays.filter(d=>getDow(year,month,d)===0);
      const monSatDays = weekDays.filter(d=>getDow(year,month,d)!==0);
      const tuThDays   = monSatDays.filter(d=>{ const dw=getDow(year,month,d); return (dw===2||dw===4)&&!HOLIDAYS[dStr(year,month,d)]; });

      // ① 일요일 순환 배정
      const sundayWorkers=new Set();
      if(sunDays.length>0){
        const sun=sunDays[0];
        const ds=dStr(year,month,sun);
        if(!HOLIDAYS[ds]){
          const cnt=Math.min(sundayCount,employees.length);
          const sorted=[...employees].sort((a,b)=>{
            const d=sunCnt[a.id]-sunCnt[b.id];
            if(d!==0) return d;
            return (a.preferredOff.includes(0)?1:0)-(b.preferredOff.includes(0)?1:0);
          });
          for(let i=0;i<cnt;i++){ sundayWorkers.add(sorted[i].id); sunCnt[sorted[i].id]++; }
          employees.forEach(e=>{
            if(!upd[e.id][ds]) upd[e.id][ds]=sundayWorkers.has(e.id)?'근무':'오프';
          });
        }
      }

      // ② 야간근무 배정 (화/목 중 1회, 직원·주 순환)
      employees.forEach((emp,eIdx)=>{
        if(!tuThDays.length) return;
        const nightDay=tuThDays[(wIdx+eIdx)%tuThDays.length];
        const ds=dStr(year,month,nightDay);
        if(!upd[emp.id][ds]) upd[emp.id][ds]='야간';
      });

      // ③ 주중 오프 배정
      //   일요일 근무자 → 주중 오프 2일 (주5일 유지)
      //   일요일 비근무자 → 주중 오프 1일
      employees.forEach(emp=>{
        const offsNeeded=sundayWorkers.has(emp.id)?2:1;
        const available=monSatDays.filter(d=>{ const ds=dStr(year,month,d); return !upd[emp.id][ds]&&!HOLIDAYS[ds]; });
        const sorted=[...available].sort((a,b)=>{
          const aP=emp.preferredOff.includes(getDow(year,month,a))?-1:1;
          const bP=emp.preferredOff.includes(getDow(year,month,b))?-1:1;
          return aP-bP;
        });
        sorted.slice(0,offsNeeded).forEach(d=>{ upd[emp.id][dStr(year,month,d)]='오프'; });
        monSatDays.forEach(d=>{ const ds=dStr(year,month,d); if(!upd[emp.id][ds]&&!HOLIDAYS[ds]) upd[emp.id][ds]='근무'; });
      });
    });

    setSchedule(upd);
    showToast('✓ 자동 배분 완료! (일요일·야간 포함)');
  };

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
    setConfirmDel(null); showToast('직원 삭제 완료');
  };

  const getFairness=()=>employees.map(e=>{
    let work=0,night=0,off=0,annual=0,half=0,satOff=0,sunWork=0;
    allDays.forEach(d=>{
      const s=getStatus(e.id,d); const dw=getDow(year,month,d);
      if(s==='근무'){work++;if(dw===0)sunWork++;}
      else if(s==='야간') night++;
      else if(s==='오프'){off++;if(dw===6)satOff++;}
      else if(s==='연차') annual++;
      else if(s==='반차') half++;
    });
    return {...e,work,night,off,annual,half,satOff,sunWork,restDays:off+annual};
  });

  const prevMonth=()=>{ if(month===1){setMonth(12);setYear(y=>y-1)}else setMonth(m=>m-1); };
  const nextMonth=()=>{ if(month===12){setMonth(1);setYear(y=>y+1)}else setMonth(m=>m+1); };

  const S={
    wrap:{fontFamily:"'Noto Sans KR',system-ui,sans-serif",minHeight:'100vh',background:'#F1F5F9'},
    header:{background:'#fff',borderBottom:'1px solid #E2E8F0',padding:'0 1.25rem',position:'sticky',top:0,zIndex:50},
    hInner:{display:'flex',alignItems:'center',justifyContent:'space-between',height:'54px',gap:'8px'},
    logoBadge:{width:'30px',height:'30px',background:'#0EA5E9',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center'},
    tabs:{display:'flex',gap:'2px',background:'#F1F5F9',padding:'4px',borderRadius:'8px'},
    tab:(a)=>({padding:'5px 14px',borderRadius:'6px',border:'none',cursor:'pointer',fontSize:'12px',
      fontWeight:a?'600':'400',background:a?'#fff':'transparent',color:a?'#0EA5E9':'#64748B',
      boxShadow:a?'0 1px 3px rgba(0,0,0,0.08)':'none',transition:'all 0.15s',whiteSpace:'nowrap'}),
    body:{padding:'1.25rem',maxWidth:'1200px',margin:'0 auto'},
    card:{background:'#fff',borderRadius:'12px',border:'1px solid #E2E8F0',overflow:'hidden'},
    btn:(v='primary')=>({
      padding:'8px 16px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'13px',fontWeight:'500',
      display:'inline-flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap',
      ...(v==='primary'?{background:'#0EA5E9',color:'#fff'}:
         v==='danger'?{background:'#FEF2F2',color:'#DC2626',border:'1px solid #FECACA'}:
         {background:'#F8FAFC',color:'#374151',border:'1px solid #E2E8F0'})
    }),
  };

  if(!loaded) return <div style={{padding:'2rem',color:'#64748B'}}>불러오는 중...</div>;

  return (
    <div style={S.wrap}>
      {toast&&(
        <div style={{position:'fixed',top:'16px',left:'50%',transform:'translateX(-50%)',zIndex:100,
          background:toast.type==='error'?'#DC2626':'#0F766E',color:'#fff',
          padding:'10px 20px',borderRadius:'24px',fontSize:'13px',fontWeight:'500',
          boxShadow:'0 4px 16px rgba(0,0,0,0.2)',whiteSpace:'nowrap'}}>
          {toast.msg}
        </div>
      )}

      {confirmDel&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:90,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:'16px',padding:'1.5rem',width:'290px',textAlign:'center',boxShadow:'0 20px 40px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:'28px',marginBottom:'8px'}}>🗑️</div>
            <div style={{fontSize:'15px',fontWeight:'700',marginBottom:'6px',color:'#0F172A'}}>직원 삭제</div>
            <div style={{fontSize:'13px',color:'#64748B',marginBottom:'1.25rem',lineHeight:1.6}}>
              <b style={{color:'#0F172A'}}>{confirmDel.name}</b>을(를) 삭제하면<br/>해당 근무 데이터도 모두 삭제됩니다.
            </div>
            <div style={{display:'flex',gap:'8px',justifyContent:'center'}}>
              <button onClick={()=>setConfirmDel(null)} style={S.btn('secondary')}>취소</button>
              <button onClick={()=>removeEmployee(confirmDel.id)} style={S.btn('danger')}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div style={S.hInner}>
          <div style={{display:'flex',alignItems:'center',gap:'9px',flexShrink:0}}>
            <div style={S.logoBadge}><i className="ti ti-stethoscope" style={{color:'#fff',fontSize:'14px'}}></i></div>
            <span style={{fontWeight:'700',fontSize:'14px',color:'#0F172A',whiteSpace:'nowrap'}}>맑은플란트 근무표</span>
          </div>
          <div style={S.tabs}>
            {[['schedule','📅 근무표'],['employees','👥 직원'],['fairness','📊 공정성']].map(([t,l])=>(
              <button key={t} onClick={()=>setTab(t)} style={S.tab(tab===t)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={S.body}>

        {/* ══════════ SCHEDULE TAB ══════════ */}
        {tab==='schedule'&&(
          <div>
            {/* Controls */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px',flexWrap:'wrap',gap:'10px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <button onClick={prevMonth} style={{...S.btn('secondary'),padding:'6px 10px'}}>
                  <i className="ti ti-chevron-left" style={{fontSize:'14px'}}></i>
                </button>
                <span style={{fontWeight:'700',fontSize:'17px',color:'#0F172A',minWidth:'110px',textAlign:'center'}}>{year}년 {month}월</span>
                <button onClick={nextMonth} style={{...S.btn('secondary'),padding:'6px 10px'}}>
                  <i className="ti ti-chevron-right" style={{fontSize:'14px'}}></i>
                </button>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                {/* Sunday count */}
                <div style={{display:'flex',alignItems:'center',gap:'8px',background:'#FEF3C7',border:'1px solid #FDE68A',borderRadius:'8px',padding:'6px 12px'}}>
                  <span style={{fontSize:'11px',color:'#92400E',fontWeight:'600'}}>🌞 일요일 근무인원</span>
                  <button onClick={()=>setSundayCount(c=>Math.max(1,c-1))}
                    style={{width:'22px',height:'22px',borderRadius:'50%',border:'1px solid #FDE68A',background:'#fff',cursor:'pointer',fontSize:'15px',lineHeight:1,color:'#92400E',fontWeight:'700',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                  <span style={{fontSize:'15px',fontWeight:'800',color:'#92400E',minWidth:'18px',textAlign:'center'}}>{sundayCount}</span>
                  <button onClick={()=>setSundayCount(c=>Math.min(employees.length||10,c+1))}
                    style={{width:'22px',height:'22px',borderRadius:'50%',border:'1px solid #FDE68A',background:'#fff',cursor:'pointer',fontSize:'15px',lineHeight:1,color:'#92400E',fontWeight:'700',display:'flex',alignItems:'center',justifyContent:'center'}}>＋</button>
                  <span style={{fontSize:'11px',color:'#92400E'}}>명</span>
                </div>
                <button onClick={autoDistribute} style={S.btn('primary')}>
                  <i className="ti ti-wand" style={{fontSize:'14px'}}></i>자동 배분
                </button>
              </div>
            </div>

            {/* Rule badges */}
            <div style={{display:'flex',gap:'6px',marginBottom:'10px',flexWrap:'wrap'}}>
              {[
                {t:'🌞 일요일 순환 근무',bg:'#FEF3C7',c:'#92400E'},
                {t:'🌙 야간 화/목 1회',bg:'#EEF2FF',c:'#4338CA'},
                {t:'📋 주5일 근무 기준',bg:'#F0FDF4',c:'#166534'},
                {t:'🔄 일요일 근무 시 주중 오프 2일',bg:'#F5F3FF',c:'#6D28D9'},
              ].map(b=>(
                <span key={b.t} style={{fontSize:'11px',padding:'4px 10px',background:b.bg,color:b.c,borderRadius:'20px',fontWeight:'500'}}>{b.t}</span>
              ))}
            </div>

            {employees.length===0?(
              <div style={{...S.card,padding:'4rem',textAlign:'center'}}>
                <i className="ti ti-users" style={{fontSize:'48px',color:'#CBD5E1',marginBottom:'12px',display:'block'}}></i>
                <div style={{color:'#94A3B8',marginBottom:'12px'}}>직원을 먼저 등록해주세요</div>
                <button onClick={()=>setTab('employees')} style={S.btn('primary')}>직원 등록하기</button>
              </div>
            ):(
              <>
                {/* Legend */}
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px',flexWrap:'wrap'}}>
                  {Object.entries(STATUS_META).map(([k,v])=>(
                    <div key={k} style={{display:'flex',alignItems:'center',gap:'4px'}}>
                      <div style={{width:'18px',height:'12px',borderRadius:'3px',background:v.bg,border:`1px solid ${v.border}`}}></div>
                      <span style={{fontSize:'11px',color:'#64748B'}}>{k}</span>
                    </div>
                  ))}
                  <span style={{fontSize:'11px',color:'#94A3B8'}}>| 셀 클릭으로 수동 변경 가능</span>
                </div>

                {/* Table */}
                <div style={{...S.card,overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{background:'#F8FAFC',borderBottom:'2px solid #E2E8F0'}}>
                        <th style={{padding:'8px 12px',textAlign:'left',fontSize:'11px',color:'#94A3B8',fontWeight:'600',
                          position:'sticky',left:0,background:'#F8FAFC',borderRight:'2px solid #E2E8F0',zIndex:2,minWidth:'90px'}}>직원</th>
                        {tableCols.map(col=>{
                          if(col.type==='sep') return <th key={col.id} style={{width:'5px',background:'#CBD5E1',padding:0}}></th>;
                          const {d}=col;
                          const dw=getDow(year,month,d);
                          const ds=dStr(year,month,d);
                          const isHol=!!HOLIDAYS[ds];
                          const isSun=dw===0; const isSat=dw===6; const isNight=dw===2||dw===4;
                          const bg=isSun?'#FFFBEB':isNight?'#F0F0FF':'transparent';
                          const tc=isHol?'#DC2626':isSun?'#D97706':isSat?'#7C3AED':'#64748B';
                          return (
                            <th key={d} style={{padding:'3px 1px',textAlign:'center',minWidth:'34px',background:bg}}>
                              <div style={{fontSize:'9px',color:tc,fontWeight:'500',lineHeight:1.3}}>{isSun?'🌞':isNight?'🌙':''}{DOW_KR[dw]}</div>
                              <div style={{fontSize:'12px',fontWeight:'800',color:tc}}>{d}</div>
                              {isHol&&<div style={{fontSize:'8px',color:'#DC2626',lineHeight:1}}>{HOLIDAYS[ds].slice(0,3)}</div>}
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
                                display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',color:'#fff',fontWeight:'700'}}>
                                {emp.name[0]}
                              </div>
                              <div style={{overflow:'hidden'}}>
                                <div style={{fontSize:'12px',fontWeight:'700',color:'#0F172A',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'58px'}}>{emp.name}</div>
                                <div style={{fontSize:'9px',color:'#94A3B8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'58px'}}>{emp.role}</div>
                              </div>
                            </div>
                          </td>
                          {tableCols.map(col=>{
                            if(col.type==='sep') return <td key={col.id} style={{width:'5px',background:'#CBD5E1',padding:0}}></td>;
                            const {d}=col;
                            const ds=dStr(year,month,d);
                            const isHol=!!HOLIDAYS[ds];
                            const dw=getDow(year,month,d);
                            const isSun=dw===0; const isNight=dw===2||dw===4;
                            const s=isHol?'공휴일':getStatus(emp.id,d);
                            const meta=STATUS_META[s]||STATUS_META['근무'];
                            const cellBg=isSun?'#FFFEF7':isNight?'#F7F7FF':'#fff';
                            return (
                              <td key={d} style={{padding:'2px 1px',textAlign:'center',background:cellBg}}>
                                <button onClick={()=>cycleStatus(emp.id,d)} title={isHol?HOLIDAYS[ds]:s}
                                  style={{width:'32px',height:'26px',borderRadius:'5px',
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

                {/* Monthly summary cards */}
                <div style={{marginTop:'1rem',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:'8px'}}>
                  {employees.map(emp=>{
                    const st={근무:0,야간:0,오프:0,연차:0,일요일:0};
                    allDays.forEach(d=>{ const s=getStatus(emp.id,d); const dw=getDow(year,month,d);
                      if(st[s]!==undefined) st[s]++;
                      if(s==='근무'&&dw===0) st['일요일']++;
                    });
                    return (
                      <div key={emp.id} style={{background:'#fff',border:'1px solid #E2E8F0',borderRadius:'10px',padding:'10px 12px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'8px'}}>
                          <div style={{width:'22px',height:'22px',borderRadius:'50%',background:emp.color,flexShrink:0,
                            display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',color:'#fff',fontWeight:'700'}}>{emp.name[0]}</div>
                          <div>
                            <div style={{fontSize:'12px',fontWeight:'700',color:'#0F172A'}}>{emp.name}</div>
                            <div style={{fontSize:'10px',color:'#94A3B8'}}>총 {st['근무']+st['야간']}일 근무</div>
                          </div>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px'}}>
                          {[{k:'근무',bg:'#F0FDF4',c:'#166534'},{k:'야간',bg:'#EEF2FF',c:'#4338CA'},
                            {k:'오프',bg:'#EFF6FF',c:'#1D4ED8'},{k:'연차',bg:'#FFFBEB',c:'#92400E'},
                            {k:'일요일',bg:'#FEF3C7',c:'#D97706'}].map(({k,bg,c})=>(
                            <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                              padding:'3px 6px',background:bg,borderRadius:'4px'}}>
                              <span style={{fontSize:'10px',color:c}}>{k}</span>
                              <span style={{fontSize:'11px',fontWeight:'800',color:c}}>{st[k]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════ EMPLOYEES TAB ══════════ */}
        {tab==='employees'&&(
          <div>
            <div style={{...S.card,padding:'1.25rem',marginBottom:'1rem'}}>
              <div style={{fontSize:'14px',fontWeight:'700',color:'#0F172A',marginBottom:'1rem'}}>
                <i className="ti ti-user-plus" style={{marginRight:'6px',color:'#0EA5E9'}}></i>직원 추가
              </div>
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
              <div style={{marginBottom:'10px'}}>
                <label style={{fontSize:'11px',color:'#64748B',marginBottom:'6px',display:'block',fontWeight:'500'}}>월 오프 목표일수</label>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <input type="range" min={2} max={10} value={newEmp.offPerMonth}
                    onChange={e=>setNewEmp(p=>({...p,offPerMonth:+e.target.value}))} style={{flex:1}}/>
                  <span style={{fontSize:'15px',fontWeight:'800',color:'#0EA5E9',minWidth:'30px'}}>{newEmp.offPerMonth}일</span>
                </div>
              </div>
              <div style={{marginBottom:'14px'}}>
                <label style={{fontSize:'11px',color:'#64748B',marginBottom:'6px',display:'block',fontWeight:'500'}}>
                  희망 오프 요일 <span style={{color:'#94A3B8'}}>(복수 선택)</span>
                </label>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  {['일🌞','월','화🌙','수','목🌙','금','토'].map((label,i)=>{
                    const sel=newEmp.preferredOff.includes(i);
                    return (
                      <button key={i}
                        onClick={()=>setNewEmp(p=>({...p,preferredOff:sel?p.preferredOff.filter(x=>x!==i):[...p.preferredOff,i]}))}
                        style={{minWidth:'42px',height:'40px',borderRadius:'8px',
                          border:`2px solid ${sel?'#0EA5E9':'#E2E8F0'}`,
                          background:sel?'#EFF6FF':'#fff',color:sel?'#0EA5E9':'#94A3B8',
                          fontSize:'11px',fontWeight:sel?'700':'400',cursor:'pointer',transition:'all 0.15s',padding:'0 6px'}}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div style={{fontSize:'11px',color:'#94A3B8',marginTop:'4px'}}>🌙=야간근무일(화/목) · 🌞=일요일</div>
              </div>
              <button onClick={addEmployee} style={S.btn('primary')}>
                <i className="ti ti-plus" style={{fontSize:'14px'}}></i>직원 추가
              </button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {employees.length===0&&(
                <div style={{...S.card,padding:'3rem',textAlign:'center',color:'#94A3B8',fontSize:'14px'}}>등록된 직원이 없습니다</div>
              )}
              {employees.map(emp=>(
                <div key={emp.id} style={{...S.card,padding:'1rem 1.25rem',display:'flex',alignItems:'center',gap:'14px'}}>
                  <div style={{width:'44px',height:'44px',borderRadius:'50%',background:emp.color,flexShrink:0,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',color:'#fff',fontWeight:'700'}}>{emp.name[0]}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'14px',fontWeight:'700',color:'#0F172A'}}>{emp.name}</div>
                    <div style={{fontSize:'12px',color:'#94A3B8',marginTop:'1px'}}>{emp.role} · 월 {emp.offPerMonth}일 오프 목표</div>
                    {emp.preferredOff.length>0&&(
                      <div style={{display:'flex',gap:'4px',marginTop:'6px',flexWrap:'wrap'}}>
                        {emp.preferredOff.map(d=>(
                          <span key={d} style={{fontSize:'11px',padding:'2px 9px',background:'#EFF6FF',color:'#1D4ED8',borderRadius:'20px',fontWeight:'500'}}>
                            {['일🌞','월','화🌙','수','목🌙','금','토'][d]} 희망
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={()=>setConfirmDel(emp)} style={{...S.btn('danger'),padding:'7px 12px'}}>
                    <i className="ti ti-trash" style={{fontSize:'13px'}}></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════ FAIRNESS TAB ══════════ */}
        {tab==='fairness'&&(
          <div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
              <div style={{fontSize:'15px',fontWeight:'700',color:'#0F172A'}}>공정성 현황</div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <button onClick={prevMonth} style={{...S.btn('secondary'),padding:'5px 10px'}}><i className="ti ti-chevron-left" style={{fontSize:'13px'}}></i></button>
                <span style={{fontSize:'13px',fontWeight:'600',color:'#475569'}}>{year}년 {month}월</span>
                <button onClick={nextMonth} style={{...S.btn('secondary'),padding:'5px 10px'}}><i className="ti ti-chevron-right" style={{fontSize:'13px'}}></i></button>
              </div>
            </div>
            {employees.length===0?(
              <div style={{...S.card,padding:'3rem',textAlign:'center',color:'#94A3B8'}}>직원을 등록해주세요</div>
            ):(()=>{
              const stats=getFairness();
              const avg=key=>(stats.reduce((a,e)=>a+e[key],0)/stats.length).toFixed(1);
              const maxOff=Math.max(...stats.map(e=>e.off));
              const minOff=Math.min(...stats.map(e=>e.off));
              const diff=maxOff-minOff;
              const fairLabel=diff<=1?'매우 균등':diff<=2?'균등':'불균등';
              const fairColor=diff<=1?'#059669':diff<=2?'#D97706':'#DC2626';
              return (
                <>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:'10px',marginBottom:'1rem'}}>
                    {[
                      {label:'평균 오프',value:`${avg('off')}일`,icon:'ti-calendar-off',c:'#1D4ED8'},
                      {label:'평균 야간',value:`${avg('night')}회`,icon:'ti-moon',c:'#4338CA'},
                      {label:'평균 일요일',value:`${avg('sunWork')}회`,icon:'ti-sun',c:'#D97706'},
                      {label:'균등도',value:fairLabel,icon:'ti-scale',c:fairColor},
                    ].map(card=>(
                      <div key={card.label} style={{background:'#fff',border:'1px solid #E2E8F0',borderRadius:'10px',padding:'14px',textAlign:'center'}}>
                        <i className={`ti ${card.icon}`} style={{fontSize:'20px',color:'#CBD5E1',marginBottom:'6px',display:'block'}}></i>
                        <div style={{fontSize:'16px',fontWeight:'800',color:card.c}}>{card.value}</div>
                        <div style={{fontSize:'11px',color:'#94A3B8',marginTop:'2px'}}>{card.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                    {stats.sort((a,b)=>b.sunWork-a.sunWork).map(emp=>{
                      const workPct=Math.round(((emp.work+emp.night)/Math.max(allDays.length,1))*100);
                      return (
                        <div key={emp.id} style={{...S.card,padding:'1.25rem'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
                            <div style={{width:'40px',height:'40px',borderRadius:'50%',background:emp.color,flexShrink:0,
                              display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',color:'#fff',fontWeight:'700'}}>{emp.name[0]}</div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:'14px',fontWeight:'700',color:'#0F172A'}}>{emp.name}</div>
                              <div style={{fontSize:'12px',color:'#94A3B8'}}>{emp.role}</div>
                            </div>
                            <div style={{textAlign:'right'}}>
                              <div style={{fontSize:'22px',fontWeight:'800',color:'#0EA5E9'}}>{emp.restDays}<span style={{fontSize:'12px',color:'#94A3B8',fontWeight:'400'}}>일</span></div>
                              <div style={{fontSize:'11px',color:'#94A3B8'}}>총 휴무</div>
                            </div>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'6px',marginBottom:'10px'}}>
                            {[{k:'근무',v:emp.work,bg:'#F0FDF4',c:'#166534'},{k:'야간',v:emp.night,bg:'#EEF2FF',c:'#4338CA'},
                              {k:'오프',v:emp.off,bg:'#EFF6FF',c:'#1D4ED8'},{k:'연차',v:emp.annual,bg:'#FFFBEB',c:'#92400E'},
                              {k:'일요일',v:emp.sunWork,bg:'#FEF3C7',c:'#D97706'}].map(({k,v,bg,c})=>(
                              <div key={k} style={{background:bg,borderRadius:'8px',padding:'8px 4px',textAlign:'center'}}>
                                <div style={{fontSize:'18px',fontWeight:'800',color:c}}>{v}</div>
                                <div style={{fontSize:'10px',color:'#94A3B8',marginTop:'1px'}}>{k}</div>
                              </div>
                            ))}
                          </div>
                          <div>
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#94A3B8',marginBottom:'4px'}}>
                              <span>근무 비율 (근무+야간)</span>
                              <span style={{fontWeight:'600',color:'#475569'}}>{workPct}%</span>
                            </div>
                            <div style={{height:'6px',background:'#F1F5F9',borderRadius:'99px',overflow:'hidden'}}>
                              <div style={{width:`${workPct}%`,height:'100%',background:emp.color,borderRadius:'99px',transition:'width 0.6s ease'}}></div>
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
