import { useState, useCallback, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════════
  COURT LAYOUT: Horizontal  |  Blue = LEFT  |  Red = RIGHT
  Net at x=0.5  |  Centre-line (L/R divider) at y=0.5
  BOX "R"/"L" = from player's own perspective facing the net:
    Blue faces RIGHT → R = screen BOTTOM (y≈0.72), L = screen TOP (y≈0.28)
    Red  faces LEFT  → R = screen TOP    (y≈0.28), L = screen BOTTOM (y≈0.72)
  SERVE: score EVEN → R box, score ODD → L box (diagonal cross-court)
  DOUBLES: serving team scores → swap their positions; receiving team scores → no swap
═══════════════════════════════════════════════════════════════════ */

const THEMES = {
  dark: {
    bg:          "#08101e",
    card:        "linear-gradient(145deg,#0c1322,#111827)",
    cardBorder:  "#ffffff0d",
    textDim:     "#ffffff44",
    btnBorder:   "#ffffff1a",
    btnText:     "#ffffff44",
    inputColor:  "#fff",
    inputBg:     "transparent",
    courtWrap:   "#0b1a10",
    courtBg:     "#071c10",
    courtBorder: "#ffffff0c",
    courtLine:   "#ffffff",
    topBar:      "#ffffff0c",
    panelFloor:  "#08101e",
    dot:         "#ffffff18",
    scoreText:   "#ffffff15",
    serveBg:     "#00ff8818",
    infoText:    "#00ff8899",
    themeBg:     "#ffffff18",
    themeBorder: "#ffffff33",
    themeColor:  "#ffffffcc",
    winnerBg:    "linear-gradient(145deg,#0c1322,#111827)",
    winnerText:  "#ffffff55",
    setFlashBg:  "#00000077",
  },
  light: {
    bg:          "#d8e8f4",
    card:        "linear-gradient(145deg,#ffffff,#eef4ff)",
    cardBorder:  "#0000001a",
    textDim:     "#0a162888",
    btnBorder:   "#0000002a",
    btnText:     "#0a162877",
    inputColor:  "#0a1628",
    inputBg:     "#ffffffcc",
    courtWrap:   "#a8d5b0",
    courtBg:     "#174d24",
    courtBorder: "#00000022",
    courtLine:   "#ffffff",
    topBar:      "#0000001a",
    panelFloor:  "#d8e8f4",
    dot:         "#0a162833",
    scoreText:   "#0a162833",
    serveBg:     "#00884422",
    infoText:    "#005533cc",
    themeBg:     "#00000015",
    themeBorder: "#00000033",
    themeColor:  "#0a1628cc",
    winnerBg:    "linear-gradient(145deg,#ffffff,#eef4ff)",
    winnerText:  "#0a162866",
    setFlashBg:  "#00000088",
  },
};

const C = {
  blue: { solid:"#1a5fd4", light:"#66bbff", dark:"#07215a" },
  red:  { solid:"#c41a1a", light:"#ff7070", dark:"#5a0707" },
};

const boxY = (team, box) =>
  team==="blue" ? (box==="R"?0.72:0.28) : (box==="R"?0.28:0.72);

const POS = {
  blue: { srv:0.30, prt:0.14, rcv:0.35, rprt:0.18 },
  red:  { srv:0.70, prt:0.86, rcv:0.65, rprt:0.82 },
};

function computePos(sides, servingTeam, servingScore, isDoubles, players) {
  const recvTeam = servingTeam==="blue"?"red":"blue";
  const sBox = servingScore%2===0?"R":"L";
  const pBox=sBox==="R"?"L":"R", rBox=sBox, rpBox=rBox==="R"?"L":"R";

  if (!isDoubles) return {
    blue:[{x:POS.blue[servingTeam==="blue"?"srv":"rcv"],
           y:boxY("blue",servingTeam==="blue"?sBox:rBox),
           role:servingTeam==="blue"?"server":"receiver",name:players.blue[0]}],
    red: [{x:POS.red[servingTeam==="red"?"srv":"rcv"],
           y:boxY("red",servingTeam==="red"?sBox:rBox),
           role:servingTeam==="red"?"server":"receiver",name:players.red[0]}],
  };

  const ss=sides[servingTeam],rs=sides[recvTeam];
  const si=ss[0]===sBox?0:1,pi=1-si,ri=rs[0]===rBox?0:1,rpi=1-ri;
  const res={blue:[null,null],red:[null,null]};
  if (servingTeam==="blue") {
    res.blue[si]={x:POS.blue.srv,y:boxY("blue",sBox),role:"server",  name:players.blue[si]};
    res.blue[pi]={x:POS.blue.prt,y:boxY("blue",pBox),role:"partner", name:players.blue[pi]};
    res.red[ri] ={x:POS.red.rcv, y:boxY("red", rBox),role:"receiver",name:players.red[ri] };
    res.red[rpi]={x:POS.red.rprt,y:boxY("red", rpBox),role:"rpartner",name:players.red[rpi]};
  } else {
    res.red[si] ={x:POS.red.srv, y:boxY("red", sBox),role:"server",  name:players.red[si] };
    res.red[pi] ={x:POS.red.prt, y:boxY("red", pBox),role:"partner", name:players.red[pi] };
    res.blue[ri]={x:POS.blue.rcv,y:boxY("blue",rBox),role:"receiver",name:players.blue[ri]};
    res.blue[rpi]={x:POS.blue.rprt,y:boxY("blue",rpBox),role:"rpartner",name:players.blue[rpi]};
  }
  return res;
}

/* ── Avatar ──────────────────────────────────────────────────────── */
function Avatar({ cx, cy, team, name, role }) {
  const isServer=role==="server", isReceiver=role==="receiver";
  const [curX,setCurX]=useState(cx),[curY,setCurY]=useState(cy);
  const targetRef=useRef({cx,cy}),rafRef=useRef(null);

  useEffect(()=>{
    targetRef.current={cx,cy};
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    const DUR=500,start=performance.now(),fx=curX,fy=curY;
    const ease=t=>1-Math.pow(1-t,3);
    const step=now=>{
      const t=Math.min((now-start)/DUR,1),e=ease(t);
      setCurX(fx+(targetRef.current.cx-fx)*e);
      setCurY(fy+(targetRef.current.cy-fy)*e);
      if(t<1) rafRef.current=requestAnimationFrame(step);
    };
    rafRef.current=requestAnimationFrame(step);
    return ()=>rafRef.current&&cancelAnimationFrame(rafRef.current);
  },[cx,cy]); // eslint-disable-line

  const R=18;
  const sc=isServer?"#00ff88":isReceiver?"#ffcc44":C[team].light;
  const fc=isServer?"#003322":isReceiver?"#332200":C[team].dark;
  const tc=isServer?"#00ff88":isReceiver?"#ffcc44":C[team].light;

  return (
    <g>
      {(isServer||isReceiver)&&(
        <circle cx={curX} cy={curY} r={R+8} fill="none" stroke={sc} strokeWidth="1.5">
          <animate attributeName="r" values={`${R+5};${R+15};${R+5}`} dur="1.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;0;0.7" dur="1.8s" repeatCount="indefinite"/>
        </circle>
      )}
      <circle cx={curX} cy={curY} r={R} fill={fc} stroke={sc}
        strokeWidth={isServer||isReceiver?2.5:1.5}/>
      <text x={curX} y={curY} textAnchor="middle" dominantBaseline="central"
        fontSize="10" fontWeight="900" fill={tc}
        fontFamily="'Chakra Petch','Sarabun',sans-serif"
        style={{pointerEvents:"none",userSelect:"none"}}>
        {name.length>4?name.slice(0,4):name}
      </text>
      {isServer&&(
        <text x={curX} y={curY-R-8} textAnchor="middle" dominantBaseline="auto"
          fontSize="13" style={{pointerEvents:"none"}}>🏸</text>
      )}
    </g>
  );
}

/* ── Court SVG ───────────────────────────────────────────────────── */
function CourtSVG({ servingTeam, serveBox, positions, players, isDoubles, swapped, T }) {
  const W=520, H=224, mL=18, mR=18, mT=30, mB=22;
  const cW=W-mL-mR, cH=H-mT-mB;
  const netX=mL+cW*0.5, centY=mT+cH*0.5;
  const sslF=0.296, dblF=0.887, sngF=0.151;
  const sslBx=netX-cW*0.5*sslF, sslRx=netX+cW*0.5*sslF;
  const dblBx=mL+cW*0.5*(1-dblF), dblRx=netX+cW*0.5*dblF;
  const sngT=mT+cH*sngF, sngB=mT+cH*(1-sngF);
  const recvTeam=servingTeam==="blue"?"red":"blue";

  function zoneRect(team, box) {
    const onLeft=swapped?team==="red":team==="blue";
    const nearNet=onLeft?sslBx:sslRx;
    const back=onLeft?(isDoubles?dblBx:mL):(isDoubles?dblRx:mL+cW);
    let y1,y2;
    if(team==="blue"){y1=box==="R"?centY:mT;y2=box==="R"?mT+cH:centY;}
    else             {y1=box==="R"?mT:centY;y2=box==="R"?centY:mT+cH;}
    if(!isDoubles){y1=Math.max(y1,sngT);y2=Math.min(y2,sngB);}
    return {x:Math.min(nearNet,back),y:y1,w:Math.abs(nearNet-back),h:y2-y1};
  }

  const landR=zoneRect(recvTeam,serveBox), srvR=zoneRect(servingTeam,serveBox);
  const ax1=srvR.x+srvR.w/2,ay1=srvR.y+srvR.h/2;
  const ax2=landR.x+landR.w/2,ay2=landR.y+landR.h/2;
  const lT=swapped?"red":"blue", rT=swapped?"blue":"red";
  const toSVG=(xf,yf)=>({sx:mL+(swapped?1-xf:xf)*cW,sy:mT+yf*cH});

  const all=[];
  ["blue","red"].forEach(t=>(positions[t]||[]).forEach((p,i)=>{
    if(!p) return;
    const{sx,sy}=toSVG(p.x,p.y);
    all.push({key:`${t}-${i}`,team:t,cx:sx,cy:sy,name:p.name,role:p.role});
  }));

  const lC=T.courtLine;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
      style={{width:"100%",maxWidth:480,display:"block",margin:"0 auto"}}>
      <defs>
        <marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L0,7 L7,3.5z" fill="#00ff8888"/>
        </marker>
      </defs>

      <rect x={mL} y={mT} width={cW} height={cH} fill={T.courtBg} rx="4"/>

      {/* Serve position (amber) */}
      <rect x={srvR.x} y={srvR.y} width={srvR.w} height={srvR.h}
        fill="#ffcc4412" stroke="#ffcc4466" strokeWidth="1.2" rx="1"/>
      {/* Landing zone (green) */}
      <rect x={landR.x} y={landR.y} width={landR.w} height={landR.h}
        fill="#00ff8820" stroke="#00ff88" strokeWidth="2.2" rx="1"/>
      {/* Arrow */}
      <line x1={ax1} y1={ay1} x2={ax2} y2={ay2}
        stroke="#00ff8866" strokeWidth="1.5" strokeDasharray="7,4" markerEnd="url(#arr)"/>

      {/* Outer boundary */}
      <rect x={mL} y={mT} width={cW} height={cH}
        fill="none" stroke={lC+"88"} strokeWidth="1.5" rx="4"/>

      {/* Singles sidelines */}
      <line x1={mL} y1={sngT} x2={mL+cW} y2={sngT} stroke="#dddd0066" strokeWidth="1" strokeDasharray="6,4"/>
      <line x1={mL} y1={sngB} x2={mL+cW} y2={sngB} stroke="#dddd0066" strokeWidth="1" strokeDasharray="6,4"/>

      {/* Doubles long service lines */}
      <line x1={dblBx} y1={mT} x2={dblBx} y2={mT+cH} stroke={lC+"44"} strokeWidth="0.9" strokeDasharray="4,5"/>
      <line x1={dblRx} y1={mT} x2={dblRx} y2={mT+cH} stroke={lC+"44"} strokeWidth="0.9" strokeDasharray="4,5"/>

      {/* Short service lines */}
      <line x1={sslBx} y1={mT} x2={sslBx} y2={mT+cH} stroke={lC+"99"} strokeWidth="1.3"/>
      <line x1={sslRx} y1={mT} x2={sslRx} y2={mT+cH} stroke={lC+"99"} strokeWidth="1.3"/>

      {/* Centre line */}
      <line x1={mL} y1={centY} x2={mL+cW} y2={centY} stroke={lC+"55"} strokeWidth="0.9"/>

      {/* Net */}
      <rect x={netX-3} y={mT-4} width={6} height={cH+8} fill={lC+"08"} rx="3"/>
      <line x1={netX} y1={mT-4} x2={netX} y2={mT+cH+4} stroke={lC+"cc"} strokeWidth="3"/>

      {/* L/R labels */}
      {[{x:sslBx-14,y:centY-16,l:"L",t:lT},{x:sslBx-14,y:centY+22,l:"R",t:lT},
        {x:sslRx+14,y:centY-16,l:"R",t:rT},{x:sslRx+14,y:centY+22,l:"L",t:rT}]
        .map(({x,y,l,t},i)=>(
          <text key={i} x={x} y={y} textAnchor="middle" fontSize="10"
            fill={C[t].light+"66"} fontFamily="Chakra Petch,sans-serif" fontWeight="700">{l}</text>
        ))}

      {/* Team name labels */}
      <text x={mL+cW*0.25} y={mT-10} textAnchor="middle" fontSize="10"
        fill={C[lT].light} fontFamily="Chakra Petch,sans-serif">
        {players[lT].join(" & ")}
      </text>
      <text x={mL+cW*0.75} y={mT-10} textAnchor="middle" fontSize="10"
        fill={C[rT].light} fontFamily="Chakra Petch,sans-serif">
        {players[rT].join(" & ")}
      </text>

      {all.map(p=><Avatar key={p.key} {...p}/>)}

      {/* Legend */}
      <rect x={mL}    y={mT+cH+6} width="9" height="5" fill="#00ff8820" stroke="#00ff88" strokeWidth="0.8" rx="1"/>
      <text x={mL+12} y={mT+cH+11} fontSize="7.5" fill="#00ff8899" fontFamily="Chakra Petch,sans-serif">Landing Zone</text>
      <rect x={mL+82} y={mT+cH+6} width="9" height="5" fill="#ffcc4412" stroke="#ffcc4466" strokeWidth="0.8" rx="1"/>
      <text x={mL+94} y={mT+cH+11} fontSize="7.5" fill="#ffcc4477" fontFamily="Chakra Petch,sans-serif">Serve Position</text>
      <line x1={mL+178} y1={mT+cH+9} x2={mL+188} y2={mT+cH+9} stroke="#dddd0066" strokeWidth="1.5" strokeDasharray="3,2"/>
      <text x={mL+191} y={mT+cH+11} fontSize="7.5" fill="#dddd0077" fontFamily="Chakra Petch,sans-serif">Singles line</text>
    </svg>
  );
}

