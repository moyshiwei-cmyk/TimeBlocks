function renderAnalytics(){
  const content=document.getElementById('analytics-content');content.innerHTML='';
  const blocks=getBlocks();const s=getStreak(),sc=getScore();
  if(!blocks.length){content.innerHTML='<div class="an-card" style="text-align:center;padding:40px 20px;color:var(--muted)">📊<br><br>No blocks on today\'s schedule yet.<br>Head to <strong>Schedule</strong> to plan your day.</div>';return;}
  const totalH=blocks.reduce((s,b)=>s+b.durationH,0);
  const freeH=Math.max(0,24-totalH);
  const hourLoad=new Array(24).fill(0);
  blocks.forEach(b=>{const st=Math.floor(b.startH),en=Math.min(24,Math.ceil(b.startH+b.durationH));for(let h=st;h<en;h++)hourLoad[h]++;});
  const busiestH=hourLoad.indexOf(Math.max(...hourLoad));
  const prodScore=Math.min(100,Math.round(totalH/16*100));
  const doneCount=blocks.filter(b=>b.done).length;
  // Stat cards
  const statHtml=`<div class="stat-row">
    <div class="stat-card"><div class="stat-val">${blocks.length}</div><div class="stat-lbl">Blocks</div></div>
    <div class="stat-card"><div class="stat-val">${totalH.toFixed(1)}h</div><div class="stat-lbl">Scheduled</div></div>
    <div class="stat-card"><div class="stat-val">${doneCount}</div><div class="stat-lbl">Completed</div></div>
    <div class="stat-card"><div class="stat-val">${prodScore}%</div><div class="stat-lbl">Productivity</div></div>
  </div>`;
  content.innerHTML=statHtml;
  const anGrid=document.createElement('div');anGrid.className='an-grid';
  // PIE — by category
  const catMap={};blocks.forEach(b=>{const k=b.catId||'__none';if(!catMap[k])catMap[k]={catId:k,hours:0,cat:CAT_MAP[b.catId]};catMap[k].hours+=b.durationH;});
  if(freeH>0)catMap['__free']={catId:'__free',hours:freeH,cat:{name:'Free',color:'#374151',emoji:'🕐'}};
  const slices=Object.values(catMap).sort((a,b)=>b.hours-a.hours);
  const totalAll=slices.reduce((s,x)=>s+x.hours,0);
  const pieCard=document.createElement('div');pieCard.className='an-card';
  pieCard.innerHTML=`<div class="an-card-title">Time by Category</div><div class="an-card-sub">Monthly view · today's snapshot</div>`;
  const pw=document.createElement('div');pw.className='pie-wrap';
  const canvas=document.createElement('canvas');canvas.width=148;canvas.height=148;pw.appendChild(canvas);
  const legend=document.createElement('div');legend.className='pie-legend';
  slices.forEach(s=>{
    const pct=(s.hours/totalAll*100).toFixed(0);const col=(s.cat?.color)||'#6B7280';
    const nm=s.cat?`${s.cat.emoji||''} ${s.cat.name}`:'Uncategorised';
    legend.innerHTML+=`<div class="pie-legend-item"><div class="pie-legend-dot" style="background:${col}"></div><span style="flex:1">${nm}</span><span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted)">${pct}%</span></div>`;
  });
  pw.appendChild(legend);pieCard.appendChild(pw);anGrid.appendChild(pieCard);
  requestAnimationFrame(()=>{
    const ctx=canvas.getContext('2d');let a=-Math.PI/2;
    slices.forEach(s=>{const sw=s.hours/totalAll*Math.PI*2;const col=(s.cat?.color)||'#6B7280';ctx.beginPath();ctx.moveTo(74,74);ctx.arc(74,74,64,a,a+sw);ctx.closePath();ctx.fillStyle=col;ctx.fill();ctx.strokeStyle=document.documentElement.getAttribute('data-theme')==='dark'?'#0D0D14':'#F4F3FF';ctx.lineWidth=2;ctx.stroke();a+=sw;});
    ctx.beginPath();ctx.arc(74,74,26,0,Math.PI*2);ctx.fillStyle=document.documentElement.getAttribute('data-theme')==='dark'?'#16161F':'#FFFFFF';ctx.fill();
    ctx.fillStyle='var(--muted)';ctx.textAlign='center';ctx.font='bold 9px DM Sans,sans-serif';ctx.fillText(blocks.length+' blocks',74,78);
  });
  // Bar chart
  const barCard=document.createElement('div');barCard.className='an-card';
  barCard.innerHTML=`<div class="an-card-title">Hourly Distribution</div><div class="an-card-sub">Block density across the day</div>`;
  const bc=document.createElement('div');bc.className='bar-chart';
  const maxL=Math.max(...hourLoad,1);
  for(let h=0;h<24;h++){
    const col=document.createElement('div');col.className='bar-col';
    const fill=document.createElement('div');fill.className='bar-fill';
    fill.style.background=hourLoad[h]>0?`hsl(${258+h*3},65%,${55-hourLoad[h]*5}%)`:'rgba(255,255,255,.05)';
    fill.style.height=(hourLoad[h]/maxL*90)+'%';fill.setAttribute('data-tip',`${h.toString().padStart(2,'0')}:00 · ${hourLoad[h]}`);
    const lbl=document.createElement('div');lbl.className='bar-lbl';lbl.textContent=h%4===0?h.toString().padStart(2,'0'):'';
    col.appendChild(fill);col.appendChild(lbl);bc.appendChild(col);
  }
  barCard.appendChild(bc);anGrid.appendChild(barCard);
  // Insight card
  const ignored=['sleep','work','study'];
  const catRanked=Object.values(catMap).filter(x=>!ignored.includes(x.catId)&&x.catId!=='__free').sort((a,b)=>b.hours-a.hours);
  const topCat=catRanked[0];
  const studyH=(catMap['study']?.hours||0);const sleepH=(catMap['sleep']?.hours||0);
  let insight=`You've scheduled <strong>${totalH.toFixed(1)} hours</strong> today with a productivity score of <strong>${prodScore}%</strong>.`;
  if(topCat)insight+=` Your top activity is <strong>${topCat.cat?.name||'Uncategorised'}</strong> at ${topCat.hours.toFixed(1)}h.`;
  const suggestions=[];
  if(sleepH<7)suggestions.push({icon:'😴',text:'Consider scheduling at least 7h of sleep for better performance'});
  if(studyH<1)suggestions.push({icon:'📚',text:'Try to include at least 1h of study or learning time'});
  if(totalH<8)suggestions.push({icon:'📅',text:'Your schedule has a lot of free time — consider adding more activities'});
  if(doneCount===0&&blocks.length>0)suggestions.push({icon:'✅',text:'Start completing your task blocks to earn reward points!'});
  const insCard=document.createElement('div');insCard.className='an-card full';
  insCard.innerHTML=`<div class="an-card-title">AI Insights</div><div class="an-card-sub">Smart analysis of your schedule</div>
  <div class="insight-box"><div class="insight-text">${insight}</div></div>
  ${suggestions.length?`<div style="margin-top:12px"><div class="an-card-sub" style="margin-bottom:8px">💡 Suggestions</div>${suggestions.map(sg=>`<div class="suggestion-item"><span class="suggestion-icon">${sg.icon}</span>${sg.text}</div>`).join('')}</div>`:''}`;
  anGrid.appendChild(insCard);content.appendChild(anGrid);
}

