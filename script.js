const eventEl=document.getElementById('event'), members=document.getElementById('members'), list=document.getElementById('memberList'); let count=0;
function pick(x){eventEl.value=x; updateMembers();}
function updateMembers(){if(eventEl.value==='Checkmate'){members.style.display='none';list.innerHTML='';count=0}else members.style.display='block'}
eventEl.addEventListener('change',updateMembers);
function addMember(){if(count>=2)return;count++;const d=document.createElement('div');d.className='member';d.innerHTML='<b>Member '+(count+1)+'</b><div class="formgrid" style="margin-top:12px"><label>Name<input required placeholder="Member name"></label><label>Email<input type="email" required placeholder="member@example.com"></label><label>Phone<input required placeholder="10-digit mobile"></label><label>Department<input required placeholder="CSE (DS)"></label></div>';list.appendChild(d)}
document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();document.getElementById('payEvent').textContent=eventEl.value;document.getElementById('payment').classList.remove('hidden');location.hash='payment'});
function demoSuccess(){document.getElementById('payment').classList.add('hidden');document.getElementById('success').classList.remove('hidden');location.hash='success'}
updateMembers();