/* ── Score Panel ─────────────────────────────────────────────────── */
function ScorePanel({ team, players, score, wonSetsCount, maxSets, onScore, isServing, T }) {
  const c=C[team];
  const [flash,setFlash]=useState(false);
  const tap=()=>{setFlash(true);setTimeout(()=>setFlash(false),240);onScore();};

  return (
    <div onClick={tap} style={{
      flex:1, display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", gap:6, padding:"10px 6px",
      background: flash
        ?`radial-gradient(circle,${c.light}33,${c.dark}66)`
        :`linear-gradient(160deg,${c.dark}cc,${T.panelFloor})`,
      border: isServing?`2px solid ${c.light}99`:`2px solid ${T.btnBorder}`,
      borderRadius: team==="blue"?"13px 0 0 13px":"0 13px 13px 0",
      cursor:"pointer", userSelect:"none",
      boxShadow: isServing?`0 0 28px ${c.light}44,inset 0 0 20px ${c.light}22`:"none",
      transition:"background 0.15s,box-shadow 0.3s",
      position:"relative", overflow:"hidden",
    }}>
      {flash&&<div style={{position:"absolute",inset:0,pointerEvents:"none",
        background:`radial-gradient(circle at center,${c.light}22,transparent)`,
        animation:"ripple 0.24s ease-out"}}/>}
      {isServing&&<div style={{
        position:"absolute",top:7,[team==="blue"?"left":"right"]:7,
        background:T.serveBg, border:"1px solid #00ff8888",
        borderRadius:20, padding:"2px 7px", fontSize:8, color:"#00ff88",
        fontFamily:"'Chakra Petch',sans-serif", letterSpacing:1,
      }}>SERVE</div>}

      <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"center"}}>
        {players.map((n,i)=>(
          <span key={i} style={{fontSize:12,color:c.light,
            fontFamily:"'Chakra Petch',sans-serif",letterSpacing:1}}>{n}</span>
        ))}
      </div>
      <div style={{
        fontSize:"clamp(52px,12vw,90px)", fontWeight:900, lineHeight:1,
        fontFamily:"'Chakra Petch',sans-serif", color:c.light,
        textShadow:`0 0 30px ${c.light}66`,
        transform:flash?"scale(1.1)":"scale(1)", transition:"transform 0.14s",
      }}>{score}</div>
      <div style={{display:"flex",gap:5}}>
        {Array.from({length:Math.ceil(maxSets/2)}).map((_,i)=>(
          <div key={i} style={{width:8,height:8,borderRadius:"50%",
            background:i<wonSetsCount?c.light:T.dot,
            boxShadow:i<wonSetsCount?`0 0 6px ${c.light}`:"none",transition:"all 0.3s"}}/>
        ))}
      </div>
      <div style={{fontSize:8,color:T.scoreText,fontFamily:"'Chakra Petch',sans-serif",letterSpacing:2}}>
        TAP TO SCORE
      </div>
    </div>
  );
}

