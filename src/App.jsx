import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from './supabase'

// ── Theme ────────────────────────────────────────────────────
const T = {
  bg:'#000',card:'#0d0d0d',surface:'#111',
  text:'#fff',sub:'#888',dim:'#222',
  danger:'#ff3b30',success:'#30d158',warning:'#ffd60a',
}
const GROUP_COLORS=['#2563eb','#8b5cf6','#ef4444','#059669','#f97316','#ec4899','#06b6d4','#eab308','#6366f1','#14b8a6']
const GROUP_ICONS=['🏋️','🏃','🥗','💪','🔥','⚡','🎯','🥊','🧘','🚴','🏊','⛹️']
const TEXT_COLORS=['#fff','#000','#ef4444','#3b82f6','#22c55e','#f59e0b','#ec4899','#a855f7']
const CAM_FILTERS=[
  {name:'None',css:'none'},
  {name:'Gains',css:'contrast(1.4) saturate(1.6) brightness(1.05) sepia(0.2)'},
  {name:'Beast',css:'contrast(1.8) brightness(0.85) saturate(1.3) grayscale(0.2)'},
  {name:'Warm',css:'sepia(0.4) saturate(1.3) brightness(1.05)'},
  {name:'B&W',css:'grayscale(1) contrast(1.2)'},
  {name:'Vivid',css:'saturate(2) contrast(1.1)'},
  {name:'Drama',css:'contrast(1.3) brightness(0.9) saturate(1.4)'},
  {name:'Cool',css:'hue-rotate(20deg) saturate(1.2) brightness(1.05)'},
]
const REACTIONS=[{e:'💪',l:'Beast'},{e:'😤',l:'Grind'},{e:'🏆',l:'GOAT'},{e:'😭',l:'Sore'},{e:'🔥',l:'Fire'}]
const BADGE_META={first_post:{icon:'🌟',label:'First Post'},streak_7:{icon:'🔥',label:'7 Day Streak'},streak_30:{icon:'💎',label:'30 Day Streak'},mvp:{icon:'👑',label:'MVP'},won_challenge:{icon:'🏆',label:'Won Bet'}}

// ── Helpers ──────────────────────────────────────────────────
const ago=ts=>{const d=(Date.now()-new Date(ts))/1000;if(d<60)return'now';if(d<3600)return`${~~(d/60)}m`;if(d<86400)return`${~~(d/3600)}h`;return`${~~(d/86400)}d`}
const initials=s=>(s||'?').slice(0,2).toUpperCase()
const today=()=>new Date().toISOString().slice(0,10)
const vibe=(ms=8)=>{try{navigator.vibrate?.(ms)}catch{}}
const groupAccent=g=>g?.color||GROUP_COLORS[0]

// ── Icons (SVG) ──────────────────────────────────────────────
const Ic={
  people:(c='#fff')=><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  discover:(c='#fff')=><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  home:(c='#fff')=><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  camera:(c='#000')=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  back:(c='#fff')=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
  send:(c='#fff')=><svg width="16" height="16" viewBox="0 0 24 24" fill={c}><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>,
  trophy:(c='#fff')=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/><path d="M7 4H4a2 2 0 0 0-2 2v2a4 4 0 0 0 4 4h.5"/><path d="M17 4h3a2 2 0 0 1 2 2v2a4 4 0 0 1-4 4h-.5"/><path d="M7 4h10v6a5 5 0 0 1-10 0V4z"/></svg>,
  settings:(c='#fff')=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  flash:(c='#fff')=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  flip:(c='#fff')=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>,
  text:(c='#fff')=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  draw:(c='#fff')=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>,
  sun:(c='#fff')=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  contrast:(c='#fff')=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20V2z" fill={c}/></svg>,
  droplet:(c='#fff')=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>,
  download:(c='#fff')=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  gallery:(c='#fff')=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
}

// ── Shared UI ────────────────────────────────────────────────
function Avatar({url,name,size=36,color,ring=false,ringColor='#2563eb'}){
  return(
    <div style={{width:size,height:size,borderRadius:'50%',background:color||'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.34,flexShrink:0,overflow:'hidden',color:'#fff',fontWeight:800,border:ring?`2.5px solid ${ringColor}`:'none',boxSizing:'border-box'}}>
      {url?<img src={url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:initials(name)}
    </div>
  )
}

function Skeleton({w='100%',h=16,r=8}){return<div style={{width:w,height:h,borderRadius:r,background:'#111',marginBottom:6}}/>}

function Toast({msg,onDone}){
  useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t)},[])
  return<div style={{position:'fixed',top:60,left:'50%',transform:'translateX(-50%)',background:'#111',color:'#fff',padding:'10px 20px',borderRadius:20,fontSize:13,fontWeight:600,zIndex:999,border:'1px solid #222',whiteSpace:'nowrap'}}>{msg}</div>
}

function Modal({children,onClose}){
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:100,display:'flex',alignItems:'flex-end'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:'100%',background:'#0d0d0d',borderRadius:'20px 20px 0 0',padding:'20px 16px 40px',maxHeight:'80vh',overflowY:'auto'}}>
        {children}
      </div>
    </div>
  )
}

