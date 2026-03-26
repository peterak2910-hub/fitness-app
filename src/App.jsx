import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from './supabase'

// ── Theme ─────────────────────────────────────────────────────
const T = {
  bg:'#0a0a0a',surface:'#111',card:'#161616',border:'#222',
  text:'#f0f0f0',sub:'#666',dim:'#333',
  danger:'#ff3b30',success:'#30d158',warning:'#ffd60a',
}

const GROUP_COLORS=['#2563eb','#8b5cf6','#ef4444','#059669','#f97316','#ec4899','#06b6d4','#eab308','#6366f1','#14b8a6']
const GROUP_ICONS=['🏋️','🏃','🥗','💪','🔥','⚡','🎯','🥊','🧘','🚴','🏊','⛹️']
const TEXT_COLORS=['#ffffff','#000000','#ef4444','#3b82f6','#22c55e','#f59e0b','#ec4899','#a855f7']
const CAM_FILTERS=[
  {name:'None',css:'none',label:'○'},
  {name:'Gains',css:'contrast(1.4) saturate(1.6) brightness(1.05) sepia(0.2)',label:'💪'},
  {name:'Beast',css:'contrast(1.8) brightness(0.85) saturate(1.3) grayscale(0.2)',label:'⚡'},
  {name:'Warm',css:'sepia(0.4) saturate(1.3) brightness(1.05)',label:'🌅'},
  {name:'B&W',css:'grayscale(1) contrast(1.2)',label:'🖤'},
  {name:'Vivid',css:'saturate(2) contrast(1.1)',label:'🌈'},
  {name:'Drama',css:'contrast(1.3) brightness(0.9) saturate(1.4)',label:'🎬'},
]
const BADGE_META={
  first_post:{icon:'🌟',label:'First Post'},
  streak_7:{icon:'🔥',label:'Week Streak'},
  streak_30:{icon:'💎',label:'Month Streak'},
  hit_goal:{icon:'🎯',label:'Goal Hit'},
  won_challenge:{icon:'🏆',label:'Challenge Won'},
  mvp:{icon:'👑',label:'MVP'},
}

// ── Helpers ───────────────────────────────────────────────────
function ago(ts){const d=(Date.now()-new Date(ts))/1000;if(d<60)return'now';if(d<3600)return`${Math.floor(d/60)}m`;if(d<86400)return`${Math.floor(d/3600)}h`;return`${Math.floor(d/86400)}d`}
function initials(str){return(str||'?').slice(0,2).toUpperCase()}
function today(){return new Date().toISOString().slice(0,10)}
function currentWeek(){const d=new Date();const w=Math.ceil(((d-new Date(d.getFullYear(),0,1))/86400000+1)/7);return`${d.getFullYear()}-W${w}`}
function isExpired(p){if(!p.is_expiring||!p.expires_at)return false;return new Date(p.expires_at)<new Date()}
function timeLeft(ea){const diff=new Date(ea)-new Date();if(diff<=0)return'Expired';const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000);return h>0?`${h}h ${m}m`:`${m}m`}
function groupAccent(g){return g?.color||GROUP_COLORS[0]}

