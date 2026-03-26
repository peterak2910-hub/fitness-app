import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from './supabase'

// ── Theme ─────────────────────────────────────────────────────
const T = {
  bg:'#000000', card:'#0d0d0d', surface:'#111',
  text:'#ffffff', sub:'#888', dim:'#333',
  danger:'#ff3b30', success:'#30d158', warning:'#ffd60a',
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
const REACTIONS=[{emoji:'💪',label:'Beast'},{emoji:'😤',label:'Grind'},{emoji:'🏆',label:'GOAT'},{emoji:'😭',label:'Sore'},{emoji:'🔥',label:'Fire'}]
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
function currentWeek(){const d=new Date();const mon=new Date(d);mon.setDate(d.getDate()-((d.getDay()+6)%7));const w=Math.ceil(((mon-new Date(mon.getFullYear(),0,1))/86400000+1)/7);return`${mon.getFullYear()}-W${w}`}
function isExpired(p){if(!p.is_expiring||!p.expires_at)return false;return new Date(p.expires_at)<new Date()}
function timeLeft(ea){const diff=new Date(ea)-new Date();if(diff<=0)return'Expired';const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000);return h>0?`${h}h ${m}m`:`${m}m`}
function groupAccent(g){return g?.color||GROUP_COLORS[0]}
function vibrate(ms=10){try{navigator.vibrate?.(ms)}catch{}}

