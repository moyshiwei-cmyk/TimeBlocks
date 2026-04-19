
const BIZ_ROW_H=44;
function getBiz(){
  return gs('BIZ')||{
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
function saveBiz(b){ss('BIZ',b);} 
function setBizViewMode(mode){bizViewMode=mode; document.querySelectorAll('[data-biz-view]').forEach(btn=>btn.classList.toggle('active', btn.dataset.bizView===mode)); renderBusiness();}
function bizRangeLabel(){
  const base=new Date(); base.setDate(base.getDate()+bizWeekOffset*(bizViewMode==='year'?365:bizViewMode==='month'?30:7));
  if(bizViewMode==='week'){ const start=new Date(base); start.setDate(base.getDate()-base.getDay()); const end=new Date(start); end.setDate(start.getDate()+6); return `${start.toLocaleDateString('en',{month:'short',day:'numeric'})} – ${end.toLocaleDateString('en',{month:'short',day:'numeric'})}`; }
  if(bizViewMode==='month'){ return base.toLocaleDateString('en',{month:'long',year:'numeric'}); }
  return base.getFullYear().toString();
}
function bizChangeWeek(n){ bizWeekOffset+=n; renderBusiness(); }
function renderBusiness(){
  const biz=getBiz();
  const el=document.getElementById('emp-list'); if(!el) return; el.innerHTML='';
  biz.employees.forEach(emp=>{
    const hrs=biz.shifts.filter(s=>s.empId===emp.id).reduce((sum,sh)=>sum+(sh.end-sh.start),0);
    const item=document.createElement('div'); item.className='emp-sidebar-item';
    item.innerHTML=`<div class="emp-sb-av" style="background:${emp.color}">${emp.initials}</div><div class="emp-sb-info"><div class="emp-sb-name">${emp.name}</div><div class="emp-sb-role">${emp.role}</div></div><div class="emp-sb-hrs">${hrs}h</div><div class="emp-edit-row"><button class="emp-edit-btn" onclick="editEmp(${emp.id},event)" title="Edit">✏️</button><button class="emp-edit-btn" onclick="deleteEmp(${emp.id},event)" title="Delete">🗑</button></div>`;
    el.appendChild(item);
  });
  const allShifts=biz.shifts;
  document.getElementById('bs-shifts').textContent=allShifts.length;
  document.getElementById('bs-hours').textContent=allShifts.reduce((s,sh)=>s+(sh.end-sh.start),0)+'h';
  document.getElementById('bs-emp').textContent=biz.employees.length;
  let conflicts=0; biz.employees.forEach(emp=>{const arr=allShifts.filter(s=>s.empId===emp.id).sort((a,b)=>a.start-b.start); for(let i=1;i<arr.length;i++) if(arr[i].start<arr[i-1].end) conflicts++;});
  const ce=document.getElementById('bs-conf'); ce.textContent=conflicts; ce.style.color=conflicts?'#EF4444':'var(--accent)';
  document.getElementById('biz-week-label').textContent=bizRangeLabel();
  const wrap=document.getElementById('biz-grid-wrap'); const grid=document.getElementById('biz-grid');
  if(bizViewMode==='week'){ renderBusinessWeek(grid,biz); setTimeout(()=>{ if(wrap) wrap.scrollTop=9*BIZ_ROW_H+40-60; },80); }
  else if(bizViewMode==='month'){ renderBusinessMonth(grid,biz); if(wrap) wrap.scrollTop=0; }
  else { renderBusinessYear(grid,biz); if(wrap) wrap.scrollTop=0; }
}
function renderBusinessWeek(bizGrid,biz){
  bizGrid.innerHTML='<div class="biz-tc" id="biz-tc"></div>';
  const tc=bizGrid.querySelector('#biz-tc'); const hdr=document.createElement('div'); hdr.className='biz-tc-hdr'; tc.appendChild(hdr);
  for(let h=0;h<24;h++){ const lbl=document.createElement('div'); lbl.className='biz-tc-lbl'; lbl.textContent=h.toString().padStart(2,'0')+':00'; tc.appendChild(lbl); }
  biz.employees.forEach(emp=>{
    const col=document.createElement('div'); col.className='emp-col';
    const ch=document.createElement('div'); ch.className='emp-col-hdr';
    const addShiftBtn=document.createElement('button'); addShiftBtn.className='emp-col-add-btn'; addShiftBtn.textContent='+'; addShiftBtn.title='Add timeslot'; addShiftBtn.addEventListener('click',ev=>{ev.stopPropagation(); showAddShiftModal(emp.id);});
    ch.innerHTML=`<div class="emp-hdr-av" style="background:${emp.color}">${emp.initials}</div><div><div class="emp-hdr-name">${emp.name.split(' ')[0]}</div><div class="emp-hdr-role">${emp.role}</div></div>`; ch.appendChild(addShiftBtn); col.appendChild(ch);
    for(let h=0;h<24;h++){ const row=document.createElement('div'); row.className='biz-row-bg'; row.style.top=(h*BIZ_ROW_H+40)+'px'; col.appendChild(row); }
    biz.shifts.filter(s=>s.empId===emp.id).forEach(sh=>{
      const overlap=biz.shifts.filter(s2=>s2.empId===emp.id&&s2.id!==sh.id&&sh.start<s2.end&&sh.end>s2.start).length>0;
      const shEl=document.createElement('div'); shEl.className='biz-shift'+(overlap?' conflict':''); shEl.dataset.shiftId=sh.id;
      shEl.style.cssText=`top:${sh.start*BIZ_ROW_H+40}px;height:${(sh.end-sh.start)*BIZ_ROW_H-4}px;background:${emp.color};color:#000`;
      shEl.innerHTML=`<div class="biz-shift-label">${sh.label}</div><div class="biz-shift-time">${String(sh.start).padStart(2,'0')}:00–${String(sh.end).padStart(2,'0')}:00</div>`;
      bindShiftDrag(shEl, sh, emp.id);
      col.appendChild(shEl);
    });
    bizGrid.appendChild(col);
  });
}
function bindShiftDrag(el, shift, empId){
  let startY=0,startTop=0;
  const onMove=ev=>{ const p=getEventPoint(ev); const delta=Math.round((p.clientY-startY)/BIZ_ROW_H); const nextStart=Math.max(0, Math.min(23-(shift.end-shift.start), startTop+delta)); shift.start=nextStart; shift.end=nextStart+(shift.end-shift.start); el.style.top=(shift.start*BIZ_ROW_H+40)+'px'; el.querySelector('.biz-shift-time').textContent=`${String(shift.start).padStart(2,'0')}:00–${String(shift.end).padStart(2,'0')}:00`; };
  const onUp=()=>{ saveBiz(getBiz()); renderBusiness(); document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); document.removeEventListener('touchmove',onMove); document.removeEventListener('touchend',onUp); };
  el.addEventListener('mousedown',e=>{ startY=e.clientY; startTop=shift.start; document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp); });
  el.addEventListener('touchstart',e=>{ const p=getEventPoint(e); startY=p.clientY; startTop=shift.start; document.addEventListener('touchmove',onMove,{passive:false}); document.addEventListener('touchend',onUp); }, {passive:true});
}
function renderBusinessMonth(bizGrid,biz){
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  bizGrid.innerHTML=`<div class="biz-summary-grid month">${days.map((d,i)=>`<div class="biz-day-card"><div class="biz-day-title">${d}</div>${biz.employees.map(emp=>`<div class="biz-chip"><span class="biz-chip-dot" style="background:${emp.color}"></span><span style="flex:1">${emp.name.split(' ')[0]}</span><strong>${biz.shifts.filter(s=>s.empId===emp.id).reduce((sum,sh)=>sum+(sh.end-sh.start),0)}h</strong></div>`).join('')}</div>`).join('')}</div>`;
}
function renderBusinessYear(bizGrid,biz){
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  bizGrid.innerHTML=`<div class="biz-summary-grid year">${months.map(m=>`<div class="biz-month-card"><div class="biz-month-title">${m}</div>${biz.employees.map(emp=>`<div class="biz-chip"><span class="biz-chip-dot" style="background:${emp.color}"></span><span style="flex:1">${emp.name.split(' ')[0]}</span><strong>${biz.shifts.filter(s=>s.empId===emp.id).length}</strong></div>`).join('')}</div>`).join('')}</div>`;
}
function editEmp(id,e){ e.stopPropagation(); const biz=getBiz(); const emp=biz.employees.find(x=>x.id===id); if(!emp) return; showModal({title:'Edit Employee',body:`<label class="tf-label">Name</label><input class="tf-input" id="en" value="${escHtml(emp.name)}"/><label class="tf-label">Role</label><input class="tf-input" id="er" value="${escHtml(emp.role)}"/>`,btn:'Save',onConfirm:()=>{ emp.name=document.getElementById('en').value.trim()||emp.name; emp.role=document.getElementById('er').value.trim()||emp.role; emp.initials=emp.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); saveBiz(biz); renderBusiness(); return true; }}); }
function deleteEmp(id,e){ e.stopPropagation(); if(!confirm('Delete this employee?')) return; const biz=getBiz(); biz.employees=biz.employees.filter(x=>x.id!==id); biz.shifts=biz.shifts.filter(s=>s.empId!==id); saveBiz(biz); renderBusiness(); showToast('Employee removed'); }
function showAddEmpModal(){ showModal({title:'Add Employee',body:`<label class="tf-label">Full Name</label><input class="tf-input" id="ename" placeholder="e.g. Sarah Connor"/><label class="tf-label">Role</label><input class="tf-input" id="erole" placeholder="e.g. Designer"/>`,btn:'Add Employee',onConfirm:()=>{ const name=document.getElementById('ename').value.trim(); const role=document.getElementById('erole').value.trim(); if(!name){showToast('Enter a name'); return false;} const biz=getBiz(); const color=EMP_COLORS[biz.employees.length%EMP_COLORS.length]; biz.employees.push({id:biz.nextEmpId++,name,role:role||'Staff',color,initials:name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}); saveBiz(biz); renderBusiness(); showToast(`${name} added ✓`); return true; }}); }
function showAddShiftModal(empId){ const biz=getBiz(); const emp=biz.employees.find(x=>x.id===empId); if(!emp) return; showModal({title:`Add Shift — ${emp.name}`,body:`<label class="tf-label">Shift Label</label><input class="tf-input" id="sh-label" placeholder="e.g. Morning Shift"/><label class="tf-label">Start Time (hour 0–23)</label><input class="tf-input" id="sh-start" type="number" min="0" max="23" value="9"/><label class="tf-label">End Time (hour 1–24)</label><input class="tf-input" id="sh-end" type="number" min="1" max="24" value="17"/>`,btn:'Add Shift',onConfirm:()=>{ const label=document.getElementById('sh-label').value.trim()||'Shift'; const start=parseInt(document.getElementById('sh-start').value,10); const end=parseInt(document.getElementById('sh-end').value,10); if(isNaN(start)||isNaN(end)||end<=start){showToast('End must be after start'); return false;} if(start<0||end>24){showToast('Hours must be between 0 and 24'); return false;} biz.shifts.push({id:biz.nextId++,empId,start,end,label}); saveBiz(biz); renderBusiness(); showToast(`Shift added for ${emp.name} ✓`); return true; }}); }