// ── Shared UI ─────────────────────────────────────────────────
function Avatar({url,name,size=36,color}){
  return(
    <div style={{width:size,height:size,borderRadius:'50%',background:color||'#222',border:'1.5px solid #2a2a2a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.34,flexShrink:0,overflow:'hidden',color:'#fff',fontWeight:700}}>
      {url?<img src={url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:initials(name)}
    </div>
  )
}
function Spinner(){return<div style={{textAlign:'center',padding:40,color:T.sub,fontSize:12}}>Loading…</div>}
function NotifDot({n}){if(!n)return null;return<div style={{background:T.danger,color:'#fff',borderRadius:'50%',fontSize:9,fontWeight:700,width:15,height:15,display:'flex',alignItems:'center',justifyContent:'center',position:'absolute',top:-3,right:-3}}>{n>9?'9+':n}</div>}

const ss={
  page:{minHeight:'100vh',background:T.bg,color:T.text,fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif'},
  topBar:{background:'rgba(10,10,10,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid #1a1a1a',padding:'12px 16px',display:'flex',alignItems:'center',gap:10,position:'sticky',top:0,zIndex:20},
  nav:{position:'fixed',bottom:0,left:0,right:0,height:60,background:'rgba(10,10,10,0.98)',backdropFilter:'blur(20px)',borderTop:'1px solid #1a1a1a',display:'flex',alignItems:'center',justifyContent:'space-around',zIndex:20},
  input:{width:'100%',padding:'10px 14px',background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:22,color:T.text,fontSize:14,outline:'none'},
  pill:(on,color)=>({padding:'5px 12px',borderRadius:20,border:`1px solid ${on?(color||'#2563eb'):'#2a2a2a'}`,background:on?`${color||'#2563eb'}22`:'transparent',color:on?(color||'#5b9cf6'):'#555',fontSize:12,cursor:'pointer',fontWeight:on?600:400,whiteSpace:'nowrap'}),
  btn:(v,color)=>({padding:'9px 18px',borderRadius:22,border:'none',cursor:'pointer',fontWeight:600,fontSize:13,
    background:v==='danger'?T.danger:v==='ghost'?'#1a1a1a':v==='success'?T.success:color||'#2563eb',color:'#fff'}),
  card:{background:T.card,border:'1px solid #1e1e1e',borderRadius:14,padding:14,marginBottom:8},
  row:{display:'flex',alignItems:'center',gap:8},
}

function Toggle({value,onChange,color='#2563eb'}){
  return(
    <button onClick={()=>onChange(!value)} style={{width:42,height:24,borderRadius:12,background:value?color:'#222',border:'none',cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0}}>
      <div style={{position:'absolute',top:3,left:value?21:3,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left .2s'}}/>
    </button>
  )
}

// ── Camera ────────────────────────────────────────────────────
function CameraScreen({onCapture,onClose}){
  const videoRef=useRef(),canvasRef=useRef()
  const [facing,setFacing]=useState('user'),[stream,setStream]=useState(null),[filterIdx,setFilterIdx]=useState(0)

  const startCam=useCallback(async(f)=>{
    if(stream)stream.getTracks().forEach(t=>t.stop())
    try{
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:f},audio:false})
      setStream(s);if(videoRef.current)videoRef.current.srcObject=s
    }catch(e){alert('Camera error: '+e.message)}
  },[])

  useEffect(()=>{startCam(facing);return()=>stream?.getTracks().forEach(t=>t.stop())},[facing])

  function capture(){
    const v=videoRef.current,c=canvasRef.current;if(!v||!c)return
    c.width=v.videoWidth;c.height=v.videoHeight
    const ctx=c.getContext('2d')
    if(facing==='user'){ctx.translate(c.width,0);ctx.scale(-1,1)}
    ctx.filter=CAM_FILTERS[filterIdx].css;ctx.drawImage(v,0,0)
    c.toBlob(blob=>{stream?.getTracks().forEach(t=>t.stop());onCapture(blob,CAM_FILTERS[filterIdx].name)},'image/jpeg',0.92)
  }

  return(
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:100,display:'flex',flexDirection:'column'}}>
      <video ref={videoRef} autoPlay playsInline muted style={{flex:1,objectFit:'cover',width:'100%',filter:CAM_FILTERS[filterIdx].css,transform:facing==='user'?'scaleX(-1)':'none'}}/>
      <canvas ref={canvasRef} style={{display:'none'}}/>
      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'space-between',padding:'16px 20px'}}>
        <button onClick={onClose} style={{background:'rgba(0,0,0,.6)',border:'none',color:'#fff',borderRadius:'50%',width:36,height:36,fontSize:16,cursor:'pointer'}}>✕</button>
        <button onClick={()=>setFacing(f=>f==='user'?'environment':'user')} style={{background:'rgba(0,0,0,.6)',border:'none',color:'#fff',borderRadius:'50%',width:36,height:36,fontSize:18,cursor:'pointer'}}>🔄</button>
      </div>
      <div style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',gap:8}}>
        {CAM_FILTERS.map((f,i)=>(
          <button key={f.name} onClick={()=>setFilterIdx(i)} style={{width:38,height:38,borderRadius:'50%',border:`2px solid ${i===filterIdx?'#fff':'rgba(255,255,255,.3)'}`,background:'rgba(0,0,0,.5)',color:'#fff',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>{f.label}</button>
        ))}
      </div>
      <div style={{position:'absolute',bottom:40,left:0,right:0,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 28px'}}>
        <div style={{flex:1,display:'flex',justifyContent:'flex-start'}}>
          <label style={{cursor:'pointer'}}>
            <div style={{width:48,height:48,borderRadius:10,border:'2px solid rgba(255,255,255,.6)',background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){stream?.getTracks().forEach(t=>t.stop());onCapture(f,CAM_FILTERS[filterIdx].name)}}}/>
          </label>
        </div>
        <button onClick={capture} style={{width:70,height:70,borderRadius:'50%',background:'#fff',border:'4px solid rgba(255,255,255,.4)',cursor:'pointer',flexShrink:0}}/>
        <div style={{flex:1}}/>
      </div>
    </div>
  )
}

// ── Photo Editor ──────────────────────────────────────────────
function PhotoEditor({blob,filterName,onDone,onRetake}){
  const [texts,setTexts]=useState([]),[newText,setNewText]=useState(''),[textColor,setTextColor]=useState('#ffffff'),[textSize,setTextSize]=useState(22),[textBg,setTextBg]=useState(true),[imgUrl,setImgUrl]=useState(null)
  const containerRef=useRef()

  useEffect(()=>{
    const url=URL.createObjectURL(blob instanceof Blob?blob:new Blob([blob]))
    setImgUrl(url);return()=>URL.revokeObjectURL(url)
  },[blob])

  function addText(){if(!newText.trim())return;setTexts(t=>[...t,{id:Date.now(),text:newText,color:textColor,size:textSize,bg:textBg,x:50,y:40+texts.length*12}]);setNewText('')}

  function startDrag(e,id){
    e.preventDefault()
    const onMove=(ev)=>{
      const rect=containerRef.current?.getBoundingClientRect();if(!rect)return
      const cx=ev.touches?ev.touches[0].clientX:ev.clientX,cy=ev.touches?ev.touches[0].clientY:ev.clientY
      setTexts(t=>t.map(tx=>tx.id===id?{...tx,x:Math.max(0,Math.min(100,((cx-rect.left)/rect.width)*100)),y:Math.max(0,Math.min(100,((cy-rect.top)/rect.height)*100))}:tx))
    }
    const onUp=()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);window.removeEventListener('touchmove',onMove);window.removeEventListener('touchend',onUp)}
    window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp)
    window.addEventListener('touchmove',onMove,{passive:false});window.addEventListener('touchend',onUp)
  }

  async function done(){
    const img=new Image();img.src=imgUrl;await new Promise(r=>img.onload=r)
    const c=document.createElement('canvas');c.width=img.width;c.height=img.height
    const ctx=c.getContext('2d');ctx.drawImage(img,0,0)
    texts.forEach(t=>{
      const px=(t.x/100)*c.width,py=(t.y/100)*c.height,fs=t.size*(c.width/400)
      ctx.font=`bold ${fs}px -apple-system,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle'
      if(t.bg){const m=ctx.measureText(t.text),pad=fs*.3;ctx.fillStyle='rgba(0,0,0,0.55)';ctx.beginPath();ctx.roundRect(px-m.width/2-pad,py-fs/2-pad*.5,m.width+pad*2,fs+pad,6);ctx.fill()}
      ctx.fillStyle=t.color;ctx.fillText(t.text,px,py)
    })
    c.toBlob(b=>onDone(b,filterName),'image/jpeg',0.92)
  }

  return(
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:100,display:'flex',flexDirection:'column'}}>
      <div ref={containerRef} style={{flex:1,position:'relative',overflow:'hidden'}}>
        {imgUrl&&<img src={imgUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>}
        {texts.map(t=>(
          <div key={t.id} onMouseDown={e=>startDrag(e,t.id)} onTouchStart={e=>startDrag(e,t.id)}
            style={{position:'absolute',left:`${t.x}%`,top:`${t.y}%`,transform:'translate(-50%,-50%)',cursor:'grab',userSelect:'none',fontSize:t.size,fontWeight:700,color:t.color,background:t.bg?'rgba(0,0,0,0.55)':'transparent',padding:t.bg?'3px 10px':0,borderRadius:6,whiteSpace:'nowrap'}}>
            {t.text}
            <button onClick={()=>setTexts(x=>x.filter(tx=>tx.id!==t.id))} style={{marginLeft:6,background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:11}}>✕</button>
          </div>
        ))}
      </div>
      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'space-between',padding:'14px 16px'}}>
        <button onClick={onRetake} style={{background:'rgba(0,0,0,.6)',border:'none',color:'#fff',borderRadius:20,padding:'6px 14px',cursor:'pointer',fontSize:13}}>← Retake</button>
        <button onClick={done} style={{background:'#2563eb',border:'none',color:'#fff',borderRadius:20,padding:'6px 18px',cursor:'pointer',fontSize:13,fontWeight:700}}>Use →</button>
      </div>
      <div style={{background:'rgba(0,0,0,.9)',backdropFilter:'blur(10px)',padding:'10px 14px',borderTop:'1px solid rgba(255,255,255,.1)'}}>
        <div style={{display:'flex',gap:6,marginBottom:8,justifyContent:'space-between'}}>
          <div style={{display:'flex',gap:5}}>{TEXT_COLORS.map(c=><button key={c} onClick={()=>setTextColor(c)} style={{width:20,height:20,borderRadius:'50%',background:c,border:`2px solid ${c===textColor?'#fff':'transparent'}`,cursor:'pointer'}}/>)}</div>
          <div style={{display:'flex',gap:5}}>
            <button onClick={()=>setTextSize(s=>Math.max(14,s-3))} style={{background:'rgba(255,255,255,.15)',border:'none',color:'#fff',borderRadius:5,width:26,height:26,cursor:'pointer',fontSize:12}}>A-</button>
            <button onClick={()=>setTextSize(s=>Math.min(48,s+3))} style={{background:'rgba(255,255,255,.15)',border:'none',color:'#fff',borderRadius:5,width:26,height:26,cursor:'pointer',fontSize:12}}>A+</button>
            <button onClick={()=>setTextBg(v=>!v)} style={{background:textBg?'#2563eb':'rgba(255,255,255,.15)',border:'none',color:'#fff',borderRadius:5,padding:'0 8px',height:26,cursor:'pointer',fontSize:11}}>BG</button>
          </div>
        </div>
        <div style={{display:'flex',gap:6}}>
          <input style={{...ss.input,flex:1,padding:'8px 12px'}} placeholder="Add text…" value={newText} onChange={e=>setNewText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addText()}/>
          <button style={{...ss.btn(),padding:'8px 14px'}} onClick={addText}>Add</button>
        </div>
      </div>
    </div>
  )
}

// ── AUTH ──────────────────────────────────────────────────────
function AuthScreen({onSession}){
  const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[pass,setPass]=useState(''),[err,setErr]=useState(''),[loading,setLoading]=useState(false)
  async function submit(){
    setErr('');setLoading(true)
    const{data,error}=mode==='login'?await supabase.auth.signInWithPassword({email,password:pass}):await supabase.auth.signUp({email,password:pass})
    setLoading(false)
    if(error){setErr(error.message);return}
    if(data.session)onSession(data.session)
    else setErr('Check your email to confirm.')
  }
  return(
    <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{width:'100%',maxWidth:360}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:8}}>🔥</div>
          <div style={{fontSize:26,fontWeight:800,letterSpacing:-0.5,color:'#f0f0f0'}}>FitSnap</div>
          <div style={{fontSize:12,color:'#555',marginTop:4}}>Accountability with your crew</div>
        </div>
        <div style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:18,padding:24}}>
          <div style={{marginBottom:14}}><input style={ss.input} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/></div>
          <div style={{marginBottom:16}}><input style={ss.input} type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/></div>
          {err&&<div style={{color:T.danger,fontSize:12,marginBottom:12}}>{err}</div>}
          <button style={{...ss.btn(),width:'100%',padding:12,marginBottom:12,borderRadius:12}} onClick={submit} disabled={loading}>{loading?'…':mode==='login'?'Log In':'Create Account'}</button>
          <div style={{textAlign:'center',fontSize:12,color:'#555'}}>
            {mode==='login'?'No account? ':'Have one? '}
            <span style={{color:'#5b9cf6',cursor:'pointer',fontWeight:600}} onClick={()=>{setMode(m=>m==='login'?'signup':'login');setErr('')}}>{mode==='login'?'Sign Up':'Log In'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PROFILE SETUP ─────────────────────────────────────────────
function ProfileSetup({user,onDone}){
  const [form,setForm]=useState({username:'',current_weight:'',goal_weight:'',main_goal:'',is_weight_public:true})
  const [avatarFile,setAvatarFile]=useState(null),[avatarPreview,setAvatarPreview]=useState(null),[loading,setLoading]=useState(false),[err,setErr]=useState('')
  const fileRef=useRef()
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))

  async function save(){
    if(!form.username.trim()){setErr('Username required');return}
    setLoading(true)
    let avatar_url=null
    if(avatarFile){
      const ext=avatarFile.name.split('.').pop(),path=`avatars/${user.id}.${ext}`
      const{error:upErr}=await supabase.storage.from('avatars').upload(path,avatarFile,{upsert:true})
      if(!upErr){const{data}=supabase.storage.from('avatars').getPublicUrl(path);avatar_url=data.publicUrl}
    }
    const{error}=await supabase.from('profiles').upsert({id:user.id,username:form.username.trim(),current_weight:parseFloat(form.current_weight)||null,goal_weight:parseFloat(form.goal_weight)||null,main_goal:form.main_goal.trim(),is_weight_public:form.is_weight_public,...(avatar_url&&{avatar_url}),updated_at:new Date().toISOString()})
    setLoading(false)
    if(error){setErr(error.message);return}
    onDone()
  }

  return(
    <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:18,width:'100%',maxWidth:380,padding:24}}>
        <div style={{fontSize:18,fontWeight:700,marginBottom:4}}>Set up your profile</div>
        <div style={{fontSize:12,color:'#555',marginBottom:20}}>Just once 👊</div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:20}}>
          <div onClick={()=>fileRef.current.click()} style={{width:72,height:72,borderRadius:'50%',background:'#1a1a1a',border:'2px solid #2563eb',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',marginBottom:6,overflow:'hidden',fontSize:28}}>
            {avatarPreview?<img src={avatarPreview} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:'📷'}
          </div>
          <span style={{fontSize:11,color:'#5b9cf6',cursor:'pointer'}} onClick={()=>fileRef.current.click()}>Add photo</span>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setAvatarFile(f);setAvatarPreview(URL.createObjectURL(f))}}}/>
        </div>
        {[['Username *','username','text','yourname'],['Current weight (lbs)','current_weight','number','175'],['Goal weight (lbs)','goal_weight','number','160'],['Main goal','main_goal','text','Lose 15 lbs by summer']].map(([lbl,key,type,ph])=>(
          <div key={key} style={{marginBottom:12}}>
            <div style={{fontSize:10,color:'#555',marginBottom:4,textTransform:'uppercase',letterSpacing:.5}}>{lbl}</div>
            <input style={ss.input} type={type} placeholder={ph} value={form[key]} onChange={e=>set(key,e.target.value)}/>
          </div>
        ))}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,padding:'10px 14px',background:'#1a1a1a',borderRadius:10}}>
          <div><div style={{fontSize:13,fontWeight:600}}>Show weight publicly</div><div style={{fontSize:11,color:'#555'}}>Visible to group members</div></div>
          <Toggle value={form.is_weight_public} onChange={v=>set('is_weight_public',v)}/>
        </div>
        {err&&<div style={{color:T.danger,fontSize:12,marginBottom:10}}>{err}</div>}
        <button style={{...ss.btn(),width:'100%',padding:12,borderRadius:12}} onClick={save} disabled={loading}>{loading?'Setting up…':'Get Started →'}</button>
      </div>
    </div>
  )
}

// ── HOME ──────────────────────────────────────────────────────
function HomeScreen({user,onOpenGroup}){
  const [groups,setGroups]=useState([]),[loading,setLoading]=useState(true),[myStreak,setMyStreak]=useState(0),[showCreate,setShowCreate]=useState(false),[newName,setNewName]=useState(''),[newIcon,setNewIcon]=useState('🏋️'),[newColor,setNewColor]=useState('#2563eb'),[creating,setCreating]=useState(false),[pinnedIds,setPinnedIds]=useState(()=>{try{return JSON.parse(localStorage.getItem('pinnedGroups')||'[]')}catch{return[]}}),[swipeGroupId,setSwipeGroupId]=useState(null)

  const load=useCallback(async()=>{
    const{data:memberships}=await supabase.from('group_members').select('group_id').eq('user_id',user.id)
    if(!memberships?.length){setGroups([]);setLoading(false);return}
    const ids=memberships.map(m=>m.group_id)
    const{data}=await supabase.from('groups').select('*').in('id',ids).eq('is_dm',false).order('updated_at',{ascending:false})
    setGroups(data||[])
    const{data:st}=await supabase.from('streaks').select('current_streak').eq('user_id',user.id).single()
    if(st)setMyStreak(st.current_streak)
    setLoading(false)
  },[user.id])

  useEffect(()=>{load()},[load])

  function togglePin(id){
    setPinnedIds(p=>{
      const next=p.includes(id)?p.filter(x=>x!==id):[...p,id]
      localStorage.setItem('pinnedGroups',JSON.stringify(next))
      return next
    })
    setSwipeGroupId(null)
  }

  async function create(){
    if(!newName.trim())return;setCreating(true)
    const{data:grp,error}=await supabase.from('groups').insert({name:newName.trim(),created_by:user.id,is_dm:false,icon:newIcon,color:newColor,updated_at:new Date().toISOString()}).select().single()
    if(!error&&grp)await supabase.from('group_members').insert({group_id:grp.id,user_id:user.id})
    setCreating(false);if(error){alert(error.message);return}
    setNewName('');setShowCreate(false);load()
  }

  const pinned=groups.filter(g=>pinnedIds.includes(g.id))
  const rest=groups.filter(g=>!pinnedIds.includes(g.id))
  const sorted=[...pinned,...rest]

  return(
    <div style={{...ss.page,paddingBottom:72}}>
      <div style={ss.topBar}>
        <div style={{fontSize:18,fontWeight:800,flex:1,letterSpacing:-0.5}}>FitSnap 🔥</div>
        {myStreak>0&&<div style={{background:'linear-gradient(135deg,#f97316,#ef4444)',color:'#fff',borderRadius:10,fontSize:11,fontWeight:700,padding:'3px 8px'}}>🔥{myStreak}</div>}
        <button onClick={()=>setShowCreate(v=>!v)} style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:20,color:'#f0f0f0',padding:'6px 12px',fontSize:12,cursor:'pointer',fontWeight:600}}>+ New</button>
      </div>

      {showCreate&&(
        <div style={{padding:'12px 14px',background:'#111',borderBottom:'1px solid #1a1a1a'}}>
          <div style={{fontSize:11,color:'#555',marginBottom:10,textTransform:'uppercase',letterSpacing:.5}}>New Group</div>
          <div style={{display:'flex',gap:8,marginBottom:10}}>
            <button style={{fontSize:18,background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:8,padding:'6px 10px',cursor:'pointer'}}>{newIcon}</button>
            <input style={{...ss.input,flex:1}} placeholder="Group name…" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&create()}/>
            <button style={{...ss.btn(),padding:'8px 14px',borderRadius:10,fontSize:13}} onClick={create} disabled={creating}>{creating?'…':'Create'}</button>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
            {GROUP_ICONS.map(ic=><button key={ic} onClick={()=>setNewIcon(ic)} style={{fontSize:18,background:ic===newIcon?'#1e2a3a':'#1a1a1a',border:`1px solid ${ic===newIcon?'#2563eb':'#2a2a2a'}`,borderRadius:8,padding:'5px 7px',cursor:'pointer'}}>{ic}</button>)}
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {GROUP_COLORS.map(c=><button key={c} onClick={()=>setNewColor(c)} style={{width:22,height:22,borderRadius:'50%',background:c,border:`2px solid ${c===newColor?'#fff':'transparent'}`,cursor:'pointer'}}/>)}
          </div>
        </div>
      )}

      <div>
        {loading?<Spinner/>:sorted.length===0
          ?<div style={{textAlign:'center',padding:60,color:'#444'}}>
            <div style={{fontSize:36,marginBottom:8}}>💬</div>
            <div style={{fontSize:14}}>No groups yet</div>
            <div style={{fontSize:12,color:'#333',marginTop:4}}>Create one or get invited</div>
          </div>
          :sorted.map(g=>{
            const accent=groupAccent(g)
            const isPinned=pinnedIds.includes(g.id)
            const isSwipe=swipeGroupId===g.id
            return(
              <div key={g.id} style={{position:'relative',overflow:'hidden'}}>
                {isSwipe&&(
                  <div style={{position:'absolute',right:0,top:0,bottom:0,display:'flex',alignItems:'center',zIndex:1}}>
                    <button onClick={()=>togglePin(g.id)} style={{height:'100%',padding:'0 22px',background:isPinned?'#333':'#1a3a5c',border:'none',color:'#fff',fontSize:12,cursor:'pointer',fontWeight:600}}>
                      {isPinned?'Unpin':'📌 Pin'}
                    </button>
                  </div>
                )}
                <div
                  style={{display:'flex',alignItems:'center',padding:'12px 16px',borderBottom:'1px solid #141414',cursor:'pointer',background:T.bg,transition:'transform .2s',transform:isSwipe?'translateX(-88px)':'translateX(0)'}}
                  onClick={()=>{if(isSwipe){setSwipeGroupId(null)}else{onOpenGroup(g)}}}
                  onTouchStart={e=>{e.currentTarget._startX=e.touches[0].clientX}}
                  onTouchEnd={e=>{const dx=e.changedTouches[0].clientX-e.currentTarget._startX;if(dx<-40)setSwipeGroupId(g.id);else if(dx>20)setSwipeGroupId(null)}}
                >
                  <div style={{width:46,height:46,borderRadius:13,background:accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,marginRight:12,flexShrink:0,position:'relative'}}>
                    {g.icon||'💬'}
                    {isPinned&&<div style={{position:'absolute',top:-4,right:-4,fontSize:10}}>📌</div>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:14,marginBottom:1}}>{g.name}</div>
                    <div style={{fontSize:11,color:'#3a3a3a'}}>Tap to open · Swipe to pin</div>
                  </div>
                  <div style={{color:'#2a2a2a',fontSize:18}}>›</div>
                </div>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}

// ── GROUP SCREEN ──────────────────────────────────────────────
function GroupScreen({group,user,onBack,onViewProfile}){
  const [tab,setTab]=useState('feed'),[posts,setPosts]=useState([]),[loading,setLoading]=useState(true),[reactions,setReactions]=useState({}),[leaderboard,setLeaderboard]=useState([]),[challenges,setChallenges]=useState([]),[shameWall,setShameWall]=useState([]),[mvpVotes,setMvpVotes]=useState({}),[myVote,setMyVote]=useState(null),[members,setMembers]=useState([]),[showManage,setShowManage]=useState(false),[addSearch,setAddSearch]=useState(''),[addResults,setAddResults]=useState([]),[copied,setCopied]=useState(false)
  const [caption,setCaption]=useState(''),[file,setFile]=useState(null),[preview,setPreview]=useState(null),[posting,setPosting]=useState(false),[expiringMode,setExpiringMode]=useState(false),[showSongCheck,setShowSongCheck]=useState(false),[songTitle,setSongTitle]=useState(''),[songArtist,setSongArtist]=useState(''),[showCam,setShowCam]=useState(false),[capturedBlob,setCapturedBlob]=useState(null),[capturedFilter,setCapturedFilter]=useState('None'),[showEditor,setShowEditor]=useState(false)
  const fileRef=useRef()
  const accent=groupAccent(group)
  const isOwner=group.created_by===user.id
  const inviteLink=`${window.location.origin}?joingroup=${group.id}`

  const loadPosts=useCallback(async()=>{
    const{data,error}=await supabase.from('posts').select('*,profiles(id,username,avatar_url,is_weight_public,current_weight)').eq('group_id',group.id).order('created_at',{ascending:false})
    console.log('posts',data,'err',error)
    setPosts((data||[]).filter(p=>!isExpired(p)))
    if(data?.length){const ids=data.map(p=>p.id);const{data:rxns}=await supabase.from('reactions').select('post_id').in('post_id',ids);const map={};(rxns||[]).forEach(r=>{map[r.post_id]=(map[r.post_id]||0)+1});setReactions(map)}
    setLoading(false)
  },[group.id])

  const loadLeaderboard=useCallback(async()=>{
    const{data}=await supabase.from('group_members').select('user_id,profiles(username,avatar_url),streaks(current_streak,longest_streak)').eq('group_id',group.id)
    setLeaderboard((data||[]).sort((a,b)=>(b.streaks?.current_streak||0)-(a.streaks?.current_streak||0)))
  },[group.id])

  const loadMembers=useCallback(async()=>{
    const{data}=await supabase.from('group_members').select('user_id,profiles(id,username,avatar_url)').eq('group_id',group.id)
    setMembers(data||[])
  },[group.id])

  const loadChallenges=useCallback(async()=>{
    const{data}=await supabase.from('challenges').select('*').eq('group_id',group.id).eq('status','active')
    setChallenges(data||[])
  },[group.id])

  const loadShame=useCallback(async()=>{
    const{data:mems}=await supabase.from('group_members').select('user_id,profiles(username,avatar_url)').eq('group_id',group.id)
    const{data:tp}=await supabase.from('posts').select('user_id').eq('group_id',group.id).gte('created_at',today()+'T00:00:00')
    const posted=new Set((tp||[]).map(p=>p.user_id))
    setShameWall((mems||[]).filter(m=>!posted.has(m.user_id)&&m.user_id!==user.id))
  },[group.id,user.id])

  const loadMVP=useCallback(async()=>{
    const wk=currentWeek()
    const{data}=await supabase.from('mvp_votes').select('nominee_id').eq('group_id',group.id).eq('week',wk)
    const map={};(data||[]).forEach(v=>{map[v.nominee_id]=(map[v.nominee_id]||0)+1});setMvpVotes(map)
    const{data:mine}=await supabase.from('mvp_votes').select('nominee_id').eq('group_id',group.id).eq('voter_id',user.id).eq('week',wk).single()
    if(mine)setMyVote(mine.nominee_id)
  },[group.id,user.id])

  useEffect(()=>{loadPosts();loadLeaderboard();loadMembers();loadChallenges();loadShame();loadMVP()},[])

  async function searchToAdd(){
    if(!addSearch.trim())return
    const{data}=await supabase.from('profiles').select('id,username,avatar_url').ilike('username',`%${addSearch.trim()}%`).neq('id',user.id).limit(8)
    const memberIds=new Set(members.map(m=>m.user_id))
    setAddResults((data||[]).filter(u=>!memberIds.has(u.id)))
  }

  async function addMember(uid){
    await supabase.from('group_members').insert({group_id:group.id,user_id:uid})
    setAddResults(r=>r.filter(u=>u.id!==uid));loadMembers()
  }

  async function kickMember(uid){
    if(!window.confirm('Remove this member?'))return
    await supabase.from('group_members').delete().eq('group_id',group.id).eq('user_id',uid)
    loadMembers()
  }

  async function deleteGroup(){
    if(!window.confirm('Delete this group? Cannot be undone.'))return
    await supabase.from('group_members').delete().eq('group_id',group.id)
    await supabase.from('posts').delete().eq('group_id',group.id)
    await supabase.from('groups').delete().eq('id',group.id)
    onBack()
  }

  function handleCamCapture(blob,filterName){setCapturedBlob(blob);setCapturedFilter(filterName);setShowCam(false);setShowEditor(true)}
  function handleEditorDone(blob,filterName){setFile(blob);setPreview(URL.createObjectURL(blob));setCapturedFilter(filterName);setShowEditor(false)}

  async function updateStreak(){
    const{data:st}=await supabase.from('streaks').select('*').eq('user_id',user.id).single()
    const td=today()
    if(st){
      if(st.last_post_date===td)return
      const diff=(new Date(td)-new Date(st.last_post_date))/(1000*60*60*24)
      const newStreak=diff===1?st.current_streak+1:1
      await supabase.from('streaks').update({current_streak:newStreak,longest_streak:Math.max(newStreak,st.longest_streak||0),last_post_date:td,updated_at:new Date().toISOString()}).eq('user_id',user.id)
      if(newStreak===7)await awardBadge(user.id,'streak_7')
      if(newStreak===30)await awardBadge(user.id,'streak_30')
    } else await supabase.from('streaks').insert({user_id:user.id,current_streak:1,longest_streak:1,last_post_date:td})
  }

  async function awardBadge(uid,type){
    const{error}=await supabase.from('badges').insert({user_id:uid,badge_type:type})
    if(!error)await supabase.from('notifications').insert({user_id:uid,type:'badge',message:`You earned the ${BADGE_META[type]?.label} badge! ${BADGE_META[type]?.icon}`})
  }

  async function post(){
    if(!file&&!caption.trim())return;setPosting(true)
    let image_url=null
    if(file){
      const fname=file.name||'photo.jpg',ext=fname.split('.').pop()||'jpg',path=`${user.id}/${Date.now()}.${ext}`
      const{error:upErr}=await supabase.storage.from('posts').upload(path,file)
      if(upErr){alert('Upload failed: '+upErr.message);setPosting(false);return}
      const{data:urlData}=supabase.storage.from('posts').getPublicUrl(path);image_url=urlData.publicUrl
    }
    const{data:existing}=await supabase.from('posts').select('id').eq('user_id',user.id).limit(1)
    const isFirst=!existing||existing.length===0
    const expiresAt=expiringMode?new Date(Date.now()+24*3600*1000).toISOString():null
    const{error}=await supabase.from('posts').insert({group_id:group.id,user_id:user.id,caption:caption.trim(),image_url,ghost_mode:false,filter_name:capturedFilter||'None',...(songTitle&&{song_title:songTitle,song_artist:songArtist}),is_expiring:expiringMode,...(expiresAt&&{expires_at:expiresAt})})
    if(!error){
      await updateStreak()
      if(isFirst)await awardBadge(user.id,'first_post')
      await supabase.from('groups').update({updated_at:new Date().toISOString()}).eq('id',group.id)
      setCaption('');setFile(null);setPreview(null);setCapturedFilter('None');setSongTitle('');setSongArtist('');setShowSongCheck(false);setExpiringMode(false)
      loadPosts();loadShame()
    } else alert(error.message)
    setPosting(false)
  }

  async function react(postId,postOwnerId){
    await supabase.from('reactions').upsert({post_id:postId,user_id:user.id,emoji:'🔥'})
    setReactions(r=>({...r,[postId]:(r[postId]||0)+1}))
    if(postOwnerId!==user.id)await supabase.from('notifications').insert({user_id:postOwnerId,type:'reaction',message:'Someone reacted 🔥 to your post!'})
  }

  async function voteMVP(nomineeId){
    if(myVote)return;const wk=currentWeek()
    const{error}=await supabase.from('mvp_votes').insert({group_id:group.id,voter_id:user.id,nominee_id:nomineeId,week:wk})
    if(!error){setMyVote(nomineeId);setMvpVotes(m=>({...m,[nomineeId]:(m[nomineeId]||0)+1}));await supabase.from('notifications').insert({user_id:nomineeId,type:'mvp',message:'You got an MVP vote this week! 👑'})}
  }

  function hype(targetUserId,username){
    supabase.from('notifications').insert({user_id:targetUserId,type:'hype',message:'Someone sent you a hype! Go post your workout 💪'})
    alert(`📣 Hype sent to ${username}!`)
  }

  if(showCam)return<CameraScreen onCapture={handleCamCapture} onClose={()=>setShowCam(false)}/>
  if(showEditor&&capturedBlob)return<PhotoEditor blob={capturedBlob} filterName={capturedFilter} onDone={handleEditorDone} onRetake={()=>{setShowEditor(false);setShowCam(true)}}/>

  return(
    <div style={{...ss.page,paddingBottom:140}}>
      <div style={{...ss.topBar,borderBottom:`1px solid ${accent}33`}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:T.text,fontSize:20,cursor:'pointer',padding:'0 4px'}}>←</button>
        <div style={{width:30,height:30,borderRadius:8,background:accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>{group.icon||'💬'}</div>
        <div style={{fontWeight:700,fontSize:15,flex:1}}>{group.name}</div>
        {isOwner&&<button onClick={()=>setShowManage(v=>!v)} style={{background:'none',border:'none',color:showManage?accent:'#555',fontSize:16,cursor:'pointer'}}>⚙️</button>}
      </div>

      {showManage&&isOwner&&(
        <div style={{background:'#111',borderBottom:'1px solid #1a1a1a',padding:'14px 16px'}}>
          <div style={{fontSize:11,color:'#555',marginBottom:12,textTransform:'uppercase',letterSpacing:.5}}>Manage Group</div>
          <div style={{background:'#1a1a1a',borderRadius:10,padding:10,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,marginBottom:6}}>🔗 Invite Link</div>
            <div style={{display:'flex',gap:6}}>
              <div style={{flex:1,fontSize:11,color:'#555',background:'#0d0d0d',padding:'7px 10px',borderRadius:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inviteLink}</div>
              <button onClick={async()=>{await navigator.clipboard.writeText(inviteLink);setCopied(true);setTimeout(()=>setCopied(false),2000)}} style={{...ss.btn(null,accent),padding:'6px 12px',fontSize:12,borderRadius:8}}>{copied?'✓':'Copy'}</button>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,marginBottom:6}}>➕ Add by Username</div>
            <div style={{display:'flex',gap:6,marginBottom:8}}>
              <input style={{...ss.input,flex:1}} placeholder="Search username…" value={addSearch} onChange={e=>setAddSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchToAdd()}/>
              <button style={{...ss.btn(null,accent),padding:'8px 12px',fontSize:12,borderRadius:8}} onClick={searchToAdd}>Search</button>
            </div>
            {addResults.map(u=>(
              <div key={u.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #1a1a1a'}}>
                <Avatar url={u.avatar_url} name={u.username} size={28}/>
                <div style={{flex:1,fontSize:13,fontWeight:500}}>{u.username}</div>
                <button onClick={()=>addMember(u.id)} style={{...ss.btn(null,accent),padding:'5px 10px',fontSize:12,borderRadius:8}}>Add</button>
              </div>
            ))}
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,marginBottom:6}}>👥 Members ({members.length})</div>
            {members.map(m=>(
              <div key={m.user_id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #161616'}}>
                <Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={26}/>
                <div style={{flex:1,fontSize:12}}>{m.profiles?.username}{m.user_id===group.created_by?' 👑':''}</div>
                {m.user_id!==user.id&&<button onClick={()=>kickMember(m.user_id)} style={{background:'none',border:'1px solid #2a2a2a',borderRadius:6,color:T.danger,padding:'3px 8px',fontSize:11,cursor:'pointer'}}>Kick</button>}
              </div>
            ))}
          </div>
          <button onClick={deleteGroup} style={{...ss.btn('danger'),width:'100%',borderRadius:10,fontSize:13}}>🗑️ Delete Group</button>
        </div>
      )}

      <div style={{display:'flex',gap:6,padding:'8px 14px',borderBottom:'1px solid #141414',overflowX:'auto'}}>
        {['feed','leaderboard','mvp','challenges','shame'].map(t=>(
          <button key={t} style={ss.pill(tab===t,accent)} onClick={()=>setTab(t)}>
            {t==='feed'?'Feed':t==='leaderboard'?'🏆':t==='mvp'?'👑 MVP':t==='challenges'?'🎯 Bets':'💀 Shame'}
          </button>
        ))}
      </div>

      {tab==='feed'&&(
        <div style={{padding:'10px 14px'}}>
          {loading?<Spinner/>:posts.length===0
            ?<div style={{textAlign:'center',padding:50,color:'#333'}}><div style={{fontSize:32,marginBottom:8}}>📸</div><div style={{fontSize:13}}>No posts yet. Be first!</div></div>
            :posts.map(p=>(
              <div key={p.id} style={{...ss.card,padding:0,overflow:'hidden',marginBottom:10}}>
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px'}}>
                  <div style={{cursor:'pointer'}} onClick={()=>onViewProfile&&onViewProfile(p.profiles?.id)}>
                    <Avatar url={p.profiles?.avatar_url} name={p.profiles?.username} size={30} color={accent}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13,cursor:'pointer'}} onClick={()=>onViewProfile&&onViewProfile(p.profiles?.id)}>{p.profiles?.username||'Unknown'}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:11,color:'#333'}}>{ago(p.created_at)}</div>
                    {p.is_expiring&&p.expires_at&&<div style={{fontSize:10,color:T.warning}}>⏳{timeLeft(p.expires_at)}</div>}
                  </div>
                </div>
                {p.image_url&&<img src={p.image_url} style={{width:'100%',maxHeight:320,objectFit:'cover',display:'block'}} alt=""/>}
                {(p.caption||p.song_title)&&(
                  <div style={{padding:'9px 12px'}}>
                    {p.caption&&<div style={{fontSize:13,lineHeight:1.4,marginBottom:p.song_title?3:0}}>{p.caption}</div>}
                    {p.song_title&&<div style={{fontSize:11,color:'#555'}}>🎵 {p.song_title}{p.song_artist?` — ${p.song_artist}`:''}</div>}
                  </div>
                )}
                <div style={{padding:'7px 12px',borderTop:'1px solid #1a1a1a'}}>
                  <button onClick={()=>react(p.id,p.user_id)} style={{background:'none',border:'1px solid #2a2a2a',borderRadius:14,padding:'4px 10px',color:T.text,cursor:'pointer',fontSize:12}}>🔥 {reactions[p.id]||0}</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab==='leaderboard'&&(
        <div style={{padding:14}}>
          <div style={{fontSize:11,color:'#444',marginBottom:10}}>Ranked by streak</div>
          {leaderboard.map((m,i)=>(
            <div key={m.user_id} style={{...ss.card,display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'10px 12px'}} onClick={()=>onViewProfile&&onViewProfile(m.user_id)}>
              <div style={{fontSize:15,fontWeight:800,color:i===0?T.warning:i===1?'#888':i===2?'#cd7f32':'#333',width:22}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</div>
              <Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={32} color={accent}/>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{m.profiles?.username||'Unknown'}</div><div style={{fontSize:11,color:'#444'}}>Best: {m.streaks?.longest_streak||0}d</div></div>
              {(m.streaks?.current_streak||0)>0&&<div style={{background:'linear-gradient(135deg,#f97316,#ef4444)',color:'#fff',borderRadius:8,fontSize:11,fontWeight:700,padding:'2px 7px'}}>🔥{m.streaks.current_streak}</div>}
            </div>
          ))}
        </div>
      )}

      {tab==='mvp'&&(
        <div style={{padding:14}}>
          <div style={{...ss.card,background:`linear-gradient(135deg,${accent}18,${accent}06)`,border:`1px solid ${accent}28`,marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:2}}>👑 MVP of the Week</div>
            <div style={{fontSize:11,color:'#555'}}>{myVote?'You voted ✓':'Vote for who killed it'}</div>
          </div>
          {leaderboard.map(m=>{
            const votes=mvpVotes[m.user_id]||0,isMyVote=myVote===m.user_id
            return(
              <div key={m.user_id} style={{...ss.card,display:'flex',alignItems:'center',gap:10,padding:'10px 12px'}}>
                <Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={32} color={accent}/>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{m.profiles?.username}</div><div style={{fontSize:11,color:'#444'}}>{votes} vote{votes!==1?'s':''}</div></div>
                <button style={{background:isMyVote?accent:'#1a1a1a',border:isMyVote?'none':'1px solid #2a2a2a',color:'#fff',padding:'6px 12px',fontSize:12,borderRadius:10,cursor:'pointer',fontWeight:600}} onClick={()=>voteMVP(m.user_id)} disabled={!!myVote}>{isMyVote?'👑 Voted':'Vote'}</button>
              </div>
            )
          })}
        </div>
      )}

      {tab==='challenges'&&<ChallengesTab group={group} user={user} challenges={challenges} reload={loadChallenges} accent={accent}/>}

      {tab==='shame'&&(
        <div style={{padding:14}}>
          <div style={{fontSize:11,color:'#444',marginBottom:10}}>Haven't posted today 👀</div>
          {shameWall.length===0
            ?<div style={{textAlign:'center',padding:40,color:T.success}}><div style={{fontSize:28,marginBottom:6}}>🎉</div><div style={{fontSize:13}}>Everyone posted!</div></div>
            :shameWall.map(m=>(
              <div key={m.user_id} style={{...ss.card,display:'flex',alignItems:'center',gap:10,padding:'10px 12px'}}>
                <Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={32}/>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{m.profiles?.username}</div><div style={{fontSize:11,color:T.danger}}>No post today 😬</div></div>
                <button style={{...ss.btn('warn'),padding:'6px 12px',fontSize:12,borderRadius:10}} onClick={()=>hype(m.user_id,m.profiles?.username)}>📣 Hype</button>
              </div>
            ))
          }
        </div>
      )}

      {/* Snapchat-style bottom post bar */}
      <div style={{position:'fixed',bottom:60,left:0,right:0,background:'rgba(10,10,10,0.98)',backdropFilter:'blur(20px)',borderTop:`1px solid ${accent}22`,zIndex:15}}>
        {(preview||showSongCheck)&&(
          <div style={{padding:'8px 14px 0',display:'flex',gap:8,alignItems:'flex-start',flexWrap:'wrap'}}>
            {preview&&<div style={{position:'relative'}}>
              <img src={preview} style={{height:60,borderRadius:8,objectFit:'cover'}} alt=""/>
              <button onClick={()=>{setFile(null);setPreview(null)}} style={{position:'absolute',top:-4,right:-4,background:'rgba(0,0,0,.8)',border:'none',color:'#fff',borderRadius:'50%',width:16,height:16,cursor:'pointer',fontSize:9,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>}
            {showSongCheck&&<div style={{display:'flex',gap:6,flex:1}}>
              <input style={{...ss.input,flex:1,padding:'7px 10px',fontSize:12}} placeholder="Song title…" value={songTitle} onChange={e=>setSongTitle(e.target.value)}/>
              <input style={{...ss.input,flex:1,padding:'7px 10px',fontSize:12}} placeholder="Artist…" value={songArtist} onChange={e=>setSongArtist(e.target.value)}/>
            </div>}
          </div>
        )}
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px 10px'}}>
          <button onClick={()=>setShowCam(true)} style={{background:'none',border:'none',color:'#555',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',padding:2}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
          <label style={{cursor:'pointer',flexShrink:0,color:'#555',display:'flex',alignItems:'center',padding:2}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setFile(f);setPreview(URL.createObjectURL(f))}}}/>
          </label>
          <input style={{...ss.input,flex:1,padding:'9px 14px',fontSize:13}} placeholder="Share your workout…" value={caption} onChange={e=>setCaption(e.target.value)} onKeyDown={e=>e.key==='Enter'&&post()}/>
          <button onClick={()=>setShowSongCheck(v=>!v)} style={{background:'none',border:'none',color:showSongCheck?accent:'#3a3a3a',fontSize:16,cursor:'pointer',flexShrink:0}}>🎵</button>
          <button onClick={()=>setExpiringMode(v=>!v)} style={{background:'none',border:'none',color:expiringMode?T.warning:'#3a3a3a',fontSize:16,cursor:'pointer',flexShrink:0}}>⏳</button>
          <button onClick={post} disabled={posting||(!file&&!caption.trim())} style={{width:34,height:34,borderRadius:'50%',background:(file||caption.trim())?accent:'#1a1a1a',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background .2s'}}>
            {posting?<span style={{fontSize:12}}>…</span>:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CHALLENGES TAB ────────────────────────────────────────────
function ChallengesTab({group,user,challenges,reload,accent}){
  const [showCreate,setShowCreate]=useState(false),[form,setForm]=useState({title:'',duration_days:7,bet_amount:0,penalty_type:'per_miss',activity_type:'post'}),[saving,setSaving]=useState(false),[myP,setMyP]=useState({})
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))

  useEffect(()=>{
    if(!challenges.length)return
    supabase.from('challenge_participants').select('challenge_id,days_completed,days_missed,amount_owed,personal_goal,goal_frequency,goal_period').eq('user_id',user.id).in('challenge_id',challenges.map(c=>c.id)).then(({data})=>{const map={};(data||[]).forEach(p=>{map[p.challenge_id]=p});setMyP(map)})
  },[challenges,user.id])

  async function createChallenge(){
    if(!form.title.trim())return;setSaving(true)
    const endsDate=new Date();endsDate.setDate(endsDate.getDate()+parseInt(form.duration_days))
    const{data:ch,error}=await supabase.from('challenges').insert({group_id:group.id,created_by:user.id,title:form.title.trim(),duration_days:parseInt(form.duration_days),bet_amount:parseFloat(form.bet_amount)||0,penalty_type:form.penalty_type,activity_type:form.activity_type,starts_at:today(),ends_at:endsDate.toISOString().slice(0,10),status:'active'}).select().single()
    if(!error&&ch){await supabase.from('challenge_participants').insert({challenge_id:ch.id,user_id:user.id});reload();setShowCreate(false)}else alert(error?.message)
    setSaving(false)
  }

  async function joinWithGoal(challengeId){
    const goal=prompt('Your personal goal?')
    if(!goal)return
    const freq=prompt('Times per week? (number)')
    const{error}=await supabase.from('challenge_participants').insert({challenge_id:challengeId,user_id:user.id,personal_goal:goal,goal_frequency:parseInt(freq)||1,goal_period:'week'})
    if(error)alert(error.message);else reload()
  }

  async function checkIn(challengeId){
    const p=myP[challengeId];if(!p)return
    const newDone=(p.days_completed||0)+1
    await supabase.from('challenge_participants').update({days_completed:newDone}).eq('challenge_id',challengeId).eq('user_id',user.id)
    setMyP(m=>({...m,[challengeId]:{...m[challengeId],days_completed:newDone}}))
  }

  return(
    <div style={{padding:14}}>
      <button style={{...ss.btn(null,accent),width:'100%',marginBottom:12,borderRadius:12}} onClick={()=>setShowCreate(v=>!v)}>{showCreate?'Cancel':'+ Create Bet'}</button>
      {showCreate&&(
        <div style={{...ss.card,marginBottom:12}}>
          <div style={{fontWeight:700,marginBottom:12,fontSize:14}}>New Challenge</div>
          <div style={{marginBottom:10}}><div style={{fontSize:10,color:'#555',marginBottom:4,textTransform:'uppercase'}}>Title</div><input style={ss.input} value={form.title} onChange={e=>set('title',e.target.value)} placeholder="30-day grind"/></div>
          <div style={{marginBottom:10}}><div style={{fontSize:10,color:'#555',marginBottom:6,textTransform:'uppercase'}}>Duration</div><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{[3,7,14,30].map(d=><button key={d} style={ss.pill(form.duration_days===d,accent)} onClick={()=>set('duration_days',d)}>{d}d</button>)}</div></div>
          <div style={{marginBottom:10}}><div style={{fontSize:10,color:'#555',marginBottom:6,textTransform:'uppercase'}}>Bet ($)</div><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{[0,5,10,25,50].map(a=><button key={a} style={ss.pill(form.bet_amount===a,accent)} onClick={()=>set('bet_amount',a)}>{a===0?'Free':`$${a}`}</button>)}</div></div>
          <div style={{marginBottom:12}}><div style={{fontSize:10,color:'#555',marginBottom:6,textTransform:'uppercase'}}>Penalty</div><div style={{display:'flex',gap:6}}><button style={ss.pill(form.penalty_type==='per_miss',accent)} onClick={()=>set('penalty_type','per_miss')}>Per Miss</button><button style={ss.pill(form.penalty_type==='all_or_nothing',accent)} onClick={()=>set('penalty_type','all_or_nothing')}>All or Nothing</button></div></div>
          <button style={{...ss.btn(null,accent),width:'100%',borderRadius:10}} onClick={createChallenge} disabled={saving}>{saving?'Creating…':'Create'}</button>
        </div>
      )}
      {challenges.length===0
        ?<div style={{textAlign:'center',padding:40,color:'#333'}}><div style={{fontSize:28,marginBottom:6}}>🎯</div><div style={{fontSize:13}}>No active bets</div></div>
        :challenges.map(c=>{
          const mine=myP[c.id],daysLeft=Math.max(0,Math.ceil((new Date(c.ends_at)-new Date())/(1000*60*60*24))),ppd=c.bet_amount/c.duration_days,owed=mine?c.penalty_type==='per_miss'?(mine.days_missed||0)*ppd:(mine.days_missed||0)>0?c.bet_amount:0:0
          return(
            <div key={c.id} style={ss.card}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <div style={{fontWeight:700,fontSize:14}}>{c.title}</div>
                <div style={{fontSize:11,color:'#444'}}>{daysLeft}d left</div>
              </div>
              {mine?.personal_goal&&<div style={{fontSize:11,color:accent,marginBottom:8}}>🎯 {mine.personal_goal} {mine.goal_frequency}x/wk</div>}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:10}}>
                {[['✅',mine?.days_completed||0,'Done'],['❌',mine?.days_missed||0,'Missed'],['💸',`$${owed.toFixed(0)}`,'Owed']].map(([ic,val,lbl])=>(
                  <div key={lbl} style={{background:'#0d0d0d',borderRadius:8,padding:'8px 6px',textAlign:'center'}}>
                    <div style={{fontSize:14,fontWeight:700}}>{val}</div>
                    <div style={{fontSize:10,color:'#444',marginTop:2}}>{ic} {lbl}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:11,color:'#444',marginBottom:8}}>{c.penalty_type==='per_miss'?`$${ppd.toFixed(2)}/missed`:'All or nothing'}</div>
              {!mine?<button style={{...ss.btn(null,accent),width:'100%',borderRadius:10}} onClick={()=>joinWithGoal(c.id)}>Join + Set Goal</button>:<button style={{...ss.btn('success'),width:'100%',borderRadius:10}} onClick={()=>checkIn(c.id)}>✅ Check In</button>}
            </div>
          )
        })
      }
    </div>
  )
}

// ── DM CHAT ───────────────────────────────────────────────────
function DMScreen({conversation,user,otherUser,onBack}){
  const [messages,setMessages]=useState([]),[text,setText]=useState(''),[sending,setSending]=useState(false),[file,setFile]=useState(null),[preview,setPreview]=useState(null),[showCam,setShowCam]=useState(false),[fullImg,setFullImg]=useState(null)
  const bottomRef=useRef()

  const loadMessages=useCallback(async()=>{
    const{data}=await supabase.from('messages').select('*,profiles(username,avatar_url)').eq('conversation_id',conversation.id).order('created_at',{ascending:true})
    setMessages(data||[]);setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),80)
  },[conversation.id])

  useEffect(()=>{
    loadMessages()
    const ch=supabase.channel(`dm_${conversation.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${conversation.id}`},()=>loadMessages()).subscribe()
    return()=>supabase.removeChannel(ch)
  },[loadMessages,conversation.id])

  async function send(){
    if(!text.trim()&&!file)return;setSending(true)
    let image_url=null
    if(file){
      const ext=(file.name||'jpg').split('.').pop()||'jpg',path=`dms/${user.id}/${Date.now()}.${ext}`
      const{error:upErr}=await supabase.storage.from('posts').upload(path,file)
      if(!upErr){const{data}=supabase.storage.from('posts').getPublicUrl(path);image_url=data.publicUrl}
    }
    await supabase.from('messages').insert({conversation_id:conversation.id,sender_id:user.id,content:text.trim()||null,image_url})
    setText('');setFile(null);setPreview(null);setSending(false)
  }

  if(showCam)return<CameraScreen onCapture={(blob)=>{setFile(blob);setPreview(URL.createObjectURL(blob));setShowCam(false)}} onClose={()=>setShowCam(false)}/>

  return(
    <div style={{...ss.page,display:'flex',flexDirection:'column',height:'100vh'}}>
      {fullImg&&(
        <div onClick={()=>setFullImg(null)} style={{position:'fixed',inset:0,background:'#000',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <img src={fullImg} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} alt=""/>
          <div style={{position:'absolute',top:16,right:16,color:'#fff',fontSize:26}}>✕</div>
        </div>
      )}
      <div style={ss.topBar}>
        <button onClick={onBack} style={{background:'none',border:'none',color:T.text,fontSize:20,cursor:'pointer'}}>←</button>
        <Avatar url={otherUser?.avatar_url} name={otherUser?.username} size={28}/>
        <div style={{fontWeight:700,fontSize:14,flex:1}}>{otherUser?.username||'Chat'}</div>
        <div style={{width:7,height:7,borderRadius:'50%',background:T.success}}/>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'10px 14px',display:'flex',flexDirection:'column',gap:5}}>
        {messages.map(m=>{
          const isMe=m.sender_id===user.id
          return(
            <div key={m.id} style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start'}}>
              {m.image_url&&(
                <div onClick={()=>setFullImg(m.image_url)} style={{cursor:'pointer',borderRadius:14,overflow:'hidden',maxWidth:'68%',marginBottom:m.content?3:0}}>
                  <img src={m.image_url} style={{width:'100%',maxHeight:240,objectFit:'cover',display:'block'}} alt=""/>
                </div>
              )}
              {m.content&&(
                <div style={{maxWidth:'72%',background:isMe?'#2563eb':'#1a1a1a',padding:'8px 13px',borderRadius:isMe?'16px 16px 3px 16px':'16px 16px 16px 3px',fontSize:14,lineHeight:1.4,border:isMe?'none':'1px solid #222'}}>
                  {m.content}
                </div>
              )}
              <div style={{fontSize:10,color:'#2a2a2a',marginTop:2}}>{ago(m.created_at)}</div>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>
      {preview&&(
        <div style={{padding:'6px 14px 0',display:'flex',alignItems:'center',gap:6}}>
          <img src={preview} style={{height:52,borderRadius:8,objectFit:'cover'}} alt=""/>
          <button onClick={()=>{setFile(null);setPreview(null)}} style={{background:'rgba(0,0,0,.6)',border:'none',color:'#fff',borderRadius:'50%',width:18,height:18,cursor:'pointer',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px 28px',background:'rgba(10,10,10,0.98)',borderTop:'1px solid #1a1a1a'}}>
        <button onClick={()=>setShowCam(true)} style={{background:'none',border:'none',color:'#555',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center'}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </button>
        <label style={{cursor:'pointer',flexShrink:0,color:'#555',display:'flex',alignItems:'center'}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setFile(f);setPreview(URL.createObjectURL(f))}}}/>
        </label>
        <input style={{...ss.input,flex:1,padding:'9px 14px',borderRadius:22}} placeholder="Message…" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}/>
        <button onClick={send} disabled={sending||(!file&&!text.trim())} style={{width:34,height:34,borderRadius:'50%',background:(file||text.trim())?'#2563eb':'#1a1a1a',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background .2s'}}>
          {sending?<span style={{fontSize:11}}>…</span>:<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>}
        </button>
      </div>
    </div>
  )
}

// ── PEOPLE ────────────────────────────────────────────────────
function PeopleScreen({user,onOpenDM}){
  const [tab,setTab]=useState('friends'),[friends,setFriends]=useState([]),[requests,setRequests]=useState([]),[search,setSearch]=useState(''),[results,setResults]=useState([]),[searching,setSearching]=useState(false),[loading,setLoading]=useState(true)

  const loadFriends=useCallback(async()=>{
    const{data}=await supabase.from('friendships').select('*,requester:profiles!friendships_requester_id_fkey(id,username,avatar_url),addressee:profiles!friendships_addressee_id_fkey(id,username,avatar_url)').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).eq('status','accepted')
    setFriends(data||[])
    const{data:reqs}=await supabase.from('friendships').select('*,requester:profiles!friendships_requester_id_fkey(id,username,avatar_url)').eq('addressee_id',user.id).eq('status','pending')
    setRequests(reqs||[]);setLoading(false)
  },[user.id])

  useEffect(()=>{loadFriends()},[loadFriends])

  async function searchUsers(){if(!search.trim())return;setSearching(true);const{data}=await supabase.from('profiles').select('id,username,avatar_url').ilike('username',`%${search.trim()}%`).neq('id',user.id).limit(10);setResults(data||[]);setSearching(false)}

  async function sendRequest(toId){
    const{error}=await supabase.from('friendships').insert({requester_id:user.id,addressee_id:toId,status:'pending'})
    if(error){alert(error.message);return}
    setResults(r=>r.filter(u=>u.id!==toId));alert('Request sent 👊')
  }

  async function acceptRequest(friendshipId,requesterId){
    await supabase.from('friendships').update({status:'accepted'}).eq('id',friendshipId)
    const name=`dm_${[user.id,requesterId].sort().join('_')}`
    const{data:existing}=await supabase.from('groups').select('id').eq('name',name).single()
    if(!existing){
      const{data:grp}=await supabase.from('groups').insert({name,created_by:user.id,is_dm:true}).select().single()
      if(grp)await supabase.from('group_members').insert([{group_id:grp.id,user_id:user.id},{group_id:grp.id,user_id:requesterId}])
    }
    loadFriends()
  }

  function friendProfile(f){return f.requester_id===user.id?f.addressee:f.requester}

  return(
    <div style={{...ss.page,paddingBottom:72}}>
      <div style={ss.topBar}>
        <div style={{fontWeight:700,fontSize:16,flex:1}}>People</div>
        {requests.length>0&&<div style={{background:T.danger,color:'#fff',borderRadius:10,fontSize:11,fontWeight:700,padding:'2px 8px'}}>{requests.length}</div>}
      </div>
      <div style={{display:'flex',gap:6,padding:'10px 14px',borderBottom:'1px solid #141414'}}>
        {['friends','add','requests'].map(t=>(
          <button key={t} style={ss.pill(tab===t)} onClick={()=>setTab(t)}>
            {t==='friends'?'Friends':t==='add'?'Add':`Requests${requests.length>0?` (${requests.length})`:''}`}
          </button>
        ))}
      </div>
      {tab==='friends'&&(
        <div>
          {loading?<Spinner/>:friends.length===0
            ?<div style={{textAlign:'center',padding:50,color:'#333'}}><div style={{fontSize:32,marginBottom:8}}>👋</div><div style={{fontSize:13}}>No friends yet</div></div>
            :friends.map(f=>{
              const p=friendProfile(f)
              return(
                <div key={f.id} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 16px',borderBottom:'1px solid #141414',cursor:'pointer'}} onClick={()=>onOpenDM&&onOpenDM(f,p)}>
                  <Avatar url={p?.avatar_url} name={p?.username} size={38}/>
                  <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{p?.username}</div><div style={{fontSize:11,color:'#3a3a3a'}}>Tap to message</div></div>
                  <div style={{color:'#2a2a2a',fontSize:18}}>›</div>
                </div>
              )
            })
          }
        </div>
      )}
      {tab==='add'&&(
        <div style={{padding:14}}>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <input style={{...ss.input,flex:1}} placeholder="Search username…" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchUsers()}/>
            <button style={{...ss.btn(),padding:'9px 14px',borderRadius:10,fontSize:13}} onClick={searchUsers} disabled={searching}>{searching?'…':'Search'}</button>
          </div>
          {results.map(u=>(
            <div key={u.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid #1a1a1a'}}>
              <Avatar url={u.avatar_url} name={u.username} size={36}/>
              <div style={{flex:1,fontWeight:600,fontSize:13}}>{u.username}</div>
              <button style={{...ss.btn(),padding:'6px 12px',fontSize:12,borderRadius:10}} onClick={()=>sendRequest(u.id)}>Add +</button>
            </div>
          ))}
        </div>
      )}
      {tab==='requests'&&(
        <div style={{padding:14}}>
          {requests.length===0
            ?<div style={{textAlign:'center',padding:40,color:'#333',fontSize:13}}>No pending requests</div>
            :requests.map(r=>(
              <div key={r.id} style={{...ss.card,display:'flex',alignItems:'center',gap:10}}>
                <Avatar url={r.requester?.avatar_url} name={r.requester?.username} size={38}/>
                <div style={{flex:1,fontWeight:600,fontSize:13}}>{r.requester?.username}</div>
                <button style={{...ss.btn('success'),padding:'7px 14px',fontSize:13,borderRadius:10}} onClick={()=>acceptRequest(r.id,r.requester_id)}>Accept</button>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ── USER PROFILE ──────────────────────────────────────────────
function UserProfile({userId,onBack}){
  const [profile,setProfile]=useState(null),[posts,setPosts]=useState([]),[badges,setBadges]=useState([]),[streak,setStreak]=useState(null),[loading,setLoading]=useState(true)
  useEffect(()=>{
    Promise.all([
      supabase.from('profiles').select('*').eq('id',userId).single(),
      supabase.from('posts').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(12),
      supabase.from('badges').select('*').eq('user_id',userId),
      supabase.from('streaks').select('*').eq('user_id',userId).single(),
    ]).then(([{data:p},{data:po},{data:b},{data:st}])=>{setProfile(p);setPosts(po||[]);setBadges(b||[]);setStreak(st);setLoading(false)})
  },[userId])
  if(loading)return<div style={ss.page}><Spinner/></div>
  if(!profile)return<div style={ss.page}><div style={{padding:20,color:'#555',fontSize:13}}>User not found</div></div>
  return(
    <div style={{...ss.page,paddingBottom:72}}>
      <div style={ss.topBar}>
        <button onClick={onBack} style={{background:'none',border:'none',color:T.text,fontSize:20,cursor:'pointer'}}>←</button>
        <div style={{fontWeight:700,fontSize:15,flex:1}}>{profile.username}</div>
      </div>
      <div style={{padding:14}}>
        <div style={{...ss.card,textAlign:'center',padding:20}}>
          <Avatar url={profile.avatar_url} name={profile.username} size={68}/>
          <div style={{fontSize:17,fontWeight:700,marginTop:10}}>{profile.username}</div>
          {profile.main_goal&&<div style={{fontSize:12,color:'#555',marginTop:3}}>🎯 {profile.main_goal}</div>}
          <div style={{display:'flex',justifyContent:'center',gap:20,marginTop:12}}>
            {streak?.current_streak>0&&<div style={{textAlign:'center'}}><div style={{fontSize:20,fontWeight:800,color:'#f97316'}}>{streak.current_streak}</div><div style={{fontSize:10,color:'#444'}}>Streak</div></div>}
            {profile.is_weight_public&&profile.current_weight&&<div style={{textAlign:'center'}}><div style={{fontSize:20,fontWeight:800}}>{profile.current_weight}</div><div style={{fontSize:10,color:'#444'}}>lbs</div></div>}
            <div style={{textAlign:'center'}}><div style={{fontSize:20,fontWeight:800}}>{posts.length}</div><div style={{fontSize:10,color:'#444'}}>Posts</div></div>
          </div>
        </div>
        {badges.length>0&&<div style={ss.card}>
          <div style={{fontWeight:600,fontSize:12,marginBottom:8,color:'#888'}}>BADGES</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {badges.map(b=>{const m=BADGE_META[b.badge_type];return m?<div key={b.id} style={{background:'#1a1a1a',borderRadius:10,padding:'7px 10px',textAlign:'center',border:'1px solid #222'}}><div style={{fontSize:18}}>{m.icon}</div><div style={{fontSize:10,color:'#555',marginTop:1}}>{m.label}</div></div>:null})}
          </div>
        </div>}
        {posts.filter(p=>p.image_url).length>0&&<div style={ss.card}>
          <div style={{fontWeight:600,fontSize:12,marginBottom:8,color:'#888'}}>POSTS</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:3}}>
            {posts.filter(p=>p.image_url).map(p=><img key={p.id} src={p.image_url} style={{width:'100%',aspectRatio:'1',objectFit:'cover',borderRadius:6}} alt=""/>)}
          </div>
        </div>}
      </div>
    </div>
  )
}

// ── NOTIFICATIONS ─────────────────────────────────────────────
function NotificationsScreen({user,onClose}){
  const [notifs,setNotifs]=useState([]),[loading,setLoading]=useState(true)
  useEffect(()=>{
    supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(30).then(({data})=>{setNotifs(data||[]);setLoading(false)})
    supabase.from('notifications').update({read:true}).eq('user_id',user.id).eq('read',false)
  },[user.id])
  return(
    <div style={{...ss.page,paddingBottom:72}}>
      <div style={ss.topBar}>
        <button onClick={onClose} style={{background:'none',border:'none',color:T.text,fontSize:20,cursor:'pointer'}}>←</button>
        <div style={{fontWeight:700,fontSize:16,flex:1}}>Notifications</div>
      </div>
      {loading?<Spinner/>:notifs.length===0
        ?<div style={{textAlign:'center',padding:60,color:'#333'}}><div style={{fontSize:36,marginBottom:8}}>🔔</div><div style={{fontSize:13}}>Nothing yet</div></div>
        :notifs.map(n=>(
          <div key={n.id} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 16px',borderBottom:'1px solid #141414',background:n.read?'transparent':'#0f1520'}}>
            <div style={{fontSize:18}}>{n.type==='reaction'?'🔥':n.type==='hype'?'📣':n.type==='badge'?'🏅':n.type==='mvp'?'👑':'💬'}</div>
            <div style={{flex:1}}><div style={{fontSize:13}}>{n.message}</div><div style={{fontSize:11,color:'#3a3a3a',marginTop:2}}>{ago(n.created_at)}</div></div>
          </div>
        ))
      }
    </div>
  )
}

// ── PROGRESS ─────────────────────────────────────────────────
function ProgressScreen({user,onBack}){
  const [photos,setPhotos]=useState([]),[loading,setLoading]=useState(true),[file,setFile]=useState(null),[preview,setPreview]=useState(null),[weight,setWeight]=useState(''),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[compare,setCompare]=useState([])
  const fileRef=useRef()

  useEffect(()=>{supabase.from('progress_photos').select('*').eq('user_id',user.id).order('taken_at',{ascending:true}).then(({data})=>{setPhotos(data||[]);setLoading(false)})},[user.id])

  async function savePhoto(){
    if(!file)return;setSaving(true)
    const ext=(file.name||'jpg').split('.').pop()||'jpg',path=`progress/${user.id}/${Date.now()}.${ext}`
    const{error:upErr}=await supabase.storage.from('posts').upload(path,file)
    if(upErr){alert(upErr.message);setSaving(false);return}
    const{data:urlData}=supabase.storage.from('posts').getPublicUrl(path)
    const{error}=await supabase.from('progress_photos').insert({user_id:user.id,image_url:urlData.publicUrl,weight:parseFloat(weight)||null,note:note.trim(),taken_at:today()})
    setSaving(false)
    if(!error){setFile(null);setPreview(null);setWeight('');setNote('');supabase.from('progress_photos').select('*').eq('user_id',user.id).order('taken_at',{ascending:true}).then(({data})=>setPhotos(data||[]))}
  }

  function toggleCompare(id){setCompare(c=>c.includes(id)?c.filter(x=>x!==id):[...c.slice(-1),id])}
  const comparePhotos=photos.filter(p=>compare.includes(p.id))

  return(
    <div style={{...ss.page,paddingBottom:72}}>
      <div style={ss.topBar}>
        <button onClick={onBack} style={{background:'none',border:'none',color:T.text,fontSize:20,cursor:'pointer'}}>←</button>
        <div style={{fontWeight:700,fontSize:15,flex:1}}>Progress</div>
      </div>
      <div style={{padding:14}}>
        <div style={{...ss.card,marginBottom:12}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>Add Photo</div>
          {preview&&<img src={preview} style={{width:'100%',borderRadius:10,maxHeight:170,objectFit:'cover',marginBottom:8}} alt=""/>}
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <button onClick={()=>fileRef.current.click()} style={{...ss.btn('ghost'),padding:'8px 12px',fontSize:16,borderRadius:10,border:'1px solid #2a2a2a'}}>📷</button>
            <input style={ss.input} placeholder="Weight (lbs)" type="number" value={weight} onChange={e=>setWeight(e.target.value)}/>
          </div>
          <input style={{...ss.input,marginBottom:8}} placeholder="Note (optional)" value={note} onChange={e=>setNote(e.target.value)}/>
          <button style={{...ss.btn(),width:'100%',borderRadius:10}} onClick={savePhoto} disabled={saving||!file}>{saving?'Saving…':'Save'}</button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setFile(f);setPreview(URL.createObjectURL(f))}}}/>
        </div>
        {comparePhotos.length===2&&<div style={{...ss.card,marginBottom:12}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:8}}>Compare</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
            {comparePhotos.map(p=><div key={p.id} style={{textAlign:'center'}}><img src={p.image_url} style={{width:'100%',borderRadius:8,aspectRatio:'1',objectFit:'cover'}} alt=""/><div style={{fontSize:10,color:'#444',marginTop:3}}>{p.taken_at}{p.weight?` · ${p.weight}lbs`:''}</div></div>)}
          </div>
        </div>}
        {loading?<Spinner/>:photos.length===0
          ?<div style={{textAlign:'center',padding:40,color:'#333',fontSize:13}}>No photos yet</div>
          :<>
            <div style={{fontSize:11,color:'#444',marginBottom:8}}>Tap 2 to compare</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4}}>
              {photos.map(p=>(
                <div key={p.id} onClick={()=>toggleCompare(p.id)} style={{cursor:'pointer',position:'relative'}}>
                  <img src={p.image_url} style={{width:'100%',aspectRatio:'1',objectFit:'cover',borderRadius:8,border:`2px solid ${compare.includes(p.id)?'#2563eb':'transparent'}`}} alt=""/>
                  {compare.includes(p.id)&&<div style={{position:'absolute',top:3,right:3,background:'#2563eb',borderRadius:'50%',width:15,height:15,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700}}>✓</div>}
                  <div style={{fontSize:9,color:'#3a3a3a',marginTop:2}}>{p.taken_at}</div>
                </div>
              ))}
            </div>
          </>
        }
      </div>
    </div>
  )
}

// ── SETTINGS ─────────────────────────────────────────────────
function SettingsScreen({user,onSignOut,onProgress}){
  const [form,setForm]=useState({username:'',current_weight:'',goal_weight:'',main_goal:'',is_weight_public:true,avatar_url:''})
  const [avatarFile,setAvatarFile]=useState(null),[avatarPreview,setAvatarPreview]=useState(null),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[streak,setStreak]=useState(null),[badges,setBadges]=useState([]),[recap,setRecap]=useState(null)
  const fileRef=useRef()
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))

  useEffect(()=>{
    supabase.from('profiles').select('*').eq('id',user.id).single().then(({data})=>{if(data)setForm({username:data.username||'',current_weight:data.current_weight||'',goal_weight:data.goal_weight||'',main_goal:data.main_goal||'',is_weight_public:data.is_weight_public??true,avatar_url:data.avatar_url||''})})
    supabase.from('streaks').select('*').eq('user_id',user.id).single().then(({data})=>{if(data)setStreak(data)})
    supabase.from('badges').select('*').eq('user_id',user.id).then(({data})=>setBadges(data||[]))
    supabase.from('posts').select('id').eq('user_id',user.id).gte('created_at',new Date(Date.now()-7*86400000).toISOString()).then(({data})=>{if(data)setRecap({posts:data.length})})
  },[user.id])

  async function save(){
    setSaving(true)
    let avatar_url=form.avatar_url
    if(avatarFile){const ext=avatarFile.name.split('.').pop(),path=`avatars/${user.id}.${ext}`;const{error:upErr}=await supabase.storage.from('avatars').upload(path,avatarFile,{upsert:true});if(!upErr){const{data}=supabase.storage.from('avatars').getPublicUrl(path);avatar_url=data.publicUrl}}
    const{error}=await supabase.from('profiles').upsert({id:user.id,...form,avatar_url,current_weight:parseFloat(form.current_weight)||null,goal_weight:parseFloat(form.goal_weight)||null,updated_at:new Date().toISOString()})
    setSaving(false);if(!error){setSaved(true);setTimeout(()=>setSaved(false),2000)}
  }

  const cw=parseFloat(form.current_weight)||0,gw=parseFloat(form.goal_weight)||0
  const pct=cw&&gw?Math.min(100,Math.max(0,Math.round(Math.abs(cw-(cw>gw?cw+20:cw-20))/Math.abs((cw>gw?cw+20:cw-20)-gw)*100))):0

  return(
    <div style={{...ss.page,paddingBottom:72}}>
      <div style={ss.topBar}><div style={{fontWeight:700,fontSize:16}}>Settings</div></div>
      <div style={{padding:14}}>
        {recap&&streak&&<div style={{...ss.card,background:'linear-gradient(135deg,#0c1a0e,#091008)',border:'1px solid #1a3020',marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-around',padding:'4px 0'}}>
            <div style={{textAlign:'center'}}><div style={{fontSize:20,fontWeight:800,color:T.success}}>{recap.posts}</div><div style={{fontSize:10,color:'#444'}}>This week</div></div>
            <div style={{textAlign:'center'}}><div style={{fontSize:20,fontWeight:800,color:'#f97316'}}>{streak.current_streak}</div><div style={{fontSize:10,color:'#444'}}>Streak 🔥</div></div>
            <div style={{textAlign:'center'}}><div style={{fontSize:20,fontWeight:800,color:'#666'}}>{streak.longest_streak}</div><div style={{fontSize:10,color:'#444'}}>Best</div></div>
          </div>
        </div>}

        {cw&&gw?<div style={{...ss.card,marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:12}}><span style={{fontWeight:600}}>Weight Progress</span><span style={{color:'#555'}}>{pct}%</span></div>
          <div style={{background:'#0d0d0d',borderRadius:20,height:6,overflow:'hidden',marginBottom:4}}><div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#2563eb,#5b9cf6)',borderRadius:20}}/></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#444'}}><span>{cw} lbs</span><span>Goal: {gw} lbs</span></div>
        </div>:null}

        <button onClick={onProgress} style={{display:'block',width:'100%',marginBottom:10,textAlign:'left',padding:'11px 14px',borderRadius:12,border:'1px solid #1e1e1e',background:'#161616',color:T.text,fontSize:13,cursor:'pointer'}}>📊 Progress Timeline →</button>

        {badges.length>0&&<div style={{...ss.card,marginBottom:10}}>
          <div style={{fontWeight:600,fontSize:12,marginBottom:8,color:'#888'}}>BADGES</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {badges.map(b=>{const m=BADGE_META[b.badge_type];return m?<div key={b.id} style={{background:'#1a1a1a',borderRadius:8,padding:'6px 10px',textAlign:'center',border:'1px solid #222'}}><div style={{fontSize:16}}>{m.icon}</div><div style={{fontSize:10,color:'#555',marginTop:1}}>{m.label}</div></div>:null})}
          </div>
        </div>}

        <div style={{...ss.card,marginBottom:10}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Profile</div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
            <div onClick={()=>fileRef.current.click()} style={{width:52,height:52,borderRadius:'50%',background:'#1a1a1a',border:'2px solid #2563eb',cursor:'pointer',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>
              {(avatarPreview||form.avatar_url)?<img src={avatarPreview||form.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:initials(form.username)}
            </div>
            <div><div style={{fontWeight:600,fontSize:13}}>{form.username}</div><span style={{fontSize:11,color:'#5b9cf6',cursor:'pointer'}} onClick={()=>fileRef.current.click()}>Change photo</span></div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setAvatarFile(f);setAvatarPreview(URL.createObjectURL(f))}}}/>
          </div>
          {[['Username','username','text'],['Current weight (lbs)','current_weight','number'],['Goal weight (lbs)','goal_weight','number'],['Main goal','main_goal','text']].map(([lbl,key,type])=>(
            <div key={key} style={{marginBottom:10}}>
              <div style={{fontSize:10,color:'#555',marginBottom:4,textTransform:'uppercase',letterSpacing:.5}}>{lbl}</div>
              <input style={ss.input} type={type} value={form[key]} onChange={e=>set(key,e.target.value)}/>
            </div>
          ))}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,padding:'8px 0'}}>
            <div style={{fontSize:13}}>Show weight publicly</div>
            <Toggle value={form.is_weight_public} onChange={v=>set('is_weight_public',v)}/>
          </div>
          <button style={{...ss.btn(),width:'100%',borderRadius:10}} onClick={save} disabled={saving}>{saving?'Saving…':saved?'✓ Saved':'Save Changes'}</button>
        </div>

        <div style={ss.card}>
          <div style={{fontSize:12,color:'#444',marginBottom:10}}>{user.email}</div>
          <button style={{...ss.btn('danger'),width:'100%',borderRadius:10}} onClick={onSignOut}>Sign Out</button>
        </div>
      </div>
    </div>
  )
}

// ── ROOT ──────────────────────────────────────────────────────
export default function App(){
  const [session,setSession]=useState(undefined),[hasProfile,setHasProfile]=useState(null),[view,setView]=useState('home'),[activeGroup,setActiveGroup]=useState(null),[activeDM,setActiveDM]=useState(null),[viewingProfile,setViewingProfile]=useState(null),[showNotifs,setShowNotifs]=useState(false),[showProgress,setShowProgress]=useState(false),[unread,setUnread]=useState(0)

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session??null))
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s))
    return()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{
    if(!session)return
    supabase.from('profiles').select('id').eq('id',session.user.id).single().then(({data})=>setHasProfile(!!data))
  },[session])

  useEffect(()=>{
    if(!session)return
    const load=()=>supabase.from('notifications').select('id',{count:'exact'}).eq('user_id',session.user.id).eq('read',false).then(({count})=>setUnread(count||0))
    load()
    const ch=supabase.channel('notifs').on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${session.user.id}`},()=>load()).subscribe()
    return()=>supabase.removeChannel(ch)
  },[session])

  useEffect(()=>{
    if(!session||!hasProfile)return
    const params=new URLSearchParams(window.location.search)
    const groupId=params.get('joingroup')
    if(groupId){
      supabase.from('group_members').upsert({group_id:groupId,user_id:session.user.id}).then(()=>{
        window.history.replaceState({},'',window.location.pathname)
      })
    }
  },[session,hasProfile])

  async function signOut(){await supabase.auth.signOut();setSession(null);setHasProfile(null)}

  if(session===undefined)return<div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',color:'#555',fontSize:13}}>Loading…</div>
  if(!session)return<AuthScreen onSession={s=>setSession(s)}/>
  if(hasProfile===false)return<ProfileSetup user={session.user} onDone={()=>setHasProfile(true)}/>
  if(hasProfile===null)return<div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center',color:'#555',fontSize:13}}>Loading…</div>
  if(showProgress)return<ProgressScreen user={session.user} onBack={()=>setShowProgress(false)}/>
  if(showNotifs)return<NotificationsScreen user={session.user} onClose={()=>{setShowNotifs(false);setUnread(0)}}/>
  if(viewingProfile)return<UserProfile userId={viewingProfile} onBack={()=>setViewingProfile(null)}/>
  if(activeDM)return<DMScreen conversation={activeDM.group} user={session.user} otherUser={activeDM.otherUser} onBack={()=>setActiveDM(null)}/>
  if(activeGroup)return<GroupScreen group={activeGroup} user={session.user} onBack={()=>setActiveGroup(null)} onViewProfile={id=>id&&setViewingProfile(id)}/>

  return(
    <div style={ss.page}>
      {view==='home'&&<HomeScreen user={session.user} onOpenGroup={g=>setActiveGroup(g)}/>}
      {view==='people'&&<PeopleScreen user={session.user} onOpenDM={async(friendship,otherProfile)=>{
        const name=`dm_${[session.user.id,otherProfile.id].sort().join('_')}`
        const{data:grp}=await supabase.from('groups').select('*').eq('name',name).single()
        if(grp)setActiveDM({group:grp,otherUser:otherProfile})
      }}/>}
      {view==='settings'&&<SettingsScreen user={session.user} onSignOut={signOut} onProgress={()=>setShowProgress(true)}/>}
      <nav style={ss.nav}>
        {[{key:'home',icon:'🏠',label:'Home'},{key:'people',icon:'👥',label:'People'},{key:'settings',icon:'⚙️',label:'Settings'}].map(({key,icon,label})=>(
          <button key={key} onClick={()=>setView(key)} style={{background:'none',border:'none',color:view===key?'#f0f0f0':'#3a3a3a',fontSize:20,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'6px 14px'}}>
            <span>{icon}</span>
            <span style={{fontSize:9,color:view===key?'#5b9cf6':'#3a3a3a',fontWeight:view===key?600:400}}>{label}</span>
          </button>
        ))}
        <button onClick={()=>setShowNotifs(true)} style={{background:'none',border:'none',color:showNotifs?'#f0f0f0':'#3a3a3a',fontSize:20,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'6px 14px',position:'relative'}}>
          <span>🔔</span>
          <span style={{fontSize:9,color:'#3a3a3a'}}>Alerts</span>
          {unread>0&&<NotifDot n={unread}/>}
        </button>
      </nav>
    </div>
  )
}
