const BIZ_ROW_H=44;

// ─── FIX: Month-based storage keys ──────────────────────────────────────────
// Old: single key 'tf_biz_v4' — all months shared one record.
// New: per-month keys e.g. 'tf_biz_2025-06' so each month has its own data.
function bizMonthKey(offset){
  // offset in months relative to current viewing position
  const d=new Date();
  d.setMonth(d.getMonth()+Math.floor(bizWeekOffset/4.33));// rough month shift
  // Use year-month derived from the week offset instead for precision:
  const base=new Date();
  base.setDate(base.getDate()+bizWeekOffset*7);
  return`tf_biz_${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}`;
}
function bizPrevMonthKey(){
  const base=new Date();
  base.setDate(base.getDate()+bizWeekOffset*7);
  base.setMonth(base.getMonth()-1);
  return`tf_biz_${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}`;
}

function defaultBiz(){
  return{
    employees:[
      {id:1,name:'Alice Johnson',role:'Designer',color:EMP_COLORS[0],initials:'AJ'},
      {id:2,name:'Bob Smith',role:'Developer',color:EMP_COLORS[1],initials:'BS'},
      {id:3,name:'Cora Lee',role:'Manager',color:EMP_COLORS[2],initials:'CL'},
      {id:4,name:'Dan Kim',role:'Marketing',color:EMP_COLORS[3],initials:'DK'},
    ],
    shifts:[
      {id:1,empId:1,start:9,end:17,label:'Design Sprint'},
      {id:2,empId:2,start:10,end:18,label:'Dev Work'},
      {id:3,empId:3,start:8,end:16,label:'Management'},
      {id:4,empId:4,start:11,end:17,label:'Campaign'},
    ],
    nextId:5,nextEmpId:5
  };
}

function getBiz(){
  const key=bizMonthKey();
  try{return JSON.parse(localStorage.getItem(key))||defaultBiz();}catch{return defaultBiz();}
}
function saveBiz(b){
  localStorage.setItem(bizMonthKey(),JSON.stringify(b));
}

// ─── FIX: Copy employees from previous month ─────────────────────────────────
function copyFromPrevMonth(){
  const prevKey=bizPrevMonthKey();
  let prev;
  try{prev=JSON.parse(localStorage.getItem(prevKey));}catch{prev=null;}
  if(!prev||!prev.employees.length){showToast('No data found for previous month');return;}
  const biz=getBiz();
  // Merge employees: only add those not already present by name
  let added=0;
  prev.employees.forEach(emp=>{
    if(!biz.employees.find(e=>e.name===emp.name)){
      biz.employees.push({...emp,id:biz.nextEmpId++,color:EMP_COLORS[biz.employees.length%EMP_COLORS.length]});
      added++;
    }
  });
  saveBiz(biz);
  renderBusiness();
  showToast(added?`✓ Copied ${added} employee${added!==1?'s':''} from last month`:'All employees already present');
}

