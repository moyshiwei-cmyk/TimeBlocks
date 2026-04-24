function renderFriends(){
  const list=document.getElementById('friend-list');list.innerHTML='';
  const sc=getScore(),s=getStreak();
  const me={id:'me',name:'You',avatar:CHARACTERS.find(c=>c.id===sc.activeChar)?.emoji||'👤',streak:s.count,score:sc.total||0,active:true};
  const all=[me,...MOCK_FRIENDS].sort((a,b)=>b.score-a.score);
  all.forEach((f,i)=>{
    const card=document.createElement('div');card.className='friend-card';
    card.innerHTML=`<div class="friend-av">${f.avatar}${f.active&&f.id!=='me'?'<div class="friend-online"></div>':''}</div><div class="friend-info"><div class="friend-name">${f.name}${f.id==='me'?' (You)':''}</div><div class="friend-meta">#${i+1} · 🔥 ${f.streak}d · ${(f.score).toLocaleString()} pts</div></div><div class="friend-actions">${f.id!=='me'?`<button class="friend-btn" onclick="openChatWith('${f.id}')">💬 Chat</button>`:'<button class="friend-btn" onclick="switchView(\'profile\')">View Profile</button>'}</div>`;
    list.appendChild(card);
  });
}
function renderMsgList(){
  const list=document.getElementById('msg-friend-list');list.innerHTML='';
  MOCK_FRIENDS.forEach(f=>{
    const msgs=getChatMsgs(f.id);const last=msgs[msgs.length-1];
    const card=document.createElement('div');card.className='friend-card';
    card.innerHTML=`<div class="friend-av">${f.avatar}${f.active?'<div class="friend-online"></div>':'<div class="friend-online friend-offline"></div>'}</div><div class="friend-info"><div class="friend-name">${f.name}</div><div class="friend-meta">${last?(last.from==='me'?'You: ':'')+last.text:'No messages yet'}</div></div><div class="friend-actions"><button class="friend-btn" onclick="openChatWith('${f.id}')">Open Chat</button></div>`;
    list.appendChild(card);
  });
}


function chatStoreKey(id){return`tf_chat2_${id}`}
function getChatMsgs(id){try{return JSON.parse(localStorage.getItem(chatStoreKey(id)))||[]}catch{return[]}}
function saveChatMsgs(id,msgs){localStorage.setItem(chatStoreKey(id),JSON.stringify(msgs.slice(-200)))}
function toggleChat(){
  const ov=document.getElementById('chat-overlay');
  if(ov.classList.contains('open')){ov.classList.remove('open');}
  else{renderChatFriendList();ov.classList.add('open');backToChatList();}
}
function handleChatOvClick(e){if(e.target.id==='chat-overlay')toggleChat();}
function renderChatFriendList(){
  const list=document.getElementById('chat-friend-list');list.innerHTML='';
  MOCK_FRIENDS.forEach(f=>{
    const msgs=getChatMsgs(f.id);const last=msgs[msgs.length-1];
    const item=document.createElement('div');item.className='chat-fitem';
    const ago=last?((Date.now()-last.time)<60000?'now':(Date.now()-last.time)<3600000?Math.round((Date.now()-last.time)/60000)+'m':''):'';
    item.innerHTML=`<div class="cfi-av"><div class="cfi-avatar">${f.avatar}</div><div class="cfi-dot ${f.active?'':'cfi-offline'}"></div></div><div class="cfi-info"><div class="cfi-name">${f.name}</div><div class="cfi-preview">${last?(last.from==='me'?'You: ':'')+last.text:'Start a conversation…'}</div></div><div class="cfi-time">${ago}</div>`;
    item.addEventListener('click',()=>openChatWith(f.id));list.appendChild(item);
  });
}
function openChatWith(fid){
  const f=MOCK_FRIENDS.find(x=>x.id===fid);if(!f)return;
  activeChatId=fid;
  // Ensure chat overlay is open
  const ov=document.getElementById('chat-overlay');if(!ov.classList.contains('open'))ov.classList.add('open');
  document.getElementById('chat-av').textContent=f.avatar;
  document.getElementById('chat-name').textContent=f.name;
  const st=document.getElementById('chat-status');st.textContent=f.active?'Online':'Last seen recently';st.className='chat-hdr-status'+(f.active?' online':'');
  document.getElementById('chat-list-view').style.display='none';
  const mv=document.getElementById('chat-msgs-view');mv.classList.add('active');
  renderMsgs(fid);
  const msgs=getChatMsgs(fid);
  if(!msgs.length){
    const seeds=['Hey! How\'s your schedule today? 👀','Have you tried the new category system? 🗂','When do you usually plan your day?'];
    setTimeout(()=>{const m=getChatMsgs(fid);m.push({from:'them',text:seeds[MOCK_FRIENDS.indexOf(f)%seeds.length],time:Date.now()-1800000});saveChatMsgs(fid,m);if(activeChatId===fid)renderMsgs(fid);},300);
  }
}
function backToChatList(){
  activeChatId=null;
  document.getElementById('chat-list-view').style.display='';
  document.getElementById('chat-msgs-view').classList.remove('active');
  renderChatFriendList();
}
function renderMsgs(fid){
  const f=MOCK_FRIENDS.find(x=>x.id===fid);
  const scroll=document.getElementById('chat-scroll');scroll.innerHTML='';
  getChatMsgs(fid).forEach(m=>{
    const row=document.createElement('div');row.className=`msg-row ${m.from==='me'?'me':'them'}`;
    row.innerHTML=`${m.from!=='me'?`<div class="msg-av">${f?.avatar||'👤'}</div>`:''}<div class="msg-content"><div class="msg-bubble">${escHtml(m.text)}</div><div class="msg-time">${formatTime(m.time)}</div></div>`;
    scroll.appendChild(row);
  });
  scroll.scrollTop=scroll.scrollHeight;
}
function chatKey2(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}}
function sendMsg(){
  const input=document.getElementById('chat-input');const text=input.value.trim();if(!text||!activeChatId)return;
  input.value='';beep('click');
  const msgs=getChatMsgs(activeChatId);msgs.push({from:'me',text,time:Date.now()});saveChatMsgs(activeChatId,msgs);
  renderMsgs(activeChatId);
  const fid=activeChatId;const tw=document.getElementById('chat-typing');tw.style.display='block';
  setTimeout(()=>{
    tw.style.display='none';
    const reply=BOT_REPLIES[Math.floor(Math.random()*BOT_REPLIES.length)];
    const m=getChatMsgs(fid);m.push({from:'them',text:reply,time:Date.now()});saveChatMsgs(fid,m);
    if(activeChatId===fid)renderMsgs(fid);beep('chat');
  },1500+Math.random()*1500);
}
// Fix chatKey event
document.addEventListener('DOMContentLoaded',()=>{
  const ci=document.getElementById('chat-input');if(ci)ci.addEventListener('keydown',chatKey2);
});


