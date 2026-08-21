(function(){
  "use strict";

  // ---------- In-memory data store ----------
  const TODAY = new Date(2026, 7, 20); // Aug 20, 2026
  TODAY.setHours(0,0,0,0);

  let idCounter = 1;
  function nextId(){ return idCounter++; }

  let events = [
    mk("Fall Science Fair", "Academic", "2026-08-27", "09:00", "Gymnasium", 120, 74,
      "Student projects on display all morning, judging begins at 11."),
    mk("Varsity Soccer vs. Northgate", "Sports", "2026-08-23", "16:00", "East Field", 200, 156,
      "Home opener. Concessions run by the Junior Class."),
    mk("Drama Club Auditions", "Club", "2026-08-24", "15:30", "Room 214", 40, 12,
      "Bring a one-minute monologue, no sign-up needed."),
    mk("PTA General Meeting", "Meeting", "2026-08-26", "18:30", "Library", 60, 22,
      "Agenda: fall fundraiser and cafeteria menu changes."),
    mk("Winter Concert Rehearsal", "Culture", "2026-09-02", "17:00", "Auditorium", 90, 30, ""),
    mk("Robotics Workshop", "Club", "2026-09-05", "14:00", "STEM Lab", 25, 25,
      "Full — waitlist forms available at the front desk."),
    mk("Career Day", "Academic", "2026-09-10", "10:00", "Cafeteria", 300, 88,
      "Local professionals share paths across a dozen industries."),
    mk("Homecoming Pep Rally", "Sports", "2026-09-18", "13:00", "Gymnasium", 500, 210, ""),
    mk("Freshman Orientation", "Meeting", "2026-08-05", "09:00", "Auditorium", 150, 150,
      "Already held — kept here for reference."),
    mk("Art Club Gallery Night", "Culture", "2026-08-12", "18:00", "Room 108", 50, 41, "")
  ];

  function mk(title, category, date, time, location, capacity, reserved, desc){
    return { id: nextId(), title, category, date, time, location, capacity, reserved, desc: desc || "" };
  }

  // ---------- Derived state ----------
  const CATEGORIES = ["Academic","Sports","Culture","Club","Meeting"];
  let activeCategory = "All";
  let searchTerm = "";
  let expandedIds = new Set();

  // ---------- DOM refs ----------
  const upcomingList = document.getElementById('upcomingList');
  const pastList = document.getElementById('pastList');
  const pastLabel = document.getElementById('pastLabel');
  const chipRow = document.getElementById('chipRow');
  const searchInput = document.getElementById('searchInput');
  const overlay = document.getElementById('overlay');
  const eventForm = document.getElementById('eventForm');
  const toast = document.getElementById('toast');

  document.getElementById('todayDate').textContent = TODAY.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });

  // ---------- Chips ----------
  function renderChips(){
    const all = ["All", ...CATEGORIES];
    chipRow.innerHTML = all.map(c =>
      `<button class="chip ${c===activeCategory?'active':''}" data-cat="${c}">${c}</button>`
    ).join('');
  }
  chipRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if(!btn) return;
    activeCategory = btn.dataset.cat;
    renderChips();
    render();
  });

  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    render();
  });

  // ---------- Helpers ----------
  function parseDate(ev){ 
    const [y,m,d] = ev.date.split('-').map(Number);
    return new Date(y, m-1, d);
  }
  function fmtMonth(d){ return d.toLocaleDateString('en-US', { month:'short' }).toUpperCase(); }
  function fmtTime(t){
    const [h,m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h+11)%12)+1;
    return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
  }
  function matchesFilter(ev){
    if(activeCategory !== "All" && ev.category !== activeCategory) return false;
    if(searchTerm){
      const hay = (ev.title + " " + ev.location + " " + ev.desc).toLowerCase();
      if(!hay.includes(searchTerm)) return false;
    }
    return true;
  }

  function eventRowHTML(ev, isPast){
    const d = parseDate(ev);
    const full = ev.reserved >= ev.capacity;
    const expanded = expandedIds.has(ev.id);
    return `
    <div class="event-row ${isPast?'past':''} ${expanded?'expanded':''}" data-id="${ev.id}">
      <div class="stamp-date">
        <div class="mon">${fmtMonth(d)}</div>
        <div class="day">${d.getDate()}</div>
      </div>
      <div class="event-body">
        <h4>${escapeHTML(ev.title)}</h4>
        <div class="event-meta">
          <span>🕐 ${fmtTime(ev.time)}</span>
          <span>📍 ${escapeHTML(ev.location)}</span>
        </div>
        <span class="tag ${ev.category}">${ev.category}</span>
        ${ev.desc ? `<p class="event-desc">${escapeHTML(ev.desc)}</p>` : ''}
      </div>
      <div class="event-actions">
        <div class="capacity ${full?'full':''}">${ev.reserved}/${ev.capacity} seats${full?'\nFULL':''}</div>
        ${!isPast ? `<button class="btn small ${full?'ghost':''}" data-action="rsvp" ${full?'disabled':''}>${full?'Full':'Reserve'}</button>` : ''}
        <button class="btn small ghost" data-action="expand">${expanded?'Hide':'Details'}</button>
        <button class="btn small danger" data-action="delete" aria-label="Delete event">✕</button>
      </div>
    </div>`;
  }

  function escapeHTML(s){
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ---------- Render ----------
  function render(){
    const filtered = events.filter(matchesFilter);
    const upcoming = filtered.filter(ev => parseDate(ev) >= TODAY).sort((a,b)=>parseDate(a)-parseDate(b));
    const past = filtered.filter(ev => parseDate(ev) < TODAY).sort((a,b)=>parseDate(b)-parseDate(a));

    document.getElementById('upcomingCount').textContent = `${upcoming.length} event${upcoming.length!==1?'s':''}`;
    upcomingList.innerHTML = upcoming.length
      ? upcoming.map(ev => eventRowHTML(ev,false)).join('')
      : `<div class="empty"><div class="display">Nothing on the register.</div><p>Try a different category or add a new event.</p></div>`;

    if(past.length){
      pastLabel.style.display = 'flex';
      document.getElementById('pastCount').textContent = `${past.length} event${past.length!==1?'s':''}`;
      pastList.innerHTML = past.map(ev => eventRowHTML(ev,true)).join('');
    } else {
      pastLabel.style.display = 'none';
      pastList.innerHTML = '';
    }

    // stats (unfiltered, all upcoming)
    const allUpcoming = events.filter(ev => parseDate(ev) >= TODAY);
    document.getElementById('statUpcoming').textContent = allUpcoming.length;
    document.getElementById('statSeats').textContent = allUpcoming.reduce((s,ev)=>s+ev.reserved,0);
    document.getElementById('statCategories').textContent = new Set(allUpcoming.map(ev=>ev.category)).size;
  }

  function showToast(msg){
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=>toast.classList.remove('show'), 2200);
  }

  // ---------- Row actions (delegated) ----------
  function handleRowClick(e){
    const row = e.target.closest('.event-row');
    if(!row) return;
    const id = Number(row.dataset.id);
    const action = e.target.closest('[data-action]')?.dataset.action;
    if(!action) return;
    const ev = events.find(x => x.id === id);
    if(!ev) return;

    if(action === 'rsvp'){
      if(ev.reserved < ev.capacity){
        ev.reserved++;
        showToast(`Seat reserved for “${ev.title}”.`);
        render();
      }
    } else if(action === 'expand'){
      if(expandedIds.has(id)) expandedIds.delete(id); else expandedIds.add(id);
      render();
    } else if(action === 'delete'){
      if(confirm(`Remove “${ev.title}” from the register?`)){
        events = events.filter(x => x.id !== id);
        showToast('Event removed.');
        render();
      }
    }
  }
  upcomingList.addEventListener('click', handleRowClick);
  pastList.addEventListener('click', handleRowClick);

  // ---------- Modal ----------
  function openModal(){
    overlay.classList.add('show');
    document.getElementById('f-title').focus();
  }
  function closeModal(){
    overlay.classList.remove('show');
    eventForm.reset();
  }
  document.getElementById('openAdd').addEventListener('click', openModal);
  document.getElementById('closeAdd').addEventListener('click', closeModal);
  document.getElementById('cancelAdd').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if(e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && overlay.classList.contains('show')) closeModal(); });

  eventForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('f-title').value.trim();
    const date = document.getElementById('f-date').value;
    const time = document.getElementById('f-time').value;
    const category = document.getElementById('f-category').value;
    const capacity = Math.max(1, parseInt(document.getElementById('f-capacity').value, 10) || 1);
    const location = document.getElementById('f-location').value.trim();
    const desc = document.getElementById('f-desc').value.trim();

    if(!title || !date || !time || !location) return;

    events.push({ id: nextId(), title, category, date, time, location, capacity, reserved:0, desc });
    closeModal();
    activeCategory = "All";
    searchTerm = "";
    searchInput.value = "";
    renderChips();
    showToast(`“${title}” added to the register.`);
    render();
  });

  // ---------- Init ----------
  renderChips();
  render();
})();