function setBizViewMode(mode){
  bizViewMode=mode;
  document.querySelectorAll('[data-biz-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.bizView===mode));
  renderBusiness();
}
function bizRangeLabel(){
  const base=new Date();base.setDate(base.getDate()+bizWeekOffset*(bizViewMode==='year'?365:bizViewMode==='month'?30:7));
  if(bizViewMode==='week'){const start=new Date(base);start.setDate(base.getDate()-base.getDay());const end=new Date(start);end.setDate(start.getDate()+6);return`${start.toLocaleDateString('en',{month:'short',day:'numeric'})} – ${end.toLocaleDateString('en',{month:'short',day:'numeric'})}`;}
  if(bizViewMode==='month'){return base.toLocaleDateString('en',{month:'long',year:'numeric'});}
  return base.getFullYear().toString();
}
function bizChangeWeek(n){bizWeekOffset+=n;renderBusiness();}

// ─── FIX: deleteShift ────────────────────────────────────────────────────────
function deleteShift(id,e){
  e.stopPropagation();
  if(!confirm('Remove this shift?'))return;
  const biz=getBiz();
  biz.shifts=biz.shifts.filter(s=>s.id!==id);
  saveBiz(biz);
  renderBusiness();
  showToast('Shift removed');
  beep('delete');
}

function renderBusiness(){
  const biz=getBiz();
  const el=document.getElementById('emp-list');if(!el)return;el.innerHTML='';
  biz.employees.forEach(emp=>{
    const hrs=biz.shifts.filter(s=>s.empId===emp.id).reduce((sum,sh)=>sum+(sh.end-sh.start),0);
    const item=document.createElement('div');item.className='emp-sidebar-item';
    item.innerHTML=`<div class="emp-sb-av" style="background:${emp.color}">${emp.initials}</div><div class="emp-sb-info"><div class="emp-sb-name">${emp.name}</div><div class="emp-sb-role">${emp.role}</div></div><div class="emp-sb-hrs">${hrs}h</div><div class="emp-edit-row"><button class="emp-edit-btn" onclick="editEmp(${emp.id},event)" title="Edit">✏️</button><button class="emp-edit-btn" onclick="deleteEmp(${emp.id},event)" title="Delete">🗑</button></div>`;
    el.appendChild(item);
  });
  const allShifts=biz.shifts;
  document.getElementById('bs-shifts').textContent=allShifts.length;
  document.getElementById('bs-hours').textContent=allShifts.reduce((s,sh)=>s+(sh.end-sh.start),0)+'h';
  document.getElementById('bs-emp').textContent=biz.employees.length;
  let conflicts=0;biz.employees.forEach(emp=>{const arr=allShifts.filter(s=>s.empId===emp.id).sort((a,b)=>a.start-b.start);for(let i=1;i<arr.length;i++)if(arr[i].start<arr[i-1].end)conflicts++;});
  const ce=document.getElementById('bs-conf');ce.textContent=conflicts;ce.style.color=conflicts?'#EF4444':'var(--accent)';
  document.getElementById('biz-week-label').textContent=bizRangeLabel();

  // ─── FIX: inject custom-hours and copy-from-last-month controls ──────────
  let ctrlBar=document.getElementById('biz-hour-ctrl');
  if(!ctrlBar){
    const topbar=document.querySelector('.biz-topbar');
    if(topbar){
      ctrlBar=document.createElement('div');
      ctrlBar.id='biz-hour-ctrl';
      ctrlBar.style.cssText='display:flex;align-items:center;gap:8px;font-size:11px;color:var(--muted);flex-wrap:wrap;';
      ctrlBar.innerHTML=`
        <span style="font-weight:600">Hours:</span>
        <select id="biz-start-h" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:5px;padding:2px 4px;font-size:11px"></select>
        <span>–</span>
        <select id="biz-end-h" style="background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:5px;padding:2px 4px;font-size:11px"></select>
        <button onclick="copyFromPrevMonth()" title="Copy staff from last month" style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:10px;cursor:pointer;font-weight:600">📋 Copy Last Month</button>
      `;
      topbar.appendChild(ctrlBar);
      // Populate hour dropdowns
      const startSel=ctrlBar.querySelector('#biz-start-h');
      const endSel=ctrlBar.querySelector('#biz-end-h');
      for(let h=0;h<24;h++){
        startSel.innerHTML+=`<option value="${h}"${h===bizStartH?' selected':''}>${fmt12h(h)}</option>`;
        endSel.innerHTML+=`<option value="${h+1}"${h+1===bizEndH?' selected':''}>${fmt12h(h+1===24?0:h+1)+( h+1===24?' (mid)':'')}</option>`;
      }
      startSel.addEventListener('change',()=>{
        bizStartH=parseInt(startSel.value,10);
        if(bizStartH>=bizEndH)bizEndH=Math.min(24,bizStartH+1);
        renderBusiness();
      });
      endSel.addEventListener('change',()=>{
        bizEndH=parseInt(endSel.value,10);
        if(bizEndH<=bizStartH)bizStartH=Math.max(0,bizEndH-1);
        renderBusiness();
      });
    }
  }else{
    // sync selects with current state
    const startSel=document.getElementById('biz-start-h');
    const endSel=document.getElementById('biz-end-h');
    if(startSel)startSel.value=bizStartH;
    if(endSel)endSel.value=bizEndH;
  }

  const wrap=document.getElementById('biz-grid-wrap');const grid=document.getElementById('biz-grid');
  if(bizViewMode==='week'){renderBusinessWeek(grid,biz);setTimeout(()=>{if(wrap)wrap.scrollTop=Math.max(0,(bizStartH)*BIZ_ROW_H+40-60);},80);}
  else if(bizViewMode==='month'){renderBusinessMonth(grid,biz);if(wrap)wrap.scrollTop=0;}
  else{renderBusinessYear(grid,biz);if(wrap)wrap.scrollTop=0;}
}

function renderBusinessWeek(bizGrid,biz){
  bizGrid.innerHTML='<div class="biz-tc" id="biz-tc"></div>';
  const tc=bizGrid.querySelector('#biz-tc');
  const hdr=document.createElement('div');hdr.className='biz-tc-hdr';tc.appendChild(hdr);

  // ─── FIX: render only hours within bizStartH–bizEndH instead of always 0-23
  for(let h=bizStartH;h<bizEndH;h++){
    const lbl=document.createElement('div');lbl.className='biz-tc-lbl';
    lbl.textContent=fmt12h(h);  // FIX: 12h format
    lbl.style.top=((h-bizStartH)*BIZ_ROW_H+40)+'px';
    tc.appendChild(lbl);
  }

  biz.employees.forEach(emp=>{
    const col=document.createElement('div');col.className='emp-col';
    const ch=document.createElement('div');ch.className='emp-col-hdr';
    const addShiftBtn=document.createElement('button');addShiftBtn.className='emp-col-add-btn';addShiftBtn.textContent='+';addShiftBtn.title='Add shift';
    addShiftBtn.addEventListener('click',ev=>{ev.stopPropagation();showAddShiftModal(emp.id);});
    ch.innerHTML=`<div class="emp-hdr-av" style="background:${emp.color}">${emp.initials}</div><div><div class="emp-hdr-name">${emp.name.split(' ')[0]}</div><div class="emp-hdr-role">${emp.role}</div></div>`;
    ch.appendChild(addShiftBtn);col.appendChild(ch);

    // Background rows only for visible hours
    for(let h=bizStartH;h<bizEndH;h++){
      const row=document.createElement('div');row.className='biz-row-bg';
      row.style.top=((h-bizStartH)*BIZ_ROW_H+40)+'px';
      col.appendChild(row);
    }

    biz.shifts.filter(s=>s.empId===emp.id).forEach(sh=>{
      // Skip shifts entirely outside the visible range
      if(sh.end<=bizStartH||sh.start>=bizEndH)return;
      // Clamp display to visible range
      const dispStart=Math.max(sh.start,bizStartH);
      const dispEnd=Math.min(sh.end,bizEndH);

      const overlap=biz.shifts.filter(s2=>s2.empId===emp.id&&s2.id!==sh.id&&sh.start<s2.end&&sh.end>s2.start).length>0;
      const shEl=document.createElement('div');shEl.className='biz-shift'+(overlap?' conflict':'');shEl.dataset.shiftId=sh.id;
      shEl.style.cssText=`top:${(dispStart-bizStartH)*BIZ_ROW_H+40}px;height:${(dispEnd-dispStart)*BIZ_ROW_H-4}px;background:${emp.color};color:#000`;

      // ─── FIX: shift label shows 12h AM/PM format ─────────────────────────
      shEl.innerHTML=`
        <div class="biz-shift-label">${sh.label}</div>
        <div class="biz-shift-time">${fmt12hRange(sh.start,sh.end)}</div>
        <button class="biz-shift-del-btn" onclick="deleteShift(${sh.id},event)" title="Remove shift"
          style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.35);color:#fff;border:none;border-radius:4px;width:18px;height:18px;font-size:10px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center">✕</button>
      `;
      bindShiftDrag(shEl,sh,emp.id);
      col.appendChild(shEl);
    });
    bizGrid.appendChild(col);
  });
}

function bindShiftDrag(el,shift,empId){
  let startY=0,startTop=0;
  const onMove=ev=>{
    const p=getEventPoint(ev);
    const delta=Math.round((p.clientY-startY)/BIZ_ROW_H);
    const dur=shift.end-shift.start;
    const nextStart=Math.max(bizStartH,Math.min(bizEndH-dur,startTop+delta));
    shift.start=nextStart;shift.end=nextStart+dur;
    el.style.top=((shift.start-bizStartH)*BIZ_ROW_H+40)+'px';
    // FIX: update label with 12h format
    const timeEl=el.querySelector('.biz-shift-time');
    if(timeEl)timeEl.textContent=fmt12hRange(shift.start,shift.end);
  };
  const onUp=()=>{
    saveBiz(getBiz());renderBusiness();
    document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);
    document.removeEventListener('touchmove',onMove);document.removeEventListener('touchend',onUp);
  };
  el.addEventListener('mousedown',e=>{
    if(e.target.classList.contains('biz-shift-del-btn'))return;
    startY=e.clientY;startTop=shift.start;
    document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
  });
  el.addEventListener('touchstart',e=>{
    if(e.target.classList.contains('biz-shift-del-btn'))return;
    const p=getEventPoint(e);startY=p.clientY;startTop=shift.start;
    document.addEventListener('touchmove',onMove,{passive:false});document.addEventListener('touchend',onUp);
  },{passive:true});
}