function renderRightPanel(){
  // Leaderboard
  const lb=document.getElementById('rp-lb');lb.innerHTML='';
  const sc=getScore(),s=getStreak();
  const me={name:'You',avatar:CHARACTERS.find(c=>c.id===sc.activeChar)?.emoji||'👤',streak:s.count,score:sc.total||0,active:true};
  const all=[me,...MOCK_FRIENDS].sort((a,b)=>b.score-a.score);
  all.forEach((f,i)=>{
    const rank=i+1;const medal=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank+'';
    lb.innerHTML+=`<div class="lb-item"><div class="lb-rank ${rank<=3?'r'+rank:''}">${medal}</div><div class="lb-av">${f.avatar}</div><div class="lb-info"><div class="lb-name">${f.name}${f.active&&f.name!=='You'?'<span class="online-dot"></span>':''}</div><div class="lb-meta">🔥 ${f.streak}d</div></div><div class="lb-score">${(f.score).toLocaleString()}</div></div>`;
  });
  // Activity
  const act=document.getElementById('rp-activity');act.innerHTML='';
  const activities=[
    {icon:'🔥',text:'<b>Alex</b> is on a 14-day streak!',time:'2h ago'},
    {icon:'✅',text:'<b>Jordan</b> completed their schedule',time:'4h ago'},
    {icon:'🎮',text:'<b>Sam</b> spent 3h on hobbies',time:'6h ago'},
    {icon:'📚',text:'<b>Maya</b> logged 2h of study time',time:'1d ago'},
    {icon:'🏆',text:'<b>Chris</b> hit 1,000 total points!',time:'2d ago'},
  ];
  activities.forEach(a=>{act.innerHTML+=`<div class="activity-item"><div class="act-icon">${a.icon}</div><div class="act-body"><div class="act-text">${a.text}</div><div class="act-time">${a.time}</div></div></div>`;});
}
function toggleRightPanel(){document.getElementById('right-panel').classList.toggle('hidden');}
function toggleCalSidebar(){document.getElementById('sidebar').classList.toggle('collapsed');}


function chatKey(e){ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMsg(); } }