// ── Shared UI ─────────────────────────────────────────────────
function Avatar({url,name,size=36,color}){
  return(
    <div style={{width:size,height:size,borderRadius:'50%',background:color||'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.34,flexShrink:0,overflow:'hidden',color:'#fff',fontWeight:800}}>
      {url?<img src={url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:initials(name)}
    </div>
  )
}

function SkeletonCard(){
  return(
    <div style={{marginBottom:2,background:'#000'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px'}}>
        <div style={{width:36,height:36,borderRadius:'50%',background:'#1a1a1a',animation:'pulse 1.5s ease-in-out infinite'}}/>
        <div style={{flex:1}}>
          <div style={{width:100,height:12,borderRadius:6,background:'#1a1a1a',marginBottom:6}}/>
          <div style={{width:60,height:10,borderRadius:6,background:'#111'}}/>
        </div>
      </div>
      <div style={{width:'100%',height:280,background:'#0d0d0d'}}/>
    </div>
  )
}

function NotifDot({n}){if(!n)return null;return<div style={{background:T.danger,color:'#fff',borderRadius:'50%',fontSize:9,fontWeight:800,width:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',position:'absolute',top:-4,right:-4,border:'2px solid #000'}}>{n>9?'9+':n}</div>}

function Toggle({value,onChange,color='#2563eb'}){
  return(
    <button onClick={()=>onChange(!value)} style={{width:44,height:26,borderRadius:13,background:value?color:'#222',border:'none',cursor:'pointer',position:'relative',transition:'background .2s',flexShrink:0}}>
      <div style={{position:'absolute',top:3,left:value?21:3,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)'}}/>
    </button>
  )
}

// SVG Icons
const Icons={
  home:(c='#fff',filled=false)=><svg width="24" height="24" viewBox="0 0 24 24" fill={filled?c:'none'} stroke={c} strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  people:(c='#fff',filled=false)=><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  bell:(c='#fff')=><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  settings:(c='#fff')=><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  camera:(c='#fff')=><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  send:(c='#fff')=><svg width="16" height="16" viewBox="0 0 24 24" fill={c}><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>,
  back:(c='#fff')=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
}

const ss={
  page:{minHeight:'100vh',background:T.bg,color:T.text,fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',overflowX:'hidden'},
  topBar:{background:'rgba(0,0,0,0.92)',backdropFilter:'blur(20px)',padding:'12px 16px',display:'flex',alignItems:'center',gap:10,position:'sticky',top:0,zIndex:20},
  input:{width:'100%',padding:'11px 16px',background:'#111',border:'none',borderRadius:24,color:T.text,fontSize:14,outline:'none'},
  pill:(on,color)=>({padding:'6px 14px',borderRadius:20,border:`1.5px solid ${on?(color||'#2563eb'):'#222'}`,background:on?`${color||'#2563eb'}18`:'transparent',color:on?(color||'#5b9cf6'):'#555',fontSize:12,cursor:'pointer',fontWeight:on?700:400,whiteSpace:'nowrap',transition:'all .15s'}),
  btn:(v,color)=>({padding:'10px 20px',borderRadius:24,border:'none',cursor:'pointer',fontWeight:700,fontSize:14,background:v==='danger'?T.danger:v==='ghost'?'#111':v==='success'?T.success:color||'#2563eb',color:'#fff',transition:'opacity .15s'}),
}

// ── Camera ────────────────────────────────────────────────────
function CameraScreen({onClose,onDone,groups=[],user}){
  const videoRef=useRef(),canvasRef=useRef()
  const [facing,setFacing]=useState('user'),[stream,setStream]=useState(null),[filterIdx,setFilterIdx]=useState(0),[mode,setMode]=useState('photo'),[capturedBlob,setCapturedBlob]=useState(null),[capturedUrl,setCapturedUrl]=useState(null),[recording,setRecording]=useState(false),[mediaRec,setMediaRec]=useState(null),[showSendTo,setShowSendTo]=useState(false),[selectedGroups,setSelectedGroups]=useState([]),[showEditor,setShowEditor]=useState(false),[storyPublic,setStoryPublic]=useState(true),[texts,setTexts]=useState([]),[newText,setNewText]=useState(''),[textColor,setTextColor]=useState('#fff'),[showTextInput,setShowTextInput]=useState(false)
  const chunks=useRef([])

  const startCam=useCallback(async(f)=>{
    if(stream)stream.getTracks().forEach(t=>t.stop())
    try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:f},audio:true});setStream(s);if(videoRef.current)videoRef.current.srcObject=s}catch(e){alert('Camera: '+e.message)}
  },[])

  useEffect(()=>{startCam(facing);return()=>stream?.getTracks().forEach(t=>t.stop())},[facing])

  function capture(){
    vibrate()
    const v=videoRef.current,c=canvasRef.current;if(!v||!c)return
    c.width=v.videoWidth;c.height=v.videoHeight
    const ctx=c.getContext('2d')
    if(facing==='user'){ctx.translate(c.width,0);ctx.scale(-1,1)}
    ctx.filter=CAM_FILTERS[filterIdx].css;ctx.drawImage(v,0,0)
    c.toBlob(blob=>{setCapturedBlob(blob);setCapturedUrl(URL.createObjectURL(blob))},'image/jpeg',0.85)
  }

  function startRecord(){
    if(!stream)return;setRecording(true);chunks.current=[]
    const mr=new MediaRecorder(stream,{mimeType:'video/webm'})
    mr.ondataavailable=e=>chunks.current.push(e.data)
    mr.onstop=()=>{const blob=new Blob(chunks.current,{type:'video/webm'});setCapturedBlob(blob);setCapturedUrl(URL.createObjectURL(blob))}
    mr.start();setMediaRec(mr)
    setTimeout(()=>{if(mr.state==='recording')mr.stop();setRecording(false)},30000)
  }

  function stopRecord(){if(mediaRec&&mediaRec.state==='recording'){mediaRec.stop();setRecording(false)}}

  function addText(){if(!newText.trim())return;setTexts(t=>[...t,{id:Date.now(),text:newText,color:textColor,x:50,y:40}]);setNewText('');setShowTextInput(false)}

  async function saveToDevice(){
    const a=document.createElement('a');a.href=capturedUrl;a.download=`fitsnap_${Date.now()}.jpg`;a.click()
  }

  async function postToStory(){
    if(!capturedBlob)return
    const path=`stories/${user.id}/${Date.now()}.jpg`
    const{error:upErr}=await supabase.storage.from('posts').upload(path,capturedBlob)
    if(upErr){alert('Upload failed');return}
    const{data}=supabase.storage.from('posts').getPublicUrl(path)
    await supabase.from('stories').insert({user_id:user.id,image_url:data.publicUrl,is_public:storyPublic,expires_at:new Date(Date.now()+24*3600*1000).toISOString()})
    onDone&&onDone();onClose()
  }

  async function sendToGroups(){
    if(!capturedBlob||!selectedGroups.length)return
    const path=`${user.id}/${Date.now()}.jpg`
    const{error:upErr}=await supabase.storage.from('posts').upload(path,capturedBlob)
    if(upErr){alert('Upload failed');return}
    const{data}=supabase.storage.from('posts').getPublicUrl(path)
    await Promise.all(selectedGroups.map(gid=>supabase.from('posts').insert({group_id:gid,user_id:user.id,image_url:data.publicUrl,caption:'',ghost_mode:false,filter_name:CAM_FILTERS[filterIdx].name})))
    await Promise.all(selectedGroups.map(gid=>supabase.from('groups').update({updated_at:new Date().toISOString()}).eq('id',gid)))
    onDone&&onDone();onClose()
  }

  // Send To sheet
  if(showSendTo&&capturedUrl){
    return(
      <div style={{position:'fixed',inset:0,background:'#000',zIndex:100,display:'flex',flexDirection:'column'}}>
        <img src={capturedUrl} style={{flex:1,objectFit:'cover',width:'100%'}} alt=""/>
        <div style={{background:'#0d0d0d',borderRadius:'20px 20px 0 0',padding:'20px 16px 40px'}}>
          <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>Send To</div>
          <div style={{fontSize:12,color:'#555',marginBottom:16}}>Select groups</div>
          {groups.map(g=>(
            <div key={g.id} onClick={()=>{vibrate();setSelectedGroups(s=>s.includes(g.id)?s.filter(x=>x!==g.id):[...s,g.id])}} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #111',cursor:'pointer'}}>
              <div style={{width:38,height:38,borderRadius:10,background:g.color||GROUP_COLORS[0],display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{g.icon||'💬'}</div>
              <div style={{flex:1,fontWeight:600,fontSize:14}}>{g.name}</div>
              <div style={{width:22,height:22,borderRadius:'50%',border:`2px solid ${selectedGroups.includes(g.id)?g.color||'#2563eb':'#333'}`,background:selectedGroups.includes(g.id)?g.color||'#2563eb':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11}}>{selectedGroups.includes(g.id)&&'✓'}</div>
            </div>
          ))}
          <button onClick={sendToGroups} disabled={!selectedGroups.length} style={{...ss.btn(null,'#2563eb'),width:'100%',marginTop:16,borderRadius:14,opacity:selectedGroups.length?1:.4}}>Send →</button>
          <button onClick={()=>setShowSendTo(false)} style={{...ss.btn('ghost'),width:'100%',marginTop:8,borderRadius:14}}>Back</button>
        </div>
      </div>
    )
  }

  // After capture
  if(capturedUrl){
    return(
      <div style={{position:'fixed',inset:0,background:'#000',zIndex:100,display:'flex',flexDirection:'column'}}>
        <div style={{flex:1,position:'relative',overflow:'hidden'}}>
          <img src={capturedUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
          {texts.map(t=>(
            <div key={t.id} style={{position:'absolute',left:`${t.x}%`,top:`${t.y}%`,transform:'translate(-50%,-50%)',color:t.color,fontSize:22,fontWeight:800,textShadow:'0 1px 4px rgba(0,0,0,.8)',pointerEvents:'none'}}>{t.text}</div>
          ))}
          {/* Right tools */}
          <div style={{position:'absolute',right:12,top:'30%',display:'flex',flexDirection:'column',gap:16}}>
            {[['T',()=>setShowTextInput(v=>!v)],['🎵',null],['✏️',null]].map(([ic,fn])=>(
              <button key={ic} onClick={fn||undefined} style={{width:40,height:40,borderRadius:'50%',background:'rgba(0,0,0,.6)',border:'none',color:'#fff',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800}}>{ic}</button>
            ))}
          </div>
          {showTextInput&&(
            <div style={{position:'absolute',bottom:120,left:16,right:16,background:'rgba(0,0,0,.9)',borderRadius:16,padding:12}}>
              <input style={{...ss.input,marginBottom:8}} placeholder="Add text…" value={newText} onChange={e=>setNewText(e.target.value)} autoFocus/>
              <div style={{display:'flex',gap:6,marginBottom:8}}>{TEXT_COLORS.map(c=><button key={c} onClick={()=>setTextColor(c)} style={{width:22,height:22,borderRadius:'50%',background:c,border:`2px solid ${c===textColor?'#fff':'transparent'}`,cursor:'pointer'}}/>)}</div>
              <button onClick={addText} style={{...ss.btn(),width:'100%',borderRadius:10,padding:'8px'}}>Add</button>
            </div>
          )}
          {/* Story privacy */}
          <div style={{position:'absolute',top:16,left:16,display:'flex',alignItems:'center',gap:8,background:'rgba(0,0,0,.6)',borderRadius:20,padding:'6px 12px'}}>
            <span style={{fontSize:12,color:'#fff'}}>{storyPublic?'🌍 Public':'🔒 Friends'}</span>
            <Toggle value={storyPublic} onChange={setStoryPublic} color='#2563eb'/>
          </div>
          <button onClick={()=>setCapturedUrl(null)} style={{position:'absolute',top:16,right:16,background:'rgba(0,0,0,.6)',border:'none',color:'#fff',borderRadius:'50%',width:36,height:36,cursor:'pointer',fontSize:18}}>✕</button>
        </div>
        {/* Bottom bar - Snapchat style */}
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'16px 20px 36px',background:'rgba(0,0,0,.95)'}}>
          <button onClick={saveToDevice} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,background:'rgba(255,255,255,.12)',border:'none',color:'#fff',borderRadius:16,padding:'12px 8px',cursor:'pointer'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span style={{fontSize:11,fontWeight:600}}>Save</span>
          </button>
          <button onClick={postToStory} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,background:'rgba(255,255,255,.12)',border:'none',color:'#fff',borderRadius:16,padding:'12px 8px',cursor:'pointer'}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:20,height:20,borderRadius:'50%',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10}}>👤</div>
            </div>
            <span style={{fontSize:11,fontWeight:600}}>My Story</span>
          </button>
          <button onClick={()=>setShowSendTo(true)} style={{flex:1.4,display:'flex',flexDirection:'column',alignItems:'center',gap:4,background:'#2563eb',border:'none',color:'#fff',borderRadius:16,padding:'12px 8px',cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <span style={{fontSize:14,fontWeight:800}}>Send To</span>
              {Icons.send()}
            </div>
            <span style={{fontSize:11,opacity:.8}}>Choose groups</span>
          </button>
        </div>
      </div>
    )
  }

  // Live viewfinder
  return(
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:100}}>
      <video ref={videoRef} autoPlay playsInline muted style={{width:'100%',height:'100%',objectFit:'cover',filter:CAM_FILTERS[filterIdx].css,transform:facing==='user'?'scaleX(-1)':'none'}}/>
      <canvas ref={canvasRef} style={{display:'none'}}/>
      {/* Top */}
      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px'}}>
        <button onClick={onClose} style={{background:'rgba(0,0,0,.5)',border:'none',color:'#fff',borderRadius:'50%',width:38,height:38,fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setMode(m=>m==='photo'?'video':'photo')} style={{background:'rgba(0,0,0,.5)',border:'none',color:'#fff',borderRadius:20,padding:'6px 14px',fontSize:12,cursor:'pointer',fontWeight:600}}>{mode==='photo'?'📹 Video':'📷 Photo'}</button>
        </div>
        <button onClick={()=>setFacing(f=>f==='user'?'environment':'user')} style={{background:'rgba(0,0,0,.5)',border:'none',color:'#fff',borderRadius:'50%',width:38,height:38,fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🔄</button>
      </div>
      {/* Filters right */}
      <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',gap:8}}>
        {CAM_FILTERS.map((f,i)=>(
          <button key={f.name} onClick={()=>setFilterIdx(i)} style={{width:40,height:40,borderRadius:'50%',border:`2px solid ${i===filterIdx?'#fff':'rgba(255,255,255,.25)'}`,background:'rgba(0,0,0,.5)',color:'#fff',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>{f.label}</button>
        ))}
      </div>
      {/* Bottom */}
      <div style={{position:'absolute',bottom:40,left:0,right:0,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 28px',gap:24}}>
        <label style={{cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',width:48,height:48}}>
          <div style={{width:48,height:48,borderRadius:12,border:'2px solid rgba(255,255,255,.5)',background:'rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <input type="file" accept="image/*,video/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setCapturedBlob(f);setCapturedUrl(URL.createObjectURL(f))}}}/>
        </label>
        {mode==='photo'
          ?<button onClick={capture} style={{width:74,height:74,borderRadius:'50%',background:'#fff',border:'4px solid rgba(255,255,255,.35)',cursor:'pointer',flexShrink:0}}/>
          :<button onMouseDown={startRecord} onMouseUp={stopRecord} onTouchStart={startRecord} onTouchEnd={stopRecord} style={{width:74,height:74,borderRadius:'50%',background:recording?T.danger:'#fff',border:`4px solid ${recording?T.danger:'rgba(255,255,255,.35)'}`,cursor:'pointer',flexShrink:0,transition:'all .2s'}}/>
        }
        <div style={{width:48,height:48}}/>
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
    <div style={{minHeight:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{width:'100%',maxWidth:360}}>
        <div style={{textAlign:'center',marginBottom:36}}>
          <div style={{fontSize:52,marginBottom:10}}>🔥</div>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:-1,color:'#fff'}}>FitSnap</div>
          <div style={{fontSize:13,color:'#555',marginTop:4}}>Accountability with your crew</div>
        </div>
        <div style={{background:'#0d0d0d',borderRadius:24,padding:24}}>
          <div style={{marginBottom:12}}><input style={ss.input} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/></div>
          <div style={{marginBottom:16}}><input style={ss.input} type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/></div>
          {err&&<div style={{color:T.danger,fontSize:12,marginBottom:12}}>{err}</div>}
          <button style={{...ss.btn(),width:'100%',padding:13,marginBottom:12,borderRadius:14,fontSize:15}} onClick={submit} disabled={loading}>{loading?'…':mode==='login'?'Log In':'Create Account'}</button>
          <div style={{textAlign:'center',fontSize:13,color:'#444'}}>
            {mode==='login'?'No account? ':'Have one? '}
            <span style={{color:'#5b9cf6',cursor:'pointer',fontWeight:700}} onClick={()=>{setMode(m=>m==='login'?'signup':'login');setErr('')}}>{mode==='login'?'Sign Up':'Log In'}</span>
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
    if(avatarFile){const ext=avatarFile.name.split('.').pop(),path=`avatars/${user.id}.${ext}`;const{error:upErr}=await supabase.storage.from('avatars').upload(path,avatarFile,{upsert:true});if(!upErr){const{data}=supabase.storage.from('avatars').getPublicUrl(path);avatar_url=data.publicUrl}}
    const{error}=await supabase.from('profiles').upsert({id:user.id,username:form.username.trim(),current_weight:parseFloat(form.current_weight)||null,goal_weight:parseFloat(form.goal_weight)||null,main_goal:form.main_goal.trim(),is_weight_public:form.is_weight_public,...(avatar_url&&{avatar_url}),updated_at:new Date().toISOString()})
    setLoading(false)
    if(error){setErr(error.message);return}
    onDone()
  }
  return(
    <div style={{minHeight:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#0d0d0d',borderRadius:24,width:'100%',maxWidth:380,padding:24}}>
        <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>Set up your profile</div>
        <div style={{fontSize:13,color:'#555',marginBottom:20}}>Just once 👊</div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:20}}>
          <div onClick={()=>fileRef.current.click()} style={{width:76,height:76,borderRadius:'50%',background:'#111',border:'2.5px solid #2563eb',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',marginBottom:6,overflow:'hidden',fontSize:30}}>
            {avatarPreview?<img src={avatarPreview} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:'📷'}
          </div>
          <span style={{fontSize:12,color:'#5b9cf6',cursor:'pointer'}} onClick={()=>fileRef.current.click()}>Add photo</span>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setAvatarFile(f);setAvatarPreview(URL.createObjectURL(f))}}}/>
        </div>
        {[['Username *','username','text','yourname'],['Current weight (lbs)','current_weight','number','175'],['Goal weight (lbs)','goal_weight','number','160'],['Main goal','main_goal','text','Lose 15 lbs by summer']].map(([lbl,key,type,ph])=>(
          <div key={key} style={{marginBottom:12}}>
            <div style={{fontSize:10,color:'#444',marginBottom:4,textTransform:'uppercase',letterSpacing:.8,fontWeight:700}}>{lbl}</div>
            <input style={ss.input} type={type} placeholder={ph} value={form[key]} onChange={e=>set(key,e.target.value)}/>
          </div>
        ))}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,padding:'12px 16px',background:'#111',borderRadius:14}}>
          <div><div style={{fontSize:13,fontWeight:600}}>Show weight publicly</div><div style={{fontSize:11,color:'#444'}}>Visible to group members</div></div>
          <Toggle value={form.is_weight_public} onChange={v=>set('is_weight_public',v)}/>
        </div>
        {err&&<div style={{color:T.danger,fontSize:12,marginBottom:10}}>{err}</div>}
        <button style={{...ss.btn(),width:'100%',padding:13,borderRadius:14,fontSize:15}} onClick={save} disabled={loading}>{loading?'Setting up…':'Get Started →'}</button>
      </div>
    </div>
  )
}

// ── STORY VIEWER ──────────────────────────────────────────────
function StoryViewer({stories,startIdx=0,user,onClose}){
  const [idx,setIdx]=useState(startIdx),[progress,setProgress]=useState(0)
  const story=stories[idx]
  const DURATION=5000

  useEffect(()=>{
    setProgress(0)
    const start=Date.now()
    const interval=setInterval(()=>{
      const p=Math.min(100,((Date.now()-start)/DURATION)*100)
      setProgress(p)
      if(p>=100){if(idx<stories.length-1)setIdx(i=>i+1);else onClose()}
    },50)
    if(story&&user)supabase.from('story_views').upsert({story_id:story.id,viewer_id:user.id}).catch(()=>{})
    return()=>clearInterval(interval)
  },[idx])

  if(!story)return null

  return(
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:200}} onClick={e=>{const x=e.clientX/window.innerWidth;if(x>0.5){if(idx<stories.length-1)setIdx(i=>i+1);else onClose()}else{if(idx>0)setIdx(i=>i-1)}}}>
      <img src={story.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
      {/* Progress bars */}
      <div style={{position:'absolute',top:12,left:12,right:12,display:'flex',gap:3}}>
        {stories.map((_,i)=>(
          <div key={i} style={{flex:1,height:2,background:'rgba(255,255,255,.3)',borderRadius:2,overflow:'hidden'}}>
            <div style={{height:'100%',background:'#fff',width:`${i<idx?100:i===idx?progress:0}%`,transition:i===idx?'none':'none',borderRadius:2}}/>
          </div>
        ))}
      </div>
      {/* Header */}
      <div style={{position:'absolute',top:24,left:16,right:16,display:'flex',alignItems:'center',gap:10,marginTop:8}}>
        <Avatar url={story.profiles?.avatar_url} name={story.profiles?.username} size={32}/>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:'#fff',textShadow:'0 1px 4px rgba(0,0,0,.8)'}}>{story.profiles?.username}</div><div style={{fontSize:11,color:'rgba(255,255,255,.7)'}}>{ago(story.created_at)}</div></div>
        <button onClick={e=>{e.stopPropagation();onClose()}} style={{background:'rgba(0,0,0,.5)',border:'none',color:'#fff',borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:16}}>✕</button>
      </div>
      {story.caption&&<div style={{position:'absolute',bottom:40,left:16,right:16,color:'#fff',fontSize:15,fontWeight:600,textShadow:'0 1px 4px rgba(0,0,0,.8)',textAlign:'center'}}>{story.caption}</div>}
    </div>
  )
}

// ── HOME ──────────────────────────────────────────────────────
function HomeScreen({user,onOpenGroup,onOpenCamera}){
  const [groups,setGroups]=useState([]),[loading,setLoading]=useState(true),[myStreak,setMyStreak]=useState(0),[showCreate,setShowCreate]=useState(false),[newName,setNewName]=useState(''),[newIcon,setNewIcon]=useState('🏋️'),[newColor,setNewColor]=useState('#2563eb'),[creating,setCreating]=useState(false),[pinnedIds,setPinnedIds]=useState(()=>{try{return JSON.parse(localStorage.getItem('pinnedGroups')||'[]')}catch{return[]}}),[swipeGroupId,setSwipeGroupId]=useState(null),[stories,setStories]=useState([]),[viewingStories,setViewingStories]=useState(null),[groupPreviews,setGroupPreviews]=useState({}),[unreadGroups,setUnreadGroups]=useState({}),[refreshing,setRefreshing]=useState(false)

  const load=useCallback(async()=>{
    const{data:memberships}=await supabase.from('group_members').select('group_id').eq('user_id',user.id)
    if(!memberships?.length){setGroups([]);setLoading(false);return}
    const ids=memberships.map(m=>m.group_id)
    const{data}=await supabase.from('groups').select('*').in('id',ids).eq('is_dm',false).order('updated_at',{ascending:false})
    setGroups(data||[])
    // Load last post thumbnail per group
    const previews={}
    await Promise.all((data||[]).map(async g=>{
      const{data:p}=await supabase.from('posts').select('image_url,created_at').eq('group_id',g.id).order('created_at',{ascending:false}).limit(1)
      if(p?.[0]?.image_url)previews[g.id]=p[0]
    }))
    setGroupPreviews(previews)
    const{data:st}=await supabase.from('streaks').select('current_streak').eq('user_id',user.id).single()
    if(st)setMyStreak(st.current_streak)
    setLoading(false)
  },[user.id])

  const loadStories=useCallback(async()=>{
    // Load stories from friends and public
    const{data}=await supabase.from('stories').select('*,profiles(username,avatar_url)').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(50)
    // Group by user
    const byUser={}
    ;(data||[]).forEach(s=>{if(!byUser[s.user_id])byUser[s.user_id]=[];byUser[s.user_id].push(s)})
    setStories(Object.values(byUser))
  },[])

  useEffect(()=>{load();loadStories()},[load,loadStories])

  async function pullRefresh(){
    setRefreshing(true);await load();await loadStories();setRefreshing(false)
  }

  function togglePin(id){
    vibrate()
    setPinnedIds(p=>{const next=p.includes(id)?p.filter(x=>x!==id):[...p,id];localStorage.setItem('pinnedGroups',JSON.stringify(next));return next})
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

  // My story
  const myStoryGroup=stories.find(sg=>sg[0]?.user_id===user.id)

  return(
    <div style={{...ss.page,paddingBottom:80}} onTouchStart={e=>{e.currentTarget._startY=e.touches[0].clientY}} onTouchEnd={e=>{const dy=e.changedTouches[0].clientY-e.currentTarget._startY;if(dy>60&&!refreshing)pullRefresh()}}>
      <div style={ss.topBar}>
        <div style={{fontSize:20,fontWeight:900,flex:1,letterSpacing:-0.5}}>FitSnap</div>
        {myStreak>0&&<div style={{background:'linear-gradient(135deg,#f97316,#ef4444)',color:'#fff',borderRadius:10,fontSize:12,fontWeight:800,padding:'3px 9px'}}>🔥{myStreak}</div>}
        <button onClick={()=>setShowCreate(v=>!v)} style={{background:'#111',border:'none',borderRadius:20,color:'#fff',padding:'6px 14px',fontSize:13,cursor:'pointer',fontWeight:700}}>+ New</button>
      </div>

      {refreshing&&<div style={{textAlign:'center',padding:'8px',fontSize:12,color:'#444'}}>Refreshing…</div>}

      {/* Stories row */}
      <div style={{display:'flex',gap:12,padding:'12px 16px',overflowX:'auto',borderBottom:'1px solid #0d0d0d'}}>
        {/* My story */}
        <div onClick={()=>myStoryGroup?setViewingStories({stories:myStoryGroup,idx:0}):onOpenCamera()} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',flexShrink:0}}>
          <div style={{width:54,height:54,borderRadius:'50%',background:myStoryGroup?'linear-gradient(135deg,#f97316,#ef4444)':'#111',padding:myStoryGroup?2:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{width:myStoryGroup?48:54,height:myStoryGroup?48:54,borderRadius:'50%',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,border:myStoryGroup?'2px solid #000':'none',overflow:'hidden'}}>
              {myStoryGroup?<img src={myStoryGroup[0].image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:'+'}
            </div>
          </div>
          <span style={{fontSize:10,color:'#555',fontWeight:600}}>My Story</span>
        </div>
        {/* Others */}
        {stories.filter(sg=>sg[0]?.user_id!==user.id).map((sg,i)=>(
          <div key={i} onClick={()=>setViewingStories({stories:sg,idx:0})} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',flexShrink:0}}>
            <div style={{width:54,height:54,borderRadius:'50%',background:'linear-gradient(135deg,#2563eb,#8b5cf6)',padding:2,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:48,height:48,borderRadius:'50%',background:'#111',border:'2px solid #000',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                {sg[0].profiles?.avatar_url?<img src={sg[0].profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:<span style={{fontSize:18,fontWeight:800}}>{initials(sg[0].profiles?.username)}</span>}
              </div>
            </div>
            <span style={{fontSize:10,color:'#888',fontWeight:600,maxWidth:54,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sg[0].profiles?.username}</span>
          </div>
        ))}
      </div>

      {/* Create group panel */}
      {showCreate&&(
        <div style={{padding:'12px 16px',background:'#0d0d0d',borderBottom:'1px solid #111'}}>
          <div style={{fontSize:11,color:'#444',marginBottom:10,textTransform:'uppercase',letterSpacing:.8,fontWeight:700}}>New Group</div>
          <div style={{display:'flex',gap:8,marginBottom:10}}>
            <span style={{fontSize:20,padding:'6px'}}>{newIcon}</span>
            <input style={{...ss.input,flex:1}} placeholder="Group name…" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&create()}/>
            <button style={{...ss.btn(),padding:'8px 16px',borderRadius:12,fontSize:13}} onClick={create} disabled={creating}>{creating?'…':'Create'}</button>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>{GROUP_ICONS.map(ic=><button key={ic} onClick={()=>setNewIcon(ic)} style={{fontSize:18,background:ic===newIcon?'#1e2a3a':'#111',border:`1px solid ${ic===newIcon?'#2563eb':'#1a1a1a'}`,borderRadius:8,padding:'5px 7px',cursor:'pointer'}}>{ic}</button>)}</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{GROUP_COLORS.map(c=><button key={c} onClick={()=>setNewColor(c)} style={{width:24,height:24,borderRadius:'50%',background:c,border:`2.5px solid ${c===newColor?'#fff':'transparent'}`,cursor:'pointer'}}/>)}</div>
        </div>
      )}

      {/* Groups list */}
      {loading?[0,1,2].map(i=><SkeletonCard key={i}/>):sorted.length===0
        ?<div style={{textAlign:'center',padding:70,color:'#333'}}><div style={{fontSize:40,marginBottom:10}}>💬</div><div style={{fontSize:14,fontWeight:600}}>No groups yet</div><div style={{fontSize:12,color:'#222',marginTop:4}}>Create one or get invited</div></div>
        :sorted.map(g=>{
          const accent=groupAccent(g),isPinned=pinnedIds.includes(g.id),isSwipe=swipeGroupId===g.id,preview=groupPreviews[g.id]
          return(
            <div key={g.id} style={{position:'relative',overflow:'hidden'}}>
              {isSwipe&&<div style={{position:'absolute',right:0,top:0,bottom:0,display:'flex',alignItems:'center',zIndex:1}}>
                <button onClick={()=>togglePin(g.id)} style={{height:'100%',padding:'0 24px',background:isPinned?'#1a1a1a':'#1a2a3a',border:'none',color:'#fff',fontSize:13,cursor:'pointer',fontWeight:700}}>{isPinned?'Unpin':'📌 Pin'}</button>
              </div>}
              <div
                style={{display:'flex',alignItems:'center',padding:'12px 16px',borderBottom:'1px solid #0d0d0d',cursor:'pointer',background:T.bg,transition:'transform .2s',transform:isSwipe?'translateX(-88px)':'translateX(0)',position:'relative',overflow:'hidden'}}
                onClick={()=>{if(isSwipe)setSwipeGroupId(null);else{vibrate();onOpenGroup(g)}}}
                onTouchStart={e=>{e.currentTarget._startX=e.touches[0].clientX}}
                onTouchEnd={e=>{const dx=e.changedTouches[0].clientX-e.currentTarget._startX;if(dx<-40)setSwipeGroupId(g.id);else if(dx>20)setSwipeGroupId(null)}}
              >
                {/* Blurred bg thumbnail */}
                {preview?.image_url&&<div style={{position:'absolute',inset:0,backgroundImage:`url(${preview.image_url})`,backgroundSize:'cover',backgroundPosition:'center',filter:'blur(20px) brightness(0.15)',transform:'scale(1.1)'}}/>}
                <div style={{position:'relative',display:'flex',alignItems:'center',gap:12,width:'100%'}}>
                  <div style={{width:48,height:48,borderRadius:14,background:accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0,position:'relative',overflow:'hidden'}}>
                    {preview?.image_url?<img src={preview.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:(g.icon||'💬')}
                    {isPinned&&<div style={{position:'absolute',top:-2,right:-2,fontSize:10}}>📌</div>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:15,marginBottom:1}}>{g.name}</div>
                    <div style={{fontSize:11,color:'#444'}}>Swipe left to pin</div>
                  </div>
                  <div style={{width:8,height:8,borderRadius:'50%',background:accent,opacity:.6}}/>
                </div>
              </div>
            </div>
          )
        })
      }

      {viewingStories&&<StoryViewer stories={viewingStories.stories} startIdx={viewingStories.idx} user={user} onClose={()=>setViewingStories(null)}/>}
    </div>
  )
}

// ── GROUP SCREEN ──────────────────────────────────────────────
function GroupScreen({group,user,onBack,onViewProfile}){
  const [tab,setTab]=useState('feed'),[posts,setPosts]=useState([]),[loading,setLoading]=useState(true),[reactions,setReactions]=useState({}),[myReactions,setMyReactions]=useState({}),[holdPost,setHoldPost]=useState(null),[leaderboard,setLeaderboard]=useState([]),[challenges,setChallenges]=useState([]),[shameWall,setShameWall]=useState([]),[mvpVotes,setMvpVotes]=useState({}),[myVote,setMyVote]=useState(null),[members,setMembers]=useState([]),[showManage,setShowManage]=useState(false),[addSearch,setAddSearch]=useState(''),[addResults,setAddResults]=useState([]),[copied,setCopied]=useState(false),[chatMessages,setChatMessages]=useState([]),[chatText,setChatText]=useState(''),[chatSending,setChatSending]=useState(false),[seasons,setSeasons]=useState([]),[showCreateSeason,setShowCreateSeason]=useState(false),[restDays,setRestDays]=useState([]),[gymName,setGymName]=useState(''),[showGymCheck,setShowGymCheck]=useState(false)
  const [caption,setCaption]=useState(''),[file,setFile]=useState(null),[preview,setPreview]=useState(null),[posting,setPosting]=useState(false),[expiringMode,setExpiringMode]=useState(false),[showSongCheck,setShowSongCheck]=useState(false),[songTitle,setSongTitle]=useState(''),[songArtist,setSongArtist]=useState(''),[showCam,setShowCam]=useState(false)
  const fileRef=useRef(),chatBottomRef=useRef()
  const accent=groupAccent(group),isOwner=group.created_by===user.id
  const inviteLink=`${window.location.origin}?joingroup=${group.id}`

  const loadPosts=useCallback(async()=>{
    const{data,error}=await supabase.from('posts').select('*,profiles(id,username,avatar_url,is_weight_public,current_weight)').eq('group_id',group.id).order('created_at',{ascending:false})
    console.log('posts',data,'err',error)
    setPosts((data||[]).filter(p=>!isExpired(p)))
    if(data?.length){
      const ids=data.map(p=>p.id)
      const{data:rxns}=await supabase.from('reactions').select('post_id,emoji,user_id').in('post_id',ids)
      const map={},mine={}
      ;(rxns||[]).forEach(r=>{
        if(!map[r.post_id])map[r.post_id]={}
        map[r.post_id][r.emoji]=(map[r.post_id][r.emoji]||0)+1
        if(r.user_id===user.id)mine[r.post_id]=r.emoji
      })
      setReactions(map);setMyReactions(mine)
    }
    setLoading(false)
  },[group.id,user.id])

  const loadChat=useCallback(async()=>{
    const{data}=await supabase.from('messages').select('*,profiles(username,avatar_url)').eq('group_id',group.id).order('created_at',{ascending:true}).limit(100)
    setChatMessages(data||[]);setTimeout(()=>chatBottomRef.current?.scrollIntoView({behavior:'smooth'}),80)
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
    const{data:rd}=await supabase.from('rest_days').select('user_id').eq('date',today())
    const posted=new Set((tp||[]).map(p=>p.user_id))
    const resting=new Set((rd||[]).map(r=>r.user_id))
    setShameWall((mems||[]).filter(m=>!posted.has(m.user_id)&&!resting.has(m.user_id)&&m.user_id!==user.id))
    setRestDays(rd||[])
  },[group.id,user.id])

  const loadMVP=useCallback(async()=>{
    const wk=currentWeek()
    const{data}=await supabase.from('mvp_votes').select('nominee_id').eq('group_id',group.id).eq('week',wk)
    const map={};(data||[]).forEach(v=>{map[v.nominee_id]=(map[v.nominee_id]||0)+1});setMvpVotes(map)
    const{data:mine}=await supabase.from('mvp_votes').select('nominee_id').eq('group_id',group.id).eq('voter_id',user.id).eq('week',wk).single()
    if(mine)setMyVote(mine.nominee_id)
  },[group.id,user.id])

  useEffect(()=>{loadPosts();loadLeaderboard();loadMembers();loadChallenges();loadShame();loadMVP()},[])

  useEffect(()=>{
    if(tab!=='chat')return
    loadChat()
    const ch=supabase.channel(`grpchat_${group.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`group_id=eq.${group.id}`},()=>loadChat()).subscribe()
    return()=>supabase.removeChannel(ch)
  },[tab,loadChat])

  async function sendChatMessage(){
    if(!chatText.trim())return;setChatSending(true)
    await supabase.from('messages').insert({group_id:group.id,sender_id:user.id,content:chatText.trim()})
    setChatText('');setChatSending(false)
  }

  async function searchToAdd(){
    if(!addSearch.trim())return
    const{data}=await supabase.from('profiles').select('id,username,avatar_url').ilike('username',`%${addSearch.trim()}%`).neq('id',user.id).limit(8)
    const memberIds=new Set(members.map(m=>m.user_id))
    setAddResults((data||[]).filter(u=>!memberIds.has(u.id)))
  }
  async function addMember(uid){await supabase.from('group_members').insert({group_id:group.id,user_id:uid});setAddResults(r=>r.filter(u=>u.id!==uid));loadMembers()}
  async function kickMember(uid){if(!window.confirm('Remove?'))return;await supabase.from('group_members').delete().eq('group_id',group.id).eq('user_id',uid);loadMembers()}
  async function deleteGroup(){if(!window.confirm('Delete group? Cannot be undone.'))return;await supabase.from('group_members').delete().eq('group_id',group.id);await supabase.from('posts').delete().eq('group_id',group.id);await supabase.from('groups').delete().eq('id',group.id);onBack()}

  async function updateStreak(){
    const{data:st}=await supabase.from('streaks').select('*').eq('user_id',user.id).single()
    const td=today()
    if(st){if(st.last_post_date===td)return;const diff=(new Date(td)-new Date(st.last_post_date))/(1000*60*60*24);const newStreak=diff===1?st.current_streak+1:1;await supabase.from('streaks').update({current_streak:newStreak,longest_streak:Math.max(newStreak,st.longest_streak||0),last_post_date:td,updated_at:new Date().toISOString()}).eq('user_id',user.id);if(newStreak===7)await awardBadge(user.id,'streak_7');if(newStreak===30)await awardBadge(user.id,'streak_30')}else await supabase.from('streaks').insert({user_id:user.id,current_streak:1,longest_streak:1,last_post_date:td})
  }
  async function awardBadge(uid,type){const{error}=await supabase.from('badges').insert({user_id:uid,badge_type:type});if(!error)await supabase.from('notifications').insert({user_id:uid,type:'badge',message:`You earned the ${BADGE_META[type]?.label} badge! ${BADGE_META[type]?.icon}`})}

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
    const{error}=await supabase.from('posts').insert({group_id:group.id,user_id:user.id,caption:caption.trim(),image_url,ghost_mode:false,...(songTitle&&{song_title:songTitle,song_artist:songArtist}),is_expiring:expiringMode,...(expiresAt&&{expires_at:expiresAt})})
    if(!error){
      await updateStreak();if(isFirst)await awardBadge(user.id,'first_post')
      await supabase.from('groups').update({updated_at:new Date().toISOString()}).eq('id',group.id)
      if(gymName.trim()){await supabase.from('gym_checkins').insert({user_id:user.id,gym_name:gymName.trim()});setGymName('');setShowGymCheck(false)}
      setCaption('');setFile(null);setPreview(null);setSongTitle('');setSongArtist('');setShowSongCheck(false);setExpiringMode(false)
      loadPosts();loadShame()
    }else alert(error.message)
    setPosting(false)
  }

  async function reactToPost(postId,emoji,ownerId){
    vibrate()
    setHoldPost(null)
    await supabase.from('reactions').upsert({post_id:postId,user_id:user.id,emoji},{onConflict:'post_id,user_id'})
    setMyReactions(m=>({...m,[postId]:emoji}))
    setReactions(r=>{const cur={...r[postId]||{}};cur[emoji]=(cur[emoji]||0)+1;return{...r,[postId]:cur}})
    if(ownerId!==user.id)await supabase.from('notifications').insert({user_id:ownerId,type:'reaction',message:`Someone reacted ${emoji} to your post!`})
  }

  async function logRestDay(){
    await supabase.from('rest_days').insert({user_id:user.id,date:today()})
    loadShame()
    alert('Rest day logged! 💤 You won\'t show on the shame wall today.')
  }

  async function voteMVP(nomineeId){
    if(myVote)return;const wk=currentWeek()
    const{error}=await supabase.from('mvp_votes').insert({group_id:group.id,voter_id:user.id,nominee_id:nomineeId,week:wk})
    if(!error){setMyVote(nomineeId);setMvpVotes(m=>({...m,[nomineeId]:(m[nomineeId]||0)+1}));await supabase.from('notifications').insert({user_id:nomineeId,type:'mvp',message:'You got an MVP vote this week! 👑'})}
  }

  function hype(uid,username){supabase.from('notifications').insert({user_id:uid,type:'hype',message:'Someone sent you a hype! Go post your workout 💪'});alert(`📣 Hype sent to ${username}!`)}

  if(showCam)return<CameraScreen onClose={()=>setShowCam(false)} onDone={()=>loadPosts()} groups={[group]} user={user}/>

  const isRestingToday=restDays.some(r=>r.user_id===user.id)

  return(
    <div style={{...ss.page,paddingBottom:tab==='chat'?0:130}}>
      {/* Top bar */}
      <div style={{...ss.topBar,borderBottom:`1px solid ${accent}22`}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:T.text,cursor:'pointer',display:'flex',alignItems:'center',padding:'0 4px'}}>{Icons.back()}</button>
        <div style={{width:30,height:30,borderRadius:8,background:accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>{group.icon||'💬'}</div>
        <div style={{fontWeight:800,fontSize:15,flex:1}}>{group.name}</div>
        {isOwner&&<button onClick={()=>setShowManage(v=>!v)} style={{background:'none',border:'none',color:showManage?accent:'#444',fontSize:16,cursor:'pointer'}}>⚙️</button>}
      </div>

      {/* Manage panel */}
      {showManage&&isOwner&&(
        <div style={{background:'#0d0d0d',borderBottom:'1px solid #111',padding:'14px 16px'}}>
          <div style={{fontSize:11,color:'#444',marginBottom:12,textTransform:'uppercase',letterSpacing:.8,fontWeight:700}}>Manage Group</div>
          <div style={{background:'#111',borderRadius:12,padding:10,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>🔗 Invite Link</div>
            <div style={{display:'flex',gap:6}}>
              <div style={{flex:1,fontSize:11,color:'#444',background:'#0a0a0a',padding:'7px 10px',borderRadius:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inviteLink}</div>
              <button onClick={async()=>{await navigator.clipboard.writeText(inviteLink);setCopied(true);setTimeout(()=>setCopied(false),2000)}} style={{...ss.btn(null,accent),padding:'6px 12px',fontSize:12,borderRadius:8}}>{copied?'✓':'Copy'}</button>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>➕ Add Member</div>
            <div style={{display:'flex',gap:6,marginBottom:8}}>
              <input style={{...ss.input,flex:1}} placeholder="Search username…" value={addSearch} onChange={e=>setAddSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchToAdd()}/>
              <button style={{...ss.btn(null,accent),padding:'8px 12px',fontSize:12,borderRadius:8}} onClick={searchToAdd}>Search</button>
            </div>
            {addResults.map(u=>(
              <div key={u.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #111'}}>
                <Avatar url={u.avatar_url} name={u.username} size={28}/>
                <div style={{flex:1,fontSize:13,fontWeight:600}}>{u.username}</div>
                <button onClick={()=>addMember(u.id)} style={{...ss.btn(null,accent),padding:'5px 10px',fontSize:12,borderRadius:8}}>Add</button>
              </div>
            ))}
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>👥 Members ({members.length})</div>
            {members.map(m=>(
              <div key={m.user_id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #0d0d0d'}}>
                <Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={26}/>
                <div style={{flex:1,fontSize:12,fontWeight:600}}>{m.profiles?.username}{m.user_id===group.created_by?' 👑':''}</div>
                {m.user_id!==user.id&&<button onClick={()=>kickMember(m.user_id)} style={{background:'none',border:'1px solid #222',borderRadius:6,color:T.danger,padding:'3px 8px',fontSize:11,cursor:'pointer'}}>Kick</button>}
              </div>
            ))}
          </div>
          <button onClick={deleteGroup} style={{...ss.btn('danger'),width:'100%',borderRadius:12,fontSize:13}}>🗑️ Delete Group</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:6,padding:'8px 14px',borderBottom:'1px solid #0d0d0d',overflowX:'auto'}}>
        {['feed','chat','leaderboard','mvp','challenges','shame'].map(t=>(
          <button key={t} style={ss.pill(tab===t,accent)} onClick={()=>{vibrate();setTab(t)}}>
            {t==='feed'?'Feed':t==='chat'?'💬':t==='leaderboard'?'🏆':t==='mvp'?'👑 MVP':t==='challenges'?'🎯 Bets':'💀 Shame'}
          </button>
        ))}
      </div>

      {/* FEED */}
      {tab==='feed'&&(
        <div>
          {loading?[0,1,2].map(i=><SkeletonCard key={i}/>):posts.length===0
            ?<div style={{textAlign:'center',padding:60,color:'#333'}}><div style={{fontSize:36,marginBottom:8}}>📸</div><div style={{fontSize:14,fontWeight:600}}>No posts yet</div></div>
            :posts.map(p=>(
              <div key={p.id} style={{marginBottom:2,background:'#000',position:'relative'}}
                onTouchStart={e=>{e.currentTarget._holdTimer=setTimeout(()=>{vibrate(20);setHoldPost(p.id)},400)}}
                onTouchEnd={e=>{clearTimeout(e.currentTarget._holdTimer)}}
                onMouseDown={e=>{e.currentTarget._holdTimer=setTimeout(()=>{vibrate(20);setHoldPost(p.id)},400)}}
                onMouseUp={e=>{clearTimeout(e.currentTarget._holdTimer)}}
              >
                {/* Hold reaction wheel */}
                {holdPost===p.id&&(
                  <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.7)',zIndex:10,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setHoldPost(null)}>
                    <div style={{display:'flex',gap:12,background:'#111',borderRadius:40,padding:'12px 20px',border:'1px solid #222'}}>
                      {REACTIONS.map(r=>(
                        <button key={r.emoji} onClick={()=>reactToPost(p.id,r.emoji,p.user_id)} style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                          <span style={{fontSize:28}}>{r.emoji}</span>
                          <span style={{fontSize:10,color:'#888'}}>{r.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px'}}>
                  <div style={{cursor:'pointer'}} onClick={()=>onViewProfile&&onViewProfile(p.profiles?.id)}><Avatar url={p.profiles?.avatar_url} name={p.profiles?.username} size={32} color={accent}/></div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14,cursor:'pointer'}} onClick={()=>onViewProfile&&onViewProfile(p.profiles?.id)}>{p.profiles?.username||'Unknown'}</div>
                    {p.profiles?.is_weight_public&&p.profiles?.current_weight&&<div style={{fontSize:11,color:'#444'}}>{p.profiles.current_weight} lbs</div>}
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:11,color:'#333'}}>{ago(p.created_at)}</div>
                    {p.is_expiring&&p.expires_at&&<div style={{fontSize:10,color:T.warning}}>⏳{timeLeft(p.expires_at)}</div>}
                  </div>
                </div>
                {p.image_url&&<img src={p.image_url} style={{width:'100%',maxHeight:400,objectFit:'cover',display:'block'}} alt=""/>}
                {(p.caption||p.song_title)&&(
                  <div style={{padding:'10px 14px'}}>
                    {p.caption&&<div style={{fontSize:14,lineHeight:1.4,marginBottom:p.song_title?4:0}}>{p.caption}</div>}
                    {p.song_title&&<div style={{fontSize:12,color:'#555'}}>🎵 {p.song_title}{p.song_artist?` — ${p.song_artist}`:''}</div>}
                  </div>
                )}
                {/* Reactions display */}
                <div style={{padding:'6px 14px 10px',display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                  {Object.entries(reactions[p.id]||{}).map(([emoji,count])=>(
                    <div key={emoji} style={{background:myReactions[p.id]===emoji?`${accent}22`:'#111',borderRadius:14,padding:'4px 10px',fontSize:13,border:`1px solid ${myReactions[p.id]===emoji?accent:'#1a1a1a'}`}}>{emoji} {count}</div>
                  ))}
                  {!Object.keys(reactions[p.id]||{}).length&&<div style={{fontSize:11,color:'#333'}}>Hold to react</div>}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* CHAT */}
      {tab==='chat'&&(
        <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 160px)'}}>
          <div style={{flex:1,overflowY:'auto',padding:'10px 14px',display:'flex',flexDirection:'column',gap:4}}>
            {chatMessages.map(m=>{
              const isMe=m.sender_id===user.id
              return(
                <div key={m.id} style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start'}}>
                  {!isMe&&<div style={{fontSize:11,color:'#444',marginBottom:2,marginLeft:4}}>{m.profiles?.username}</div>}
                  <div style={{maxWidth:'74%',background:isMe?accent:'#111',padding:'9px 14px',borderRadius:isMe?'18px 18px 4px 18px':'18px 18px 18px 4px',fontSize:14,lineHeight:1.4}}>
                    {m.content}
                  </div>
                  <div style={{fontSize:10,color:'#2a2a2a',marginTop:2}}>{ago(m.created_at)}</div>
                </div>
              )
            })}
            <div ref={chatBottomRef}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px 32px',background:'rgba(0,0,0,.98)',borderTop:'1px solid #0d0d0d'}}>
            <input style={{...ss.input,flex:1,padding:'10px 16px'}} placeholder="Message…" value={chatText} onChange={e=>setChatText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChatMessage()}/>
            <button onClick={sendChatMessage} disabled={chatSending||!chatText.trim()} style={{width:36,height:36,borderRadius:'50%',background:chatText.trim()?accent:'#111',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background .2s'}}>
              {Icons.send()}
            </button>
          </div>
        </div>
      )}

      {/* LEADERBOARD */}
      {tab==='leaderboard'&&(
        <div style={{padding:14}}>
          {leaderboard.map((m,i)=>(
            <div key={m.user_id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid #0d0d0d',cursor:'pointer'}} onClick={()=>onViewProfile&&onViewProfile(m.user_id)}>
              <div style={{fontSize:16,fontWeight:900,color:i===0?T.warning:i===1?'#888':i===2?'#cd7f32':'#333',width:24}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</div>
              <Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={34} color={accent}/>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{m.profiles?.username||'Unknown'}</div><div style={{fontSize:11,color:'#444'}}>Best: {m.streaks?.longest_streak||0}d</div></div>
              {(m.streaks?.current_streak||0)>0&&<div style={{background:'linear-gradient(135deg,#f97316,#ef4444)',color:'#fff',borderRadius:8,fontSize:12,fontWeight:800,padding:'3px 8px'}}>🔥{m.streaks.current_streak}</div>}
            </div>
          ))}
        </div>
      )}

      {/* MVP */}
      {tab==='mvp'&&(
        <div style={{padding:14}}>
          <div style={{background:`${accent}12`,border:`1px solid ${accent}22`,borderRadius:14,padding:12,marginBottom:12}}>
            <div style={{fontSize:15,fontWeight:800,marginBottom:2}}>👑 MVP of the Week</div>
            <div style={{fontSize:12,color:'#555'}}>{myVote?'You voted ✓':'Hold down to vote'}</div>
          </div>
          {leaderboard.map(m=>{
            const votes=mvpVotes[m.user_id]||0,isMyVote=myVote===m.user_id
            return(
              <div key={m.user_id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid #0d0d0d'}}>
                <Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={34} color={accent}/>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{m.profiles?.username}</div><div style={{fontSize:12,color:'#444'}}>{votes} vote{votes!==1?'s':''}</div></div>
                <button style={{background:isMyVote?accent:'#111',border:isMyVote?'none':'1px solid #1a1a1a',color:'#fff',padding:'7px 14px',fontSize:12,borderRadius:12,cursor:'pointer',fontWeight:700}} onClick={()=>voteMVP(m.user_id)} disabled={!!myVote}>{isMyVote?'👑 Voted':'Vote'}</button>
              </div>
            )
          })}
        </div>
      )}

      {tab==='challenges'&&<ChallengesTab group={group} user={user} challenges={challenges} reload={loadChallenges} accent={accent} seasons={seasons}/>}

      {/* SHAME WALL */}
      {tab==='shame'&&(
        <div style={{padding:14}}>
          {!isRestingToday&&<button onClick={logRestDay} style={{...ss.btn('ghost'),width:'100%',marginBottom:12,borderRadius:12,border:'1px solid #1a1a1a',fontSize:13}}>💤 Log Rest Day (won't appear here)</button>}
          {isRestingToday&&<div style={{textAlign:'center',padding:'10px',marginBottom:12,background:'#0d0d0d',borderRadius:12,fontSize:13,color:'#555'}}>💤 You logged a rest day today</div>}
          {shameWall.length===0
            ?<div style={{textAlign:'center',padding:40,color:T.success}}><div style={{fontSize:30,marginBottom:6}}>🎉</div><div style={{fontSize:13,fontWeight:600}}>Everyone posted!</div></div>
            :shameWall.map(m=>(
              <div key={m.user_id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid #0d0d0d'}}>
                <Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={34}/>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{m.profiles?.username}</div><div style={{fontSize:12,color:T.danger}}>No post today 😬</div></div>
                <button style={{background:'#111',border:'none',color:'#fff',padding:'7px 12px',fontSize:12,borderRadius:12,cursor:'pointer',fontWeight:700}} onClick={()=>hype(m.user_id,m.profiles?.username)}>📣 Hype</button>
              </div>
            ))
          }
        </div>
      )}

      {/* POST BAR - only on feed tab */}
      {tab==='feed'&&(
        <div style={{position:'fixed',bottom:60,left:0,right:0,background:'rgba(0,0,0,.98)',backdropFilter:'blur(20px)',borderTop:`1px solid ${accent}18`,zIndex:15}}>
          {(preview||showSongCheck||showGymCheck)&&(
            <div style={{padding:'8px 14px 0',display:'flex',gap:8,alignItems:'flex-start',flexWrap:'wrap'}}>
              {preview&&<div style={{position:'relative'}}>
                <img src={preview} style={{height:56,borderRadius:8,objectFit:'cover'}} alt=""/>
                <button onClick={()=>{setFile(null);setPreview(null)}} style={{position:'absolute',top:-4,right:-4,background:'rgba(0,0,0,.8)',border:'none',color:'#fff',borderRadius:'50%',width:16,height:16,cursor:'pointer',fontSize:9,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
              </div>}
              {showSongCheck&&<div style={{display:'flex',gap:6,flex:1}}>
                <input style={{...ss.input,flex:1,padding:'7px 10px',fontSize:12}} placeholder="Song…" value={songTitle} onChange={e=>setSongTitle(e.target.value)}/>
                <input style={{...ss.input,flex:1,padding:'7px 10px',fontSize:12}} placeholder="Artist…" value={songArtist} onChange={e=>setSongArtist(e.target.value)}/>
              </div>}
              {showGymCheck&&<div style={{flex:1}}>
                <input style={{...ss.input,padding:'7px 10px',fontSize:12}} placeholder="📍 Gym name…" value={gymName} onChange={e=>setGymName(e.target.value)}/>
              </div>}
            </div>
          )}
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px 10px'}}>
            <button onClick={()=>setShowCam(true)} style={{background:'none',border:'none',color:'#555',cursor:'pointer',flexShrink:0,display:'flex',padding:2}}>{Icons.camera('#555')}</button>
            <label style={{cursor:'pointer',flexShrink:0,color:'#555',display:'flex',alignItems:'center',padding:2}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setFile(f);setPreview(URL.createObjectURL(f))}}}/>
            </label>
            <input style={{...ss.input,flex:1,padding:'9px 14px',fontSize:13}} placeholder="Share your workout…" value={caption} onChange={e=>setCaption(e.target.value)} onKeyDown={e=>e.key==='Enter'&&post()}/>
            <button onClick={()=>setShowSongCheck(v=>!v)} style={{background:'none',border:'none',color:showSongCheck?accent:'#333',fontSize:16,cursor:'pointer',flexShrink:0}}>🎵</button>
            <button onClick={()=>setShowGymCheck(v=>!v)} style={{background:'none',border:'none',color:showGymCheck?accent:'#333',fontSize:16,cursor:'pointer',flexShrink:0}}>📍</button>
            <button onClick={()=>setExpiringMode(v=>!v)} style={{background:'none',border:'none',color:expiringMode?T.warning:'#333',fontSize:16,cursor:'pointer',flexShrink:0}}>⏳</button>
            <button onClick={post} disabled={posting||(!file&&!caption.trim())} style={{width:34,height:34,borderRadius:'50%',background:(file||caption.trim())?accent:'#111',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background .2s'}}>
              {posting?<span style={{fontSize:11}}>…</span>:Icons.send()}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── CHALLENGES TAB ────────────────────────────────────────────
function ChallengesTab({group,user,challenges,reload,accent,seasons}){
  const [showCreate,setShowCreate]=useState(false),[form,setForm]=useState({title:'',duration_days:7,bet_amount:0,penalty_type:'per_miss'}),[saving,setSaving]=useState(false),[myP,setMyP]=useState({}),[showSeason,setShowSeason]=useState(false),[seasonForm,setSeasonForm]=useState({title:'',start_date:'',end_date:''}),[localSeasons,setLocalSeasons]=useState([])
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))

  useEffect(()=>{
    if(challenges.length)supabase.from('challenge_participants').select('*').eq('user_id',user.id).in('challenge_id',challenges.map(c=>c.id)).then(({data})=>{const map={};(data||[]).forEach(p=>{map[p.challenge_id]=p});setMyP(map)})
    supabase.from('seasons').select('*').eq('group_id',group.id).order('start_date',{ascending:false}).then(({data})=>setLocalSeasons(data||[]))
  },[challenges,user.id])

  async function createChallenge(){
    if(!form.title.trim())return;setSaving(true)
    const endsDate=new Date();endsDate.setDate(endsDate.getDate()+parseInt(form.duration_days))
    const{data:ch,error}=await supabase.from('challenges').insert({group_id:group.id,created_by:user.id,title:form.title.trim(),duration_days:parseInt(form.duration_days),bet_amount:parseFloat(form.bet_amount)||0,penalty_type:form.penalty_type,starts_at:today(),ends_at:endsDate.toISOString().slice(0,10),status:'active'}).select().single()
    if(!error&&ch){await supabase.from('challenge_participants').insert({challenge_id:ch.id,user_id:user.id});reload();setShowCreate(false)}else alert(error?.message)
    setSaving(false)
  }

  async function createSeason(){
    if(!seasonForm.title||!seasonForm.start_date||!seasonForm.end_date)return
    const{error}=await supabase.from('seasons').insert({group_id:group.id,created_by:user.id,...seasonForm})
    if(!error){setShowSeason(false);supabase.from('seasons').select('*').eq('group_id',group.id).order('start_date',{ascending:false}).then(({data})=>setLocalSeasons(data||[]))}else alert(error.message)
  }

  async function joinWithGoal(cid){
    const goal=prompt('Your personal goal?');if(!goal)return
    const freq=prompt('Times per week?')
    const{error}=await supabase.from('challenge_participants').insert({challenge_id:cid,user_id:user.id,personal_goal:goal,goal_frequency:parseInt(freq)||1,goal_period:'week'})
    if(error)alert(error.message);else reload()
  }

  async function checkIn(cid){
    const p=myP[cid];if(!p)return
    await supabase.from('challenge_participants').update({days_completed:(p.days_completed||0)+1}).eq('challenge_id',cid).eq('user_id',user.id)
    setMyP(m=>({...m,[cid]:{...m[cid],days_completed:(m[cid].days_completed||0)+1}}))
  }

  return(
    <div style={{padding:14}}>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <button style={{...ss.btn(null,accent),flex:1,borderRadius:12,fontSize:13}} onClick={()=>setShowCreate(v=>!v)}>{showCreate?'Cancel':'+ Bet'}</button>
        <button style={{...ss.btn('ghost'),flex:1,borderRadius:12,fontSize:13,border:'1px solid #1a1a1a'}} onClick={()=>setShowSeason(v=>!v)}>{showSeason?'Cancel':'🏆 Season'}</button>
      </div>

      {showCreate&&(
        <div style={{background:'#0d0d0d',borderRadius:16,padding:14,marginBottom:14,border:'1px solid #111'}}>
          <div style={{fontWeight:800,marginBottom:12,fontSize:14}}>New Bet</div>
          <input style={{...ss.input,marginBottom:10}} value={form.title} onChange={e=>set('title',e.target.value)} placeholder="30-day grind"/>
          <div style={{marginBottom:10}}><div style={{fontSize:10,color:'#444',marginBottom:6,textTransform:'uppercase',fontWeight:700}}>Duration</div><div style={{display:'flex',gap:6}}>{[3,7,14,30].map(d=><button key={d} style={ss.pill(form.duration_days===d,accent)} onClick={()=>set('duration_days',d)}>{d}d</button>)}</div></div>
          <div style={{marginBottom:10}}><div style={{fontSize:10,color:'#444',marginBottom:6,textTransform:'uppercase',fontWeight:700}}>Bet</div><div style={{display:'flex',gap:6}}>{[0,5,10,25,50].map(a=><button key={a} style={ss.pill(form.bet_amount===a,accent)} onClick={()=>set('bet_amount',a)}>{a===0?'Free':`$${a}`}</button>)}</div></div>
          <div style={{marginBottom:14}}><div style={{fontSize:10,color:'#444',marginBottom:6,textTransform:'uppercase',fontWeight:700}}>Penalty</div><div style={{display:'flex',gap:6}}><button style={ss.pill(form.penalty_type==='per_miss',accent)} onClick={()=>set('penalty_type','per_miss')}>Per Miss</button><button style={ss.pill(form.penalty_type==='all_or_nothing',accent)} onClick={()=>set('penalty_type','all_or_nothing')}>All or Nothing</button></div></div>
          <button style={{...ss.btn(null,accent),width:'100%',borderRadius:12}} onClick={createChallenge} disabled={saving}>{saving?'…':'Create'}</button>
        </div>
      )}

      {showSeason&&(
        <div style={{background:'#0d0d0d',borderRadius:16,padding:14,marginBottom:14,border:'1px solid #111'}}>
          <div style={{fontWeight:800,marginBottom:12,fontSize:14}}>New Season</div>
          <input style={{...ss.input,marginBottom:10}} placeholder="Season name…" value={seasonForm.title} onChange={e=>setSeasonForm(f=>({...f,title:e.target.value}))}/>
          <div style={{marginBottom:10}}><div style={{fontSize:10,color:'#444',marginBottom:6,textTransform:'uppercase',fontWeight:700}}>Start Date</div><input type="date" style={{...ss.input}} value={seasonForm.start_date} onChange={e=>setSeasonForm(f=>({...f,start_date:e.target.value}))}/></div>
          <div style={{marginBottom:14}}><div style={{fontSize:10,color:'#444',marginBottom:6,textTransform:'uppercase',fontWeight:700}}>End Date</div><input type="date" style={{...ss.input}} value={seasonForm.end_date} onChange={e=>setSeasonForm(f=>({...f,end_date:e.target.value}))}/></div>
          <button style={{...ss.btn(null,accent),width:'100%',borderRadius:12}} onClick={createSeason}>Create Season</button>
        </div>
      )}

      {localSeasons.length>0&&(
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:'#444',marginBottom:8,textTransform:'uppercase',fontWeight:700,letterSpacing:.8}}>Seasons</div>
          {localSeasons.map(s=>{
            const end=new Date(s.end_date),start=new Date(s.start_date),total=Math.ceil((end-start)/(1000*60*60*24)),remaining=Math.max(0,Math.ceil((end-new Date())/(1000*60*60*24))),pct=Math.min(100,Math.round(((total-remaining)/total)*100))
            return(
              <div key={s.id} style={{background:'#0d0d0d',borderRadius:14,padding:12,marginBottom:8,border:'1px solid #111'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><div style={{fontWeight:700,fontSize:14}}>{s.title}</div><div style={{fontSize:11,color:'#444'}}>{remaining}d left</div></div>
                <div style={{background:'#111',borderRadius:20,height:5,overflow:'hidden',marginBottom:4}}><div style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${accent},${accent}88)`,borderRadius:20}}/></div>
                <div style={{fontSize:10,color:'#333'}}>{s.start_date} → {s.end_date}</div>
              </div>
            )
          })}
        </div>
      )}

      {challenges.length===0
        ?<div style={{textAlign:'center',padding:40,color:'#333'}}><div style={{fontSize:28,marginBottom:6}}>🎯</div><div style={{fontSize:13,fontWeight:600}}>No active bets</div></div>
        :challenges.map(c=>{
          const mine=myP[c.id],daysLeft=Math.max(0,Math.ceil((new Date(c.ends_at)-new Date())/(1000*60*60*24))),ppd=(c.bet_amount||0)/c.duration_days,owed=mine?c.penalty_type==='per_miss'?(mine.days_missed||0)*ppd:(mine.days_missed||0)>0?c.bet_amount:0:0
          return(
            <div key={c.id} style={{background:'#0d0d0d',borderRadius:14,padding:12,marginBottom:8,border:'1px solid #111'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><div style={{fontWeight:800,fontSize:14}}>{c.title}</div><div style={{fontSize:11,color:'#444'}}>{daysLeft}d left</div></div>
              {mine?.personal_goal&&<div style={{fontSize:12,color:accent,marginBottom:8}}>🎯 {mine.personal_goal} {mine.goal_frequency}x/wk</div>}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:10}}>
                {[['✅',mine?.days_completed||0,'Done'],['❌',mine?.days_missed||0,'Missed'],['💸',`$${owed.toFixed(0)}`,'Owed']].map(([ic,val,lbl])=>(
                  <div key={lbl} style={{background:'#111',borderRadius:10,padding:'8px 6px',textAlign:'center'}}>
                    <div style={{fontSize:15,fontWeight:800}}>{val}</div>
                    <div style={{fontSize:10,color:'#444',marginTop:2}}>{ic} {lbl}</div>
                  </div>
                ))}
              </div>
              {!mine?<button style={{...ss.btn(null,accent),width:'100%',borderRadius:12}} onClick={()=>joinWithGoal(c.id)}>Join + Set Goal</button>:<button style={{...ss.btn('success'),width:'100%',borderRadius:12}} onClick={()=>checkIn(c.id)}>✅ Check In</button>}
            </div>
          )
        })
      }
    </div>
  )
}

// ── DM SCREEN ─────────────────────────────────────────────────
function DMScreen({conversation,user,otherUser,onBack}){
  const [messages,setMessages]=useState([]),[text,setText]=useState(''),[sending,setSending]=useState(false),[file,setFile]=useState(null),[preview,setPreview]=useState(null),[showCam,setShowCam]=useState(false),[fullImg,setFullImg]=useState(null)
  const bottomRef=useRef()

  const loadMessages=useCallback(async()=>{
    const{data}=await supabase.from('messages').select('*,profiles(username,avatar_url)').eq('conversation_id',conversation.id).order('created_at',{ascending:true})
    setMessages(data||[])
    // Mark as read
    await supabase.from('messages').update({status:'opened',read_at:new Date().toISOString()}).eq('conversation_id',conversation.id).neq('sender_id',user.id).is('read_at',null)
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),80)
  },[conversation.id,user.id])

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
    await supabase.from('messages').insert({conversation_id:conversation.id,sender_id:user.id,content:text.trim()||null,image_url,status:'sent'})
    setText('');setFile(null);setPreview(null);setSending(false)
  }

  if(showCam)return<CameraScreen onCapture={(blob)=>{setFile(blob);setPreview(URL.createObjectURL(blob));setShowCam(false)}} onClose={()=>setShowCam(false)} groups={[]} user={user}/>

  return(
    <div style={{...ss.page,display:'flex',flexDirection:'column',height:'100vh'}}>
      {fullImg&&(
        <div onClick={()=>setFullImg(null)} style={{position:'fixed',inset:0,background:'#000',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <img src={fullImg} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} alt=""/>
          <div style={{position:'absolute',top:16,right:16,color:'#fff',fontSize:28}}>✕</div>
        </div>
      )}
      <div style={ss.topBar}>
        <button onClick={onBack} style={{background:'none',border:'none',color:T.text,cursor:'pointer',display:'flex',alignItems:'center'}}>{Icons.back()}</button>
        <Avatar url={otherUser?.avatar_url} name={otherUser?.username} size={30}/>
        <div style={{fontWeight:800,fontSize:14,flex:1}}>{otherUser?.username||'Chat'}</div>
        <div style={{width:8,height:8,borderRadius:'50%',background:T.success}}/>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'10px 14px',display:'flex',flexDirection:'column',gap:5}}>
        {messages.map(m=>{
          const isMe=m.sender_id===user.id
          return(
            <div key={m.id} style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start'}}>
              {m.image_url&&(
                <div onClick={()=>setFullImg(m.image_url)} style={{cursor:'pointer',borderRadius:16,overflow:'hidden',maxWidth:'68%',marginBottom:m.content?3:0}}>
                  <img src={m.image_url} style={{width:'100%',maxHeight:240,objectFit:'cover',display:'block'}} alt=""/>
                </div>
              )}
              {m.content&&(
                <div style={{maxWidth:'74%',background:isMe?'#2563eb':'#111',padding:'9px 14px',borderRadius:isMe?'18px 18px 4px 18px':'18px 18px 18px 4px',fontSize:14,lineHeight:1.4}}>
                  {m.content}
                </div>
              )}
              <div style={{fontSize:10,color:'#222',marginTop:2,display:'flex',gap:4,alignItems:'center'}}>
                {ago(m.created_at)}
                {isMe&&<span style={{color:m.status==='opened'?'#5b9cf6':m.status==='delivered'?'#555':'#333'}}>{m.status==='opened'?'Opened':m.status==='delivered'?'Delivered':'Sent'}</span>}
              </div>
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
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px 28px',background:'rgba(0,0,0,.98)',borderTop:'1px solid #0d0d0d'}}>
        <button onClick={()=>setShowCam(true)} style={{background:'none',border:'none',color:'#444',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center'}}>{Icons.camera('#444')}</button>
        <label style={{cursor:'pointer',flexShrink:0,color:'#444',display:'flex',alignItems:'center'}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setFile(f);setPreview(URL.createObjectURL(f))}}}/>
        </label>
        <input style={{...ss.input,flex:1,padding:'10px 16px'}} placeholder="Message…" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}/>
        <button onClick={send} disabled={sending||(!file&&!text.trim())} style={{width:36,height:36,borderRadius:'50%',background:(file||text.trim())?'#2563eb':'#111',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background .2s'}}>
          {sending?<span style={{fontSize:11}}>…</span>:Icons.send()}
        </button>
      </div>
    </div>
  )
}

// ── PEOPLE ────────────────────────────────────────────────────
function PeopleScreen({user,onOpenDM}){
  const [tab,setTab]=useState('friends'),[friends,setFriends]=useState([]),[requests,setRequests]=useState([]),[search,setSearch]=useState(''),[results,setResults]=useState([]),[searching,setSearching]=useState(false),[loading,setLoading]=useState(true),[dmStatuses,setDmStatuses]=useState({})

  const loadFriends=useCallback(async()=>{
    const{data}=await supabase.from('friendships').select('*,requester:profiles!friendships_requester_id_fkey(id,username,avatar_url),addressee:profiles!friendships_addressee_id_fkey(id,username,avatar_url)').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).eq('status','accepted')
    setFriends(data||[])
    const{data:reqs}=await supabase.from('friendships').select('*,requester:profiles!friendships_requester_id_fkey(id,username,avatar_url)').eq('addressee_id',user.id).eq('status','pending')
    setRequests(reqs||[])
    // Load last message status for each DM
    const statuses={}
    await Promise.all((data||[]).map(async f=>{
      const otherId=f.requester_id===user.id?f.addressee_id:f.requester_id
      const name=`dm_${[user.id,otherId].sort().join('_')}`
      const{data:grp}=await supabase.from('groups').select('id').eq('name',name).single()
      if(grp){
        const{data:msgs}=await supabase.from('messages').select('status,sender_id,content,created_at').eq('conversation_id',grp.id).order('created_at',{ascending:false}).limit(1)
        if(msgs?.[0])statuses[f.id]={...msgs[0],isMe:msgs[0].sender_id===user.id}
      }
    }))
    setDmStatuses(statuses)
    setLoading(false)
  },[user.id])

  useEffect(()=>{loadFriends()},[loadFriends])

  async function searchUsers(){if(!search.trim())return;setSearching(true);const{data}=await supabase.from('profiles').select('id,username,avatar_url').ilike('username',`%${search.trim()}%`).neq('id',user.id).limit(10);setResults(data||[]);setSearching(false)}

  async function sendRequest(toId){
    const{error}=await supabase.from('friendships').insert({requester_id:user.id,addressee_id:toId,status:'pending'})
    if(error){alert(error.message);return}
    vibrate();setResults(r=>r.filter(u=>u.id!==toId));alert('Request sent 👊')
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

  function statusLabel(st){
    if(!st)return null
    if(st.isMe){
      const c=st.status==='opened'?'#5b9cf6':st.status==='delivered'?'#555':'#333'
      const label=st.status==='opened'?'Opened':st.status==='delivered'?'Delivered':'Sent'
      return<span style={{fontSize:11,color:c,fontWeight:600}}>{label}</span>
    }
    return<span style={{fontSize:11,color:'#fff',fontWeight:700}}>New</span>
  }

  return(
    <div style={{...ss.page,paddingBottom:80}}>
      <div style={ss.topBar}>
        <div style={{fontWeight:900,fontSize:18,flex:1}}>People</div>
        {requests.length>0&&<div style={{background:T.danger,color:'#fff',borderRadius:10,fontSize:12,fontWeight:800,padding:'3px 9px'}}>{requests.length}</div>}
      </div>
      <div style={{display:'flex',gap:6,padding:'10px 16px',borderBottom:'1px solid #0d0d0d'}}>
        {['friends','add','requests'].map(t=>(
          <button key={t} style={ss.pill(tab===t)} onClick={()=>{vibrate();setTab(t);if(t==='friends'||t==='requests')loadFriends()}}>
            {t==='friends'?'Friends':t==='add'?'Add':`Requests${requests.length>0?` (${requests.length})`:''}`}
          </button>
        ))}
      </div>
      {tab==='friends'&&(
        <div>
          {loading?[0,1,2].map(i=><SkeletonCard key={i}/>):friends.length===0
            ?<div style={{textAlign:'center',padding:60,color:'#333'}}><div style={{fontSize:36,marginBottom:8}}>👋</div><div style={{fontSize:14,fontWeight:600}}>No friends yet</div></div>
            :friends.map(f=>{
              const p=friendProfile(f),st=dmStatuses[f.id]
              return(
                <div key={f.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid #0d0d0d',cursor:'pointer'}} onClick={()=>onOpenDM&&onOpenDM(f,p)}>
                  <Avatar url={p?.avatar_url} name={p?.username} size={42}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{p?.username}</div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      {st?<span style={{fontSize:12,color:'#444',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:140}}>{st.content||'📷 Photo'}</span>:<span style={{fontSize:12,color:'#333'}}>Tap to message</span>}
                      {statusLabel(st)}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              )
            })
          }
        </div>
      )}
      {tab==='add'&&(
        <div style={{padding:14}}>
          <div style={{display:'flex',gap:8,marginBottom:14}}>
            <input style={{...ss.input,flex:1}} placeholder="Search username…" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchUsers()}/>
            <button style={{...ss.btn(),padding:'10px 16px',borderRadius:12,fontSize:13}} onClick={searchUsers} disabled={searching}>{searching?'…':'Search'}</button>
          </div>
          {results.map(u=>(
            <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #0d0d0d'}}>
              <Avatar url={u.avatar_url} name={u.username} size={40}/>
              <div style={{flex:1,fontWeight:700,fontSize:14}}>{u.username}</div>
              <button style={{...ss.btn(),padding:'7px 14px',fontSize:13,borderRadius:12}} onClick={()=>sendRequest(u.id)}>Add +</button>
            </div>
          ))}
        </div>
      )}
      {tab==='requests'&&(
        <div style={{padding:14}}>
          {requests.length===0
            ?<div style={{textAlign:'center',padding:50,color:'#333',fontSize:13,fontWeight:600}}>No pending requests</div>
            :requests.map(r=>(
              <div key={r.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #0d0d0d'}}>
                <Avatar url={r.requester?.avatar_url} name={r.requester?.username} size={42}/>
                <div style={{flex:1,fontWeight:700,fontSize:14}}>{r.requester?.username}</div>
                <button style={{...ss.btn('success'),padding:'8px 16px',fontSize:13,borderRadius:12}} onClick={()=>acceptRequest(r.id,r.requester_id)}>Accept</button>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ── DISCOVER ──────────────────────────────────────────────────
function DiscoverScreen({user,onBack}){
  const [stories,setStories]=useState([]),[shorts,setShorts]=useState([]),[loading,setLoading]=useState(true),[viewingStories,setViewingStories]=useState(null)
  useEffect(()=>{
    Promise.all([
      supabase.from('stories').select('*,profiles(username,avatar_url)').eq('is_public',true).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(30),
      supabase.from('stories').select('*,profiles(username,avatar_url)').eq('is_short',true).eq('is_public',true).order('created_at',{ascending:false}).limit(20),
    ]).then(([{data:s},{data:sh}])=>{setStories(s||[]);setShorts(sh||[]);setLoading(false)})
  },[])
  return(
    <div style={{...ss.page,paddingBottom:80}}>
      <div style={ss.topBar}>
        <button onClick={onBack} style={{background:'none',border:'none',color:T.text,cursor:'pointer',display:'flex'}}>{Icons.back()}</button>
        <div style={{fontWeight:900,fontSize:18,flex:1}}>Discover</div>
      </div>
      {loading?[0,1,2].map(i=><SkeletonCard key={i}/>):(
        <div style={{padding:14}}>
          {stories.length>0&&<>
            <div style={{fontSize:11,color:'#444',marginBottom:10,textTransform:'uppercase',fontWeight:700,letterSpacing:.8}}>Public Stories</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:2,marginBottom:20}}>
              {stories.map(s=>(
                <div key={s.id} onClick={()=>setViewingStories([s])} style={{aspectRatio:'9/16',background:'#0d0d0d',borderRadius:8,overflow:'hidden',cursor:'pointer',position:'relative'}}>
                  <img src={s.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                  <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,.7)',padding:'20px 6px 6px'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#fff'}}>{s.profiles?.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </>}
          {shorts.length>0&&<>
            <div style={{fontSize:11,color:'#444',marginBottom:10,textTransform:'uppercase',fontWeight:700,letterSpacing:.8}}>Shorts</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:4}}>
              {shorts.map(s=>(
                <div key={s.id} style={{aspectRatio:'9/16',background:'#0d0d0d',borderRadius:12,overflow:'hidden',cursor:'pointer',position:'relative'}}>
                  <img src={s.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                  <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,.8)',padding:'30px 10px 10px'}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#fff'}}>{s.profiles?.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </>}
          {stories.length===0&&shorts.length===0&&<div style={{textAlign:'center',padding:60,color:'#333'}}><div style={{fontSize:40,marginBottom:8}}>🌍</div><div style={{fontSize:14,fontWeight:600}}>Nothing public yet</div></div>}
        </div>
      )}
      {viewingStories&&<StoryViewer stories={viewingStories} user={user} onClose={()=>setViewingStories(null)}/>}
    </div>
  )
}

// ── USER PROFILE ──────────────────────────────────────────────
function UserProfile({userId,onBack}){
  const [profile,setProfile]=useState(null),[posts,setPosts]=useState([]),[badges,setBadges]=useState([]),[streak,setStreak]=useState(null),[loading,setLoading]=useState(true)
  useEffect(()=>{
    Promise.all([supabase.from('profiles').select('*').eq('id',userId).single(),supabase.from('posts').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(12),supabase.from('badges').select('*').eq('user_id',userId),supabase.from('streaks').select('*').eq('user_id',userId).single()])
    .then(([{data:p},{data:po},{data:b},{data:st}])=>{setProfile(p);setPosts(po||[]);setBadges(b||[]);setStreak(st);setLoading(false)})
  },[userId])
  if(loading)return<div style={ss.page}><div style={{textAlign:'center',padding:60,color:'#333',fontSize:13}}>Loading…</div></div>
  if(!profile)return<div style={ss.page}><div style={{padding:20,color:'#444',fontSize:13}}>User not found</div></div>
  return(
    <div style={{...ss.page,paddingBottom:80}}>
      <div style={ss.topBar}>
        <button onClick={onBack} style={{background:'none',border:'none',color:T.text,cursor:'pointer',display:'flex'}}>{Icons.back()}</button>
        <div style={{fontWeight:900,fontSize:16,flex:1}}>{profile.username}</div>
      </div>
      <div style={{padding:16}}>
        <div style={{textAlign:'center',padding:'24px 0 20px'}}>
          <Avatar url={profile.avatar_url} name={profile.username} size={76}/>
          <div style={{fontSize:20,fontWeight:900,marginTop:12,letterSpacing:-0.5}}>{profile.username}</div>
          {profile.main_goal&&<div style={{fontSize:13,color:'#555',marginTop:4}}>🎯 {profile.main_goal}</div>}
          <div style={{display:'flex',justifyContent:'center',gap:28,marginTop:16}}>
            {streak?.current_streak>0&&<div style={{textAlign:'center'}}><div style={{fontSize:22,fontWeight:900,color:'#f97316'}}>{streak.current_streak}</div><div style={{fontSize:11,color:'#444',marginTop:2}}>Streak</div></div>}
            {profile.is_weight_public&&profile.current_weight&&<div style={{textAlign:'center'}}><div style={{fontSize:22,fontWeight:900}}>{profile.current_weight}</div><div style={{fontSize:11,color:'#444',marginTop:2}}>lbs</div></div>}
            <div style={{textAlign:'center'}}><div style={{fontSize:22,fontWeight:900}}>{posts.length}</div><div style={{fontSize:11,color:'#444',marginTop:2}}>Posts</div></div>
          </div>
        </div>
        {badges.length>0&&<div style={{marginBottom:20}}>
          <div style={{fontSize:11,color:'#444',marginBottom:10,textTransform:'uppercase',fontWeight:700,letterSpacing:.8}}>Badges</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {badges.map(b=>{const m=BADGE_META[b.badge_type];return m?<div key={b.id} style={{background:'#0d0d0d',borderRadius:12,padding:'8px 12px',textAlign:'center',border:'1px solid #111'}}><div style={{fontSize:20}}>{m.icon}</div><div style={{fontSize:10,color:'#444',marginTop:2}}>{m.label}</div></div>:null})}
          </div>
        </div>}
        {posts.filter(p=>p.image_url).length>0&&<div>
          <div style={{fontSize:11,color:'#444',marginBottom:10,textTransform:'uppercase',fontWeight:700,letterSpacing:.8}}>Posts</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:2}}>
            {posts.filter(p=>p.image_url).map(p=><img key={p.id} src={p.image_url} style={{width:'100%',aspectRatio:'1',objectFit:'cover',borderRadius:4}} alt=""/>)}
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
    supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(40).then(({data})=>{setNotifs(data||[]);setLoading(false)})
    supabase.from('notifications').update({read:true}).eq('user_id',user.id).eq('read',false)
  },[user.id])
  return(
    <div style={{...ss.page,paddingBottom:80}}>
      <div style={ss.topBar}>
        <button onClick={onClose} style={{background:'none',border:'none',color:T.text,cursor:'pointer',display:'flex'}}>{Icons.back()}</button>
        <div style={{fontWeight:900,fontSize:18,flex:1}}>Notifications</div>
      </div>
      {loading?[0,1,2].map(i=><SkeletonCard key={i}/>):notifs.length===0
        ?<div style={{textAlign:'center',padding:70,color:'#333'}}><div style={{fontSize:40,marginBottom:8}}>🔔</div><div style={{fontSize:14,fontWeight:600}}>Nothing yet</div></div>
        :notifs.map(n=>(
          <div key={n.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid #0d0d0d',background:n.read?'transparent':'#040a14'}}>
            <div style={{fontSize:22,width:36,textAlign:'center'}}>{n.type==='reaction'?'🔥':n.type==='hype'?'📣':n.type==='badge'?'🏅':n.type==='mvp'?'👑':'💬'}</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:n.read?400:600,lineHeight:1.4}}>{n.message}</div><div style={{fontSize:11,color:'#333',marginTop:3}}>{ago(n.created_at)}</div></div>
          </div>
        ))
      }
    </div>
  )
}

// ── SETTINGS ─────────────────────────────────────────────────
function SettingsScreen({user,onSignOut,onProgress,onDiscover}){
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
    <div style={{...ss.page,paddingBottom:80}}>
      <div style={ss.topBar}><div style={{fontWeight:900,fontSize:18}}>Settings</div></div>
      <div style={{padding:14}}>
        {recap&&streak&&<div style={{background:'#0d0d0d',borderRadius:16,padding:14,marginBottom:10,border:'1px solid #111'}}>
          <div style={{display:'flex',justifyContent:'space-around'}}>
            {[{v:recap.posts,l:'This week',c:T.success},{v:streak.current_streak,l:'Streak 🔥',c:'#f97316'},{v:streak.longest_streak,l:'Best',c:'#555'}].map(({v,l,c})=>(
              <div key={l} style={{textAlign:'center'}}><div style={{fontSize:22,fontWeight:900,color:c}}>{v}</div><div style={{fontSize:11,color:'#444',marginTop:2}}>{l}</div></div>
            ))}
          </div>
        </div>}

        {cw&&gw?<div style={{background:'#0d0d0d',borderRadius:16,padding:14,marginBottom:10,border:'1px solid #111'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}><span style={{fontWeight:700}}>Weight Goal</span><span style={{color:'#555'}}>{pct}%</span></div>
          <div style={{background:'#111',borderRadius:20,height:6,overflow:'hidden',marginBottom:6}}><div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#2563eb,#5b9cf6)',borderRadius:20,transition:'width .5s'}}/></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#444'}}><span>{cw} lbs</span><span>Goal: {gw} lbs</span></div>
        </div>:null}

        <button onClick={onProgress} style={{display:'block',width:'100%',marginBottom:8,textAlign:'left',padding:'13px 16px',borderRadius:14,border:'1px solid #111',background:'#0d0d0d',color:T.text,fontSize:14,cursor:'pointer',fontWeight:600}}>📊 Progress Timeline →</button>
        <button onClick={onDiscover} style={{display:'block',width:'100%',marginBottom:10,textAlign:'left',padding:'13px 16px',borderRadius:14,border:'1px solid #111',background:'#0d0d0d',color:T.text,fontSize:14,cursor:'pointer',fontWeight:600}}>🌍 Discover →</button>

        {badges.length>0&&<div style={{background:'#0d0d0d',borderRadius:16,padding:14,marginBottom:10,border:'1px solid #111'}}>
          <div style={{fontSize:11,color:'#444',marginBottom:10,textTransform:'uppercase',fontWeight:700,letterSpacing:.8}}>Badges</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {badges.map(b=>{const m=BADGE_META[b.badge_type];return m?<div key={b.id} style={{background:'#111',borderRadius:10,padding:'7px 12px',textAlign:'center',border:'1px solid #1a1a1a'}}><div style={{fontSize:18}}>{m.icon}</div><div style={{fontSize:10,color:'#444',marginTop:2}}>{m.label}</div></div>:null})}
          </div>
        </div>}

        <div style={{background:'#0d0d0d',borderRadius:16,padding:16,marginBottom:10,border:'1px solid #111'}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Profile</div>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
            <div onClick={()=>fileRef.current.click()} style={{width:56,height:56,borderRadius:'50%',background:'#111',border:'2.5px solid #2563eb',cursor:'pointer',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>
              {(avatarPreview||form.avatar_url)?<img src={avatarPreview||form.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:initials(form.username)}
            </div>
            <div><div style={{fontWeight:700,fontSize:15}}>{form.username}</div><span style={{fontSize:12,color:'#5b9cf6',cursor:'pointer'}} onClick={()=>fileRef.current.click()}>Change photo</span></div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setAvatarFile(f);setAvatarPreview(URL.createObjectURL(f))}}}/>
          </div>
          {[['Username','username','text'],['Current weight (lbs)','current_weight','number'],['Goal weight (lbs)','goal_weight','number'],['Main goal','main_goal','text']].map(([lbl,key,type])=>(
            <div key={key} style={{marginBottom:12}}>
              <div style={{fontSize:10,color:'#444',marginBottom:4,textTransform:'uppercase',letterSpacing:.8,fontWeight:700}}>{lbl}</div>
              <input style={ss.input} type={type} value={form[key]} onChange={e=>set(key,e.target.value)}/>
            </div>
          ))}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,padding:'10px 0'}}>
            <div style={{fontSize:14,fontWeight:600}}>Show weight publicly</div>
            <Toggle value={form.is_weight_public} onChange={v=>set('is_weight_public',v)}/>
          </div>
          <button style={{...ss.btn(),width:'100%',borderRadius:12,padding:13}} onClick={save} disabled={saving}>{saving?'Saving…':saved?'✓ Saved':'Save Changes'}</button>
        </div>

        <div style={{background:'#0d0d0d',borderRadius:16,padding:16,border:'1px solid #111'}}>
          <div style={{fontSize:12,color:'#333',marginBottom:12}}>{user.email}</div>
          <button style={{...ss.btn('danger'),width:'100%',borderRadius:12,padding:13}} onClick={onSignOut}>Sign Out</button>
        </div>
      </div>
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
    await supabase.from('progress_photos').insert({user_id:user.id,image_url:urlData.publicUrl,weight:parseFloat(weight)||null,note:note.trim(),taken_at:today()})
    setSaving(false);setFile(null);setPreview(null);setWeight('');setNote('')
    supabase.from('progress_photos').select('*').eq('user_id',user.id).order('taken_at',{ascending:true}).then(({data})=>setPhotos(data||[]))
  }
  function toggleCompare(id){setCompare(c=>c.includes(id)?c.filter(x=>x!==id):[...c.slice(-1),id])}
  const comparePhotos=photos.filter(p=>compare.includes(p.id))
  return(
    <div style={{...ss.page,paddingBottom:80}}>
      <div style={ss.topBar}>
        <button onClick={onBack} style={{background:'none',border:'none',color:T.text,cursor:'pointer',display:'flex'}}>{Icons.back()}</button>
        <div style={{fontWeight:900,fontSize:16,flex:1}}>Progress</div>
      </div>
      <div style={{padding:14}}>
        <div style={{background:'#0d0d0d',borderRadius:16,padding:14,marginBottom:12,border:'1px solid #111'}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Add Photo</div>
          {preview&&<img src={preview} style={{width:'100%',borderRadius:12,maxHeight:180,objectFit:'cover',marginBottom:10}} alt=""/>}
          <div style={{display:'flex',gap:8,marginBottom:10}}>
            <button onClick={()=>fileRef.current.click()} style={{...ss.btn('ghost'),padding:'9px 14px',fontSize:18,borderRadius:12,border:'1px solid #1a1a1a'}}>📷</button>
            <input style={ss.input} placeholder="Weight (lbs)" type="number" value={weight} onChange={e=>setWeight(e.target.value)}/>
          </div>
          <input style={{...ss.input,marginBottom:10}} placeholder="Note (optional)" value={note} onChange={e=>setNote(e.target.value)}/>
          <button style={{...ss.btn(),width:'100%',borderRadius:12}} onClick={savePhoto} disabled={saving||!file}>{saving?'Saving…':'Save'}</button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setFile(f);setPreview(URL.createObjectURL(f))}}}/>
        </div>
        {comparePhotos.length===2&&<div style={{background:'#0d0d0d',borderRadius:16,padding:14,marginBottom:12,border:'1px solid #111'}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>Compare</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {comparePhotos.map(p=><div key={p.id} style={{textAlign:'center'}}><img src={p.image_url} style={{width:'100%',borderRadius:10,aspectRatio:'1',objectFit:'cover'}} alt=""/><div style={{fontSize:11,color:'#444',marginTop:4}}>{p.taken_at}{p.weight?` · ${p.weight}lbs`:''}</div></div>)}
          </div>
        </div>}
        {loading?<div style={{textAlign:'center',padding:40,color:'#333',fontSize:13}}>Loading…</div>:photos.length===0
          ?<div style={{textAlign:'center',padding:50,color:'#333',fontSize:14,fontWeight:600}}>No photos yet</div>
          :<>
            <div style={{fontSize:11,color:'#444',marginBottom:10,fontWeight:600}}>Tap 2 to compare</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:3}}>
              {photos.map(p=>(
                <div key={p.id} onClick={()=>toggleCompare(p.id)} style={{cursor:'pointer',position:'relative'}}>
                  <img src={p.image_url} style={{width:'100%',aspectRatio:'1',objectFit:'cover',borderRadius:8,border:`2px solid ${compare.includes(p.id)?'#2563eb':'transparent'}`}} alt=""/>
                  {compare.includes(p.id)&&<div style={{position:'absolute',top:4,right:4,background:'#2563eb',borderRadius:'50%',width:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800}}>✓</div>}
                  <div style={{fontSize:9,color:'#333',marginTop:2}}>{p.taken_at}</div>
                </div>
              ))}
            </div>
          </>
        }
      </div>
    </div>
  )
}

// ── ROOT ──────────────────────────────────────────────────────
export default function App(){
  const [session,setSession]=useState(undefined),[hasProfile,setHasProfile]=useState(null),[view,setView]=useState('home'),[activeGroup,setActiveGroup]=useState(null),[activeDM,setActiveDM]=useState(null),[viewingProfile,setViewingProfile]=useState(null),[showNotifs,setShowNotifs]=useState(false),[showProgress,setShowProgress]=useState(false),[showDiscover,setShowDiscover]=useState(false),[showCam,setShowCam]=useState(false),[unread,setUnread]=useState(0),[groups,setGroups]=useState([])
  // Swipe nav
  const [swipeStartX,setSwipeStartX]=useState(null)
  const VIEWS=['people','home','camera','notifications','settings']

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session??null))
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s))
    return()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{if(!session)return;supabase.from('profiles').select('id').eq('id',session.user.id).single().then(({data})=>setHasProfile(!!data))},[session])

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
    if(groupId){supabase.from('group_members').upsert({group_id:groupId,user_id:session.user.id}).then(()=>window.history.replaceState({},'',window.location.pathname))}
    // Load groups for camera send-to
    supabase.from('group_members').select('group_id').eq('user_id',session.user.id).then(({data})=>{
      if(data?.length)supabase.from('groups').select('*').in('id',data.map(m=>m.group_id)).eq('is_dm',false).then(({data:g})=>setGroups(g||[]))
    })
  },[session,hasProfile])

  function handleSwipe(e){
    if(swipeStartX===null)return
    const dx=e.changedTouches[0].clientX-swipeStartX
    if(Math.abs(dx)<60)return
    if(dx<0&&view==='home'){setView('settings');vibrate()}
    else if(dx>0&&view==='home'){setView('people');vibrate()}
    else if(dx<0&&view==='people'){setView('home');vibrate()}
    else if(dx>0&&view==='settings'){setView('home');vibrate()}
    setSwipeStartX(null)
  }

  async function signOut(){await supabase.auth.signOut();setSession(null);setHasProfile(null)}

  if(session===undefined)return<div style={{minHeight:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',color:'#333',fontSize:13}}>Loading…</div>
  if(!session)return<AuthScreen onSession={s=>setSession(s)}/>
  if(hasProfile===false)return<ProfileSetup user={session.user} onDone={()=>setHasProfile(true)}/>
  if(hasProfile===null)return<div style={{minHeight:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',color:'#333',fontSize:13}}>Loading…</div>
  if(showProgress)return<ProgressScreen user={session.user} onBack={()=>setShowProgress(false)}/>
  if(showDiscover)return<DiscoverScreen user={session.user} onBack={()=>setShowDiscover(false)}/>
  if(showNotifs)return<NotificationsScreen user={session.user} onClose={()=>{setShowNotifs(false);setUnread(0)}}/>
  if(viewingProfile)return<UserProfile userId={viewingProfile} onBack={()=>setViewingProfile(null)}/>
  if(activeDM)return<DMScreen conversation={activeDM.group} user={session.user} otherUser={activeDM.otherUser} onBack={()=>setActiveDM(null)}/>
  if(activeGroup)return<GroupScreen group={activeGroup} user={session.user} onBack={()=>setActiveGroup(null)} onViewProfile={id=>id&&setViewingProfile(id)}/>
  if(showCam)return<CameraScreen onClose={()=>setShowCam(false)} onDone={()=>{}} groups={groups} user={session.user}/>

  return(
    <div style={ss.page} onTouchStart={e=>setSwipeStartX(e.touches[0].clientX)} onTouchEnd={handleSwipe}>
      {view==='home'&&<HomeScreen user={session.user} onOpenGroup={g=>setActiveGroup(g)} onOpenCamera={()=>setShowCam(true)}/>}
      {view==='people'&&<PeopleScreen user={session.user} onOpenDM={async(friendship,otherProfile)=>{
        const name=`dm_${[session.user.id,otherProfile.id].sort().join('_')}`
        const{data:grp}=await supabase.from('groups').select('*').eq('name',name).single()
        if(grp)setActiveDM({group:grp,otherUser:otherProfile})
      }}/>}
      {view==='settings'&&<SettingsScreen user={session.user} onSignOut={signOut} onProgress={()=>setShowProgress(true)} onDiscover={()=>setShowDiscover(true)}/>}

      {/* Bottom nav */}
      <nav style={{position:'fixed',bottom:0,left:0,right:0,height:68,background:'rgba(0,0,0,.95)',backdropFilter:'blur(20px)',borderTop:'1px solid #0d0d0d',display:'flex',alignItems:'center',justifyContent:'space-around',zIndex:20,padding:'0 8px'}}>
        {[
          {key:'people',icon:()=>Icons.people(view==='people'?'#fff':'#444',view==='people'),label:'People'},
          {key:'home',icon:()=>Icons.home(view==='home'?'#fff':'#444',view==='home'),label:'Home'},
          {key:'camera',icon:null,label:''},
          {key:'notifications',icon:()=>Icons.bell(showNotifs?'#fff':'#444'),label:'Alerts'},
          {key:'settings',icon:()=>Icons.settings(view==='settings'?'#fff':'#444'),label:'Me'},
        ].map(({key,icon,label})=>{
          if(key==='camera')return(
            <button key="camera" onClick={()=>{vibrate();setShowCam(true)}} style={{width:52,height:52,borderRadius:'50%',background:'#fff',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 0 4px rgba(255,255,255,.1)',marginBottom:8}}>
              {Icons.camera('#000')}
            </button>
          )
          return(
            <button key={key} onClick={()=>{vibrate();if(key==='notifications'){setShowNotifs(true)}else setView(key)}} style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'6px 10px',position:'relative',flex:1}}>
              {icon?.()}
              <span style={{fontSize:9,color:view===key?'#5b9cf6':'#333',fontWeight:view===key?700:400,letterSpacing:.2}}>{label}</span>
              {key==='notifications'&&unread>0&&<NotifDot n={unread}/>}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