function renderBusinessMonth(bizGrid,biz){
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  bizGrid.innerHTML=`<div class="biz-summary-grid month">${days.map(d=>`<div class="biz-day-card"><div class="biz-day-title">${d}</div>${biz.employees.map(emp=>`<div class="biz-chip"><span class="biz-chip-dot" style="background:${emp.color}"></span><span style="flex:1">${emp.name.split(' ')[0]}</span><strong>${biz.shifts.filter(s=>s.empId===emp.id).reduce((sum,sh)=>sum+(sh.end-sh.start),0)}h</strong></div>`).join('')}</div>`).join('')}</div>`;
}
function renderBusinessYear(bizGrid,biz){
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  bizGrid.innerHTML=`<div class="biz-summary-grid year">${months.map(m=>`<div class="biz-month-card"><div class="biz-month-title">${m}</div>${biz.employees.map(emp=>`<div class="biz-chip"><span class="biz-chip-dot" style="background:${emp.color}"></span><span style="flex:1">${emp.name.split(' ')[0]}</span><strong>${biz.shifts.filter(s=>s.empId===emp.id).length}</strong></div>`).join('')}</div>`).join('')}</div>`;
}

function editEmp(id,e){
  e.stopPropagation();const biz=getBiz();const emp=biz.employees.find(x=>x.id===id);if(!emp)return;
  showModal({title:'Edit Employee',body:`<label class="tf-label">Name</label><input class="tf-input" id="en" value="${escHtml(emp.name)}"/><label class="tf-label">Role</label><input class="tf-input" id="er" value="${escHtml(emp.role)}"/>`,btn:'Save',onConfirm:()=>{
    emp.name=document.getElementById('en').value.trim()||emp.name;
    emp.role=document.getElementById('er').value.trim()||emp.role;
    emp.initials=emp.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    saveBiz(biz);renderBusiness();return true;
  }});
}
function deleteEmp(id,e){
  e.stopPropagation();if(!confirm('Delete this employee?'))return;
  const biz=getBiz();biz.employees=biz.employees.filter(x=>x.id!==id);biz.shifts=biz.shifts.filter(s=>s.empId!==id);
  saveBiz(biz);renderBusiness();showToast('Employee removed');
}
function showAddEmpModal(){
  showModal({title:'Add Employee',body:`<label class="tf-label">Full Name</label><input class="tf-input" id="ename" placeholder="e.g. Sarah Connor"/><label class="tf-label">Role</label><input class="tf-input" id="erole" placeholder="e.g. Designer"/>`,btn:'Add Employee',onConfirm:()=>{
    const name=document.getElementById('ename').value.trim();const role=document.getElementById('erole').value.trim();
    if(!name){showToast('Enter a name');return false;}
    const biz=getBiz();const color=EMP_COLORS[biz.employees.length%EMP_COLORS.length];
    biz.employees.push({id:biz.nextEmpId++,name,role:role||'Staff',color,initials:name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()});
    saveBiz(biz);renderBusiness();showToast(`${name} added ✓`);return true;
  }});
}
function showAddShiftModal(empId){
  const biz=getBiz();const emp=biz.employees.find(x=>x.id===empId);if(!emp)return;
  // Build hour options for the dropdowns (respects custom range)
  const opts=(from,to)=>Array.from({length:to-from+1},(_,i)=>{const h=from+i;return`<option value="${h}">${fmt12h(h===24?0:h)}</option>`;}).join('');
  showModal({
    title:`Add Shift — ${emp.name}`,
    body:`
      <label class="tf-label">Shift Label</label>
      <input class="tf-input" id="sh-label" placeholder="e.g. Morning Shift"/>
      <label class="tf-label">Start Time</label>
      <select class="tf-input" id="sh-start">${opts(bizStartH,bizEndH-1)}</select>
      <label class="tf-label">End Time</label>
      <select class="tf-input" id="sh-end">${opts(bizStartH+1,bizEndH)}</select>
    `,
    btn:'Add Shift',
    onConfirm:()=>{
      const label=document.getElementById('sh-label').value.trim()||'Shift';
      const start=parseInt(document.getElementById('sh-start').value,10);
      const end=parseInt(document.getElementById('sh-end').value,10);
      if(isNaN(start)||isNaN(end)||end<=start){showToast('End must be after start');return false;}
      biz.shifts.push({id:biz.nextId++,empId,start,end,label});
      saveBiz(biz);renderBusiness();showToast(`Shift added for ${emp.name} ✓`);return true;
    }
  });
}