/* ── Setup Screen ────────────────────────────────────────────────── */
function SetupScreen({ onStart, T, theme, toggleTheme }) {
  const [mt,setMt]=useState("doubles");
  const [sets,setSets]=useState(3);
  const [pts,setPts]=useState(21);
  const [nm,setNm]=useState({b1:"P1",b2:"P2",r1:"P3",r2:"P4"});
  const [firstServe,setFirstServe]=useState("blue");

  const inp=(bg,ac)=>({
    width:"100%", padding:"9px 12px", borderRadius:9,
    background:bg, border:`1px solid ${ac}44`,
    color:T.inputColor, fontSize:13,
    fontFamily:"'Chakra Petch',sans-serif",
    outline:"none", boxSizing:"border-box",
  });

  const start=()=>onStart({matchType:mt,sets,pts,firstServe,players:{
    blue:mt==="doubles"?[nm.b1,nm.b2]:[nm.b1],
    red: mt==="doubles"?[nm.r1,nm.r2]:[nm.r1],
  }});

  return (
    <div style={{
      minHeight:"100dvh", background:T.bg,
      display:"flex", alignItems:"flex-start", justifyContent:"center",
      fontFamily:"'Chakra Petch',sans-serif", overflowY:"auto", padding:"16px 0",
    }}>
      <div style={{
        width:"min(460px,95vw)", background:T.card,
        borderRadius:22, padding:"clamp(18px,4vw,28px)",
        border:`1px solid ${T.cardBorder}`,
        boxShadow:"0 40px 80px #00000030",
        margin:"auto", position:"relative",
      }}>
        {/* Theme toggle */}
        <div style={{position:"absolute",top:14,right:14}}>
          <button onClick={toggleTheme} style={{
            background:T.themeBg, border:`1px solid ${T.themeBorder}`,
            borderRadius:18, padding:"4px 12px",
            color:T.themeColor, fontSize:11, cursor:"pointer",
            fontFamily:"'Chakra Petch',sans-serif",
          }}>{theme==="dark"?"☀️ Light":"🌙 Dark"}</button>
        </div>

        {/* Title */}
        <div style={{textAlign:"center",marginBottom:24,paddingTop:4}}>
          <div style={{fontSize:32,marginBottom:6}}>🏸</div>
          <h1 style={{margin:0,fontSize:24,fontWeight:900,letterSpacing:3,
            background:"linear-gradient(135deg,#66bbff,#fff,#ff7070)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>BADMINTON</h1>
          <div style={{fontSize:10,color:T.textDim,letterSpacing:4,marginTop:4}}>SCORE TRACKER</div>
        </div>

        {/* Match type */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:10,color:T.textDim,letterSpacing:2,marginBottom:8}}>MATCH TYPE</div>
          <div style={{display:"flex",gap:8}}>
            {[["singles","Singles"],["doubles","Doubles"]].map(([v,l])=>(
              <button key={v} onClick={()=>setMt(v)} style={{
                flex:1, padding:"11px 0", borderRadius:11,
                border:`2px solid ${mt===v?"#66bbff":T.btnBorder}`,
                background:mt===v?"#66bbff1a":"transparent",
                color:mt===v?"#66bbff":T.btnText,
                fontSize:14, fontWeight:700, cursor:"pointer",
                fontFamily:"'Chakra Petch',sans-serif", transition:"all 0.2s",
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Sets & Points */}
        <div style={{display:"flex",gap:10,marginBottom:18}}>
          {[["No. of Sets",[1,3,5],sets,setSets,"#a855f7"],
            ["Points/Set",[11,15,21],pts,setPts,"#00cc77"]].map(([lbl,opts,val,set,col])=>(
            <div key={lbl} style={{flex:1}}>
              <div style={{fontSize:10,color:T.textDim,letterSpacing:2,marginBottom:8}}>{lbl}</div>
              <div style={{display:"flex",gap:5}}>
                {opts.map(n=>(
                  <button key={n} onClick={()=>set(n)} style={{
                    flex:1, padding:"9px 0", borderRadius:9,
                    border:`2px solid ${val===n?col:T.btnBorder}`,
                    background:val===n?`${col}22`:"transparent",
                    color:val===n?col:T.btnText,
                    fontSize:13, fontWeight:700, cursor:"pointer",
                    fontFamily:"'Chakra Petch',sans-serif", transition:"all 0.2s",
                  }}>{n}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Player names */}
        <div style={{display:"flex",gap:10,marginBottom:18}}>
          {[["🔵 Blue Team","#66bbff","b1","b2","#1a5fd422"],
            ["🔴 Red Team","#ff7070","r1","r2","#c41a1a22"]].map(([lbl,col,k1,k2,bg])=>(
            <div key={lbl} style={{flex:1}}>
              <div style={{fontSize:10,color:col,letterSpacing:2,marginBottom:8}}>{lbl}</div>
              <input value={nm[k1]} onChange={e=>setNm(n=>({...n,[k1]:e.target.value}))}
                placeholder="Player 1" style={inp(bg,col)}/>
              {mt==="doubles"&&(
                <input value={nm[k2]} onChange={e=>setNm(n=>({...n,[k2]:e.target.value}))}
                  placeholder="Player 2" style={{...inp(bg,col),marginTop:7}}/>
              )}
            </div>
          ))}
        </div>

        {/* First serve */}
        <div style={{marginBottom:22}}>
          <div style={{fontSize:10,color:T.textDim,letterSpacing:2,marginBottom:8}}>FIRST SERVE</div>
          <div style={{display:"flex",gap:8}}>
            {[["blue","🔵 Blue Team","#66bbff","#1a5fd422"],
              ["red", "🔴 Red Team", "#ff7070","#c41a1a22"]].map(([v,l,col,bg])=>(
              <button key={v} onClick={()=>setFirstServe(v)} style={{
                flex:1, padding:"13px 0", borderRadius:11,
                border:`2px solid ${firstServe===v?col:T.btnBorder}`,
                background:firstServe===v?bg:"transparent",
                color:firstServe===v?col:T.btnText,
                fontSize:13, fontWeight:700, cursor:"pointer",
                fontFamily:"'Chakra Petch',sans-serif", transition:"all 0.2s",
                boxShadow:firstServe===v?`0 0 16px ${col}44`:"none",
              }}>
                {l}{firstServe===v&&<span style={{marginLeft:6,fontSize:10}}>🏸</span>}
              </button>
            ))}
          </div>
        </div>

        <button onClick={start} style={{
          width:"100%", padding:"15px 0", borderRadius:13,
          background:"linear-gradient(135deg,#1a5fd4,#66bbff)",
          border:"none", color:"#fff", fontSize:15, fontWeight:900,
          letterSpacing:3, cursor:"pointer",
          fontFamily:"'Chakra Petch',sans-serif",
          boxShadow:"0 8px 28px #66bbff33", transition:"transform 0.2s",
        }}
          onMouseOver={e=>e.currentTarget.style.transform="translateY(-2px)"}
          onMouseOut={e=>e.currentTarget.style.transform="translateY(0)"}
        >Start Match 🏸</button>
      </div>
    </div>
  );
}

/* ── Game Screen ─────────────────────────────────────────────────── */
function GameScreen({ config, onReset, T, theme, toggleTheme }) {
  const{matchType,sets:maxSets,pts:pointsToWin,players,firstServe="blue"}=config;
  const isDoubles=matchType==="doubles";
  const setsToWin=Math.ceil(maxSets/2);

  const[sides,setSides]=useState({blue:{0:"R",1:"L"},red:{0:"R",1:"L"}});
  const[servingTeam,setServingTeam]=useState(firstServe);
  const[scores,setScores]=useState({blue:0,red:0});
  const[wonSets,setWonSets]=useState({blue:0,red:0});
  const[currentSet,setCurrentSet]=useState(1);
  const[winner,setWinner]=useState(null);
  const[setWinAnim,setSetWinAnim]=useState(null);
  const[history,setHistory]=useState([]);
  const[swapped,setSwapped]=useState(false);
  const[swapAnim,setSwapAnim]=useState(false);

  const serveBox=scores[servingTeam]%2===0?"R":"L";
  const positions=computePos(sides,servingTeam,scores[servingTeam],isDoubles,players);
  const srvIdx=isDoubles?(sides[servingTeam][0]===serveBox?0:1):0;
  const serverName=players[servingTeam][srvIdx];

  const addScore=useCallback((scoringTeam)=>{
    if(winner) return;
    const newSc={...scores,[scoringTeam]:scores[scoringTeam]+1};
    const mine=newSc[scoringTeam],opp=newSc[scoringTeam==="blue"?"red":"blue"];
    const cap=pointsToWin+Math.round(pointsToWin*0.143);
    const snap={scores,servingTeam,sides,wonSets};
    const setWon=(mine>=pointsToWin&&mine-opp>=2)||mine>=cap;
    if(setWon){
      const nw={...wonSets,[scoringTeam]:wonSets[scoringTeam]+1};
      setSetWinAnim(scoringTeam);setTimeout(()=>setSetWinAnim(null),2200);
      if(nw[scoringTeam]>=setsToWin){setWinner(scoringTeam);setWonSets(nw);}
      else{setWonSets(nw);setScores({blue:0,red:0});setCurrentSet(s=>s+1);
        setServingTeam(scoringTeam);setSides({blue:{0:"R",1:"L"},red:{0:"R",1:"L"}});}
    } else {
      setScores(newSc);
      if(isDoubles){
        if(scoringTeam===servingTeam)
          setSides(prev=>({...prev,[scoringTeam]:{0:prev[scoringTeam][1],1:prev[scoringTeam][0]}}));
        else setServingTeam(scoringTeam);
      } else if(scoringTeam!==servingTeam) setServingTeam(scoringTeam);
    }
    setHistory(h=>[...h,snap]);
  },[scores,servingTeam,sides,wonSets,winner,pointsToWin,setsToWin,isDoubles]);

  const undo=()=>{
    if(!history.length) return;
    const s=history[history.length-1];
    setHistory(h=>h.slice(0,-1));
    setScores(s.scores);setServingTeam(s.servingTeam);setSides(s.sides);setWonSets(s.wonSets);
  };
  const doSwap=()=>{setSwapAnim(true);setTimeout(()=>setSwapAnim(false),500);setSwapped(s=>!s);};
  const lT=swapped?"red":"blue", rT=swapped?"blue":"red";

  return (
    <div style={{
      minHeight:"100dvh", background:T.bg,
      display:"flex", flexDirection:"column",
      fontFamily:"'Chakra Petch',sans-serif",
      overflowY:"auto", overflowX:"hidden",
    }}>

      {/* Winner overlay */}
      {winner&&(
        <div style={{position:"fixed",inset:0,zIndex:100,background:"#000000aa",
          backdropFilter:"blur(12px)",display:"flex",alignItems:"center",
          justifyContent:"center",padding:16,animation:"fadeIn 0.4s ease"}}>
          <div style={{textAlign:"center",padding:"clamp(20px,5vw,36px)",
            width:"min(320px,90vw)", background:T.winnerBg,
            borderRadius:22, border:`2px solid ${C[winner].light}`,
            boxShadow:`0 0 60px ${C[winner].light}44`}}>
            <div style={{fontSize:"clamp(40px,8vw,56px)",marginBottom:12}}>🏆</div>
            <div style={{fontSize:"clamp(18px,4vw,26px)",fontWeight:900,
              color:C[winner].light,marginBottom:6,wordBreak:"break-word"}}>
              {players[winner].join(" & ")}</div>
            <div style={{color:T.winnerText,fontSize:"clamp(11px,2.5vw,13px)",
              letterSpacing:2,marginBottom:20}}>Wins the match!</div>
            <div style={{display:"flex",gap:14,justifyContent:"center",
              marginBottom:24,fontSize:"clamp(18px,4vw,22px)"}}>
              <span style={{color:C.blue.light}}>{wonSets.blue}</span>
              <span style={{color:T.textDim}}>–</span>
              <span style={{color:C.red.light}}>{wonSets.red}</span>
            </div>
            <button onClick={onReset} style={{padding:"11px 28px",borderRadius:11,
              background:"linear-gradient(135deg,#1a5fd4,#66bbff)",
              border:"none",color:"#fff",fontSize:"clamp(12px,2.5vw,13px)",fontWeight:700,
              cursor:"pointer",fontFamily:"'Chakra Petch',sans-serif",
              letterSpacing:2,width:"100%"}}>New Match</button>
          </div>
        </div>
      )}

      {/* Set win flash */}
      {setWinAnim&&(
        <div style={{position:"fixed",inset:0,zIndex:50,pointerEvents:"none",
          display:"flex",alignItems:"center",justifyContent:"center",padding:16,
          animation:"fadeInOut 2.2s ease forwards"}}>
          <div style={{fontSize:"clamp(18px,4vw,28px)",fontWeight:900,letterSpacing:3,
            color:C[setWinAnim].light,background:T.setFlashBg,
            padding:"12px 24px",borderRadius:14,textAlign:"center"}}>
            {players[setWinAnim][0]} wins set {currentSet}!
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"8px clamp(8px,3vw,16px)",
        borderBottom:`1px solid ${T.topBar}`,
        flexShrink:0, gap:6,
      }}>
        <button onClick={onReset} style={{
          background:"transparent",border:`1px solid ${T.btnBorder}`,
          color:T.textDim,padding:"5px 10px",borderRadius:7,
          fontSize:"clamp(10px,2vw,11px)",cursor:"pointer",
          fontFamily:"'Chakra Petch',sans-serif",letterSpacing:1,whiteSpace:"nowrap",flexShrink:0,
        }}>← Back</button>

        <div style={{textAlign:"center",flex:1,minWidth:0}}>
          <div style={{fontSize:"clamp(9px,1.8vw,10px)",color:T.textDim,letterSpacing:1}}>
            Set {currentSet}/{maxSets} · {pointsToWin} pts</div>
          <div style={{fontSize:"clamp(10px,2vw,12px)",color:T.textDim}}>
            {isDoubles?"Doubles":"Singles"}</div>
        </div>

        {/* Right: theme + undo + swap — all in one row */}
        <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
          <button onClick={toggleTheme} style={{
            background:T.themeBg,border:`1px solid ${T.themeBorder}`,
            borderRadius:18,padding:"4px 10px",
            color:T.themeColor,fontSize:10,cursor:"pointer",
            fontFamily:"'Chakra Petch',sans-serif",whiteSpace:"nowrap",
          }}>{theme==="dark"?"☀️":"🌙"}</button>
          <button onClick={undo} style={{
            background:"transparent",border:`1px solid ${T.btnBorder}`,
            color:T.textDim,padding:"5px 9px",borderRadius:7,
            fontSize:14,cursor:"pointer"}}>↩</button>
          <button onClick={doSwap} style={{
            background:swapAnim?"#f59e0b1a":"transparent",
            border:`1px solid ${swapAnim?"#f59e0b":"#f59e0b55"}`,
            color:swapAnim?"#f59e0b":"#f59e0b88",
            padding:"5px 9px",borderRadius:7,fontSize:15,cursor:"pointer",
            transition:"all 0.2s",
            transform:swapAnim?"rotate(180deg)":"rotate(0deg)"}}>⇄</button>
        </div>
      </div>

      {/* Court */}
      <div style={{padding:"6px clamp(6px,2vw,12px) 2px",flexShrink:0}}>
        <div style={{
          background:T.courtWrap,borderRadius:10,
          border:`1px solid ${T.courtBorder}`,padding:"8px 6px 4px",
        }}>
          <div style={{textAlign:"center",
            fontSize:"clamp(8px,1.8vw,10px)",color:T.infoText,
            fontFamily:"'Chakra Petch',sans-serif",marginBottom:4,lineHeight:1.5}}>
            🏸 <b>{serverName}</b> serves from <b>{serveBox==="R"?"Right":"Left"}</b>
            &nbsp;·&nbsp;Score {scores[servingTeam]}
            &nbsp;·&nbsp;{servingTeam==="blue"?"Blue":"Red"}
          </div>
          <CourtSVG servingTeam={servingTeam} serveBox={serveBox}
            positions={positions} players={players}
            isDoubles={isDoubles} swapped={swapped} T={T}/>
        </div>
      </div>

      {/* Score panels */}
      <div style={{
        display:"flex",flex:1,
        margin:"5px clamp(5px,2vw,12px) clamp(5px,2vw,12px)",
        gap:3,borderRadius:13,overflow:"hidden",minHeight:140,
      }}>
        <ScorePanel team={lT} players={players[lT]} score={scores[lT]}
          wonSetsCount={wonSets[lT]} maxSets={maxSets}
          onScore={()=>addScore(lT)} isServing={servingTeam===lT} T={T}/>
        <ScorePanel team={rT} players={players[rT]} score={scores[rT]}
          wonSetsCount={wonSets[rT]} maxSets={maxSets}
          onScore={()=>addScore(rT)} isServing={servingTeam===rT} T={T}/>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;700;900&family=Sarabun:wght@400;700&display=swap');
        @keyframes ripple    {from{opacity:1;transform:scale(0.7)}to{opacity:0;transform:scale(1.6)}}
        @keyframes fadeIn    {from{opacity:0}to{opacity:1}}
        @keyframes fadeInOut {0%{opacity:0;transform:scale(0.85)}15%{opacity:1;transform:scale(1.04)}75%{opacity:1}100%{opacity:0}}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
      `}</style>
    </div>
  );
}

/* ── Root ────────────────────────────────────────────────────────── */
export default function App() {
  const[cfg,setCfg]=useState(null);
  const[theme,setTheme]=useState("dark");
  const T=THEMES[theme];
  const toggleTheme=()=>setTheme(t=>t==="dark"?"light":"dark");
  return cfg
    ?<GameScreen config={cfg} onReset={()=>setCfg(null)} T={T} theme={theme} toggleTheme={toggleTheme}/>
    :<SetupScreen onStart={setCfg} T={T} theme={theme} toggleTheme={toggleTheme}/>;
}