const ss={
  page:{minHeight:'100vh',background:T.bg,color:T.text,fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif'},
  topBar:{background:'rgba(0,0,0,.92)',backdropFilter:'blur(20px)',padding:'12px 16px',display:'flex',alignItems:'center',gap:10,position:'sticky',top:0,zIndex:20},
  input:{width:'100%',padding:'11px 16px',background:'#111',border:'none',borderRadius:24,color:'#fff',fontSize:14,outline:'none',boxSizing:'border-box'},
  pill:(on,c)=>({padding:'6px 14px',borderRadius:20,border:`1.5px solid ${on?(c||'#2563eb'):'#1a1a1a'}`,background:on?`${c||'#2563eb'}18`:'transparent',color:on?(c||'#5b9cf6'):'#555',fontSize:12,cursor:'pointer',fontWeight:on?700:400,whiteSpace:'nowrap'}),
  btn:(v,c)=>({padding:'10px 20px',borderRadius:24,border:'none',cursor:'pointer',fontWeight:700,fontSize:14,background:v==='danger'?T.danger:v==='ghost'?'#111':v==='success'?T.success:c||'#2563eb',color:'#fff'}),
}

// ── Camera Screen ────────────────────────────────────────────
function CameraScreen({onClose,onCapture,groups=[],user}){
  const videoRef=useRef(),canvasRef=useRef()
  const [facing,setFacing]=useState('user'),[stream,setStream]=useState(null)
  const [filterIdx,setFilterIdx]=useState(0),[flashOn,setFlashOn]=useState(false)
  const [captured,setCaptured]=useState(null),[capturedUrl,setCapturedUrl]=useState(null)
  const [showSendTo,setShowSendTo]=useState(false),[selectedGroups,setSelectedGroups]=useState([])
  const [editMode,setEditMode]=useState(null) // 'text'|'draw'|'brightness'|'contrast'|'saturation'
  const [texts,setTexts]=useState([]),[newText,setNewText]=useState(''),[textColor,setTextColor]=useState('#fff')
  const [brightness,setBrightness]=useState(100),[contrast,setContrast]=useState(100),[saturation,setSaturation]=useState(100)
  const [flashOverlay,setFlashOverlay]=useState(false)
  const [storyPublic,setStoryPublic]=useState(true)
  const [toast,setToast]=useState(null)
  const [sending,setSending]=useState(false)

  const startCam=useCallback(async(f)=>{
    if(stream)stream.getTracks().forEach(t=>t.stop())
    try{
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:f,width:{ideal:1280},height:{ideal:720}},audio:false})
      setStream(s);if(videoRef.current)videoRef.current.srcObject=s
    }catch(e){alert('Camera: '+e.message)}
  },[])

  useEffect(()=>{startCam(facing);return()=>stream?.getTracks().forEach(t=>t.stop())},[facing])

  function doFlash(cb){
    if(flashOn&&facing==='user'){setFlashOverlay(true);setTimeout(()=>{setFlashOverlay(false);cb()},150)}
    else cb()
  }

  function capture(){
    vibe()
    doFlash(()=>{
      const v=videoRef.current,c=canvasRef.current;if(!v||!c)return
      c.width=v.videoWidth;c.height=v.videoHeight
      const ctx=c.getContext('2d')
      if(facing==='user'){ctx.translate(c.width,0);ctx.scale(-1,1)}
      ctx.filter=CAM_FILTERS[filterIdx].css
      ctx.drawImage(v,0,0)
      c.toBlob(blob=>{
        stream?.getTracks().forEach(t=>t.stop())
        setCaptured(blob);setCapturedUrl(URL.createObjectURL(blob))
      },'image/jpeg',0.88)
    })
  }

  const imgFilter=`brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`

  async function uploadBlob(blob,path){
    const{error}=await supabase.storage.from('posts').upload(path,blob,{contentType:'image/jpeg'})
    if(error)throw error
    return supabase.storage.from('posts').getPublicUrl(path).data.publicUrl
  }

  async function saveToDevice(){
    const a=document.createElement('a');a.href=capturedUrl;a.download=`fitsnap_${Date.now()}.jpg`;a.click()
    setToast('Saved!')
  }

  async function postToStory(){
    setSending(true)
    try{
      const url=await uploadBlob(captured,`stories/${user.id}/${Date.now()}.jpg`)
      await supabase.from('stories').insert({user_id:user.id,image_url:url,is_public:storyPublic,expires_at:new Date(Date.now()+24*3600*1000).toISOString()})
      setToast('Posted to your story!')
      setTimeout(()=>{onClose()},1000)
    }catch(e){alert(e.message)}
    setSending(false)
  }

  async function sendToGroups(){
    if(!selectedGroups.length)return
    setSending(true)
    try{
      const url=await uploadBlob(captured,`${user.id}/${Date.now()}.jpg`)
      await Promise.all(selectedGroups.map(gid=>
        supabase.from('messages').insert({group_id:gid,sender_id:user.id,image_url:url,msg_type:'photo',content:null})
      ))
      await Promise.all(selectedGroups.map(gid=>supabase.from('groups').update({updated_at:new Date().toISOString(),last_message:'📷 Photo'}).eq('id',gid)))
      setToast('Sent!')
      setTimeout(()=>{onClose()},800)
    }catch(e){alert(e.message)}
    setSending(false)
  }

  // After capture screen
  if(capturedUrl){
    return(
      <div style={{position:'fixed',inset:0,background:'#000',zIndex:100,display:'flex',flexDirection:'column',userSelect:'none'}}>
        {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
        {/* Flash overlay */}
        {flashOverlay&&<div style={{position:'fixed',inset:0,background:'#fff',zIndex:200}}/>}

        {showSendTo?(
          <>
            <img src={capturedUrl} style={{flex:1,objectFit:'cover',width:'100%',filter:imgFilter}} alt=""/>
            <div style={{background:'#0d0d0d',borderRadius:'20px 20px 0 0',padding:'20px 16px 40px'}}>
              <div style={{fontWeight:800,fontSize:17,marginBottom:4}}>Send To</div>
              <div style={{fontSize:12,color:'#555',marginBottom:16}}>Pick groups to send your workout proof</div>
              {groups.map(g=>(
                <div key={g.id} onClick={()=>{vibe();setSelectedGroups(s=>s.includes(g.id)?s.filter(x=>x!==g.id):[...s,g.id])}} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 0',borderBottom:'1px solid #111',cursor:'pointer'}}>
                  <div style={{width:40,height:40,borderRadius:11,background:g.color||GROUP_COLORS[0],display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{g.icon||'💬'}</div>
                  <div style={{flex:1,fontWeight:600,fontSize:14}}>{g.name}</div>
                  <div style={{width:24,height:24,borderRadius:'50%',border:`2px solid ${selectedGroups.includes(g.id)?g.color||'#2563eb':'#333'}`,background:selectedGroups.includes(g.id)?g.color||'#2563eb':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#fff'}}>{selectedGroups.includes(g.id)&&'✓'}</div>
                </div>
              ))}
              {groups.length===0&&<div style={{color:'#444',fontSize:13,textAlign:'center',padding:'20px 0'}}>No groups yet — create one first</div>}
              <button onClick={sendToGroups} disabled={!selectedGroups.length||sending} style={{...ss.btn(null,'#2563eb'),width:'100%',marginTop:16,borderRadius:14,opacity:selectedGroups.length?1:.4}}>{sending?'Sending…':'Send →'}</button>
              <button onClick={()=>setShowSendTo(false)} style={{...ss.btn('ghost'),width:'100%',marginTop:8,borderRadius:14,border:'1px solid #1a1a1a'}}>Back</button>
            </div>
          </>
        ):(
          <>
            <div style={{flex:1,position:'relative',overflow:'hidden'}}>
              <img src={capturedUrl} style={{width:'100%',height:'100%',objectFit:'cover',filter:imgFilter}} alt=""/>
              {/* Text overlays */}
              {texts.map(t=>(
                <div key={t.id} style={{position:'absolute',left:`${t.x}%`,top:`${t.y}%`,transform:'translate(-50%,-50%)',color:t.color,fontSize:22,fontWeight:800,textShadow:'0 1px 6px rgba(0,0,0,.9)',pointerEvents:'none',whiteSpace:'nowrap'}}>{t.text}</div>
              ))}
              {/* Story privacy pill */}
              <div style={{position:'absolute',top:16,left:16,display:'flex',alignItems:'center',gap:8,background:'rgba(0,0,0,.55)',borderRadius:20,padding:'6px 12px',backdropFilter:'blur(8px)'}}>
                <span style={{fontSize:12,color:'#fff',fontWeight:600}}>{storyPublic?'🌍 Public':'🔒 Friends'}</span>
                <button onClick={()=>setStoryPublic(v=>!v)} style={{width:32,height:18,borderRadius:9,background:storyPublic?'#2563eb':'#444',border:'none',cursor:'pointer',position:'relative',flexShrink:0}}>
                  <div style={{position:'absolute',top:2,left:storyPublic?14:2,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left .15s'}}/>
                </button>
              </div>
              <button onClick={()=>setCaptured(null)&&setCapturedUrl(null)||setCapturedUrl(null)} style={{position:'absolute',top:16,right:16,background:'rgba(0,0,0,.55)',border:'none',color:'#fff',borderRadius:'50%',width:36,height:36,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>✕</button>

              {/* Right side edit tools */}
              <div style={{position:'absolute',right:12,top:'30%',display:'flex',flexDirection:'column',gap:14}}>
                {[['text',Ic.text],['draw',Ic.draw],['brightness',Ic.sun],['contrast',Ic.contrast],['saturation',Ic.droplet]].map(([mode,Icon])=>(
                  <button key={mode} onClick={()=>setEditMode(editMode===mode?null:mode)} style={{width:42,height:42,borderRadius:'50%',background:editMode===mode?'rgba(255,255,255,.25)':'rgba(0,0,0,.55)',border:`1.5px solid ${editMode===mode?'#fff':'rgba(255,255,255,.2)'}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>{Icon()}</button>
                ))}
              </div>

              {/* Edit panels */}
              {editMode==='text'&&(
                <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,.9)',padding:'12px 14px',backdropFilter:'blur(10px)'}}>
                  <div style={{display:'flex',gap:5,marginBottom:8}}>{TEXT_COLORS.map(c=><button key={c} onClick={()=>setTextColor(c)} style={{width:24,height:24,borderRadius:'50%',background:c,border:`2.5px solid ${c===textColor?'#fff':'transparent'}`,cursor:'pointer'}}/>)}</div>
                  <div style={{display:'flex',gap:8}}>
                    <input style={{...ss.input,flex:1,padding:'8px 12px'}} placeholder="Add text…" value={newText} onChange={e=>setNewText(e.target.value)} autoFocus onKeyDown={e=>{if(e.key==='Enter'&&newText.trim()){setTexts(t=>[...t,{id:Date.now(),text:newText,color:textColor,x:50,y:40}]);setNewText('')}}}/>
                    <button onClick={()=>{if(newText.trim()){setTexts(t=>[...t,{id:Date.now(),text:newText,color:textColor,x:50,y:40}]);setNewText('')}}} style={{...ss.btn(),padding:'8px 14px',borderRadius:12}}>Add</button>
                  </div>
                </div>
              )}
              {['brightness','contrast','saturation'].includes(editMode)&&(
                <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,.9)',padding:'16px 20px',backdropFilter:'blur(10px)'}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:12,textTransform:'capitalize'}}>{editMode}</div>
                  <input type="range" min="50" max="150" value={editMode==='brightness'?brightness:editMode==='contrast'?contrast:saturation}
                    onChange={e=>{const v=parseInt(e.target.value);editMode==='brightness'?setBrightness(v):editMode==='contrast'?setContrast(v):setSaturation(v)}}
                    style={{width:'100%',accentColor:'#2563eb'}}/>
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'14px 16px 40px',background:'rgba(0,0,0,.95)'}}>
              <button onClick={saveToDevice} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:5,background:'rgba(255,255,255,.1)',border:'none',color:'#fff',borderRadius:16,padding:'12px 8px',cursor:'pointer'}}>
                {Ic.download()}
                <span style={{fontSize:11,fontWeight:600}}>Save</span>
              </button>
              <button onClick={postToStory} disabled={sending} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:5,background:'rgba(255,255,255,.1)',border:'none',color:'#fff',borderRadius:16,padding:'12px 8px',cursor:'pointer'}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#f97316,#ef4444)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>📖</div>
                <span style={{fontSize:11,fontWeight:600}}>My Story</span>
              </button>
              <button onClick={()=>setShowSendTo(true)} style={{flex:1.4,display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'#2563eb',border:'none',color:'#fff',borderRadius:16,padding:'14px 8px',cursor:'pointer'}}>
                <span style={{fontWeight:800,fontSize:14}}>Send To</span>
                {Ic.send()}
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // Live viewfinder
  return(
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:100}}
      onDoubleClick={()=>{vibe();setFacing(f=>f==='user'?'environment':'user');startCam(facing==='user'?'environment':'user')}}
    >
      {flashOverlay&&<div style={{position:'fixed',inset:0,background:'#fff',zIndex:200,pointerEvents:'none'}}/>}
      <video ref={videoRef} autoPlay playsInline muted style={{width:'100%',height:'100%',objectFit:'cover',filter:CAM_FILTERS[filterIdx].css,transform:facing==='user'?'scaleX(-1)':'none'}}/>
      <canvas ref={canvasRef} style={{display:'none'}}/>

      {/* Top controls */}
      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 20px',background:'linear-gradient(to bottom,rgba(0,0,0,.4),transparent)'}}>
        <button onClick={onClose} style={{background:'rgba(0,0,0,.4)',border:'none',color:'#fff',borderRadius:'50%',width:38,height:38,fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>✕</button>
        <button onClick={()=>{vibe();setFlashOn(v=>!v)}} style={{background:flashOn?'rgba(255,220,0,.3)':'rgba(0,0,0,.4)',border:flashOn?'1.5px solid #ffd60a':'none',borderRadius:'50%',width:38,height:38,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>
          {Ic.flash(flashOn?'#ffd60a':'#fff')}
        </button>
      </div>

      {/* Filter bar bottom */}
      <div style={{position:'absolute',bottom:100,left:0,right:0}}>
        <div style={{display:'flex',gap:8,padding:'0 16px',overflowX:'auto',justifyContent:'center'}}>
          {CAM_FILTERS.map((f,i)=>(
            <button key={f.name} onClick={()=>setFilterIdx(i)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,background:'none',border:'none',cursor:'pointer',flexShrink:0}}>
              <div style={{width:48,height:48,borderRadius:12,overflow:'hidden',border:`2px solid ${i===filterIdx?'#fff':'rgba(255,255,255,.2)'}`,position:'relative'}}>
                <video src="" style={{width:'100%',height:'100%',objectFit:'cover',filter:f.css,transform:facing==='user'?'scaleX(-1)':'none',pointerEvents:'none'}}/>
                <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.15)'}}/>
              </div>
              <span style={{fontSize:10,color:i===filterIdx?'#fff':'rgba(255,255,255,.5)',fontWeight:i===filterIdx?700:400}}>{f.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{position:'absolute',bottom:28,left:0,right:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 32px'}}>
        <label style={{cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',width:50,height:50}}>
          <div style={{width:50,height:50,borderRadius:14,border:'2px solid rgba(255,255,255,.4)',background:'rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>
            {Ic.gallery()}
          </div>
          <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){stream?.getTracks().forEach(t=>t.stop());setCaptured(f);setCapturedUrl(URL.createObjectURL(f))}}}/>
        </label>
        <button onClick={capture} style={{width:76,height:76,borderRadius:'50%',background:'#fff',border:'4px solid rgba(255,255,255,.3)',cursor:'pointer',flexShrink:0}}/>
        <button onClick={()=>{vibe();setFacing(f=>{const nf=f==='user'?'environment':'user';startCam(nf);return nf})}} style={{width:50,height:50,borderRadius:'50%',background:'rgba(0,0,0,.4)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>
          {Ic.flip()}
        </button>
      </div>
    </div>
  )
}

// ── Auth ─────────────────────────────────────────────────────
function AuthScreen({onSession}){
  const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[pass,setPass]=useState(''),[err,setErr]=useState(''),[loading,setLoading]=useState(false)
  async function submit(){
    setErr('');setLoading(true)
    const{data,error}=mode==='login'?await supabase.auth.signInWithPassword({email,password:pass}):await supabase.auth.signUp({email,password:pass})
    setLoading(false)
    if(error){setErr(error.message);return}
    if(data.session)onSession(data.session)
    else setErr('Check your email.')
  }
  return(
    <div style={{minHeight:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{width:'100%',maxWidth:360}}>
        <div style={{textAlign:'center',marginBottom:36}}>
          <div style={{fontSize:52,marginBottom:10}}>🔥</div>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:-1}}>FitSnap</div>
          <div style={{fontSize:13,color:'#555',marginTop:4}}>Accountability with your crew</div>
        </div>
        <div style={{background:'#0d0d0d',borderRadius:24,padding:24}}>
          <input style={{...ss.input,marginBottom:12}} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
          <input style={{...ss.input,marginBottom:16}} type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}/>
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

// ── Profile Setup ────────────────────────────────────────────
function ProfileSetup({user,onDone}){
  const [form,setForm]=useState({username:'',current_weight:'',goal_weight:'',main_goal:'',is_weight_public:true})
  const [avatarFile,setAvatarFile]=useState(null),[avatarPreview,setAvatarPreview]=useState(null),[loading,setLoading]=useState(false),[err,setErr]=useState('')
  const fileRef=useRef()
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  async function save(){
    if(!form.username.trim()){setErr('Username required');return}
    setLoading(true)
    let avatar_url=null
    if(avatarFile){const ext=avatarFile.name.split('.').pop(),path=`avatars/${user.id}.${ext}`;const{error:e}=await supabase.storage.from('avatars').upload(path,avatarFile,{upsert:true});if(!e){const{data}=supabase.storage.from('avatars').getPublicUrl(path);avatar_url=data.publicUrl}}
    const{error}=await supabase.from('profiles').upsert({id:user.id,username:form.username.trim(),current_weight:parseFloat(form.current_weight)||null,goal_weight:parseFloat(form.goal_weight)||null,main_goal:form.main_goal.trim(),is_weight_public:form.is_weight_public,...(avatar_url&&{avatar_url}),updated_at:new Date().toISOString()})
    setLoading(false)
    if(error){setErr(error.message);return}
    onDone()
  }
  return(
    <div style={{minHeight:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#0d0d0d',borderRadius:24,width:'100%',maxWidth:380,padding:24}}>
        <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>Set up profile</div>
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
          <div style={{fontSize:13,fontWeight:600}}>Show weight publicly</div>
          <button onClick={()=>set('is_weight_public',!form.is_weight_public)} style={{width:44,height:26,borderRadius:13,background:form.is_weight_public?'#2563eb':'#222',border:'none',cursor:'pointer',position:'relative'}}>
            <div style={{position:'absolute',top:3,left:form.is_weight_public?21:3,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left .15s'}}/>
          </button>
        </div>
        {err&&<div style={{color:T.danger,fontSize:12,marginBottom:10}}>{err}</div>}
        <button style={{...ss.btn(),width:'100%',padding:13,borderRadius:14,fontSize:15}} onClick={save} disabled={loading}>{loading?'Setting up…':'Get Started →'}</button>
      </div>
    </div>
  )
}

// ── Story Viewer ─────────────────────────────────────────────
function StoryViewer({stories,user,onClose}){
  const [idx,setIdx]=useState(0),[progress,setProgress]=useState(0)
  const story=stories[idx]
  useEffect(()=>{
    setProgress(0);const start=Date.now()
    const iv=setInterval(()=>{const p=Math.min(100,((Date.now()-start)/5000)*100);setProgress(p);if(p>=100){if(idx<stories.length-1)setIdx(i=>i+1);else onClose()}},50)
    if(story&&user)supabase.from('story_views').upsert({story_id:story.id,viewer_id:user.id}).catch(()=>{})
    return()=>clearInterval(iv)
  },[idx])
  if(!story)return null
  return(
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:200}} onClick={e=>{const x=e.clientX/window.innerWidth;x>0.5?idx<stories.length-1?setIdx(i=>i+1):onClose():idx>0?setIdx(i=>i-1):onClose()}}>
      <img src={story.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
      <div style={{position:'absolute',top:12,left:12,right:12,display:'flex',gap:3}}>
        {stories.map((_,i)=><div key={i} style={{flex:1,height:2.5,background:'rgba(255,255,255,.25)',borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',background:'#fff',width:`${i<idx?100:i===idx?progress:0}%`,borderRadius:2}}/></div>)}
      </div>
      <div style={{position:'absolute',top:24,left:16,right:16,display:'flex',alignItems:'center',gap:10,marginTop:8}}>
        <Avatar url={story.profiles?.avatar_url} name={story.profiles?.username} size={34}/>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:'#fff',textShadow:'0 1px 4px rgba(0,0,0,.8)'}}>{story.profiles?.username}</div><div style={{fontSize:11,color:'rgba(255,255,255,.6)'}}>{ago(story.created_at)}</div></div>
        <button onClick={e=>{e.stopPropagation();onClose()}} style={{background:'rgba(0,0,0,.5)',border:'none',color:'#fff',borderRadius:'50%',width:32,height:32,cursor:'pointer',fontSize:16}}>✕</button>
      </div>
    </div>
  )
}

// ── Group Chat (combined feed+chat) ──────────────────────────
function GroupChat({group,user,onBack,onViewProfile,onOpenCamera}){
  const [messages,setMessages]=useState([]),[loading,setLoading]=useState(true)
  const [text,setText]=useState(''),[file,setFile]=useState(null),[preview,setPreview]=useState(null),[sending,setSending]=useState(false)
  const [replyTo,setReplyTo]=useState(null)
  const [holdMsg,setHoldMsg]=useState(null)
  const [showReactions,setShowReactions]=useState(null)
  const [msgReactions,setMsgReactions]=useState({})
  const [showFeatures,setShowFeatures]=useState(false)
  const [showLeaderboard,setShowLeaderboard]=useState(false)
  const [leaderboard,setLeaderboard]=useState([])
  const [members,setMembers]=useState([])
  const [showManage,setShowManage]=useState(false)
  const [addSearch,setAddSearch]=useState(''),[addResults,setAddResults]=useState([])
  const [copied,setCopied]=useState(false)
  const [challenges,setChallenges]=useState([])
  const [shameWall,setShameWall]=useState([])
  const [mvpVotes,setMvpVotes]=useState({}),[myVote,setMyVote]=useState(null)
  const [showCreateBet,setShowCreateBet]=useState(false)
  const [betForm,setBetForm]=useState({title:'',duration_days:7,bet_amount:0,penalty_type:'per_miss'})
  const [viewingStory,setViewingStory]=useState(null)
  const [swipeStartX,setSwipeStartX]=useState(null)
  const bottomRef=useRef(),fileRef=useRef()
  const accent=groupAccent(group),isOwner=group.created_by===user.id
  const inviteLink=`${window.location.origin}?joingroup=${group.id}`

  const loadMessages=useCallback(async()=>{
    const{data}=await supabase.from('messages').select('*,profiles(id,username,avatar_url)').eq('group_id',group.id).order('created_at',{ascending:true}).limit(100)
    setMessages(data||[])
    if(data?.length){
      const ids=data.map(m=>m.id)
      const{data:rxns}=await supabase.from('reactions').select('message_id,emoji,user_id').in('message_id',ids)
      const map={}
      ;(rxns||[]).forEach(r=>{if(!map[r.message_id])map[r.message_id]={};map[r.message_id][r.emoji]=(map[r.message_id][r.emoji]||0)+1})
      setMsgReactions(map)
    }
    setLoading(false)
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),100)
  },[group.id])

  useEffect(()=>{
    loadMessages()
    const ch=supabase.channel(`grp_${group.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`group_id=eq.${group.id}`},()=>loadMessages()).subscribe()
    return()=>supabase.removeChannel(ch)
  },[loadMessages])

  useEffect(()=>{
    supabase.from('group_members').select('user_id,profiles(username,avatar_url),streaks(current_streak,longest_streak)').eq('group_id',group.id).then(({data})=>{
      setMembers(data||[])
      setLeaderboard((data||[]).sort((a,b)=>(b.streaks?.current_streak||0)-(a.streaks?.current_streak||0)))
    })
    supabase.from('challenges').select('*').eq('group_id',group.id).eq('status','active').then(({data})=>setChallenges(data||[]))
    loadShame()
    loadMVP()
  },[group.id])

  const loadShame=async()=>{
    const{data:mems}=await supabase.from('group_members').select('user_id,profiles(username,avatar_url)').eq('group_id',group.id)
    const{data:msgs}=await supabase.from('messages').select('sender_id').eq('group_id',group.id).eq('msg_type','photo').gte('created_at',today()+'T00:00:00')
    const{data:rd}=await supabase.from('rest_days').select('user_id').eq('date',today())
    const posted=new Set((msgs||[]).map(m=>m.sender_id))
    const resting=new Set((rd||[]).map(r=>r.user_id))
    setShameWall((mems||[]).filter(m=>!posted.has(m.user_id)&&!resting.has(m.user_id)&&m.user_id!==user.id))
  }

  const loadMVP=async()=>{
    const wk=`${new Date().getFullYear()}-W${Math.ceil(((new Date()-new Date(new Date().getFullYear(),0,1))/86400000+1)/7)}`
    const{data}=await supabase.from('mvp_votes').select('nominee_id').eq('group_id',group.id).eq('week',wk)
    const map={};(data||[]).forEach(v=>{map[v.nominee_id]=(map[v.nominee_id]||0)+1});setMvpVotes(map)
    const{data:mine}=await supabase.from('mvp_votes').select('nominee_id').eq('group_id',group.id).eq('voter_id',user.id).eq('week',wk).single()
    if(mine)setMyVote(mine.nominee_id)
  }

  async function send(){
    if(!file&&!text.trim())return
    setSending(true)
    let image_url=null,msg_type='text'
    if(file){
      const ext=(file.name||'jpg').split('.').pop()||'jpg',path=`${user.id}/${Date.now()}.${ext}`
      const{error:upErr}=await supabase.storage.from('posts').upload(path,file)
      if(upErr){alert('Upload failed: '+upErr.message);setSending(false);return}
      const{data}=supabase.storage.from('posts').getPublicUrl(path);image_url=data.publicUrl;msg_type='photo'
    }
    const payload={group_id:group.id,sender_id:user.id,content:text.trim()||null,image_url,msg_type,...(replyTo&&{reply_to_id:replyTo.id,reply_preview:replyTo.content||(replyTo.image_url?'📷 Photo':'')})}
    const{error}=await supabase.from('messages').insert(payload)
    if(!error){
      setText('');setFile(null);setPreview(null);setReplyTo(null)
      await supabase.from('groups').update({updated_at:new Date().toISOString(),last_message:msg_type==='photo'?'📷 Photo':text.trim()}).eq('id',group.id)
      if(msg_type==='photo'){
        // Update streak
        const{data:st}=await supabase.from('streaks').select('*').eq('user_id',user.id).single()
        const td=today()
        if(st){if(st.last_post_date!==td){const diff=(new Date(td)-new Date(st.last_post_date))/(86400000);const ns=diff===1?st.current_streak+1:1;await supabase.from('streaks').update({current_streak:ns,longest_streak:Math.max(ns,st.longest_streak||0),last_post_date:td}).eq('user_id',user.id)}}
        else await supabase.from('streaks').insert({user_id:user.id,current_streak:1,longest_streak:1,last_post_date:td})
        loadShame()
      }
    }else alert(error.message)
    setSending(false)
  }

  async function reactToMsg(msgId,emoji,ownerId){
    vibe()
    setShowReactions(null)
    await supabase.from('reactions').upsert({message_id:msgId,user_id:user.id,emoji},{onConflict:'message_id,user_id'})
    setMsgReactions(r=>{const cur={...(r[msgId]||{})};cur[emoji]=(cur[emoji]||0)+1;return{...r,[msgId]:cur}})
    if(ownerId!==user.id)await supabase.from('notifications').insert({user_id:ownerId,type:'reaction',message:`Someone reacted ${emoji} to your post!`})
  }

  async function logRestDay(){
    await supabase.from('rest_days').insert({user_id:user.id,date:today()})
    await supabase.from('messages').insert({group_id:group.id,sender_id:user.id,content:`${user.username||'Someone'} logged a rest day 💤`,msg_type:'system'})
    loadShame()
    vibe()
  }

  async function voteMVP(nomineeId){
    if(myVote)return
    const wk=`${new Date().getFullYear()}-W${Math.ceil(((new Date()-new Date(new Date().getFullYear(),0,1))/86400000+1)/7)}`
    const{error}=await supabase.from('mvp_votes').insert({group_id:group.id,voter_id:user.id,nominee_id:nomineeId,week:wk})
    if(!error){setMyVote(nomineeId);setMvpVotes(m=>({...m,[nomineeId]:(m[nomineeId]||0)+1}));await supabase.from('notifications').insert({user_id:nomineeId,type:'mvp',message:'You got an MVP vote! 👑'})}
  }

  async function createBet(){
    if(!betForm.title.trim())return
    const endsDate=new Date();endsDate.setDate(endsDate.getDate()+parseInt(betForm.duration_days))
    const{data:ch,error}=await supabase.from('challenges').insert({group_id:group.id,created_by:user.id,title:betForm.title.trim(),duration_days:parseInt(betForm.duration_days),bet_amount:parseFloat(betForm.bet_amount)||0,penalty_type:betForm.penalty_type,starts_at:today(),ends_at:endsDate.toISOString().slice(0,10),status:'active'}).select().single()
    if(!error&&ch){await supabase.from('challenge_participants').insert({challenge_id:ch.id,user_id:user.id});setChallenges(c=>[...c,ch]);setShowCreateBet(false)}else alert(error?.message)
  }

  async function searchToAdd(){
    if(!addSearch.trim())return
    const{data}=await supabase.from('profiles').select('id,username,avatar_url').ilike('username',`%${addSearch.trim()}%`).neq('id',user.id).limit(8)
    const memberIds=new Set(members.map(m=>m.user_id))
    setAddResults((data||[]).filter(u=>!memberIds.has(u.id)))
  }

  async function addMember(uid){await supabase.from('group_members').insert({group_id:group.id,user_id:uid});setAddResults(r=>r.filter(u=>u.id!==uid))}
  async function kickMember(uid){if(!window.confirm('Remove?'))return;await supabase.from('group_members').delete().eq('group_id',group.id).eq('user_id',uid);setMembers(m=>m.filter(x=>x.user_id!==uid))}
  async function deleteGroup(){if(!window.confirm('Delete group?'))return;await supabase.from('group_members').delete().eq('group_id',group.id);await supabase.from('groups').delete().eq('id',group.id);onBack()}

  // Render a message bubble
  function renderMsg(m,prevM){
    const isMe=m.sender_id===user.id
    const isSystem=m.msg_type==='system'
    const isPhoto=m.msg_type==='photo'
    const sameUser=prevM&&prevM.sender_id===m.sender_id&&prevM.msg_type!=='system'
    const rxns=msgReactions[m.id]||{}
    const hasRxns=Object.keys(rxns).length>0

    if(isSystem)return(
      <div key={m.id} style={{textAlign:'center',padding:'6px 20px'}}>
        <span style={{fontSize:11,color:'#444',background:'#0d0d0d',padding:'4px 12px',borderRadius:12}}>{m.content}</span>
      </div>
    )

    return(
      <div key={m.id} style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start',marginBottom:hasRxns?16:3,paddingLeft:isMe?40:0,paddingRight:isMe?0:40}}
        onTouchStart={e=>{
          e.currentTarget._holdTimer=setTimeout(()=>{vibe(20);setShowReactions(m.id)},400)
          setSwipeStartX(e.touches[0].clientX)
        }}
        onTouchEnd={e=>{
          clearTimeout(e.currentTarget._holdTimer)
          const dx=e.changedTouches[0].clientX-swipeStartX
          if(dx>50&&!isMe)setReplyTo(m)
          else if(dx<-50&&isMe)setReplyTo(m)
        }}
        onMouseDown={e=>{e.currentTarget._holdTimer=setTimeout(()=>{vibe(20);setShowReactions(m.id)},400)}}
        onMouseUp={e=>clearTimeout(e.currentTarget._holdTimer)}
      >
        {/* Name (first in cluster, not me) */}
        {!isMe&&!sameUser&&<div style={{fontSize:11,color:'#555',marginBottom:3,marginLeft:4,fontWeight:600}}>{m.profiles?.username}</div>}

        {/* Reply preview */}
        {m.reply_to_id&&m.reply_preview&&(
          <div style={{background:'rgba(255,255,255,.06)',borderLeft:`3px solid ${accent}`,borderRadius:8,padding:'5px 10px',marginBottom:4,fontSize:11,color:'#666',maxWidth:220}}>↩ {m.reply_preview}</div>
        )}

        {/* Bubble */}
        <div style={{position:'relative',maxWidth:'78%'}}>
          {isPhoto?(
            <div style={{borderRadius:18,overflow:'hidden',cursor:'pointer'}} onClick={()=>{}}>
              <img src={m.image_url} style={{width:'100%',maxWidth:260,display:'block',borderRadius:18}} alt="workout proof"/>
              {m.content&&<div style={{background:isMe?accent:'#1a1a1a',padding:'8px 12px',fontSize:13,lineHeight:1.4,borderRadius:'0 0 18px 18px'}}>{m.content}</div>}
            </div>
          ):(
            <div style={{background:isMe?accent:'#1a1a1a',padding:'9px 14px',borderRadius:isMe?'18px 18px 4px 18px':'18px 18px 18px 4px',fontSize:14,lineHeight:1.4,wordBreak:'break-word'}}>
              {m.content}
            </div>
          )}

          {/* Reaction wheel overlay */}
          {showReactions===m.id&&(
            <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowReactions(null)}>
              <div style={{display:'flex',gap:14,background:'#111',borderRadius:40,padding:'14px 22px',border:'1px solid #222'}}>
                {REACTIONS.map(r=>(
                  <button key={r.e} onClick={e=>{e.stopPropagation();reactToMsg(m.id,r.e,m.sender_id)}} style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                    <span style={{fontSize:30}}>{r.e}</span>
                    <span style={{fontSize:10,color:'#888'}}>{r.l}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reactions row */}
        {hasRxns&&(
          <div style={{display:'flex',gap:4,marginTop:4,flexWrap:'wrap',justifyContent:isMe?'flex-end':'flex-start'}}>
            {Object.entries(rxns).map(([e,count])=>(
              <div key={e} style={{background:'#111',borderRadius:12,padding:'3px 8px',fontSize:12,border:'1px solid #1a1a1a'}}>{e} {count}</div>
            ))}
          </div>
        )}

        <div style={{fontSize:10,color:'#2a2a2a',marginTop:2}}>{ago(m.created_at)}</div>
      </div>
    )
  }

  return(
    <div style={{...ss.page,display:'flex',flexDirection:'column',height:'100vh'}}>
      {/* Top bar */}
      <div style={{...ss.topBar,borderBottom:`1px solid ${accent}22`,flexShrink:0}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',display:'flex',padding:'0 4px'}}>{Ic.back()}</button>
        <div style={{width:30,height:30,borderRadius:8,background:accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0}}>{group.icon||'💬'}</div>
        <div style={{fontWeight:800,fontSize:15,flex:1}}>{group.name}</div>
        <button onClick={()=>{setShowLeaderboard(true);}} style={{background:'none',border:'none',color:'#555',cursor:'pointer',marginRight:4}}>{Ic.trophy()}</button>
        <button onClick={()=>setShowFeatures(v=>!v)} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',fontSize:15}}>⋯</button>
        {isOwner&&<button onClick={()=>setShowManage(v=>!v)} style={{background:'none',border:'none',color:showManage?accent:'#444',cursor:'pointer',fontSize:15}}>⚙️</button>}
      </div>

      {/* Manage panel */}
      {showManage&&isOwner&&(
        <div style={{background:'#0d0d0d',borderBottom:'1px solid #111',padding:'14px 16px',flexShrink:0}}>
          <div style={{fontSize:11,color:'#444',marginBottom:10,textTransform:'uppercase',letterSpacing:.8,fontWeight:700}}>Manage</div>
          <div style={{background:'#111',borderRadius:12,padding:10,marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>🔗 Invite Link</div>
            <div style={{display:'flex',gap:6}}>
              <div style={{flex:1,fontSize:11,color:'#444',background:'#0a0a0a',padding:'7px 10px',borderRadius:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inviteLink}</div>
              <button onClick={async()=>{await navigator.clipboard.writeText(inviteLink);setCopied(true);setTimeout(()=>setCopied(false),2000)}} style={{...ss.btn(null,accent),padding:'6px 12px',fontSize:12,borderRadius:8}}>{copied?'✓':'Copy'}</button>
            </div>
          </div>
          <div style={{display:'flex',gap:6,marginBottom:8}}>
            <input style={{...ss.input,flex:1}} placeholder="Add by username…" value={addSearch} onChange={e=>setAddSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchToAdd()}/>
            <button style={{...ss.btn(null,accent),padding:'8px 12px',fontSize:12,borderRadius:8}} onClick={searchToAdd}>Search</button>
          </div>
          {addResults.map(u=>(
            <div key={u.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #111'}}>
              <Avatar url={u.avatar_url} name={u.username} size={28}/>
              <div style={{flex:1,fontSize:13,fontWeight:600}}>{u.username}</div>
              <button onClick={()=>addMember(u.id)} style={{...ss.btn(null,accent),padding:'5px 10px',fontSize:12,borderRadius:8}}>Add</button>
            </div>
          ))}
          <div style={{marginTop:8}}>
            {members.map(m=>(
              <div key={m.user_id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0'}}>
                <Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={24}/>
                <div style={{flex:1,fontSize:12}}>{m.profiles?.username}{m.user_id===group.created_by?' 👑':''}</div>
                {m.user_id!==user.id&&<button onClick={()=>kickMember(m.user_id)} style={{background:'none',border:'1px solid #222',borderRadius:6,color:T.danger,padding:'2px 7px',fontSize:11,cursor:'pointer'}}>Kick</button>}
              </div>
            ))}
          </div>
          <button onClick={deleteGroup} style={{...ss.btn('danger'),width:'100%',borderRadius:12,fontSize:13,marginTop:10}}>🗑️ Delete Group</button>
        </div>
      )}

      {/* Features panel (collapsible) */}
      {showFeatures&&(
        <div style={{background:'#0d0d0d',borderBottom:'1px solid #111',flexShrink:0}}>
          {/* Active bets pinned */}
          {challenges.length>0&&(
            <div style={{padding:'10px 16px',borderBottom:'1px solid #111'}}>
              <div style={{fontSize:11,color:'#444',marginBottom:6,textTransform:'uppercase',fontWeight:700,letterSpacing:.5}}>Active Bets</div>
              {challenges.map(c=>{
                const daysLeft=Math.max(0,Math.ceil((new Date(c.ends_at)-new Date())/(86400000)))
                return(
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0'}}>
                    <div style={{flex:1,fontSize:13,fontWeight:600}}>{c.title}</div>
                    <div style={{fontSize:11,color:'#555'}}>{daysLeft}d left</div>
                    {c.bet_amount>0&&<div style={{fontSize:11,color:T.warning}}>${c.bet_amount}</div>}
                  </div>
                )
              })}
              <button onClick={()=>setShowCreateBet(true)} style={{...ss.btn(null,accent),padding:'6px 14px',fontSize:12,borderRadius:10,marginTop:6}}>+ New Bet</button>
            </div>
          )}
          {challenges.length===0&&<div style={{padding:'10px 16px',borderBottom:'1px solid #111',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:13,color:'#555'}}>No active bets</span>
            <button onClick={()=>setShowCreateBet(true)} style={{...ss.btn(null,accent),padding:'6px 14px',fontSize:12,borderRadius:10}}>+ New Bet</button>
          </div>}

          {/* Shame wall */}
          {shameWall.length>0&&(
            <div style={{padding:'10px 16px',borderBottom:'1px solid #111'}}>
              <div style={{fontSize:11,color:'#444',marginBottom:6,textTransform:'uppercase',fontWeight:700,letterSpacing:.5}}>💀 Haven't Posted Today</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {shameWall.map(m=>(
                  <div key={m.user_id} style={{display:'flex',alignItems:'center',gap:6,background:'#111',borderRadius:20,padding:'4px 10px'}}>
                    <Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={20}/>
                    <span style={{fontSize:12}}>{m.profiles?.username}</span>
                    <button onClick={()=>{supabase.from('notifications').insert({user_id:m.user_id,type:'hype',message:'Someone sent you a hype! 💪'});vibe()}} style={{background:'none',border:'none',color:'#f97316',cursor:'pointer',fontSize:12}}>📣</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MVP */}
          <div style={{padding:'10px 16px',borderBottom:'1px solid #111'}}>
            <div style={{fontSize:11,color:'#444',marginBottom:8,textTransform:'uppercase',fontWeight:700,letterSpacing:.5}}>👑 MVP This Week</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {leaderboard.slice(0,5).map(m=>(
                <button key={m.user_id} onClick={()=>voteMVP(m.user_id)} disabled={!!myVote} style={{display:'flex',alignItems:'center',gap:6,background:myVote===m.user_id?`${accent}22`:'#111',border:`1px solid ${myVote===m.user_id?accent:'#1a1a1a'}`,borderRadius:20,padding:'5px 10px',cursor:'pointer'}}>
                  <Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={20}/>
                  <span style={{fontSize:12,color:'#fff'}}>{m.profiles?.username}</span>
                  {mvpVotes[m.user_id]>0&&<span style={{fontSize:11,color:accent}}>{mvpVotes[m.user_id]}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Rest day */}
          <div style={{padding:'10px 16px'}}>
            <button onClick={logRestDay} style={{...ss.btn('ghost'),borderRadius:12,fontSize:13,border:'1px solid #1a1a1a',padding:'8px 16px'}}>💤 Log Rest Day</button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'10px 12px 10px'}}>
        {loading?[0,1,2,3].map(i=><div key={i} style={{marginBottom:12}}><Skeleton w="60%" h={14}/><Skeleton w="40%" h={14}/></div>)
          :messages.map((m,i)=>renderMsg(m,messages[i-1]))}
        <div ref={bottomRef}/>
      </div>

      {/* Reply bar */}
      {replyTo&&(
        <div style={{background:'#0d0d0d',borderTop:'1px solid #111',padding:'8px 14px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <div style={{flex:1,fontSize:12,color:'#888',borderLeft:`3px solid ${accent}`,paddingLeft:8}}>
            ↩ Replying to: {replyTo.content||(replyTo.image_url?'📷 Photo':'')}
          </div>
          <button onClick={()=>setReplyTo(null)} style={{background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:18}}>✕</button>
        </div>
      )}

      {/* Input bar */}
      {preview&&(
        <div style={{padding:'6px 14px 0',display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
          <img src={preview} style={{height:52,borderRadius:10,objectFit:'cover'}} alt=""/>
          <button onClick={()=>{setFile(null);setPreview(null)}} style={{background:'rgba(0,0,0,.6)',border:'none',color:'#fff',borderRadius:'50%',width:18,height:18,cursor:'pointer',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px 32px',background:'rgba(0,0,0,.98)',borderTop:'1px solid #0d0d0d',flexShrink:0}}>
        <button onClick={onOpenCamera} style={{background:'none',border:'none',color:'#555',cursor:'pointer',flexShrink:0,display:'flex'}}>{Ic.camera('#555')}</button>
        <label style={{cursor:'pointer',flexShrink:0,color:'#555',display:'flex'}}>
          {Ic.gallery('#555')}
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setFile(f);setPreview(URL.createObjectURL(f))}}}/>
        </label>
        <input style={{...ss.input,flex:1,padding:'10px 14px'}} placeholder={file?'Add a caption…':'Message or send proof…'} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}/>
        <button onClick={send} disabled={sending||(!file&&!text.trim())} style={{width:36,height:36,borderRadius:'50%',background:(file||text.trim())?accent:'#111',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background .2s'}}>
          {sending?<span style={{fontSize:11}}>…</span>:Ic.send()}
        </button>
      </div>

      {/* Leaderboard modal */}
      {showLeaderboard&&(
        <Modal onClose={()=>setShowLeaderboard(false)}>
          <div style={{fontWeight:800,fontSize:17,marginBottom:16}}>🏆 Leaderboard</div>
          {leaderboard.map((m,i)=>(
            <div key={m.user_id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid #111',cursor:'pointer'}} onClick={()=>{setShowLeaderboard(false);onViewProfile&&onViewProfile(m.user_id)}}>
              <div style={{fontSize:16,fontWeight:900,color:i===0?T.warning:i===1?'#888':i===2?'#cd7f32':'#333',width:24}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</div>
              <Avatar url={m.profiles?.avatar_url} name={m.profiles?.username} size={36} color={accent}/>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{m.profiles?.username}</div><div style={{fontSize:11,color:'#444'}}>Best: {m.streaks?.longest_streak||0}d</div></div>
              {(m.streaks?.current_streak||0)>0&&<div style={{background:'linear-gradient(135deg,#f97316,#ef4444)',color:'#fff',borderRadius:8,fontSize:12,fontWeight:800,padding:'3px 8px'}}>🔥{m.streaks.current_streak}</div>}
            </div>
          ))}
        </Modal>
      )}

      {/* Create bet modal */}
      {showCreateBet&&(
        <Modal onClose={()=>setShowCreateBet(false)}>
          <div style={{fontWeight:800,fontSize:17,marginBottom:16}}>🎯 New Bet</div>
          <input style={{...ss.input,marginBottom:10}} placeholder="Bet name…" value={betForm.title} onChange={e=>setBetForm(f=>({...f,title:e.target.value}))}/>
          <div style={{marginBottom:10}}><div style={{fontSize:11,color:'#444',marginBottom:6,textTransform:'uppercase',fontWeight:700}}>Duration</div><div style={{display:'flex',gap:6}}>{[3,7,14,30].map(d=><button key={d} style={ss.pill(betForm.duration_days===d,accent)} onClick={()=>setBetForm(f=>({...f,duration_days:d}))}>{d}d</button>)}</div></div>
          <div style={{marginBottom:10}}><div style={{fontSize:11,color:'#444',marginBottom:6,textTransform:'uppercase',fontWeight:700}}>Bet Amount</div><div style={{display:'flex',gap:6}}>{[0,5,10,25,50].map(a=><button key={a} style={ss.pill(betForm.bet_amount===a,accent)} onClick={()=>setBetForm(f=>({...f,bet_amount:a}))}>{a===0?'Free':`$${a}`}</button>)}</div></div>
          <div style={{marginBottom:16}}><div style={{fontSize:11,color:'#444',marginBottom:6,textTransform:'uppercase',fontWeight:700}}>Penalty</div><div style={{display:'flex',gap:6}}><button style={ss.pill(betForm.penalty_type==='per_miss',accent)} onClick={()=>setBetForm(f=>({...f,penalty_type:'per_miss'}))}>Per Miss</button><button style={ss.pill(betForm.penalty_type==='all_or_nothing',accent)} onClick={()=>setBetForm(f=>({...f,penalty_type:'all_or_nothing'}))}>All or Nothing</button></div></div>
          <button style={{...ss.btn(null,accent),width:'100%',borderRadius:12}} onClick={createBet}>Create</button>
        </Modal>
      )}
    </div>
  )
}

// ── DM Screen ────────────────────────────────────────────────
function DMScreen({conversation,user,otherUser,onBack}){
  const [messages,setMessages]=useState([]),[text,setText]=useState(''),[sending,setSending]=useState(false),[file,setFile]=useState(null),[preview,setPreview]=useState(null),[fullImg,setFullImg]=useState(null),[replyTo,setReplyTo]=useState(null),[swipeStartX,setSwipeStartX]=useState(null)
  const bottomRef=useRef(),fileRef=useRef()

  const loadMessages=useCallback(async()=>{
    const{data}=await supabase.from('messages').select('*,profiles(username,avatar_url)').eq('conversation_id',conversation.id).order('created_at',{ascending:true})
    setMessages(data||[])
    await supabase.from('messages').update({status:'opened',read_at:new Date().toISOString()}).eq('conversation_id',conversation.id).neq('sender_id',user.id).is('read_at',null)
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),80)
  },[conversation.id,user.id])

  useEffect(()=>{
    loadMessages()
    const ch=supabase.channel(`dm_${conversation.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${conversation.id}`},()=>loadMessages()).subscribe()
    return()=>supabase.removeChannel(ch)
  },[loadMessages])

  async function send(){
    if(!text.trim()&&!file)return;setSending(true)
    let image_url=null
    if(file){const ext=(file.name||'jpg').split('.').pop()||'jpg',path=`dms/${user.id}/${Date.now()}.${ext}`;const{error:upErr}=await supabase.storage.from('posts').upload(path,file);if(!upErr){const{data}=supabase.storage.from('posts').getPublicUrl(path);image_url=data.publicUrl}}
    await supabase.from('messages').insert({conversation_id:conversation.id,sender_id:user.id,content:text.trim()||null,image_url,status:'sent',...(replyTo&&{reply_to_id:replyTo.id,reply_preview:replyTo.content||(replyTo.image_url?'📷 Photo':'')})})
    setText('');setFile(null);setPreview(null);setReplyTo(null);setSending(false)
  }

  return(
    <div style={{...ss.page,display:'flex',flexDirection:'column',height:'100vh'}}>
      {fullImg&&<div onClick={()=>setFullImg(null)} style={{position:'fixed',inset:0,background:'#000',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><img src={fullImg} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} alt=""/><div style={{position:'absolute',top:16,right:16,color:'#fff',fontSize:26}}>✕</div></div>}
      <div style={{...ss.topBar,flexShrink:0}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',display:'flex'}}>{Ic.back()}</button>
        <Avatar url={otherUser?.avatar_url} name={otherUser?.username} size={30}/>
        <div style={{fontWeight:800,fontSize:15,flex:1,textAlign:'center'}}>{otherUser?.username}</div>
        <div style={{width:8,height:8,borderRadius:'50%',background:T.success}}/>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'10px 14px',display:'flex',flexDirection:'column',gap:4}}>
        {messages.map(m=>{
          const isMe=m.sender_id===user.id
          return(
            <div key={m.id} style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start'}}
              onTouchStart={e=>{setSwipeStartX(e.touches[0].clientX)}}
              onTouchEnd={e=>{const dx=e.changedTouches[0].clientX-swipeStartX;if(Math.abs(dx)>50)setReplyTo(m)}}
            >
              {m.reply_preview&&<div style={{background:'rgba(255,255,255,.06)',borderLeft:'3px solid #2563eb',borderRadius:8,padding:'4px 10px',marginBottom:3,fontSize:11,color:'#666',maxWidth:220}}>↩ {m.reply_preview}</div>}
              {m.image_url&&<div onClick={()=>setFullImg(m.image_url)} style={{cursor:'pointer',borderRadius:16,overflow:'hidden',maxWidth:'68%',marginBottom:m.content?3:0}}><img src={m.image_url} style={{width:'100%',maxHeight:220,objectFit:'cover',display:'block'}} alt=""/></div>}
              {m.content&&<div style={{maxWidth:'74%',background:isMe?'#2563eb':'#111',padding:'9px 14px',borderRadius:isMe?'18px 18px 4px 18px':'18px 18px 18px 4px',fontSize:14,lineHeight:1.4}}>{m.content}</div>}
              <div style={{fontSize:10,color:'#222',marginTop:2,display:'flex',gap:4}}>
                {ago(m.created_at)}
                {isMe&&<span style={{color:m.status==='opened'?'#5b9cf6':m.status==='delivered'?'#555':'#333'}}>{m.status==='opened'?'Opened':m.status==='delivered'?'Delivered':'Sent'}</span>}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>
      {replyTo&&<div style={{background:'#0d0d0d',borderTop:'1px solid #111',padding:'8px 14px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}><div style={{flex:1,fontSize:12,color:'#888',borderLeft:'3px solid #2563eb',paddingLeft:8}}>↩ {replyTo.content||(replyTo.image_url?'📷 Photo':'')}</div><button onClick={()=>setReplyTo(null)} style={{background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:18}}>✕</button></div>}
      {preview&&<div style={{padding:'6px 14px 0',display:'flex',alignItems:'center',gap:6}}><img src={preview} style={{height:50,borderRadius:8}} alt=""/><button onClick={()=>{setFile(null);setPreview(null)}} style={{background:'rgba(0,0,0,.6)',border:'none',color:'#fff',borderRadius:'50%',width:18,height:18,cursor:'pointer',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div>}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px 30px',background:'rgba(0,0,0,.98)',borderTop:'1px solid #0d0d0d',flexShrink:0}}>
        <label style={{cursor:'pointer',color:'#444',display:'flex'}}>{Ic.gallery('#444')}<input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setFile(f);setPreview(URL.createObjectURL(f))}}}/></label>
        <input style={{...ss.input,flex:1,padding:'10px 14px'}} placeholder="Message…" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}/>
        <button onClick={send} disabled={sending||(!file&&!text.trim())} style={{width:36,height:36,borderRadius:'50%',background:(file||text.trim())?'#2563eb':'#111',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'background .2s'}}>
          {sending?<span style={{fontSize:11}}>…</span>:Ic.send()}
        </button>
      </div>
    </div>
  )
}

// ── Home Screen ──────────────────────────────────────────────
function HomeScreen({user,profile,onOpenGroup,onOpenCamera,onViewStory}){
  const [groups,setGroups]=useState([]),[loading,setLoading]=useState(true),[stories,setStories]=useState([]),[pinnedIds,setPinnedIds]=useState(()=>{try{return JSON.parse(localStorage.getItem('pinnedGroups')||'[]')}catch{return[]}}),[swipeGroupId,setSwipeGroupId]=useState(null),[recap,setRecap]=useState(null),[showCreate,setShowCreate]=useState(false),[newName,setNewName]=useState(''),[newIcon,setNewIcon]=useState('🏋️'),[newColor,setNewColor]=useState('#2563eb'),[creating,setCreating]=useState(false)

  const load=useCallback(async()=>{
    const{data:memberships}=await supabase.from('group_members').select('group_id').eq('user_id',user.id)
    if(!memberships?.length){setGroups([]);setLoading(false);return}
    const ids=memberships.map(m=>m.group_id)
    const{data}=await supabase.from('groups').select('*').in('id',ids).eq('is_dm',false).order('updated_at',{ascending:false})
    setGroups(data||[])
    setLoading(false)
  },[user.id])

  const loadStories=useCallback(async()=>{
    const{data}=await supabase.from('stories').select('*,profiles(username,avatar_url)').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(40)
    const byUser={}
    ;(data||[]).forEach(s=>{if(!byUser[s.user_id])byUser[s.user_id]=[];byUser[s.user_id].push(s)})
    setStories(Object.values(byUser))
  },[])

  useEffect(()=>{
    load();loadStories()
    // Weekly recap
    const wk=`${new Date().getFullYear()}-W${Math.ceil(((new Date()-new Date(new Date().getFullYear(),0,1))/86400000+1)/7)}`
    supabase.from('posts').select('id').eq('user_id',user.id).gte('created_at',new Date(Date.now()-7*86400000).toISOString()).then(({data})=>{
      supabase.from('streaks').select('current_streak').eq('user_id',user.id).single().then(({data:st})=>{
        if(data?.length||st?.current_streak)setRecap({posts:data?.length||0,streak:st?.current_streak||0})
      })
    })
  },[load,loadStories])

  function togglePin(id){vibe();setPinnedIds(p=>{const n=p.includes(id)?p.filter(x=>x!==id):[...p,id];localStorage.setItem('pinnedGroups',JSON.stringify(n));return n});setSwipeGroupId(null)}

  async function create(){
    if(!newName.trim())return;setCreating(true)
    const{data:grp,error}=await supabase.from('groups').insert({name:newName.trim(),created_by:user.id,is_dm:false,icon:newIcon,color:newColor,updated_at:new Date().toISOString(),last_message:''}).select().single()
    if(!error&&grp)await supabase.from('group_members').insert({group_id:grp.id,user_id:user.id})
    setCreating(false);if(error){alert(error.message);return}
    setNewName('');setShowCreate(false);load()
    await supabase.from('messages').insert({group_id:grp.id,sender_id:user.id,content:`${profile?.username||'Someone'} created the group 👋`,msg_type:'system'})
  }

  const myStoryGroup=stories.find(sg=>sg[0]?.user_id===user.id)
  const pinned=groups.filter(g=>pinnedIds.includes(g.id))
  const rest=groups.filter(g=>!pinnedIds.includes(g.id))
  const sorted=[...pinned,...rest]

  return(
    <div style={{...ss.page,paddingBottom:80}}>
      {/* Top bar - logo centered like Snapchat */}
      <div style={{...ss.topBar,justifyContent:'center',position:'relative'}}>
        <div style={{fontSize:20,fontWeight:900,letterSpacing:-0.5}}>FitSnap 🔥</div>
        <button onClick={()=>setShowCreate(v=>!v)} style={{position:'absolute',right:16,background:'#111',border:'none',borderRadius:20,color:'#fff',padding:'6px 14px',fontSize:13,cursor:'pointer',fontWeight:700}}>+ New</button>
      </div>

      {/* Story circles */}
      <div style={{display:'flex',gap:12,padding:'12px 16px',overflowX:'auto',borderBottom:'1px solid #0a0a0a'}}>
        <div onClick={()=>myStoryGroup?onViewStory(myStoryGroup):onOpenCamera()} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',flexShrink:0}}>
          <div style={{width:56,height:56,borderRadius:'50%',background:myStoryGroup?'linear-gradient(135deg,#f97316,#ef4444)':'#111',padding:myStoryGroup?2.5:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{width:myStoryGroup?49:56,height:myStoryGroup?49:56,borderRadius:'50%',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',border:myStoryGroup?'2px solid #000':'none',fontSize:22}}>
              {myStoryGroup?<img src={myStoryGroup[0].image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:'+'}
            </div>
          </div>
          <span style={{fontSize:10,color:'#555',fontWeight:600}}>My Story</span>
        </div>
        {stories.filter(sg=>sg[0]?.user_id!==user.id).map((sg,i)=>(
          <div key={i} onClick={()=>onViewStory(sg)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',flexShrink:0}}>
            <div style={{width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#2563eb,#8b5cf6)',padding:2.5,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:49,height:49,borderRadius:'50%',background:'#111',border:'2px solid #000',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                {sg[0].profiles?.avatar_url?<img src={sg[0].profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:<span style={{fontSize:18,fontWeight:800}}>{initials(sg[0].profiles?.username)}</span>}
              </div>
            </div>
            <span style={{fontSize:10,color:'#888',fontWeight:600,maxWidth:56,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sg[0].profiles?.username}</span>
          </div>
        ))}
      </div>

      {/* Weekly recap card */}
      {recap&&(recap.posts>0||recap.streak>0)&&(
        <div style={{margin:'10px 16px',background:'linear-gradient(135deg,#0d1a10,#091208)',border:'1px solid #1a3020',borderRadius:16,padding:'12px 16px',display:'flex',justifyContent:'space-around'}}>
          <div style={{textAlign:'center'}}><div style={{fontSize:20,fontWeight:900,color:T.success}}>{recap.posts}</div><div style={{fontSize:11,color:'#444'}}>This week</div></div>
          <div style={{width:1,background:'#1a1a1a'}}/>
          <div style={{textAlign:'center'}}><div style={{fontSize:20,fontWeight:900,color:'#f97316'}}>{recap.streak}</div><div style={{fontSize:11,color:'#444'}}>Streak 🔥</div></div>
        </div>
      )}

      {/* Create group */}
      {showCreate&&(
        <div style={{padding:'10px 16px',background:'#0d0d0d',borderBottom:'1px solid #111'}}>
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <span style={{fontSize:20,padding:'6px'}}>{newIcon}</span>
            <input style={{...ss.input,flex:1}} placeholder="Group name…" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&create()} autoFocus/>
            <button style={{...ss.btn(),padding:'8px 16px',borderRadius:12,fontSize:13}} onClick={create} disabled={creating}>{creating?'…':'Create'}</button>
          </div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:6}}>{GROUP_ICONS.map(ic=><button key={ic} onClick={()=>setNewIcon(ic)} style={{fontSize:17,background:ic===newIcon?'#1e2a3a':'#111',border:`1px solid ${ic===newIcon?'#2563eb':'#1a1a1a'}`,borderRadius:8,padding:'4px 6px',cursor:'pointer'}}>{ic}</button>)}</div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{GROUP_COLORS.map(c=><button key={c} onClick={()=>setNewColor(c)} style={{width:22,height:22,borderRadius:'50%',background:c,border:`2.5px solid ${c===newColor?'#fff':'transparent'}`,cursor:'pointer'}}/>)}</div>
        </div>
      )}

      {/* Groups list - Snapchat chat style */}
      {loading?[0,1,2,3].map(i=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid #0a0a0a'}}>
          <div style={{width:50,height:50,borderRadius:'50%',background:'#111'}}/>
          <div style={{flex:1}}><Skeleton w="120px" h={14}/><Skeleton w="80px" h={11}/></div>
        </div>
      )):sorted.length===0
        ?<div style={{textAlign:'center',padding:70,color:'#333'}}><div style={{fontSize:40,marginBottom:10}}>💬</div><div style={{fontSize:14,fontWeight:600}}>No groups yet</div></div>
        :sorted.map(g=>{
          const accent=groupAccent(g),isPinned=pinnedIds.includes(g.id),isSwipe=swipeGroupId===g.id
          return(
            <div key={g.id} style={{position:'relative',overflow:'hidden'}}>
              {isSwipe&&<div style={{position:'absolute',right:0,top:0,bottom:0,display:'flex',alignItems:'center',zIndex:1}}>
                <button onClick={()=>togglePin(g.id)} style={{height:'100%',padding:'0 24px',background:isPinned?'#1a1a1a':'#1a2a3a',border:'none',color:'#fff',fontSize:13,cursor:'pointer',fontWeight:700}}>{isPinned?'Unpin':'📌 Pin'}</button>
              </div>}
              <div
                style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid #0a0a0a',cursor:'pointer',background:'#000',transition:'transform .2s',transform:isSwipe?'translateX(-88px)':'translateX(0)'}}
                onClick={()=>{if(isSwipe){setSwipeGroupId(null)}else{vibe();onOpenGroup(g)}}}
                onTouchStart={e=>{e.currentTarget._startX=e.touches[0].clientX}}
                onTouchEnd={e=>{const dx=e.changedTouches[0].clientX-e.currentTarget._startX;if(dx<-40)setSwipeGroupId(g.id);else if(dx>20)setSwipeGroupId(null)}}
              >
                {/* Group avatar circle like Snapchat */}
                <div style={{width:52,height:52,borderRadius:'50%',background:accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0,position:'relative'}}>
                  {g.icon||'💬'}
                  {isPinned&&<div style={{position:'absolute',top:-2,right:-2,fontSize:11}}>📌</div>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{g.name}</div>
                  <div style={{fontSize:12,color:'#555',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.last_message||'No messages yet'}</div>
                </div>
                <div style={{fontSize:11,color:'#333',flexShrink:0}}>{g.updated_at?ago(g.updated_at):''}</div>
              </div>
            </div>
          )
        })
      }
    </div>
  )
}

// ── People Screen ────────────────────────────────────────────
function PeopleScreen({user,onOpenDM,requestCount,onRequestCountChange}){
  const [tab,setTab]=useState('friends'),[friends,setFriends]=useState([]),[requests,setRequests]=useState([]),[search,setSearch]=useState(''),[results,setResults]=useState([]),[searching,setSearching]=useState(false),[loading,setLoading]=useState(true),[dmStatuses,setDmStatuses]=useState({})

  const loadFriends=useCallback(async()=>{
    const{data}=await supabase.from('friendships').select('*,requester:profiles!friendships_requester_id_fkey(id,username,avatar_url),addressee:profiles!friendships_addressee_id_fkey(id,username,avatar_url)').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).eq('status','accepted')
    setFriends(data||[])
    const{data:reqs}=await supabase.from('friendships').select('*,requester:profiles!friendships_requester_id_fkey(id,username,avatar_url)').eq('addressee_id',user.id).eq('status','pending')
    setRequests(reqs||[])
    onRequestCountChange?.(reqs?.length||0)
    setLoading(false)
  },[user.id])

  useEffect(()=>{loadFriends()},[loadFriends])

  async function searchUsers(){if(!search.trim())return;setSearching(true);const{data}=await supabase.from('profiles').select('id,username,avatar_url').ilike('username',`%${search.trim()}%`).neq('id',user.id).limit(10);setResults(data||[]);setSearching(false)}

  async function sendRequest(toId){
    const{error}=await supabase.from('friendships').insert({requester_id:user.id,addressee_id:toId,status:'pending'})
    if(error&&error.code!=='23505'){alert(error.message);return}
    vibe();setResults(r=>r.filter(u=>u.id!==toId))
    alert('Request sent 👊')
  }

  async function acceptRequest(friendshipId,requesterId){
    await supabase.from('friendships').update({status:'accepted'}).eq('id',friendshipId)
    const name=`dm_${[user.id,requesterId].sort().join('_')}`
    const{data:existing}=await supabase.from('groups').select('id').eq('name',name).single()
    if(!existing){
      const{data:grp}=await supabase.from('groups').insert({name,created_by:user.id,is_dm:true,updated_at:new Date().toISOString(),last_message:''}).select().single()
      if(grp)await supabase.from('group_members').insert([{group_id:grp.id,user_id:user.id},{group_id:grp.id,user_id:requesterId}])
    }
    vibe();loadFriends()
  }

  function friendProfile(f){return f.requester_id===user.id?f.addressee:f.requester}

  return(
    <div style={{...ss.page,paddingBottom:80}}>
      <div style={{...ss.topBar,justifyContent:'center',position:'relative'}}>
        <div style={{fontWeight:900,fontSize:18}}>People</div>
        {requests.length>0&&<div style={{position:'absolute',right:16,background:T.danger,color:'#fff',borderRadius:10,fontSize:12,fontWeight:800,padding:'3px 9px'}}>{requests.length}</div>}
      </div>
      <div style={{display:'flex',gap:6,padding:'10px 16px',borderBottom:'1px solid #0a0a0a'}}>
        {['friends','add','requests'].map(t=>(
          <button key={t} style={ss.pill(tab===t)} onClick={()=>{vibe();setTab(t);if(t!=='add')loadFriends()}}>
            {t==='friends'?'Friends':t==='add'?'Add':`Requests${requests.length>0?` (${requests.length})`:''}`}
          </button>
        ))}
      </div>

      {tab==='friends'&&(
        <div>
          {loading?[0,1,2].map(i=><div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px'}}><div style={{width:44,height:44,borderRadius:'50%',background:'#111'}}/><div style={{flex:1}}><Skeleton w="100px" h={13}/><Skeleton w="70px" h={11}/></div></div>)
            :friends.length===0
            ?<div style={{textAlign:'center',padding:60,color:'#333'}}><div style={{fontSize:36,marginBottom:8}}>👋</div><div style={{fontSize:14,fontWeight:600}}>No friends yet</div></div>
            :friends.map(f=>{
              const p=friendProfile(f)
              return(
                <div key={f.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:'1px solid #0a0a0a',cursor:'pointer'}} onClick={()=>onOpenDM&&onOpenDM(f,p)}>
                  <Avatar url={p?.avatar_url} name={p?.username} size={44}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{p?.username}</div>
                    <div style={{fontSize:12,color:'#444'}}>Tap to message</div>
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
            <input style={{...ss.input,flex:1}} placeholder="Search username…" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchUsers()} autoFocus/>
            <button style={{...ss.btn(),padding:'10px 16px',borderRadius:12,fontSize:13}} onClick={searchUsers} disabled={searching}>{searching?'…':'Search'}</button>
          </div>
          {results.map(u=>(
            <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #0a0a0a'}}>
              <Avatar url={u.avatar_url} name={u.username} size={42}/>
              <div style={{flex:1,fontWeight:700,fontSize:14}}>{u.username}</div>
              <button style={{...ss.btn(),padding:'7px 14px',fontSize:13,borderRadius:12}} onClick={()=>sendRequest(u.id)}>Add +</button>
            </div>
          ))}
        </div>
      )}

      {tab==='requests'&&(
        <div style={{padding:14}}>
          {requests.length===0
            ?<div style={{textAlign:'center',padding:50,color:'#333',fontSize:14,fontWeight:600}}>No pending requests</div>
            :requests.map(r=>(
              <div key={r.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #0a0a0a'}}>
                <Avatar url={r.requester?.avatar_url} name={r.requester?.username} size={44}/>
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

// ── Discover Screen ──────────────────────────────────────────
function DiscoverScreen({user}){
  const [stories,setStories]=useState([]),[posts,setPosts]=useState([]),[loading,setLoading]=useState(true),[viewingStories,setViewingStories]=useState(null)

  useEffect(()=>{
    Promise.all([
      supabase.from('stories').select('*,profiles(username,avatar_url)').eq('is_public',true).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(30),
      supabase.from('stories').select('*,profiles(username,avatar_url)').eq('is_public',true).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(20),
    ]).then(([{data:s},{data:p}])=>{
      const byUser={}
      ;(s||[]).forEach(st=>{if(!byUser[st.user_id])byUser[st.user_id]=[];byUser[st.user_id].push(st)})
      setStories(Object.values(byUser))
      setPosts(p||[])
      setLoading(false)
    })
  },[])

  return(
    <div style={{...ss.page,paddingBottom:80}}>
      <div style={{...ss.topBar,justifyContent:'center'}}>
        <div style={{fontWeight:900,fontSize:18}}>Discover</div>
      </div>
      {loading?<div style={{padding:40,textAlign:'center',color:'#333'}}>Loading…</div>:(
        <div>
          {/* Story circles */}
          {stories.length>0&&(
            <div style={{display:'flex',gap:12,padding:'12px 16px',overflowX:'auto',borderBottom:'1px solid #0a0a0a'}}>
              {stories.map((sg,i)=>(
                <div key={i} onClick={()=>setViewingStories(sg)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',flexShrink:0}}>
                  <div style={{width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#2563eb,#8b5cf6)',padding:2.5,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <div style={{width:49,height:49,borderRadius:'50%',background:'#111',border:'2px solid #000',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {sg[0].profiles?.avatar_url?<img src={sg[0].profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:<span style={{fontSize:18,fontWeight:800}}>{initials(sg[0].profiles?.username)}</span>}
                    </div>
                  </div>
                  <span style={{fontSize:10,color:'#888',fontWeight:600,maxWidth:56,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sg[0].profiles?.username}</span>
                </div>
              ))}
            </div>
          )}

          {/* Public feed */}
          <div style={{padding:'12px 16px'}}>
            <div style={{fontSize:11,color:'#444',marginBottom:12,textTransform:'uppercase',fontWeight:700,letterSpacing:.8}}>Public Posts</div>
            {posts.length===0
              ?<div style={{textAlign:'center',padding:50,color:'#333'}}><div style={{fontSize:36,marginBottom:8}}>🌍</div><div style={{fontSize:14,fontWeight:600}}>Nothing public yet</div><div style={{fontSize:12,color:'#333',marginTop:4}}>Post to your story as Public to show here</div></div>
              :<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                {posts.map(p=>(
                  <div key={p.id} style={{aspectRatio:'1',background:'#0d0d0d',borderRadius:12,overflow:'hidden',position:'relative',cursor:'pointer'}} onClick={()=>setViewingStories([p])}>
                    <img src={p.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                    <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,.7))',padding:'24px 8px 8px'}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#fff'}}>{p.profiles?.username}</div>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      )}
      {viewingStories&&<StoryViewer stories={Array.isArray(viewingStories)?viewingStories:[viewingStories]} user={user} onClose={()=>setViewingStories(null)}/>}
    </div>
  )
}

// ── Profile Screen ───────────────────────────────────────────
function ProfileScreen({user,onSignOut,onViewStory}){
  const [profile,setProfile]=useState(null),[posts,setPosts]=useState([]),[badges,setBadges]=useState([]),[streak,setStreak]=useState(null),[loading,setLoading]=useState(true),[showSettings,setShowSettings]=useState(false),[form,setForm]=useState({username:'',current_weight:'',goal_weight:'',main_goal:'',is_weight_public:true,avatar_url:''}),[avatarFile,setAvatarFile]=useState(null),[avatarPreview,setAvatarPreview]=useState(null),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[myStories,setMyStories]=useState([])
  const fileRef=useRef()
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))

  useEffect(()=>{
    Promise.all([
      supabase.from('profiles').select('*').eq('id',user.id).single(),
      supabase.from('posts').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(18),
      supabase.from('badges').select('*').eq('user_id',user.id),
      supabase.from('streaks').select('*').eq('user_id',user.id).single(),
      supabase.from('stories').select('*').eq('user_id',user.id).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}),
    ]).then(([{data:p},{data:po},{data:b},{data:st},{data:s}])=>{
      setProfile(p);setPosts(po||[]);setBadges(b||[]);setStreak(st);setMyStories(s||[])
      if(p)setForm({username:p.username||'',current_weight:p.current_weight||'',goal_weight:p.goal_weight||'',main_goal:p.main_goal||'',is_weight_public:p.is_weight_public??true,avatar_url:p.avatar_url||''})
      setLoading(false)
    })
  },[user.id])

  async function saveProfile(){
    setSaving(true)
    let avatar_url=form.avatar_url
    if(avatarFile){const ext=avatarFile.name.split('.').pop(),path=`avatars/${user.id}.${ext}`;const{error:e}=await supabase.storage.from('avatars').upload(path,avatarFile,{upsert:true});if(!e){const{data}=supabase.storage.from('avatars').getPublicUrl(path);avatar_url=data.publicUrl}}
    const{error}=await supabase.from('profiles').upsert({id:user.id,...form,avatar_url,current_weight:parseFloat(form.current_weight)||null,goal_weight:parseFloat(form.goal_weight)||null,updated_at:new Date().toISOString()})
    setSaving(false);if(!error){setSaved(true);setTimeout(()=>setSaved(false),2000);setProfile(p=>({...p,...form,avatar_url}))}
  }

  if(loading)return<div style={{...ss.page,display:'flex',alignItems:'center',justifyContent:'center',color:'#333',fontSize:13}}>Loading…</div>

  return(
    <div style={{...ss.page,paddingBottom:80,overflowY:'auto'}}>
      <div style={{...ss.topBar,justifyContent:'space-between'}}>
        <div style={{fontWeight:900,fontSize:18}}>{profile?.username||'Profile'}</div>
        <button onClick={()=>setShowSettings(v=>!v)} style={{background:'none',border:'none',color:showSettings?'#fff':'#555',cursor:'pointer'}}>{Ic.settings(showSettings?'#fff':'#555')}</button>
      </div>

      {/* Story circle + add */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'16px',borderBottom:'1px solid #0a0a0a'}}>
        <div onClick={()=>myStories.length?onViewStory(myStories):null} style={{cursor:myStories.length?'pointer':'default'}}>
          <div style={{width:70,height:70,borderRadius:'50%',background:myStories.length?'linear-gradient(135deg,#f97316,#ef4444)':'#111',padding:myStories.length?2.5:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{width:myStories.length?63:70,height:myStories.length?63:70,borderRadius:'50%',background:'#111',border:myStories.length?'2px solid #000':'none',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {(avatarPreview||profile?.avatar_url)?<img src={avatarPreview||profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:<span style={{fontSize:28,fontWeight:800}}>{initials(profile?.username)}</span>}
            </div>
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:18,marginBottom:2}}>{profile?.username}</div>
          {profile?.main_goal&&<div style={{fontSize:12,color:'#555'}}>🎯 {profile.main_goal}</div>}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'flex-end'}}>
          {streak?.current_streak>0&&<div style={{background:'linear-gradient(135deg,#f97316,#ef4444)',color:'#fff',borderRadius:10,fontSize:12,fontWeight:800,padding:'3px 9px'}}>🔥{streak.current_streak}</div>}
          <div style={{fontSize:12,color:'#444'}}>{posts.length} posts</div>
        </div>
      </div>

      {/* Badges */}
      {badges.length>0&&(
        <div style={{padding:'12px 16px',borderBottom:'1px solid #0a0a0a'}}>
          <div style={{fontSize:11,color:'#444',marginBottom:8,textTransform:'uppercase',fontWeight:700,letterSpacing:.8}}>Badges</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {badges.map(b=>{const m=BADGE_META[b.badge_type];return m?<div key={b.id} style={{background:'#0d0d0d',borderRadius:12,padding:'8px 12px',textAlign:'center',border:'1px solid #111'}}><div style={{fontSize:20}}>{m.icon}</div><div style={{fontSize:10,color:'#444',marginTop:2}}>{m.label}</div></div>:null})}
          </div>
        </div>
      )}

      {/* Post grid */}
      {posts.filter(p=>p.image_url).length>0&&(
        <div style={{padding:'0'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:2}}>
            {posts.filter(p=>p.image_url).map(p=><img key={p.id} src={p.image_url} style={{width:'100%',aspectRatio:'1',objectFit:'cover'}} alt=""/>)}
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings&&(
        <div style={{padding:16}}>
          <div style={{fontWeight:700,fontSize:16,marginBottom:16}}>Settings</div>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
            <div onClick={()=>fileRef.current.click()} style={{width:56,height:56,borderRadius:'50%',background:'#111',border:'2.5px solid #2563eb',cursor:'pointer',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>
              {(avatarPreview||form.avatar_url)?<img src={avatarPreview||form.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:initials(form.username)}
            </div>
            <span style={{fontSize:12,color:'#5b9cf6',cursor:'pointer'}} onClick={()=>fileRef.current.click()}>Change photo</span>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setAvatarFile(f);setAvatarPreview(URL.createObjectURL(f))}}}/>
          </div>
          {[['Username','username','text'],['Current weight (lbs)','current_weight','number'],['Goal weight (lbs)','goal_weight','number'],['Main goal','main_goal','text']].map(([lbl,key,type])=>(
            <div key={key} style={{marginBottom:10}}>
              <div style={{fontSize:10,color:'#444',marginBottom:4,textTransform:'uppercase',letterSpacing:.8,fontWeight:700}}>{lbl}</div>
              <input style={ss.input} type={type} value={form[key]} onChange={e=>set(key,e.target.value)}/>
            </div>
          ))}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,padding:'10px 0'}}>
            <div style={{fontSize:14,fontWeight:600}}>Show weight publicly</div>
            <button onClick={()=>set('is_weight_public',!form.is_weight_public)} style={{width:44,height:26,borderRadius:13,background:form.is_weight_public?'#2563eb':'#222',border:'none',cursor:'pointer',position:'relative'}}>
              <div style={{position:'absolute',top:3,left:form.is_weight_public?21:3,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left .15s'}}/>
            </button>
          </div>
          <button style={{...ss.btn(),width:'100%',borderRadius:12,padding:13,marginBottom:10}} onClick={saveProfile} disabled={saving}>{saving?'Saving…':saved?'✓ Saved':'Save Changes'}</button>
          <div style={{fontSize:12,color:'#333',marginBottom:10,textAlign:'center'}}>{user.email}</div>
          <button style={{...ss.btn('danger'),width:'100%',borderRadius:12,padding:13}} onClick={onSignOut}>Sign Out</button>
        </div>
      )}
    </div>
  )
}

// ── User Profile (other people) ──────────────────────────────
function UserProfile({userId,onBack}){
  const [profile,setProfile]=useState(null),[posts,setPosts]=useState([]),[badges,setBadges]=useState([]),[streak,setStreak]=useState(null),[loading,setLoading]=useState(true)
  useEffect(()=>{
    Promise.all([supabase.from('profiles').select('*').eq('id',userId).single(),supabase.from('posts').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(18),supabase.from('badges').select('*').eq('user_id',userId),supabase.from('streaks').select('*').eq('user_id',userId).single()])
    .then(([{data:p},{data:po},{data:b},{data:st}])=>{setProfile(p);setPosts(po||[]);setBadges(b||[]);setStreak(st);setLoading(false)})
  },[userId])
  if(loading)return<div style={{...ss.page,display:'flex',alignItems:'center',justifyContent:'center',color:'#333',fontSize:13}}>Loading…</div>
  if(!profile)return<div style={ss.page}><div style={{padding:20,color:'#444'}}>User not found</div></div>
  return(
    <div style={{...ss.page,paddingBottom:80}}>
      <div style={ss.topBar}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',display:'flex'}}>{Ic.back()}</button>
        <div style={{fontWeight:900,fontSize:16,flex:1,textAlign:'center'}}>{profile.username}</div>
        <div style={{width:22}}/>
      </div>
      <div style={{padding:'20px 16px',borderBottom:'1px solid #0a0a0a',display:'flex',alignItems:'center',gap:16}}>
        <Avatar url={profile.avatar_url} name={profile.username} size={70}/>
        <div style={{flex:1}}>
          <div style={{fontSize:20,fontWeight:900,marginBottom:4}}>{profile.username}</div>
          {profile.main_goal&&<div style={{fontSize:13,color:'#555'}}>🎯 {profile.main_goal}</div>}
          <div style={{display:'flex',gap:16,marginTop:8}}>
            {streak?.current_streak>0&&<div style={{textAlign:'center'}}><div style={{fontSize:18,fontWeight:900,color:'#f97316'}}>{streak.current_streak}</div><div style={{fontSize:10,color:'#444'}}>Streak</div></div>}
            {profile.is_weight_public&&profile.current_weight&&<div style={{textAlign:'center'}}><div style={{fontSize:18,fontWeight:900}}>{profile.current_weight}</div><div style={{fontSize:10,color:'#444'}}>lbs</div></div>}
            <div style={{textAlign:'center'}}><div style={{fontSize:18,fontWeight:900}}>{posts.length}</div><div style={{fontSize:10,color:'#444'}}>Posts</div></div>
          </div>
        </div>
      </div>
      {badges.length>0&&<div style={{padding:'12px 16px',borderBottom:'1px solid #0a0a0a',display:'flex',gap:8,flexWrap:'wrap'}}>
        {badges.map(b=>{const m=BADGE_META[b.badge_type];return m?<div key={b.id} style={{background:'#0d0d0d',borderRadius:10,padding:'7px 12px',textAlign:'center',border:'1px solid #111'}}><div style={{fontSize:18}}>{m.icon}</div><div style={{fontSize:10,color:'#444',marginTop:2}}>{m.label}</div></div>:null})}
      </div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:2}}>
        {posts.filter(p=>p.image_url).map(p=><img key={p.id} src={p.image_url} style={{width:'100%',aspectRatio:'1',objectFit:'cover'}} alt=""/>)}
      </div>
    </div>
  )
}

// ── Notifications ─────────────────────────────────────────────
function NotificationsScreen({user,onClose}){
  const [notifs,setNotifs]=useState([]),[loading,setLoading]=useState(true)
  useEffect(()=>{
    supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(40).then(({data})=>{setNotifs(data||[]);setLoading(false)})
    supabase.from('notifications').update({read:true}).eq('user_id',user.id).eq('read',false)
  },[user.id])
  return(
    <Modal onClose={onClose}>
      <div style={{fontWeight:900,fontSize:18,marginBottom:16}}>Notifications</div>
      {loading?[0,1,2].map(i=><div key={i} style={{marginBottom:12}}><Skeleton w="80%" h={13}/></div>)
        :notifs.length===0
        ?<div style={{textAlign:'center',padding:40,color:'#333'}}><div style={{fontSize:36,marginBottom:8}}>🔔</div><div style={{fontSize:14,fontWeight:600}}>Nothing yet</div></div>
        :notifs.map(n=>(
          <div key={n.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #111',background:n.read?'transparent':''}}>
            <div style={{fontSize:22,width:36,textAlign:'center'}}>{n.type==='reaction'?'🔥':n.type==='hype'?'📣':n.type==='badge'?'🏅':n.type==='mvp'?'👑':'💬'}</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:n.read?400:600,lineHeight:1.4}}>{n.message}</div><div style={{fontSize:11,color:'#444',marginTop:2}}>{ago(n.created_at)}</div></div>
          </div>
        ))
      }
    </Modal>
  )
}

// ── Root ──────────────────────────────────────────────────────
export default function App(){
  const [session,setSession]=useState(undefined),[hasProfile,setHasProfile]=useState(null),[profile,setProfile]=useState(null)
  const [view,setView]=useState('home') // people | discover | home | profile
  const [activeGroup,setActiveGroup]=useState(null),[activeDM,setActiveDM]=useState(null)
  const [viewingProfile,setViewingProfile]=useState(null),[viewingStories,setViewingStories]=useState(null)
  const [showCam,setShowCam]=useState(false),[showNotifs,setShowNotifs]=useState(false)
  const [unread,setUnread]=useState(0),[requestCount,setRequestCount]=useState(0)
  const [groups,setGroups]=useState([])
  const [swipeStartX,setSwipeStartX]=useState(null)
  const [toast,setToast]=useState(null)

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session??null))
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s))
    return()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{
    if(!session)return
    supabase.from('profiles').select('*').eq('id',session.user.id).single().then(({data})=>{setHasProfile(!!data);setProfile(data)})
  },[session])

  useEffect(()=>{
    if(!session)return
    const load=()=>supabase.from('notifications').select('id',{count:'exact'}).eq('user_id',session.user.id).eq('read',false).then(({count})=>setUnread(count||0))
    load()
    const ch=supabase.channel('notifs_root').on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${session.user.id}`},()=>load()).subscribe()
    return()=>supabase.removeChannel(ch)
  },[session])

  useEffect(()=>{
    if(!session||!hasProfile)return
    const params=new URLSearchParams(window.location.search)
    const gid=params.get('joingroup')
    if(gid){
      supabase.from('group_members').upsert({group_id:gid,user_id:session.user.id}).then(()=>{
        window.history.replaceState({},'',window.location.pathname)
        setToast('Joined group! 👋')
        supabase.from('groups').select('*').eq('id',gid).single().then(({data})=>{
          if(data){
            supabase.from('messages').insert({group_id:gid,sender_id:session.user.id,content:`${profile?.username||'Someone'} joined the group 👋`,msg_type:'system'})
          }
        })
      })
    }
    // Load groups for camera
    supabase.from('group_members').select('group_id').eq('user_id',session.user.id).then(({data})=>{
      if(data?.length)supabase.from('groups').select('*').in('id',data.map(m=>m.group_id)).eq('is_dm',false).then(({data:g})=>setGroups(g||[]))
    })
  },[session,hasProfile])

  function handleSwipe(e){
    if(swipeStartX===null)return
    const dx=e.changedTouches[0].clientX-swipeStartX
    if(Math.abs(dx)<60)return
    if(dx<0){
      if(view==='people')setView('home')
      else if(view==='home')setView('discover')
    }else{
      if(view==='discover')setView('home')
      else if(view==='home')setView('people')
    }
    setSwipeStartX(null)
  }

  async function signOut(){await supabase.auth.signOut();setSession(null);setHasProfile(null);setProfile(null)}

  if(session===undefined)return<div style={{minHeight:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',color:'#333',fontSize:13}}>Loading…</div>
  if(!session)return<AuthScreen onSession={s=>setSession(s)}/>
  if(hasProfile===false)return<ProfileSetup user={session.user} onDone={()=>{supabase.from('profiles').select('*').eq('id',session.user.id).single().then(({data})=>{setHasProfile(true);setProfile(data)})}}/>
  if(hasProfile===null)return<div style={{minHeight:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',color:'#333',fontSize:13}}>Loading…</div>

  // Full screen overlays
  if(showCam)return<CameraScreen onClose={()=>setShowCam(false)} onCapture={()=>{}} groups={groups} user={session.user}/>
  if(viewingStories)return<StoryViewer stories={viewingStories} user={session.user} onClose={()=>setViewingStories(null)}/>
  if(viewingProfile)return<UserProfile userId={viewingProfile} onBack={()=>setViewingProfile(null)}/>
  if(activeDM)return<DMScreen conversation={activeDM.group} user={session.user} otherUser={activeDM.otherUser} onBack={()=>setActiveDM(null)}/>
  if(activeGroup)return(
    <GroupChat
      group={activeGroup}
      user={session.user}
      onBack={()=>setActiveGroup(null)}
      onViewProfile={id=>id&&setViewingProfile(id)}
      onOpenCamera={()=>{setActiveGroup(null);setShowCam(true)}}
    />
  )

  const NAV=[
    {key:'people',icon:(a)=>Ic.people(a?'#fff':'#444'),label:'People',badge:requestCount},
    {key:'discover',icon:(a)=>Ic.discover(a?'#fff':'#444'),label:'Discover'},
    {key:'camera',icon:null,label:''},
    {key:'home',icon:(a)=>Ic.home(a?'#fff':'#444'),label:'Home'},
    {key:'profile',icon:null,label:'Me'},
  ]

  return(
    <div style={ss.page}
      onTouchStart={e=>{if(!showNotifs)setSwipeStartX(e.touches[0].clientX)}}
      onTouchEnd={e=>{if(!showNotifs)handleSwipe(e)}}
    >
      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}

      {view==='home'&&<HomeScreen user={session.user} profile={profile} onOpenGroup={g=>setActiveGroup(g)} onOpenCamera={()=>setShowCam(true)} onViewStory={sg=>setViewingStories(sg)}/>}
      {view==='people'&&<PeopleScreen user={session.user} onOpenDM={async(friendship,otherProfile)=>{const name=`dm_${[session.user.id,otherProfile.id].sort().join('_')}`;const{data:grp}=await supabase.from('groups').select('*').eq('name',name).single();if(grp)setActiveDM({group:grp,otherUser:otherProfile})}} requestCount={requestCount} onRequestCountChange={setRequestCount}/>}
      {view==='discover'&&<DiscoverScreen user={session.user}/>}
      {view==='profile'&&<ProfileScreen user={session.user} onSignOut={signOut} onViewStory={sg=>setViewingStories(sg)}/>}

      {showNotifs&&<NotificationsScreen user={session.user} onClose={()=>{setShowNotifs(false);setUnread(0)}}/>}

      {/* Bottom nav */}
      <nav style={{position:'fixed',bottom:0,left:0,right:0,height:72,background:'rgba(0,0,0,.96)',backdropFilter:'blur(20px)',borderTop:'1px solid #0d0d0d',display:'flex',alignItems:'center',justifyContent:'space-around',zIndex:20,padding:'0 4px'}}>
        {NAV.map(({key,icon,label,badge})=>{
          if(key==='camera')return(
            <button key="camera" onClick={()=>{vibe();setShowCam(true)}} style={{width:54,height:54,borderRadius:'50%',background:'#fff',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 0 5px rgba(255,255,255,.08)',marginBottom:6,flexShrink:0}}>
              {Ic.camera('#000')}
            </button>
          )
          if(key==='profile')return(
            <button key="profile" onClick={()=>{vibe();setView('profile')}} style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'4px 8px',position:'relative',flex:1}}>
              <div style={{width:28,height:28,borderRadius:'50%',overflow:'hidden',border:`2px solid ${view==='profile'?'#fff':'#333'}`,background:'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff'}}>
                {profile?.avatar_url?<img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:initials(profile?.username)}
              </div>
              {(unread>0)&&<div style={{position:'absolute',top:0,right:4,width:14,height:14,background:T.danger,borderRadius:'50%',border:'2px solid #000',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,color:'#fff'}}>{unread>9?'9+':unread}</div>}
              <span style={{fontSize:9,color:view==='profile'?'#fff':'#333',fontWeight:view==='profile'?700:400}}>Me</span>
              {/* Notifications bell on profile */}
              <button onClick={e=>{e.stopPropagation();vibe();setShowNotifs(true)}} style={{position:'absolute',top:-8,right:-4,background:'none',border:'none',cursor:'pointer',padding:2}}>
                {unread>0&&<div style={{width:6,height:6,borderRadius:'50%',background:T.danger}}/>}
              </button>
            </button>
          )
          const isActive=view===key
          return(
            <button key={key} onClick={()=>{vibe();setView(key)}} style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'4px 8px',position:'relative',flex:1}}>
              {icon?.(isActive)}
              <span style={{fontSize:9,color:isActive?'#fff':'#333',fontWeight:isActive?700:400,letterSpacing:.2}}>{label}</span>
              {badge>0&&<div style={{position:'absolute',top:0,right:'20%',width:15,height:15,background:T.danger,borderRadius:'50%',border:'2px solid #000',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,color:'#fff'}}>{badge}</div>}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
