import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from './supabase'

// ── Theme ─────────────────────────────────────────────────────
const T = {
  bg:'#000',surface:'#0a0a0a',card:'#111',border:'#1a1a2e',
  accent:'#2563eb',accentLit:'#3b82f6',accentGlow:'rgba(37,99,235,0.15)',
  muted:'#1a1a2e',text:'#f1f5f9',sub:'#64748b',dim:'#334155',
  danger:'#ef4444',success:'#22c55e',warning:'#f59e0b',purple:'#8b5cf6',
}
const s = {
  page:   {minHeight:'100vh',background:T.bg,color:T.text,fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',paddingBottom:72},
  topBar: {background:'rgba(0,0,0,0.92)',backdropFilter:'blur(12px)',borderBottom:`1px solid ${T.border}`,padding:'14px 18px',display:'flex',alignItems:'center',gap:10,position:'sticky',top:0,zIndex:10},
  nav:    {position:'fixed',bottom:0,left:0,right:0,height:64,background:'rgba(0,0,0,0.96)',backdropFilter:'blur(12px)',borderTop:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-around',zIndex:10},
  navBtn: (on)=>({background:'none',border:'none',color:on?T.accentLit:T.dim,fontSize:20,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'6px 14px',transition:'color .2s'}),
  navLbl: (on)=>({fontSize:10,color:on?T.accentLit:T.dim,fontWeight:on?600:400}),
  card:   {background:T.card,border:`1px solid ${T.border}`,borderRadius:16,padding:16,marginBottom:12},
  input:  {width:'100%',padding:'12px 14px',background:'#0d0d0d',border:`1px solid ${T.border}`,borderRadius:10,color:T.text,fontSize:14,outline:'none'},
  btn:    (v='primary')=>({padding:'11px 20px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:600,fontSize:14,
    background:v==='danger'?T.danger:v==='ghost'?T.muted:v==='success'?T.success:v==='warn'?T.warning:v==='purple'?T.purple:T.accent,color:'#fff'}),
  label:  {fontSize:11,color:T.sub,marginBottom:5,display:'block',textTransform:'uppercase',letterSpacing:.5},
  title:  {fontSize:20,fontWeight:700},
  row:    {display:'flex',alignItems:'center',gap:10},
  avatar: (sz=40)=>({width:sz,height:sz,borderRadius:'50%',background:T.muted,border:`2px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:sz*.36,flexShrink:0,overflow:'hidden',color:T.text}),
  toggle: (on)=>({width:46,height:26,borderRadius:13,background:on?T.accent:T.muted,border:'none',cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0}),
  togDot: (on)=>({position:'absolute',top:3,left:on?23:3,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left .2s'}),
  pill:   (on)=>({padding:'6px 14px',borderRadius:20,border:`1px solid ${on?T.accent:T.border}`,background:on?T.accentGlow:'transparent',color:on?T.accentLit:T.sub,fontSize:13,cursor:'pointer',fontWeight:on?600:400}),
}

// ── Helpers ───────────────────────────────────────────────────
function ago(ts){const d=(Date.now()-new Date(ts))/1000;if(d<60)return 'now';if(d<3600)return`${Math.floor(d/60)}m`;if(d<86400)return`${Math.floor(d/3600)}h`;return`${Math.floor(d/86400)}d`}
function initials(str){return(str||'?').slice(0,2).toUpperCase()}
function today(){return new Date().toISOString().slice(0,10)}
function currentWeek(){const d=new Date();const w=Math.ceil(((d-new Date(d.getFullYear(),0,1))/86400000+1)/7);return`${d.getFullYear()}-W${w}`}
function isExpired(post){if(!post.is_expiring||!post.expires_at)return false;return new Date(post.expires_at)<new Date()}
function timeLeft(expiresAt){const diff=new Date(expiresAt)-new Date();if(diff<=0)return 'Expired';const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000);return h>0?`${h}h ${m}m left`:`${m}m left`}

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
  first_post:  {icon:'🌟',label:'First Post',desc:'Posted for the first time'},
  streak_7:    {icon:'🔥',label:'Week Streak',desc:'7 days in a row'},
  streak_30:   {icon:'💎',label:'Month Streak',desc:'30 days in a row'},
  hit_goal:    {icon:'🎯',label:'Goal Hit',desc:'Reached your goal weight'},
  won_challenge:{icon:'🏆',label:'Challenge Won',desc:'Won a group challenge'},
  mvp:         {icon:'👑',label:'MVP',desc:'Voted MVP of the week'},
}

const GROUP_ICONS=['💬','🏋️','🏃','🥗','💪','🔥','⚡','🎯','🥊','🧘']
const GROUP_COLORS=['#2563eb','#8b5cf6','#ef4444','#22c55e','#f97316','#ec4899','#06b6d4','#eab308']
const TEXT_COLORS=['#ffffff','#000000','#ef4444','#3b82f6','#22c55e','#f59e0b','#ec4899','#a855f7']

// ── Shared UI ─────────────────────────────────────────────────
function Toggle({value,onChange}){return<button style={s.toggle(value)} onClick={()=>onChange(!value)}><div style={s.togDot(value)}/></button>}
function Avatar({url,name,size=40}){return<div style={s.avatar(size)}>{url?<img src={url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:initials(name)}</div>}
function Spinner(){return<div style={{textAlign:'center',padding:40,color:T.sub,fontSize:13}}>Loading…</div>}
function Field({label,children}){return<div style={{marginBottom:16}}><label style={s.label}>{label}</label>{children}</div>}
function NotifDot({n}){if(!n)return null;return<div style={{background:T.danger,color:'#fff',borderRadius:'50%',fontSize:9,fontWeight:700,width:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',position:'absolute',top:-4,right:-4}}>{n>9?'9+':n}</div>}
function StreakBadge({n}){if(!n)return null;return<div style={{background:'linear-gradient(135deg,#f97316,#ef4444)',color:'#fff',borderRadius:10,fontSize:11,fontWeight:700,padding:'2px 8px'}}>🔥{n}</div>}
function UploadIcon(){return<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}

// ── Library Thumbnail ─────────────────────────────────────────
function LibraryThumb(){
  return(
    <div style={{width:54,height:54,borderRadius:10,border:'2px solid rgba(255,255,255,.6)',background:'rgba(255,255,255,.15)',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <UploadIcon/>
    </div>
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
      setStream(s)
      if(videoRef.current)videoRef.current.srcObject=s
    }catch(e){alert('Camera error: '+e.message)}
  },[])

  useEffect(()=>{startCam(facing);return()=>stream?.getTracks().forEach(t=>t.stop())},[facing])

  function capture(){
    const v=videoRef.current,c=canvasRef.current;if(!v||!c)return
    c.width=v.videoWidth;c.height=v.videoHeight
    const ctx=c.getContext('2d')
    if(facing==='user'){ctx.translate(c.width,0);ctx.scale(-1,1)}
    ctx.filter=CAM_FILTERS[filterIdx].css
    ctx.drawImage(v,0,0)
    c.toBlob(blob=>{stream?.getTracks().forEach(t=>t.stop());onCapture(blob,CAM_FILTERS[filterIdx].name)},'image/jpeg',0.92)
  }

  return(
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:100,display:'flex',flexDirection:'column'}}>
      <video ref={videoRef} autoPlay playsInline muted style={{flex:1,objectFit:'cover',width:'100%',filter:CAM_FILTERS[filterIdx].css,transform:facing==='user'?'scaleX(-1)':'none'}}/>
      <canvas ref={canvasRef} style={{display:'none'}}/>

      {/* Top bar */}
      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'flex-start',padding:'16px 20px'}}>
        <button onClick={onClose} style={{background:'rgba(0,0,0,.5)',border:'none',color:'#fff',borderRadius:'50%',width:38,height:38,fontSize:18,cursor:'pointer'}}>✕</button>
      </div>

      {/* Filter strip — right side */}
      <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',gap:10}}>
        {CAM_FILTERS.map((f,i)=>(
          <button key={f.name} onClick={()=>setFilterIdx(i)} style={{width:42,height:42,borderRadius:'50%',border:`2px solid ${i===filterIdx?'#fff':'rgba(255,255,255,.3)'}`,background:'rgba(0,0,0,.5)',color:'#fff',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>{f.label}</button>
        ))}
      </div>

      {/* Filter name */}
      {filterIdx>0&&<div style={{position:'absolute',bottom:120,left:0,right:0,textAlign:'center',color:'#fff',fontSize:13,fontWeight:600,textShadow:'0 1px 4px rgba(0,0,0,.8)'}}>{CAM_FILTERS[filterIdx].name}</div>}

      {/* Bottom row: library | shutter | flip */}
      <div style={{position:'absolute',bottom:40,left:0,right:0,display:'flex',alignItems:'center',justifyContent:'center',gap:0,padding:'0 28px'}}>
        <div style={{flex:1,display:'flex',justifyContent:'flex-start'}}>
          <label style={{cursor:'pointer'}}>
            <LibraryThumb/>
            <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){stream?.getTracks().forEach(t=>t.stop());onCapture(f,CAM_FILTERS[filterIdx].name)}}}/>
          </label>
        </div>
        <button onClick={capture} style={{width:74,height:74,borderRadius:'50%',background:'#fff',border:'5px solid rgba(255,255,255,.4)',cursor:'pointer',flexShrink:0}}/>
        <div style={{flex:1,display:'flex',justifyContent:'flex-end'}}>
          <button onClick={()=>setFacing(f=>f==='user'?'environment':'user')} style={{width:46,height:46,borderRadius:'50%',background:'rgba(0,0,0,.5)',border:'1.5px solid rgba(255,255,255,.4)',color:'#fff',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🔄</button>
        </div>
      </div>
    </div>
  )
}

// ── Photo Editor (text overlays) ──────────────────────────────
function PhotoEditor({blob,filterName,onDone,onRetake}){
  const [texts,setTexts]=useState([]),[newText,setNewText]=useState(''),[textColor,setTextColor]=useState('#ffffff'),[textSize,setTextSize]=useState(24),[textBg,setTextBg]=useState(true),[imgUrl,setImgUrl]=useState(null)
  const containerRef=useRef()

  useEffect(()=>{
    const url=URL.createObjectURL(blob instanceof Blob?blob:new Blob([blob]))
    setImgUrl(url)
    return()=>URL.revokeObjectURL(url)
  },[blob])

  function addText(){if(!newText.trim())return;setTexts(t=>[...t,{id:Date.now(),text:newText,color:textColor,size:textSize,bg:textBg,x:50,y:40+texts.length*12}]);setNewText('')}

  function removeText(id){setTexts(t=>t.filter(x=>x.id!==id))}

  function startDrag(e,id){
    e.preventDefault()
    const onMove=(ev)=>{
      const rect=containerRef.current?.getBoundingClientRect();if(!rect)return
      const cx=ev.touches?ev.touches[0].clientX:ev.clientX
      const cy=ev.touches?ev.touches[0].clientY:ev.clientY
      setTexts(t=>t.map(tx=>tx.id===id?{...tx,x:Math.max(0,Math.min(100,((cx-rect.left)/rect.width)*100)),y:Math.max(0,Math.min(100,((cy-rect.top)/rect.height)*100))}:tx))
    }
    const onUp=()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);window.removeEventListener('touchmove',onMove);window.removeEventListener('touchend',onUp)}
    window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp)
    window.addEventListener('touchmove',onMove,{passive:false});window.addEventListener('touchend',onUp)
  }

  async function done(){
    const img=new Image();img.src=imgUrl
    await new Promise(r=>img.onload=r)
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
      {/* Image with text overlays */}
      <div ref={containerRef} style={{flex:1,position:'relative',overflow:'hidden'}}>
        {imgUrl&&<img src={imgUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>}
        {texts.map(t=>(
          <div key={t.id} onMouseDown={e=>startDrag(e,t.id)} onTouchStart={e=>startDrag(e,t.id)}
            style={{position:'absolute',left:`${t.x}%`,top:`${t.y}%`,transform:'translate(-50%,-50%)',cursor:'grab',userSelect:'none',fontSize:t.size,fontWeight:700,color:t.color,background:t.bg?'rgba(0,0,0,0.55)':'transparent',padding:t.bg?'3px 10px':0,borderRadius:6,whiteSpace:'nowrap',textShadow:t.bg?'none':'0 1px 4px rgba(0,0,0,.8)'}}>
            {t.text}
            <button onClick={()=>removeText(t.id)} style={{marginLeft:6,background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:12,verticalAlign:'middle'}}>✕</button>
          </div>
        ))}
      </div>

      {/* Top actions */}
      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'space-between',padding:'14px 16px'}}>
        <button onClick={onRetake} style={{background:'rgba(0,0,0,.6)',border:'none',color:'#fff',borderRadius:20,padding:'6px 14px',cursor:'pointer',fontSize:13}}>← Retake</button>
        <button onClick={done} style={{background:T.accent,border:'none',color:'#fff',borderRadius:20,padding:'6px 18px',cursor:'pointer',fontSize:13,fontWeight:700}}>Use Photo →</button>
      </div>

      {/* Text editor panel */}
      <div style={{background:'rgba(0,0,0,.85)',backdropFilter:'blur(10px)',padding:'12px 14px',borderTop:'1px solid rgba(255,255,255,.1)'}}>
        {/* Color + size row */}
        <div style={{...s.row,marginBottom:10,justifyContent:'space-between'}}>
          <div style={{...s.row,gap:6}}>
            {TEXT_COLORS.map(c=>(
              <button key={c} onClick={()=>setTextColor(c)} style={{width:22,height:22,borderRadius:'50%',background:c,border:`2px solid ${c===textColor?'#fff':'transparent'}`,cursor:'pointer'}}/>
            ))}
          </div>
          <div style={{...s.row,gap:6}}>
            <button onClick={()=>setTextSize(s=>Math.max(14,s-4))} style={{background:'rgba(255,255,255,.15)',border:'none',color:'#fff',borderRadius:6,width:28,height:28,cursor:'pointer',fontSize:14}}>A-</button>
            <button onClick={()=>setTextSize(s=>Math.min(48,s+4))} style={{background:'rgba(255,255,255,.15)',border:'none',color:'#fff',borderRadius:6,width:28,height:28,cursor:'pointer',fontSize:14}}>A+</button>
            <button onClick={()=>setTextBg(v=>!v)} style={{background:textBg?T.accent:'rgba(255,255,255,.15)',border:'none',color:'#fff',borderRadius:6,padding:'0 10px',height:28,cursor:'pointer',fontSize:12}}>BG</button>
          </div>
        </div>
        {/* Text input */}
        <div style={s.row}>
          <input style={{...s.input,flex:1,padding:'9px 12px',fontSize:14}} placeholder="Add text…" value={newText} onChange={e=>setNewText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addText()}/>
          <button style={{...s.btn(),padding:'9px 16px'}} onClick={addText}>Add</button>
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
    else setErr('Check your email to confirm your account.')
  }
  return(
    <div style={{minHeight:'100vh',background:T.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{width:'100%',maxWidth:380}}>
        <div style={{textAlign:'center',marginBottom:36}}>
          <div style={{fontSize:52,marginBottom:10}}>🔥</div>
          <div style={{fontSize:28,fontWeight:800,letterSpacing:-0.5}}>FitSnap</div>
          <div style={{fontSize:13,color:T.sub,marginTop:6}}>Accountability with your crew</div>
        </div>
        <div style={{...s.card,padding:28}}>
          <Field label="Email"><input style={s.input} type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)}/></Field>
          <Field label="Password"><input style={s.input} type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/></Field>
          {err&&<div style={{color:T.danger,fontSize:13,marginBottom:12}}>{err}</div>}
          <button style={{...s.btn(),width:'100%',marginBottom:14,padding:13}} onClick={submit} disabled={loading}>{loading?'…':mode==='login'?'Log In':'Create Account'}</button>
          <div style={{textAlign:'center',fontSize:13,color:T.sub}}>
            {mode==='login'?"No account? ":"Have one? "}
            <span style={{color:T.accentLit,cursor:'pointer',fontWeight:600}} onClick={()=>{setMode(m=>m==='login'?'signup':'login');setErr('')}}>{mode==='login'?'Sign Up':'Log In'}</span>
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
  function pickAvatar(e){const f=e.target.files[0];if(!f)return;setAvatarFile(f);setAvatarPreview(URL.createObjectURL(f))}
  async function save(){
    if(!form.username.trim()){setErr('Username is required');return}
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
    <div style={{minHeight:'100vh',background:T.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{...s.card,width:'100%',maxWidth:400,padding:28}}>
        <div style={{fontSize:22,fontWeight:700,marginBottom:4}}>Set up your profile</div>
        <div style={{fontSize:13,color:T.sub,marginBottom:24}}>You only do this once 👊</div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:24}}>
          <div style={{...s.avatar(84),marginBottom:10,cursor:'pointer',border:`2px solid ${T.accent}`}} onClick={()=>fileRef.current.click()}>
            {avatarPreview?<img src={avatarPreview} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:'📷'}
          </div>
          <span style={{fontSize:12,color:T.accentLit,cursor:'pointer'}} onClick={()=>fileRef.current.click()}>Add profile photo</span>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={pickAvatar}/>
        </div>
        <Field label="Username *"><input style={s.input} value={form.username} onChange={e=>set('username',e.target.value)} placeholder="yourname"/></Field>
        <Field label="Current Weight (lbs)"><input style={s.input} type="number" value={form.current_weight} onChange={e=>set('current_weight',e.target.value)} placeholder="175"/></Field>
        <Field label="Goal Weight (lbs)"><input style={s.input} type="number" value={form.goal_weight} onChange={e=>set('goal_weight',e.target.value)} placeholder="160"/></Field>
        <Field label="Main Goal"><input style={s.input} value={form.main_goal} onChange={e=>set('main_goal',e.target.value)} placeholder="Lose 15 lbs by summer"/></Field>
        <div style={{...s.row,justifyContent:'space-between',marginBottom:24}}>
          <div><div style={{fontSize:14,fontWeight:600}}>Show weight publicly</div><div style={{fontSize:12,color:T.sub}}>Visible to group members</div></div>
          <Toggle value={form.is_weight_public} onChange={v=>set('is_weight_public',v)}/>
        </div>
        {err&&<div style={{color:T.danger,fontSize:13,marginBottom:12}}>{err}</div>}
        <button style={{...s.btn(),width:'100%',padding:13}} onClick={save} disabled={loading}>{loading?'Setting up…':'Get Started →'}</button>
      </div>
    </div>
  )
}

// ── USER PROFILE ──────────────────────────────────────────────
function UserProfile({userId,currentUser,onBack}){
  const [profile,setProfile]=useState(null),[posts,setPosts]=useState([]),[badges,setBadges]=useState([]),[streak,setStreak]=useState(null),[loading,setLoading]=useState(true)
  useEffect(()=>{
    Promise.all([
      supabase.from('profiles').select('*').eq('id',userId).single(),
      supabase.from('posts').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(12),
      supabase.from('badges').select('*').eq('user_id',userId),
      supabase.from('streaks').select('*').eq('user_id',userId).single(),
    ]).then(([{data:p},{data:po},{data:b},{data:st}])=>{setProfile(p);setPosts(po||[]);setBadges(b||[]);setStreak(st);setLoading(false)})
  },[userId])
  if(loading)return<div style={s.page}><Spinner/></div>
  if(!profile)return<div style={s.page}><div style={{padding:20,color:T.sub}}>User not found</div></div>
  return(
    <div style={s.page}>
      <div style={s.topBar}>
        <button style={{background:'none',border:'none',color:T.text,fontSize:22,cursor:'pointer'}} onClick={onBack}>←</button>
        <div style={{...s.title,flex:1}}>{profile.username}</div>
      </div>
      <div style={{padding:20}}>
        <div style={{...s.card,textAlign:'center',padding:24}}>
          <Avatar url={profile.avatar_url} name={profile.username} size={80}/>
          <div style={{fontSize:20,fontWeight:700,marginTop:12}}>{profile.username}</div>
          {profile.main_goal&&<div style={{fontSize:13,color:T.sub,marginTop:4}}>🎯 {profile.main_goal}</div>}
          <div style={{...s.row,justifyContent:'center',gap:20,marginTop:16}}>
            {streak?.current_streak>0&&<div style={{textAlign:'center'}}><div style={{fontSize:22,fontWeight:800,color:'#f97316'}}>{streak.current_streak}</div><div style={{fontSize:11,color:T.sub}}>Streak</div></div>}
            {profile.is_weight_public&&profile.current_weight&&<div style={{textAlign:'center'}}><div style={{fontSize:22,fontWeight:800}}>{profile.current_weight}</div><div style={{fontSize:11,color:T.sub}}>lbs</div></div>}
            {profile.is_weight_public&&profile.goal_weight&&<div style={{textAlign:'center'}}><div style={{fontSize:22,fontWeight:800}}>{profile.goal_weight}</div><div style={{fontSize:11,color:T.sub}}>goal</div></div>}
            <div style={{textAlign:'center'}}><div style={{fontSize:22,fontWeight:800}}>{posts.length}</div><div style={{fontSize:11,color:T.sub}}>Posts</div></div>
          </div>
        </div>
        {badges.length>0&&<div style={s.card}>
          <div style={{fontWeight:700,marginBottom:12}}>🏅 Badges</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {badges.map(b=>{const m=BADGE_META[b.badge_type];return m?<div key={b.id} style={{background:T.muted,borderRadius:10,padding:'8px 12px',textAlign:'center',border:`1px solid ${T.border}`}}><div style={{fontSize:20}}>{m.icon}</div><div style={{fontSize:11,color:T.sub,marginTop:2}}>{m.label}</div></div>:null})}
          </div>
        </div>}
        {posts.filter(p=>p.image_url).length>0&&<div style={s.card}>
          <div style={{fontWeight:700,marginBottom:12}}>📸 Posts</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4}}>
            {posts.filter(p=>p.image_url).map(p=><img key={p.id} src={p.image_url} style={{width:'100%',aspectRatio:'1',objectFit:'cover',borderRadius:8}} alt=""/>)}
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
    <div style={s.page}>
      <div style={s.topBar}>
        <button style={{background:'none',border:'none',color:T.text,fontSize:22,cursor:'pointer'}} onClick={onClose}>←</button>
        <div style={{...s.title,flex:1}}>🔔 Notifications</div>
      </div>
      {loading?<Spinner/>:notifs.length===0
        ?<div style={{textAlign:'center',padding:60,color:T.sub}}><div style={{fontSize:40,marginBottom:12}}>🔔</div><div>No notifications yet</div></div>
        :notifs.map(n=>(
          <div key={n.id} style={{...s.row,padding:'14px 18px',borderBottom:`1px solid ${T.border}`,background:n.read?'transparent':T.accentGlow}}>
            <div style={{fontSize:24,marginRight:4}}>{n.type==='reaction'?'🔥':n.type==='hype'?'📣':n.type==='badge'?'🏅':n.type==='mvp'?'👑':'💬'}</div>
            <div style={{flex:1}}><div style={{fontSize:14}}>{n.message}</div><div style={{fontSize:12,color:T.sub,marginTop:2}}>{ago(n.created_at)}</div></div>
          </div>
        ))
      }
    </div>
  )
}

// ── DM CHAT ───────────────────────────────────────────────────
function DMScreen({conversation,user,otherUser,onBack}){
  const [messages,setMessages]=useState([]),[text,setText]=useState(''),[sending,setSending]=useState(false),[file,setFile]=useState(null),[preview,setPreview]=useState(null),[showCam,setShowCam]=useState(false),[camBlob,setCamBlob]=useState(null)
  const bottomRef=useRef(),fileRef=useRef()

  const loadMessages=useCallback(async()=>{
    const{data}=await supabase.from('messages').select('*,profiles(username,avatar_url)').eq('conversation_id',conversation.id).order('created_at',{ascending:true})
    setMessages(data||[])
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),100)
  },[conversation.id])

  useEffect(()=>{
    loadMessages()
    const channel=supabase.channel(`dm_${conversation.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${conversation.id}`},()=>loadMessages()).subscribe()
    return()=>supabase.removeChannel(channel)
  },[loadMessages,conversation.id])

  function pickFile(e){const f=e.target.files[0];if(!f)return;setFile(f);setPreview(URL.createObjectURL(f))}

  function handleCapture(blob){setCamBlob(blob);setShowCam(false);setPreview(URL.createObjectURL(blob));setFile(blob)}

  async function send(){
    if(!text.trim()&&!file)return;setSending(true)
    let image_url=null
    if(file){
      const ext=(file.name||'jpg').split('.').pop()||'jpg',path=`dms/${user.id}/${Date.now()}.${ext}`
      const{error:upErr}=await supabase.storage.from('posts').upload(path,file)
      if(!upErr){const{data}=supabase.storage.from('posts').getPublicUrl(path);image_url=data.publicUrl}
    }
    await supabase.from('messages').insert({conversation_id:conversation.id,sender_id:user.id,content:text.trim(),image_url})
    setText('');setFile(null);setPreview(null);setCamBlob(null);setSending(false)
  }

  if(showCam)return<CameraScreen onCapture={handleCapture} onClose={()=>setShowCam(false)}/>

  return(
    <div style={{...s.page,display:'flex',flexDirection:'column'}}>
      <div style={s.topBar}>
        <button style={{background:'none',border:'none',color:T.text,fontSize:22,cursor:'pointer'}} onClick={onBack}>←</button>
        <Avatar url={otherUser?.avatar_url} name={otherUser?.username} size={34}/>
        <div style={{...s.title,flex:1,fontSize:16}}>{otherUser?.username||'DM'}</div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'12px 14px'}}>
        {messages.map(m=>{
          const isMe=m.sender_id===user.id
          return(
            <div key={m.id} style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start',marginBottom:10}}>
              {!isMe&&<Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={28}/>}
              <div style={{maxWidth:'70%',marginLeft:isMe?0:8}}>
                {m.image_url&&<img src={m.image_url} style={{width:'100%',borderRadius:12,marginBottom:4,maxHeight:200,objectFit:'cover'}} alt=""/>}
                {m.content&&<div style={{background:isMe?T.accent:T.card,padding:'10px 14px',borderRadius:isMe?'16px 16px 4px 16px':'16px 16px 16px 4px',fontSize:14,border:isMe?'none':`1px solid ${T.border}`}}>{m.content}</div>}
                <div style={{fontSize:10,color:T.dim,marginTop:3,textAlign:isMe?'right':'left'}}>{ago(m.created_at)}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>
      {preview&&(
        <div style={{padding:'0 14px 8px',position:'relative'}}>
          <img src={preview} style={{height:80,borderRadius:8,objectFit:'cover'}} alt=""/>
          <button onClick={()=>{setFile(null);setPreview(null);setCamBlob(null)}} style={{position:'absolute',top:0,right:14,background:'rgba(0,0,0,.7)',border:'none',color:'#fff',borderRadius:'50%',width:22,height:22,cursor:'pointer',fontSize:12}}>✕</button>
        </div>
      )}
      <div style={{...s.row,padding:'10px 14px',borderTop:`1px solid ${T.border}`,background:T.surface}}>
        <button style={{...s.btn('ghost'),padding:'9px 12px',fontSize:18,flexShrink:0}} onClick={()=>setShowCam(true)}>📷</button>
        <input style={s.input} placeholder="Message…" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}/>
        <button style={{...s.btn(),padding:'9px 14px',flexShrink:0}} onClick={send} disabled={sending}>{sending?'…':'Send'}</button>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={pickFile}/>
      </div>
    </div>
  )
}

// ── PEOPLE ────────────────────────────────────────────────────
function PeopleScreen({user,onOpenDM}){
  const [tab,setTab]=useState('friends'),[friends,setFriends]=useState([]),[requests,setRequests]=useState([]),[search,setSearch]=useState(''),[results,setResults]=useState([]),[searching,setSearching]=useState(false),[loading,setLoading]=useState(true),[copied,setCopied]=useState(false)
  const inviteLink=`${window.location.origin}?invite=${user.id}`

  const loadFriends=useCallback(async()=>{
    const{data}=await supabase.from('friendships').select('*,requester:profiles!friendships_requester_id_fkey(id,username,avatar_url),addressee:profiles!friendships_addressee_id_fkey(id,username,avatar_url)').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).eq('status','accepted')
    setFriends(data||[])
    const{data:reqs}=await supabase.from('friendships').select('*,requester:profiles!friendships_requester_id_fkey(id,username,avatar_url)').eq('addressee_id',user.id).eq('status','pending')
    setRequests(reqs||[]);setLoading(false)
  },[user.id])

  useEffect(()=>{loadFriends()},[loadFriends])

  async function searchUsers(){if(!search.trim())return;setSearching(true);const{data}=await supabase.from('profiles').select('id,username,avatar_url').ilike('username',`%${search.trim()}%`).neq('id',user.id).limit(10);setResults(data||[]);setSearching(false)}
  async function sendRequest(toId){const{error}=await supabase.from('friendships').insert({requester_id:user.id,addressee_id:toId,status:'pending'});if(error){alert(error.message);return};setResults(r=>r.filter(u=>u.id!==toId));alert('Friend request sent! 👊')}
  async function acceptRequest(friendshipId,requesterId){
    await supabase.from('friendships').update({status:'accepted'}).eq('id',friendshipId)
    const name=`dm_${[user.id,requesterId].sort().join('_')}`
    const{data:existing}=await supabase.from('groups').select('id').eq('name',name).single()
    if(!existing){const{data:grp}=await supabase.from('groups').insert({name,created_by:user.id,is_dm:true}).select().single();if(grp)await supabase.from('group_members').insert([{group_id:grp.id,user_id:user.id},{group_id:grp.id,user_id:requesterId}])}
    loadFriends()
  }
  async function copyInvite(){await navigator.clipboard.writeText(inviteLink);setCopied(true);setTimeout(()=>setCopied(false),2000)}
  function friendProfile(f){return f.requester_id===user.id?f.addressee:f.requester}

  return(
    <div style={s.page}>
      <div style={s.topBar}>
        <div style={{...s.title,flex:1}}>👥 People</div>
        {requests.length>0&&<div style={{background:T.danger,color:'#fff',borderRadius:10,fontSize:11,fontWeight:700,padding:'2px 8px'}}>{requests.length}</div>}
      </div>
      <div style={{...s.row,padding:'10px 14px',gap:8,borderBottom:`1px solid ${T.border}`}}>
        {['friends','add','requests'].map(t=><button key={t} style={s.pill(tab===t)} onClick={()=>setTab(t)}>{t==='friends'?'Friends':t==='add'?'Add People':`Requests${requests.length>0?` (${requests.length})`:''}`}</button>)}
      </div>
      {tab==='friends'&&<div>{loading?<Spinner/>:friends.length===0?<div style={{textAlign:'center',padding:50,color:T.sub}}><div style={{fontSize:32,marginBottom:8}}>👋</div><div>No friends yet!</div></div>:friends.map(f=>{const p=friendProfile(f);return(<div key={f.id} style={{...s.row,padding:'14px 18px',borderBottom:`1px solid ${T.border}`,cursor:'pointer'}} onClick={()=>onOpenDM&&onOpenDM(f,p)}><Avatar url={p?.avatar_url} name={p?.username} size={46}/><div style={{flex:1}}><div style={{fontWeight:600}}>{p?.username}</div><div style={{fontSize:12,color:T.sub}}>Tap to message</div></div><div style={{color:T.dim,fontSize:20}}>›</div></div>)})}</div>}
      {tab==='add'&&<div style={{padding:16}}>
        <div style={{...s.card,marginBottom:16}}>
          <div style={{fontWeight:600,marginBottom:4}}>🔗 Invite Link</div>
          <div style={{fontSize:12,color:T.sub,marginBottom:12}}>Share this to let friends add you</div>
          <div style={s.row}><div style={{flex:1,padding:'10px 12px',background:'#0d0d0d',borderRadius:8,fontSize:12,color:T.sub,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',border:`1px solid ${T.border}`}}>{inviteLink}</div><button style={s.btn(copied?'success':'primary')} onClick={copyInvite}>{copied?'Copied!':'Copy'}</button></div>
        </div>
        <div style={{fontWeight:600,marginBottom:10}}>🔍 Search by Username</div>
        <div style={{...s.row,marginBottom:16}}><input style={s.input} placeholder="Search username…" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchUsers()}/><button style={s.btn()} onClick={searchUsers} disabled={searching}>{searching?'…':'Search'}</button></div>
        {results.map(u=><div key={u.id} style={{...s.row,padding:'12px 0',borderBottom:`1px solid ${T.border}`}}><Avatar url={u.avatar_url} name={u.username} size={42}/><div style={{flex:1,fontWeight:600}}>{u.username}</div><button style={{...s.btn(),padding:'8px 14px',fontSize:13}} onClick={()=>sendRequest(u.id)}>Add +</button></div>)}
      </div>}
      {tab==='requests'&&<div style={{padding:16}}>{requests.length===0?<div style={{textAlign:'center',padding:40,color:T.sub}}>No pending requests</div>:requests.map(r=><div key={r.id} style={{...s.row,...s.card}}><Avatar url={r.requester?.avatar_url} name={r.requester?.username} size={44}/><div style={{flex:1,fontWeight:600}}>{r.requester?.username}</div><button style={{...s.btn(),padding:'8px 14px',fontSize:13}} onClick={()=>acceptRequest(r.id,r.requester_id)}>Accept</button></div>)}</div>}
    </div>
  )
}

// ── HOME ──────────────────────────────────────────────────────
function HomeScreen({user,onOpenGroup}){
  const [groups,setGroups]=useState([]),[newName,setNewName]=useState(''),[loading,setLoading]=useState(true),[creating,setCreating]=useState(false),[showCreate,setShowCreate]=useState(false),[myStreak,setMyStreak]=useState(0),[newIcon,setNewIcon]=useState('💬'),[newColor,setNewColor]=useState('#2563eb'),[showIconPicker,setShowIconPicker]=useState(false)

  const load=useCallback(async()=>{
    const{data}=await supabase.from('groups').select('*').eq('is_dm',false).order('created_at',{ascending:false})
    setGroups(data||[])
    const{data:st}=await supabase.from('streaks').select('current_streak').eq('user_id',user.id).single()
    if(st)setMyStreak(st.current_streak);setLoading(false)
  },[user.id])

  useEffect(()=>{load()},[load])

  async function create(){
    if(!newName.trim())return;setCreating(true)
    const{data:grp,error}=await supabase.from('groups').insert({name:newName.trim(),created_by:user.id,is_dm:false,icon:newIcon,color:newColor}).select().single()
    if(!error&&grp)await supabase.from('group_members').insert({group_id:grp.id,user_id:user.id})
    setCreating(false);if(error){alert(error.message);return}
    setNewName('');setShowCreate(false);load()
  }

  return(
    <div style={s.page}>
      <div style={s.topBar}>
        <div style={{fontSize:20,fontWeight:800,flex:1,letterSpacing:-0.5}}>🔥 FitSnap</div>
        {myStreak>0&&<StreakBadge n={myStreak}/>}
        <button style={{...s.btn('ghost'),padding:'8px 14px',fontSize:13}} onClick={()=>setShowCreate(v=>!v)}>+ New</button>
      </div>
      {showCreate&&(
        <div style={{padding:'14px 16px',background:T.surface,borderBottom:`1px solid ${T.border}`}}>
          <div style={s.row}>
            <button style={{fontSize:22,background:'none',border:`1px solid ${T.border}`,borderRadius:8,padding:'8px 10px',cursor:'pointer'}} onClick={()=>setShowIconPicker(v=>!v)}>{newIcon}</button>
            <input style={s.input} placeholder="Group name…" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&create()}/>
            <button style={s.btn()} onClick={create} disabled={creating}>{creating?'…':'Create'}</button>
          </div>
          {showIconPicker&&<div style={{marginTop:10}}>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>{GROUP_ICONS.map(ic=><button key={ic} style={{fontSize:20,background:ic===newIcon?T.accentGlow:'none',border:`1px solid ${ic===newIcon?T.accent:T.border}`,borderRadius:8,padding:'6px 8px',cursor:'pointer'}} onClick={()=>setNewIcon(ic)}>{ic}</button>)}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{GROUP_COLORS.map(c=><button key={c} style={{width:26,height:26,borderRadius:'50%',background:c,border:`2px solid ${c===newColor?'#fff':'transparent'}`,cursor:'pointer'}} onClick={()=>setNewColor(c)}/>)}</div>
          </div>}
        </div>
      )}
      <div>
        {loading?<Spinner/>:groups.length===0
          ?<div style={{textAlign:'center',padding:50,color:T.sub}}><div style={{fontSize:32,marginBottom:8}}>💬</div><div>No groups yet — create one!</div></div>
          :groups.map(g=>(
            <div key={g.id} style={{...s.row,padding:'14px 18px',borderBottom:`1px solid ${T.border}`,cursor:'pointer'}} onClick={()=>onOpenGroup(g)}>
              <div style={{...s.avatar(48),background:g.color||T.accent,fontSize:20,color:'#fff',border:'none'}}>{g.icon||'💬'}</div>
              <div style={{flex:1}}><div style={{fontWeight:600}}>{g.name}</div><div style={{fontSize:12,color:T.sub}}>Tap to view posts</div></div>
              <div style={{color:T.dim,fontSize:20}}>›</div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ── GROUP FEED ────────────────────────────────────────────────
function GroupScreen({group,user,onBack,onViewProfile}){
  const [tab,setTab]=useState('feed'),[posts,setPosts]=useState([]),[caption,setCaption]=useState(''),[file,setFile]=useState(null),[preview,setPreview]=useState(null),[loading,setLoading]=useState(true),[posting,setPosting]=useState(false),[ghostMode,setGhostMode]=useState(false),[filterIdx,setFilterIdx]=useState(0),[showFilters,setShowFilters]=useState(false),[reactions,setReactions]=useState({}),[leaderboard,setLeaderboard]=useState([]),[challenges,setChallenges]=useState([]),[shameWall,setShameWall]=useState([]),[songTitle,setSongTitle]=useState(''),[songArtist,setSongArtist]=useState(''),[showSong,setShowSong]=useState(false),[mvpVotes,setMvpVotes]=useState({}),[myVote,setMyVote]=useState(null),[expiringMode,setExpiringMode]=useState(false),[tokens,setTokens]=useState(1),[showCam,setShowCam]=useState(false),[camBlob,setCamBlob]=useState(null),[showEditor,setShowEditor]=useState(false),[capturedBlob,setCapturedBlob]=useState(null),[capturedFilter,setCapturedFilter]=useState('None')
  const fileRef=useRef()

  const loadPosts=useCallback(async()=>{
    const{data}=await supabase.from('posts').select('*,profiles(id,username,avatar_url,is_weight_public,current_weight)').eq('group_id',group.id).order('created_at',{ascending:false})
    // Filter out fully expired posts from feed (move to archive)
    setPosts((data||[]).filter(p=>!isExpired(p)))
    if(data?.length){const ids=data.map(p=>p.id);const{data:rxns}=await supabase.from('reactions').select('post_id').in('post_id',ids);const map={};(rxns||[]).forEach(r=>{map[r.post_id]=(map[r.post_id]||0)+1});setReactions(map)}
    setLoading(false)
  },[group.id])

  const loadLeaderboard=useCallback(async()=>{
    const{data}=await supabase.from('group_members').select('user_id,profiles(username,avatar_url),streaks(current_streak,longest_streak)').eq('group_id',group.id)
    setLeaderboard((data||[]).sort((a,b)=>(b.streaks?.current_streak||0)-(a.streaks?.current_streak||0)))
  },[group.id])

  const loadChallenges=useCallback(async()=>{
    const{data}=await supabase.from('challenges').select('*').eq('group_id',group.id).eq('status','active')
    setChallenges(data||[])
  },[group.id])

  const loadShame=useCallback(async()=>{
    const{data:members}=await supabase.from('group_members').select('user_id,profiles(username,avatar_url)').eq('group_id',group.id)
    const{data:todayPosts}=await supabase.from('posts').select('user_id').eq('group_id',group.id).gte('created_at',today()+'T00:00:00')
    const postedIds=new Set((todayPosts||[]).map(p=>p.user_id))
    setShameWall((members||[]).filter(m=>!postedIds.has(m.user_id)&&m.user_id!==user.id))
  },[group.id,user.id])

  const loadMVP=useCallback(async()=>{
    const wk=currentWeek()
    const{data}=await supabase.from('mvp_votes').select('nominee_id').eq('group_id',group.id).eq('week',wk)
    const map={};(data||[]).forEach(v=>{map[v.nominee_id]=(map[v.nominee_id]||0)+1});setMvpVotes(map)
    const{data:mine}=await supabase.from('mvp_votes').select('nominee_id').eq('group_id',group.id).eq('voter_id',user.id).eq('week',wk).single()
    if(mine)setMyVote(mine.nominee_id)
  },[group.id,user.id])

  useEffect(()=>{
    loadPosts();loadLeaderboard();loadChallenges();loadShame();loadMVP()
    supabase.from('profiles').select('streak_tokens,tokens_reset_date').eq('id',user.id).single().then(({data})=>{
      if(!data)return
      const resetDate=new Date(data.tokens_reset_date),now=new Date()
      if(now.getMonth()!==resetDate.getMonth()||now.getFullYear()!==resetDate.getFullYear()){
        supabase.from('profiles').update({streak_tokens:1,tokens_reset_date:today()}).eq('id',user.id);setTokens(1)
      } else setTokens(data.streak_tokens??1)
    })
  },[loadPosts,loadLeaderboard,loadChallenges,loadShame,loadMVP])

  async function useStreakInsurance(){
    if(tokens<1){alert('No tokens left this month!');return}
    if(!window.confirm('Use 1 streak insurance token to protect your streak today?'))return
    await supabase.from('streaks').update({last_post_date:today()}).eq('user_id',user.id)
    await supabase.from('profiles').update({streak_tokens:tokens-1}).eq('id',user.id)
    await supabase.from('token_usage').insert({user_id:user.id,reason:'streak_insurance'})
    setTokens(t=>t-1);alert('🎰 Streak protected! Token used.')
  }

  function handleCamCapture(blob,filterName){
    setCapturedBlob(blob);setCapturedFilter(filterName);setShowCam(false);setShowEditor(true)
  }
  function handleEditorDone(blob,filterName){
    setCapturedBlob(blob);setFile(blob);setPreview(URL.createObjectURL(blob));setShowEditor(false);setCapturedFilter(filterName)
  }

  function pickFile(e){const f=e.target.files[0];if(!f)return;setFile(f);setPreview(URL.createObjectURL(f))}

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
    const{data:existingPosts}=await supabase.from('posts').select('id').eq('user_id',user.id).limit(1)
    const isFirst=!existingPosts||existingPosts.length===0
    const expiresAt=expiringMode?new Date(Date.now()+24*3600*1000).toISOString():null
    const{error}=await supabase.from('posts').insert({group_id:group.id,user_id:user.id,caption:caption.trim(),image_url,ghost_mode:ghostMode,filter_name:capturedFilter||'None',...(songTitle&&{song_title:songTitle,song_artist:songArtist}),is_expiring:expiringMode,...(expiresAt&&{expires_at:expiresAt})})
    if(!error){
      await updateStreak()
      if(isFirst)await awardBadge(user.id,'first_post')
      setCaption('');setFile(null);setPreview(null);setGhostMode(false);setCapturedFilter('None');setSongTitle('');setSongArtist('');setShowSong(false);setExpiringMode(false)
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
    <div style={s.page}>
      <div style={s.topBar}>
        <button style={{background:'none',border:'none',color:T.text,fontSize:22,cursor:'pointer',padding:'0 4px'}} onClick={onBack}>←</button>
        <div style={{fontSize:20,marginRight:4}}>{group.icon||'💬'}</div>
        <div style={{...s.title,flex:1}}>{group.name}</div>
      </div>

      <div style={{...s.row,padding:'10px 14px',gap:8,borderBottom:`1px solid ${T.border}`,overflowX:'auto'}}>
        {['feed','leaderboard','mvp','challenges','shame'].map(t=>(
          <button key={t} style={{...s.pill(tab===t),flexShrink:0}} onClick={()=>setTab(t)}>
            {t==='feed'?'Feed':t==='leaderboard'?'🏆':t==='mvp'?'👑 MVP':t==='challenges'?'🎯':'💀 Shame'}
          </button>
        ))}
      </div>

      {tab==='feed'&&(
        <>
          <div style={{...s.card,margin:'14px 14px 0',padding:14}}>
            {preview&&(
              <div style={{position:'relative',marginBottom:10}}>
                <img src={preview} style={{width:'100%',borderRadius:10,maxHeight:220,objectFit:'cover'}} alt=""/>
                <button onClick={()=>{setFile(null);setPreview(null)}} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,.7)',border:'none',color:'#fff',borderRadius:'50%',width:26,height:26,cursor:'pointer',fontSize:14}}>✕</button>
              </div>
            )}
            <div style={s.row}>
              <button style={{...s.btn('ghost'),padding:'9px 12px',fontSize:18,flexShrink:0}} onClick={()=>setShowCam(true)}>📷</button>
              <input style={s.input} placeholder="What did you do today?" value={caption} onChange={e=>setCaption(e.target.value)} onKeyDown={e=>e.key==='Enter'&&post()}/>
              <button style={{...s.btn(),padding:'9px 14px',flexShrink:0}} onClick={post} disabled={posting}>{posting?'…':'Post'}</button>
            </div>
            {showSong&&(
              <div style={{...s.row,marginTop:8}}>
                <input style={{...s.input,flex:1}} placeholder="Song title…" value={songTitle} onChange={e=>setSongTitle(e.target.value)}/>
                <input style={{...s.input,flex:1}} placeholder="Artist…" value={songArtist} onChange={e=>setSongArtist(e.target.value)}/>
              </div>
            )}
            <div style={{...s.row,marginTop:10,gap:12,flexWrap:'wrap'}}>
              <div style={s.row}><Toggle value={ghostMode} onChange={setGhostMode}/><span style={{fontSize:12,color:T.sub}}>👻 Ghost</span></div>
              <div style={s.row}><Toggle value={expiringMode} onChange={setExpiringMode}/><span style={{fontSize:12,color:T.sub}}>⏳ 24hr</span></div>
              <button style={{background:'none',border:'none',color:showSong?T.accentLit:T.sub,cursor:'pointer',fontSize:12,padding:0}} onClick={()=>setShowSong(v=>!v)}>🎵 Vibe</button>
              <button style={{background:'none',border:'none',color:tokens>0?T.warning:T.sub,cursor:'pointer',fontSize:12,padding:0}} onClick={useStreakInsurance}>🎰 Insurance ({tokens})</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={pickFile}/>
          </div>

          <div style={{padding:'10px 14px'}}>
            {loading?<Spinner/>:posts.length===0
              ?<div style={{textAlign:'center',padding:40,color:T.sub}}>No posts yet. Be the first!</div>
              :posts.map(p=>(
                <div key={p.id} style={s.card}>
                  <div style={{...s.row,marginBottom:10}}>
                    <div style={{cursor:'pointer'}} onClick={()=>!p.ghost_mode&&onViewProfile&&onViewProfile(p.profiles?.id)}>
                      <Avatar url={p.ghost_mode?null:p.profiles?.avatar_url} name={p.ghost_mode?'??':p.profiles?.username} size={36}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:14,cursor:'pointer'}} onClick={()=>!p.ghost_mode&&onViewProfile&&onViewProfile(p.profiles?.id)}>
                        {p.ghost_mode?'👻 Anonymous':p.profiles?.username||'Unknown'}
                      </div>
                      {!p.ghost_mode&&p.profiles?.is_weight_public&&p.profiles?.current_weight&&<div style={{fontSize:12,color:T.sub}}>{p.profiles.current_weight} lbs</div>}
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:12,color:T.dim}}>{ago(p.created_at)}</div>
                      {p.is_expiring&&p.expires_at&&<div style={{fontSize:10,color:T.warning}}>⏳ {timeLeft(p.expires_at)}</div>}
                    </div>
                  </div>
                  {p.image_url&&<img src={p.image_url} style={{width:'100%',borderRadius:10,marginBottom:10,maxHeight:320,objectFit:'cover'}} alt=""/>}
                  {p.caption&&<div style={{fontSize:14,lineHeight:1.5,marginBottom:8}}>{p.caption}</div>}
                  {p.song_title&&<div style={{fontSize:12,color:T.sub,marginBottom:8}}>🎵 {p.song_title}{p.song_artist?` — ${p.song_artist}`:''}</div>}
                  <div style={s.row}>
                    <button onClick={()=>react(p.id,p.user_id)} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:20,padding:'5px 12px',color:T.text,cursor:'pointer',fontSize:13}}>🔥 {reactions[p.id]||0}</button>
                  </div>
                </div>
              ))
            }
          </div>
        </>
      )}

      {tab==='leaderboard'&&(
        <div style={{padding:14}}>
          <div style={{fontSize:13,color:T.sub,marginBottom:14}}>Ranked by current streak 🔥</div>
          {leaderboard.length===0?<Spinner/>:leaderboard.map((m,i)=>(
            <div key={m.user_id} style={{...s.card,display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer'}} onClick={()=>onViewProfile&&onViewProfile(m.user_id)}>
              <div style={{fontSize:20,fontWeight:800,color:i===0?T.warning:i===1?T.sub:T.dim,width:28,textAlign:'center'}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</div>
              <Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={40}/>
              <div style={{flex:1}}><div style={{fontWeight:600}}>{m.profiles?.username||'Unknown'}</div><div style={{fontSize:12,color:T.sub}}>Best: {m.streaks?.longest_streak||0}d</div></div>
              <StreakBadge n={m.streaks?.current_streak||0}/>
            </div>
          ))}
        </div>
      )}

      {tab==='mvp'&&(
        <div style={{padding:14}}>
          <div style={{...s.card,background:'linear-gradient(135deg,#1a0a2e,#0a0020)',border:`1px solid ${T.purple}44`,marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>👑 MVP of the Week</div>
            <div style={{fontSize:12,color:T.sub}}>{myVote?'You already voted this week':'Vote for who killed it this week'}</div>
          </div>
          {leaderboard.map(m=>{
            const votes=mvpVotes[m.user_id]||0,isMyVote=myVote===m.user_id
            return(
              <div key={m.user_id} style={{...s.card,display:'flex',alignItems:'center',gap:12}}>
                <Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={42}/>
                <div style={{flex:1}}><div style={{fontWeight:600}}>{m.profiles?.username}</div><div style={{fontSize:12,color:T.sub}}>{votes} vote{votes!==1?'s':''}</div></div>
                <button style={{...s.btn(isMyVote?'purple':'ghost'),padding:'8px 14px',fontSize:13}} onClick={()=>voteMVP(m.user_id)} disabled={!!myVote}>{isMyVote?'👑 Voted':'Vote'}</button>
              </div>
            )
          })}
        </div>
      )}

      {tab==='challenges'&&<ChallengesTab group={group} user={user} challenges={challenges} reload={loadChallenges}/>}

      {tab==='shame'&&(
        <div style={{padding:14}}>
          <div style={{fontSize:13,color:T.sub,marginBottom:14}}>Haven't posted today 👀</div>
          {shameWall.length===0
            ?<div style={{textAlign:'center',padding:40,color:T.success}}><div style={{fontSize:32,marginBottom:8}}>🎉</div><div>Everyone's posted today!</div></div>
            :shameWall.map(m=>(
              <div key={m.user_id} style={{...s.card,display:'flex',alignItems:'center',gap:12}}>
                <Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={44}/>
                <div style={{flex:1}}><div style={{fontWeight:600}}>{m.profiles?.username}</div><div style={{fontSize:12,color:T.danger}}>No post today 😬</div></div>
                <button style={{...s.btn('warn'),padding:'8px 14px',fontSize:13}} onClick={()=>hype(m.user_id,m.profiles?.username)}>📣 Hype</button>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ── CHALLENGES TAB ────────────────────────────────────────────
function ChallengesTab({group,user,challenges,reload}){
  const [showCreate,setShowCreate]=useState(false),[form,setForm]=useState({title:'',duration_days:7,bet_amount:0,penalty_type:'per_miss',activity_type:'post'}),[saving,setSaving]=useState(false),[myP,setMyP]=useState({})
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))

  useEffect(()=>{
    if(!challenges.length)return
    supabase.from('challenge_participants').select('challenge_id,days_completed,days_missed,amount_owed,personal_goal,goal_frequency,goal_period').eq('user_id',user.id).in('challenge_id',challenges.map(c=>c.id)).then(({data})=>{const map={};(data||[]).forEach(p=>{map[p.challenge_id]=p});setMyP(map)})
  },[challenges,user.id])

  async function createChallenge(){
    if(!form.title.trim())return;setSaving(true)
    const starts=today(),endsDate=new Date();endsDate.setDate(endsDate.getDate()+parseInt(form.duration_days))
    const{data:ch,error}=await supabase.from('challenges').insert({group_id:group.id,created_by:user.id,title:form.title.trim(),duration_days:parseInt(form.duration_days),bet_amount:parseFloat(form.bet_amount)||0,penalty_type:form.penalty_type,activity_type:form.activity_type,starts_at:starts,ends_at:endsDate.toISOString().slice(0,10),status:'active'}).select().single()
    if(!error&&ch){await supabase.from('challenge_participants').insert({challenge_id:ch.id,user_id:user.id});reload();setShowCreate(false)}else alert(error?.message);setSaving(false)
  }

  async function joinWithGoal(challengeId){
    const goal=prompt('What is YOUR personal goal?\n(e.g. "Go to gym 3x/week", "Post every day")')
    if(!goal)return
    const freq=prompt('How many times per week? (enter a number)')
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
      <button style={{...s.btn(),width:'100%',marginBottom:16}} onClick={()=>setShowCreate(v=>!v)}>{showCreate?'Cancel':'+ Create Challenge'}</button>
      {showCreate&&(
        <div style={{...s.card,marginBottom:16}}>
          <div style={{fontWeight:700,marginBottom:14}}>New Challenge</div>
          <Field label="Title"><input style={s.input} value={form.title} onChange={e=>set('title',e.target.value)} placeholder="30-day grind"/></Field>
          <Field label="Duration"><div style={{...s.row,gap:8,flexWrap:'wrap'}}>{[3,7,14,30].map(d=><button key={d} style={s.pill(form.duration_days===d)} onClick={()=>set('duration_days',d)}>{d}d</button>)}<input style={{...s.input,width:80}} type="number" value={form.duration_days} onChange={e=>set('duration_days',e.target.value)}/></div></Field>
          <Field label="Bet Amount ($)"><div style={{...s.row,gap:8,flexWrap:'wrap'}}>{[0,5,10,25,50].map(a=><button key={a} style={s.pill(form.bet_amount===a)} onClick={()=>set('bet_amount',a)}>{a===0?'Free':`$${a}`}</button>)}</div></Field>
          <Field label="Penalty"><div style={s.row}><button style={s.pill(form.penalty_type==='per_miss')} onClick={()=>set('penalty_type','per_miss')}>Per Miss</button><button style={s.pill(form.penalty_type==='all_or_nothing')} onClick={()=>set('penalty_type','all_or_nothing')}>All or Nothing</button></div></Field>
          <Field label="Activity"><div style={s.row}><button style={s.pill(form.activity_type==='post')} onClick={()=>set('activity_type','post')}>Post</button><button style={s.pill(form.activity_type==='checkin')} onClick={()=>set('activity_type','checkin')}>Check-in</button><button style={s.pill(form.activity_type==='both')} onClick={()=>set('activity_type','both')}>Both</button></div></Field>
          <button style={{...s.btn(),width:'100%'}} onClick={createChallenge} disabled={saving}>{saving?'Creating…':'Create Challenge'}</button>
        </div>
      )}
      {challenges.length===0
        ?<div style={{textAlign:'center',padding:40,color:T.sub}}><div style={{fontSize:32,marginBottom:8}}>🎯</div><div>No active challenges</div></div>
        :challenges.map(c=>{
          const mine=myP[c.id],daysLeft=Math.max(0,Math.ceil((new Date(c.ends_at)-new Date())/(1000*60*60*24))),ppd=c.bet_amount/c.duration_days,owed=mine?c.penalty_type==='per_miss'?(mine.days_missed||0)*ppd:(mine.days_missed||0)>0?c.bet_amount:0:0
          return(
            <div key={c.id} style={s.card}>
              <div style={{...s.row,marginBottom:8}}><div style={{flex:1,fontWeight:700,fontSize:15}}>{c.title}</div><div style={{fontSize:12,color:T.sub}}>{daysLeft}d left</div></div>
              {mine?.personal_goal&&<div style={{fontSize:12,color:T.accentLit,marginBottom:10}}>🎯 Your goal: {mine.personal_goal} {mine.goal_frequency}x/{mine.goal_period}</div>}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
                {[['✅',mine?.days_completed||0,'Done'],['❌',mine?.days_missed||0,'Missed'],['💸',`$${owed.toFixed(0)}`,'Owes']].map(([ic,val,lbl])=>(
                  <div key={lbl} style={{background:'#0d0d0d',borderRadius:10,padding:'10px 8px',textAlign:'center',border:`1px solid ${T.border}`}}><div style={{fontSize:16,fontWeight:700}}>{val}</div><div style={{fontSize:11,color:T.sub,marginTop:2}}>{ic} {lbl}</div></div>
                ))}
              </div>
              <div style={{fontSize:12,color:T.sub,marginBottom:10}}>{c.penalty_type==='per_miss'?`$${ppd.toFixed(2)}/missed day`:'All or nothing'} · {c.activity_type}</div>
              {!mine?<button style={{...s.btn(),width:'100%'}} onClick={()=>joinWithGoal(c.id)}>Join + Set My Goal</button>:<button style={{...s.btn('success'),width:'100%'}} onClick={()=>checkIn(c.id)}>✅ Check In Today</button>}
            </div>
          )
        })
      }
    </div>
  )
}

// ── PROGRESS TIMELINE ─────────────────────────────────────────
function ProgressScreen({user,onBack}){
  const [photos,setPhotos]=useState([]),[loading,setLoading]=useState(true),[file,setFile]=useState(null),[preview,setPreview]=useState(null),[weight,setWeight]=useState(''),[note,setNote]=useState(''),[saving,setSaving]=useState(false),[compare,setCompare]=useState([])
  const fileRef=useRef()

  useEffect(()=>{supabase.from('progress_photos').select('*').eq('user_id',user.id).order('taken_at',{ascending:true}).then(({data})=>{setPhotos(data||[]);setLoading(false)})},[user.id])

  function pickFile(e){const f=e.target.files[0];if(!f)return;setFile(f);setPreview(URL.createObjectURL(f))}

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
    <div style={s.page}>
      <div style={s.topBar}><button style={{background:'none',border:'none',color:T.text,fontSize:22,cursor:'pointer'}} onClick={onBack}>←</button><div style={{...s.title,flex:1}}>📊 Progress Timeline</div></div>
      <div style={{padding:14}}>
        <div style={{...s.card,marginBottom:16}}>
          <div style={{fontWeight:700,marginBottom:12}}>Add Progress Photo</div>
          {preview&&<img src={preview} style={{width:'100%',borderRadius:10,maxHeight:200,objectFit:'cover',marginBottom:10}} alt=""/>}
          <div style={{...s.row,marginBottom:8}}>
            <button style={{...s.btn('ghost'),padding:'9px 12px',fontSize:18}} onClick={()=>fileRef.current.click()}>📷</button>
            <input style={s.input} placeholder="Weight (lbs)" type="number" value={weight} onChange={e=>setWeight(e.target.value)}/>
          </div>
          <input style={{...s.input,marginBottom:8}} placeholder="Note (optional)" value={note} onChange={e=>setNote(e.target.value)}/>
          <button style={{...s.btn(),width:'100%'}} onClick={savePhoto} disabled={saving||!file}>{saving?'Saving…':'Save Photo'}</button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={pickFile}/>
        </div>
        {comparePhotos.length===2&&<div style={{...s.card,marginBottom:16}}>
          <div style={{fontWeight:700,marginBottom:10}}>Side-by-Side Compare</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {comparePhotos.map(p=><div key={p.id} style={{textAlign:'center'}}><img src={p.image_url} style={{width:'100%',borderRadius:8,aspectRatio:'1',objectFit:'cover'}} alt=""/><div style={{fontSize:12,color:T.sub,marginTop:4}}>{p.taken_at}{p.weight?` · ${p.weight} lbs`:''}</div></div>)}
          </div>
        </div>}
        {loading?<Spinner/>:photos.length===0
          ?<div style={{textAlign:'center',padding:40,color:T.sub}}>No progress photos yet</div>
          :<><div style={{fontSize:13,color:T.sub,marginBottom:10}}>Tap 2 photos to compare side-by-side</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {photos.map(p=>(
                <div key={p.id} style={{cursor:'pointer'}} onClick={()=>toggleCompare(p.id)}>
                  <div style={{position:'relative'}}>
                    <img src={p.image_url} style={{width:'100%',aspectRatio:'1',objectFit:'cover',borderRadius:8,border:`2px solid ${compare.includes(p.id)?T.accent:'transparent'}`}} alt=""/>
                    {compare.includes(p.id)&&<div style={{position:'absolute',top:4,right:4,background:T.accent,borderRadius:'50%',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700}}>✓</div>}
                  </div>
                  <div style={{fontSize:10,color:T.sub,marginTop:3}}>{p.taken_at}</div>
                  {p.weight&&<div style={{fontSize:10,color:T.accentLit}}>{p.weight} lbs</div>}
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

  function pickAvatar(e){const f=e.target.files[0];if(!f)return;setAvatarFile(f);setAvatarPreview(URL.createObjectURL(f))}

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
    <div style={s.page}>
      <div style={s.topBar}><div style={s.title}>⚙️ Settings</div></div>
      <div style={{padding:16}}>
        {recap&&<div style={{...s.card,background:'linear-gradient(135deg,#0a1a0a,#001400)',border:`1px solid ${T.success}44`,marginBottom:12}}>
          <div style={{fontWeight:700,marginBottom:4}}>📅 This Week</div>
          <div style={{...s.row,gap:20,marginTop:8}}>
            <div style={{textAlign:'center'}}><div style={{fontSize:22,fontWeight:800,color:T.success}}>{recap.posts}</div><div style={{fontSize:11,color:T.sub}}>Posts</div></div>
            {streak&&<div style={{textAlign:'center'}}><div style={{fontSize:22,fontWeight:800,color:'#f97316'}}>{streak.current_streak}</div><div style={{fontSize:11,color:T.sub}}>Streak</div></div>}
          </div>
        </div>}

        {streak&&<div style={{...s.card,background:'linear-gradient(135deg,#1a0a00,#2d1200)',border:`1px solid #f9731644`,marginBottom:12}}>
          <div style={{...s.row,justifyContent:'space-between'}}>
            <div><div style={{fontWeight:700,fontSize:15}}>🔥 Your Streak</div><div style={{fontSize:12,color:T.sub,marginTop:2}}>Keep posting daily!</div></div>
            <div style={{textAlign:'right'}}><div style={{fontSize:28,fontWeight:800,color:'#f97316'}}>{streak.current_streak}</div><div style={{fontSize:11,color:T.sub}}>Best: {streak.longest_streak}</div></div>
          </div>
        </div>}

        {cw&&gw?<div style={{...s.card,marginBottom:12}}>
          <div style={{...s.row,justifyContent:'space-between',marginBottom:8}}><div style={{fontWeight:700}}>📊 Weight Progress</div><div style={{fontSize:13,color:T.sub}}>{pct}%</div></div>
          <div style={{background:'#0d0d0d',borderRadius:20,height:10,overflow:'hidden',marginBottom:8}}><div style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${T.accent},${T.accentLit})`,borderRadius:20,transition:'width .5s'}}/></div>
          <div style={{...s.row,justifyContent:'space-between',fontSize:12,color:T.sub}}><span>Start</span><span>{cw} lbs now</span><span>Goal: {gw} lbs</span></div>
        </div>:null}

        <button style={{...s.btn('ghost'),width:'100%',marginBottom:12,textAlign:'left',padding:'14px 16px'}} onClick={onProgress}>📊 Body Progress Timeline →</button>

        {badges.length>0&&<div style={{...s.card,marginBottom:12}}>
          <div style={{fontWeight:700,marginBottom:12}}>🏅 Your Badges</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {badges.map(b=>{const m=BADGE_META[b.badge_type];return m?<div key={b.id} style={{background:T.muted,borderRadius:10,padding:'8px 12px',textAlign:'center',border:`1px solid ${T.border}`}}><div style={{fontSize:20}}>{m.icon}</div><div style={{fontSize:11,color:T.sub,marginTop:2}}>{m.label}</div></div>:null})}
          </div>
        </div>}

        <div style={s.card}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Your Profile</div>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
            <div style={{...s.avatar(64),cursor:'pointer',border:`2px solid ${T.accent}`}} onClick={()=>fileRef.current.click()}>
              {(avatarPreview||form.avatar_url)?<img src={avatarPreview||form.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:initials(form.username)}
            </div>
            <div><div style={{fontWeight:600,marginBottom:4}}>{form.username||'Your name'}</div><span style={{fontSize:12,color:T.accentLit,cursor:'pointer'}} onClick={()=>fileRef.current.click()}>Change photo</span></div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={pickAvatar}/>
          </div>
          <Field label="Username"><input style={s.input} value={form.username} onChange={e=>set('username',e.target.value)}/></Field>
          <Field label="Current Weight (lbs)"><input style={s.input} type="number" value={form.current_weight} onChange={e=>set('current_weight',e.target.value)}/></Field>
          <Field label="Goal Weight (lbs)"><input style={s.input} type="number" value={form.goal_weight} onChange={e=>set('goal_weight',e.target.value)}/></Field>
          <Field label="Main Goal"><input style={s.input} value={form.main_goal} onChange={e=>set('main_goal',e.target.value)}/></Field>
          <div style={{...s.row,justifyContent:'space-between',marginBottom:20}}>
            <div><div style={{fontSize:14,fontWeight:600}}>Show weight publicly</div><div style={{fontSize:12,color:T.sub}}>Visible to group members</div></div>
            <Toggle value={form.is_weight_public} onChange={v=>set('is_weight_public',v)}/>
          </div>
          <button style={{...s.btn(),width:'100%'}} onClick={save} disabled={saving}>{saving?'Saving…':saved?'✓ Saved!':'Save Changes'}</button>
        </div>

        <div style={s.card}>
          <div style={{fontSize:13,color:T.sub,marginBottom:12}}>Signed in as {user.email}</div>
          <button style={{...s.btn('danger'),width:'100%'}} onClick={onSignOut}>Sign Out</button>
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

  useEffect(()=>{if(!session)return;supabase.from('profiles').select('id').eq('id',session.user.id).single().then(({data})=>setHasProfile(!!data))},[session])

  useEffect(()=>{
    if(!session)return
    const loadUnread=()=>supabase.from('notifications').select('id',{count:'exact'}).eq('user_id',session.user.id).eq('read',false).then(({count})=>setUnread(count||0))
    loadUnread()
    const ch=supabase.channel('notifs').on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${session.user.id}`},()=>loadUnread()).subscribe()
    return()=>supabase.removeChannel(ch)
  },[session])

  async function signOut(){await supabase.auth.signOut();setSession(null);setHasProfile(null)}

  if(session===undefined)return<div style={{...s.page,display:'flex',alignItems:'center',justifyContent:'center'}}><Spinner/></div>
  if(!session)return<AuthScreen onSession={s=>setSession(s)}/>
  if(hasProfile===false)return<ProfileSetup user={session.user} onDone={()=>setHasProfile(true)}/>
  if(hasProfile===null)return<div style={{...s.page,display:'flex',alignItems:'center',justifyContent:'center'}}><Spinner/></div>
  if(showProgress)return<ProgressScreen user={session.user} onBack={()=>setShowProgress(false)}/>
  if(showNotifs)return<NotificationsScreen user={session.user} onClose={()=>{setShowNotifs(false);setUnread(0)}}/>
  if(viewingProfile)return<UserProfile userId={viewingProfile} currentUser={session.user} onBack={()=>setViewingProfile(null)}/>
  if(activeDM)return<DMScreen conversation={activeDM.group} user={session.user} otherUser={activeDM.otherUser} onBack={()=>setActiveDM(null)}/>
  if(activeGroup)return<GroupScreen group={activeGroup} user={session.user} onBack={()=>setActiveGroup(null)} onViewProfile={id=>id&&setViewingProfile(id)}/>

  return(
    <div style={s.page}>
      {view==='home'&&<HomeScreen user={session.user} onOpenGroup={g=>setActiveGroup(g)}/>}
      {view==='people'&&<PeopleScreen user={session.user} onOpenDM={async(friendship,otherProfile)=>{
        const name=`dm_${[session.user.id,otherProfile.id].sort().join('_')}`
        const{data:grp}=await supabase.from('groups').select('*').eq('name',name).single()
        if(grp)setActiveDM({group:grp,otherUser:otherProfile})
      }}/>}
      {view==='settings'&&<SettingsScreen user={session.user} onSignOut={signOut} onProgress={()=>setShowProgress(true)}/>}
      <nav style={s.nav}>
        {[{key:'home',icon:'🏠',label:'Home'},{key:'people',icon:'👥',label:'People'},{key:'settings',icon:'⚙️',label:'Settings'}].map(({key,icon,label})=>(
          <button key={key} style={s.navBtn(view===key)} onClick={()=>setView(key)}><span>{icon}</span><span style={s.navLbl(view===key)}>{label}</span></button>
        ))}
        <button style={{...s.navBtn(false),position:'relative'}} onClick={()=>setShowNotifs(true)}>
          <span>🔔</span><span style={s.navLbl(false)}>Alerts</span>
          {unread>0&&<NotifDot n={unread}/>}
        </button>
      </nav>
    </div>
  )
}