const params=new URLSearchParams(location.search), eventEl=document.getElementById('event'), members=document.getElementById('members'), list=document.getElementById('memberList'), addBtn=document.getElementById('addBtn'); let count=0;
if(params.get('event')) eventEl.value=params.get('event');
function update(){members.style.display=eventEl.value==='Checkmate'?'none':'block'; if(eventEl.value==='Checkmate'){list.innerHTML='';count=0}}
eventEl.addEventListener('change',update);
addBtn.addEventListener('click',()=>{if(count>=2)return;count++;let d=document.createElement('div');d.className='member';d.innerHTML=`<b>Member ${count+1}</b><div class="formgrid"><label>Name<input required placeholder="Full name"></label><label>Email<input type="email" required placeholder="member@example.com"></label><label>Phone<div class="phone"><span>+91</span><input inputmode="numeric" maxlength="10" pattern="[6-9][0-9]{9}" required placeholder="10-digit number"></div></label></div>`;list.appendChild(d)});
document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();const p=document.getElementById('phone');if(!/^[6-9][0-9]{9}$/.test(p.value)){alert('Enter a valid 10-digit Indian mobile number.');p.focus();return} alert('Registration form accepted. Payment will be connected in Phase 2.');});
update();
