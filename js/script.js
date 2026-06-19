const WPP_NUM = '5511993749189';
let isLoggedIn = false;
let currentDetail = null;
let cacheOrcamentos = [];
let cacheAgendamentos = [];
let cacheFeedbacks = [];
let csrfToken = '';

function openWpp(msg){
  const url = 'https://wa.me/'+WPP_NUM+'?text='+encodeURIComponent(msg);
  window.open(url,'_blank');
}
function openClientWpp(phone,msg){
  const cleanPhone = String(phone || '').replace(/\D/g, '');

  if(!cleanPhone){
    toast('Telefone do cliente não encontrado.', true);
    return;
  }

  const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
  const url = 'https://wa.me/' + finalPhone + '?text=' + encodeURIComponent(msg);

  window.open(url, '_blank');
}
function toast(msg,err){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.style.borderLeftColor=err?'#E24B4A':'#1D9E75';
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3500);
}
function limparFormulariosPublicos(){

  // Limpa campos do orçamento
  const camposOrcamento = [
    'orc-nome',
    'orc-wpp',
    'orc-carro',
    'orc-ano',
    'orc-problema'
  ];
  camposOrcamento.forEach(id => {
    const campo = document.getElementById(id);
    if(campo){
      campo.value = '';
      campo.classList.remove('input-error');
    }
  });

  // Limpa selects do orçamento
  const selectsOrcamento = [
    'orc-servico',
    'orc-horario',
    'orc-midia'
  ];
  selectsOrcamento.forEach(id => {
    const select = document.getElementById(id);
    if(select){
      select.selectedIndex = 0;
      select.classList.remove('input-error');
    }
  });

  // Limpa campos do agendamento
  const camposAgendamento = [
    'ag-nome',
    'ag-tel',
    'ag-carro',
    'ag-problema',
    'ag-data',
    'ag-obs'
  ];
  camposAgendamento.forEach(id => {
    const campo = document.getElementById(id);
    if(campo){
      campo.value = '';
      campo.classList.remove('input-error');
    }
  });

  // Limpa select do agendamento
  resetHorarioSelect();
  clearError('ag-hora');
  const camposFeedback = [
  'fb-nome',
  'fb-cidade',
  'fb-texto'
  ];
  camposFeedback.forEach(id => {
    const campo = document.getElementById(id);

    if(campo){
      campo.value = '';
      campo.classList.remove('input-error');
    }
  });
  const fbNota = document.getElementById('fb-nota');
  if(fbNota){
    fbNota.selectedIndex = 0;
    fbNota.classList.remove('input-error');
  }
}
function goTo(page){
  limparFormulariosPublicos();
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>{
    if(b.textContent.toLowerCase().includes(page.slice(0,4))){
      b.classList.add('active');
    }
  });
  if(page==='admin'){
    checkAdminSession();
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

// STORAGE helpers (sanitize inputs)
function sanitize(s){
  return String(s||'').replace(/[<>]/g,'').trim().slice(0,300)
}
function escapeHTML(value){
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function formatDateBR(value){
  if(!value)return '';
  const datePart = String(value).split(' ')[0];
  if(/^\d{4}-\d{2}-\d{2}$/.test(datePart)){
    const [year,month,day]=datePart.split('-');
    return `${day}/${month}/${year}`;
  }
  return String(value);
}

async function apiRequest(url, options={}){
  const method = String(options.method || 'GET').toUpperCase();
  const headers = {
    ...(options.body ? {'Content-Type':'application/json'} : {}),
    ...(options.headers || {})
  };

  if(csrfToken && ['PATCH','DELETE'].includes(method)){
    headers['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch(url,{
    credentials:'same-origin',
    ...options,
    headers
  });
  const data = await response.json().catch(()=>({success:false,message:'Resposta inválida da API.'}));
  if(!response.ok || data.success === false){
    throw new Error(data.message || 'Não foi possível processar a solicitação.');
  }
  return data;
}

async function getOrcamentos(status=''){
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await apiRequest(`api/orcamentos.php${qs}`);
  cacheOrcamentos = response.data || [];
  return cacheOrcamentos;
}

async function getAgendamentos(status=''){
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await apiRequest(`api/agendamentos.php${qs}`);
  cacheAgendamentos = response.data || [];
  return cacheAgendamentos;
}

function saveOrcamentos(d){
  cacheOrcamentos = Array.isArray(d) ? d : cacheOrcamentos;
}
function saveAgendamentos(d){
  cacheAgendamentos = Array.isArray(d) ? d : cacheAgendamentos;
}
async function getFeedbacks(){
  const response = await apiRequest('api/feedbacks.php');
  return response.data || [];
}

async function getAdminFeedbacks(status=''){
  const qs = status ? `&status=${encodeURIComponent(status)}` : '';
  const response = await apiRequest(`api/feedbacks.php?admin=1${qs}`);
  cacheFeedbacks = response.data || [];
  return cacheFeedbacks;
}

// VALIDAÇÕES
function markError(id){
  const el = document.getElementById(id);
  if(el){
    el.classList.add('input-error');
  }
}
function clearError(id){
  const el = document.getElementById(id);
  if(el){
    el.classList.remove('input-error');
  }
}
function clearErrors(ids){
  ids.forEach(id => clearError(id));
}
function validatePhone(p){
  const nums = p.replace(/\D/g, '');

  if(nums.length !== 10 && nums.length !== 11){
    return false;
  }

  if(nums.slice(0, 2) === '00'){
    return false;
  }

  return !/^(\d)\1+$/.test(nums);
}
function maskPhone(value){
  value = value.replace(/\D/g, '');

  if(value.length > 11){
    value = value.slice(0, 11);
  }

  if(value.length <= 10){
    return value
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return value
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}
function validateYear(y){
  const n=parseInt(y);return n>=1950&&n<=new Date().getFullYear()+2
}
function resetHorarioSelect(message = 'Selecione uma data primeiro'){
  const agHora = document.getElementById('ag-hora');

  if(!agHora){
    return;
  }

  agHora.innerHTML = `<option value="" disabled selected hidden>${message}</option>`;
  agHora.disabled = true;
}
async function carregarHorariosDisponiveis(){
  const agData = document.getElementById('ag-data');
  const agHora = document.getElementById('ag-hora');

  if(!agData || !agHora){
    return;
  }

  const data = agData.value;
  clearError('ag-data');
  clearError('ag-hora');

  if(!data){
    resetHorarioSelect();
    return;
  }

  agHora.disabled = true;
  agHora.innerHTML = '<option value="" disabled selected hidden>Carregando horários...</option>';

  try{
    const response = await apiRequest(`api/horarios_disponiveis.php?data=${encodeURIComponent(data)}`);
    const horarios = response.data?.horarios || [];

    if(!horarios.length){
      resetHorarioSelect('Nenhum horário disponível');
      if(response.message){
        toast(response.message, true);
      }
      return;
    }

    agHora.innerHTML = '<option value="" disabled selected hidden>Selecione um horário</option>' +
      horarios.map(h => `<option value="${escapeHTML(h)}">${escapeHTML(h)}</option>`).join('');
    agHora.disabled = false;
  }catch(error){
    resetHorarioSelect('Nenhum horário disponível');
    toast(error.message || 'Erro ao carregar horários disponíveis', true);
  }
}
async function submitOrcamento(){
  const nome=sanitize(document.getElementById('orc-nome').value);
  const wpp=sanitize(document.getElementById('orc-wpp').value);
  const carro=sanitize(document.getElementById('orc-carro').value);
  const ano=sanitize(document.getElementById('orc-ano').value);
  const problema=sanitize(document.getElementById('orc-problema').value);
  const servico=sanitize(document.getElementById('orc-servico').value);
  const horario=sanitize(document.getElementById('orc-horario').value);
  const midia=sanitize(document.getElementById('orc-midia').value);
  clearErrors(['orc-nome','orc-wpp','orc-carro','orc-ano','orc-problema','orc-servico']);

  let hasError = false;
  if(!nome){
    markError('orc-nome');
    hasError = true;
  }
  if(!wpp){
    markError('orc-wpp');
    hasError = true;
  }
  if(!carro){
    markError('orc-carro');
    hasError = true;
  }
  if(!problema){
    markError('orc-problema');
    hasError = true;
  }
  if(!servico){
    markError('orc-servico');
    hasError = true;
  }
  if(wpp && !validatePhone(wpp)){
    markError('orc-wpp');
    toast('WhatsApp inválido', true);
    return;
  }
  if(ano && !validateYear(ano)){
    markError('orc-ano');
    toast('Ano do veículo inválido', true);
    return;
  }
  if(hasError){
    toast('Preencha todos os campos obrigatórios', true);
    return;
  }
  try{
    await apiRequest('api/orcamentos.php',{
      method:'POST',
      body:JSON.stringify({nome,wpp,carro,ano,problema,servico,horario,midia})
    });
  }catch(error){
    toast(error.message || 'Erro ao enviar solicitação', true);
    return;
  }
  toast('Solicitação enviada! Retornaremos pelo WhatsApp em até 2h.');
  ['orc-nome','orc-wpp','orc-carro','orc-ano','orc-problema'].forEach(id=>document.getElementById(id).value='');
  ['orc-servico','orc-horario','orc-midia'].forEach(id=>document.getElementById(id).selectedIndex=0);
  const msg=`Olá ${nome}! Recebemos sua solicitação de orçamento para o veículo ${carro}${ano?' ('+ano+')':''}. Para avaliar melhor, envie fotos ou vídeos do problema pelo WhatsApp. Em breve entraremos em contato!`;
  setTimeout(()=>{if(confirm('Deseja abrir o WhatsApp para confirmar sua solicitação?'))openWpp(msg)},400);
}

async function submitAgendamento(){
  const nome=sanitize(document.getElementById('ag-nome').value);
  const tel=sanitize(document.getElementById('ag-tel').value);
  const carro=sanitize(document.getElementById('ag-carro').value);
  const problema=sanitize(document.getElementById('ag-problema').value);
  const data=document.getElementById('ag-data').value;
  const hora=sanitize(document.getElementById('ag-hora').value);
  const obs=sanitize(document.getElementById('ag-obs').value);
  clearErrors(['ag-nome','ag-tel','ag-carro','ag-data','ag-hora']);

  let hasError = false;
  if(!nome){
    markError('ag-nome');
    hasError = true;
  }
  if(!tel){
    markError('ag-tel');
    hasError = true;
  }
  if(!carro){
    markError('ag-carro');
    hasError = true;
  }
  if(!data){
    markError('ag-data');
    hasError = true;
  }
  if(!hora){
    markError('ag-hora');
    hasError = true;
  }
  if(tel && !validatePhone(tel)){
    markError('ag-tel');
    toast('Telefone inválido', true);
    return;
  }
  if(hasError){
    toast('Preencha todos os campos obrigatórios', true);
    return;
  }
  const dataObj=new Date(data+'T12:00:00');
  const dataFmt=dataObj.toLocaleDateString('pt-BR');
  try{
    await apiRequest('api/agendamentos.php',{
      method:'POST',
      body:JSON.stringify({
        nome,
        tel,
        carro,
        problema,
        data_agendamento:data,
        hora_agendamento:hora,
        obs
      })
    });
  }catch(error){
    toast(error.message || 'Erro ao registrar agendamento', true);
    return;
  }
  toast('Pré-agendamento registrado! O dono confirmará pelo WhatsApp.');
  ['ag-nome','ag-tel','ag-carro','ag-problema','ag-obs'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('ag-data').value='';
  resetHorarioSelect();
  const msg=`Olá ${nome}! Seu horário de avaliação ficou pré-agendado para ${dataFmt} às ${hora}. Confirma pra mim se consegue comparecer? — DS Special Eletric`;
  setTimeout(()=>{if(confirm('Deseja abrir o WhatsApp para confirmar o agendamento?'))openWpp(msg)},400);
}
async function submitFeedback(){
  const nome = sanitize(document.getElementById('fb-nome')?.value);
  const cidade = sanitize(document.getElementById('fb-cidade')?.value);
  const nota = sanitize(document.getElementById('fb-nota')?.value);
  const texto = sanitize(document.getElementById('fb-texto')?.value);
  clearErrors(['fb-nome','fb-cidade','fb-nota','fb-texto']);
  let hasError = false;
  if(!nome){
    markError('fb-nome');
    hasError = true;
  }
  if(!cidade){
    markError('fb-cidade');
    hasError = true;
  }
  if(!nota){
    markError('fb-nota');
    hasError = true;
  }
  if(!texto){
    markError('fb-texto');
    hasError = true;
  }
  if(hasError){
    toast('Preencha todos os campos obrigatórios', true);
    return;
  }
  try{
    await apiRequest('api/feedbacks.php',{
      method:'POST',
      body:JSON.stringify({nome,cidade,nota,texto})
    });
  }catch(error){
    toast(error.message || 'Erro ao enviar feedback', true);
    return;
  }
  toast('Feedback enviado! Ele será analisado antes de aparecer no site.');
  document.getElementById('fb-nome').value = '';
  document.getElementById('fb-cidade').value = '';
  document.getElementById('fb-nota').selectedIndex = 0;
  document.getElementById('fb-texto').value = '';
  setTimeout(() => {
    goTo('home');
  }, 800);
}

// ADMIN
function doLogin(){
  const userInput=document.getElementById('admin-user');
  const passInput=document.getElementById('admin-pass');
  const err=document.getElementById('login-err');
  const usuario=userInput?userInput.value.trim():'';
  const senha=passInput?passInput.value:'';

  if(err)err.style.display='none';

  fetch('api/login.php',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    credentials:'same-origin',
    body:JSON.stringify({usuario,senha})
  })
  .then(r=>r.json().then(data=>({ok:r.ok,data})))
  .then(({ok,data})=>{
    if(!ok || !data.success)throw new Error(data.message||'Login inválido');
    isLoggedIn=true;
    csrfToken=data.csrfToken || '';
    document.getElementById('admin-login').style.display='none';
    document.getElementById('admin-panel').style.display='block';
    renderAdmin();
  })
  .catch(()=>{
    if(err)err.style.display='block';
    if(passInput)passInput.value='';
  });
}
function doLogout(){
  fetch('api/logout.php',{
    method:'POST',
    credentials:'same-origin',
    headers:csrfToken ? {'X-CSRF-Token':csrfToken} : {}
  }).finally(()=>{
    isLoggedIn=false;
    csrfToken='';
    document.getElementById('admin-login').style.display='block';
    document.getElementById('admin-panel').style.display='none';
    const userInput=document.getElementById('admin-user');
    const passInput=document.getElementById('admin-pass');
    const err=document.getElementById('login-err');
    if(userInput)userInput.value='';
    if(passInput)passInput.value='';
    if(err)err.style.display='none';
  });
}
function checkAdminSession(){
  const loginBox=document.getElementById('admin-login');
  const panel=document.getElementById('admin-panel');

  if(!loginBox || !panel)return;

  fetch('api/me.php',{credentials:'same-origin'})
  .then(r=>r.json())
  .then(data=>{
    isLoggedIn=!!data.loggedIn;
    csrfToken=data.csrfToken || '';
    loginBox.style.display=isLoggedIn?'none':'block';
    panel.style.display=isLoggedIn?'block':'none';
    if(isLoggedIn)renderAdmin();
  })
  .catch(()=>{
    isLoggedIn=false;
    csrfToken='';
    loginBox.style.display='block';
    panel.style.display='none';
  });
}
function renderAdmin(){
  if(!isLoggedIn)return;
  renderDashboard();renderOrcamentos();renderAgendamentos();renderAdminFeedbacks();
}
function switchTab(t){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById('tab-'+t).classList.add('active');
  event.target.classList.add('active');
}
function badgeHtml(s){
  const status = String(s || '').toLowerCase().trim();
  const map = {
    'novo': 'badge-novo',
    'respondido': 'badge-respondido',
    'aguardando cliente': 'badge-aguardando',
    'fechado': 'badge-fechado',
    'perdido': 'badge-perdido',
    'pendente': 'badge-aguardando',
    'aprovado': 'badge-fechado',
    'reprovado': 'badge-perdido'
  };
  const labels = {
    'novo': 'Novo',
    'respondido': 'Respondido',
    'aguardando cliente': 'Aguardando Cliente',
    'fechado': 'Fechado',
    'perdido': 'Perdido',
    'pendente': 'Pendente',
    'aprovado': 'Aprovado',
    'reprovado': 'Reprovado'
  };
  return `<span class="badge ${map[status] || 'badge-novo'}">${labels[status] || s}</span>`;
}
function limparFiltrosDashboard(){
  const tipo = document.getElementById('recent-type-filter');
  const status = document.getElementById('recent-status-filter');
  if(tipo){
    tipo.value = '';
  }
  if(status){
    status.value = '';
  }
  renderDashboard();
}
async function renderDashboard(){
  try{
    const response = await apiRequest('api/dashboard.php');
    const dashboard = response.data || {};
    const todayLabel = document.getElementById('dashboard-today-label');

    if(todayLabel){
      todayLabel.textContent = new Date().toLocaleDateString('pt-BR', {weekday:'short', day:'2-digit', month:'2-digit'});
    }

    const metrics = [
      {
        icon:'fa-file-invoice-dollar',
        chip:'Total',
        value:dashboard.total_orcamentos || 0,
        label:'Total Orçamentos',
        sub:'Solicitações recebidas pelo site'
      },
      {
        icon:'fa-calendar-check',
        chip:'Agenda',
        value:dashboard.total_agendamentos || 0,
        label:'Agendamentos',
        sub:'Pré-agendamentos registrados'
      },
      {
        icon:'fa-bell',
        chip:'Agora',
        value:dashboard.total_novos || 0,
        label:'Novos / Pendentes',
        sub:'Itens que precisam de resposta'
      },
      {
        icon:'fa-circle-check',
        chip:'Fechado',
        value:dashboard.total_fechados || 0,
        label:'Fechados',
        sub:'Atendimentos concluídos'
      },
      {
        icon:'fa-star-half-stroke',
        chip:'Feedback',
        value:dashboard.feedbacks_pendentes || 0,
        label:'Feedbacks Pendentes',
        sub:'Avaliações aguardando aprovação'
      }
    ];

    document.getElementById('stats-grid').innerHTML = metrics.map(metric => `
      <div class="metric-card">
        <div class="metric-top">
          <div class="metric-icon"><i class="fa-solid ${metric.icon}"></i></div>
          <span class="metric-chip">${metric.chip}</span>
        </div>
        <div class="metric-value">${metric.value}</div>
        <div class="metric-label">${metric.label}</div>
        <div class="metric-sub">${metric.sub}</div>
      </div>
    `).join('');

    const statuses = [
      {key:'novo', label:'Novo', value:dashboard.status_novo || 0},
      {key:'respondido', label:'Respondido', value:dashboard.status_respondido || 0},
      {key:'aguardando', label:'Aguardando Cliente', value:dashboard.status_aguardando || 0},
      {key:'fechado', label:'Fechado', value:dashboard.status_fechado || 0},
      {key:'perdido', label:'Perdido', value:dashboard.status_perdido || 0}
    ];
    const maxStatus = Math.max(...statuses.map(item => item.value), 0);
    const pipeline = document.getElementById('status-pipeline');

    if(pipeline){
      pipeline.innerHTML = statuses.map(item => {
        const width = maxStatus > 0 ? Math.round((item.value / maxStatus) * 100) : 0;
        return `
          <div class="pipeline-item pipeline-${item.key}">
            <div class="pipeline-row">
              <span>${item.label}</span>
              <strong>${item.value}</strong>
            </div>
            <div class="pipeline-bar"><span style="width:${width}%"></span></div>
          </div>
        `;
      }).join('');
    }

    const quickActions = document.getElementById('quick-actions-list');
    if(quickActions){
      quickActions.innerHTML = `
        <div class="quick-action-card">
          <div class="quick-action-icon"><i class="fa-solid fa-bell"></i></div>
          <div>
            <strong>${dashboard.total_novos || 0} solicitações novas</strong>
            <span>Responda para não perder clientes.</span>
          </div>
        </div>
        <div class="quick-action-card">
          <div class="quick-action-icon"><i class="fa-solid fa-comment-dots"></i></div>
          <div>
            <strong>${dashboard.feedbacks_pendentes || 0} feedbacks pendentes</strong>
            <span>Aprove avaliações para aparecerem no site.</span>
          </div>
        </div>
        <div class="quick-action-card">
          <div class="quick-action-icon"><i class="fa-solid fa-calendar-day"></i></div>
          <div>
            <strong>${dashboard.agendamentos_hoje || 0} agendamentos hoje</strong>
            <span>Confira os horários do dia.</span>
          </div>
        </div>
      `;
    }

    const tipoFiltro = document.getElementById('recent-type-filter')?.value || '';
    const statusFiltro = document.getElementById('recent-status-filter')?.value.toLowerCase().trim() || '';
    let recent = dashboard.ultimas_solicitacoes || [];

    if(tipoFiltro){
      recent = recent.filter(r => r.tipo === tipoFiltro);
    }

    if(statusFiltro){
      recent = recent.filter(r => String(r.status || '').toLowerCase().trim() === statusFiltro);
    }

    if(!recent.length){
      document.getElementById('recent-list').innerHTML = `
        <div class="empty-state dashboard-empty">
          <div class="empty-icon"><i class="fa-solid fa-inbox"></i></div>
          <div class="empty-text">Nenhuma solicitação encontrada.</div>
        </div>
      `;
      return;
    }

    document.getElementById('recent-list').innerHTML = `
      <div class="recent-cards-list">
        ${recent.map(r => {
          const isNovo = String(r.status || '').toLowerCase().trim() === 'novo';
          const tipoLabel = r.tipo === 'orcamento' ? 'Orçamento' : 'Agendamento';
          const icon = r.tipo === 'orcamento' ? 'fa-file-invoice-dollar' : 'fa-calendar-check';
          return `
            <div class="recent-card ${isNovo ? 'is-new' : ''}">
              <div class="recent-icon"><i class="fa-solid ${icon}"></i></div>
              <div class="recent-info">
                <div class="recent-meta">
                  <span>${tipoLabel}</span>
                  <span>${escapeHTML(formatDateBR(r.criado_em || r.criado))}</span>
                </div>
                <strong>${escapeHTML(r.nome)}</strong>
                <p>${escapeHTML(r.carro || '')}</p>
              </div>
              <div class="recent-status">${badgeHtml(r.status)}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }catch(error){
    toast(error.message || 'Erro ao carregar dashboard', true);
  }
}
function limparFiltroOrcamentos(){
  const filtro = document.getElementById('orc-filter');
  if(filtro){
    filtro.value = '';
  }
  renderOrcamentos();
}
async function renderOrcamentos(){
  try{
    const filter = document.getElementById('orc-filter')?.value.toLowerCase().trim() || '';
    const orcs = await getOrcamentos(filter);
    if(!orcs.length){
      document.getElementById('orc-table-wrap').innerHTML='<div class="empty-state"><div class="empty-icon">i</div><div class="empty-text">Nenhum orçamento encontrado</div></div>';return
    }
    document.getElementById('orc-table-wrap').innerHTML=`
    <table class="data-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Veículo</th>
          <th>Serviço</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${orcs.map(o=>`
          <tr>
            <td>${escapeHTML(o.nome)}</td>
            <td>${escapeHTML(o.carro)}${o.ano?' ('+escapeHTML(o.ano)+')':''}</td>
            <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(o.servico)}</td>
            <td>${badgeHtml(o.status)}</td>
            <td style="display:flex;gap:4px;flex-wrap:wrap">
              <button class="action-btn" onclick="openDetail('orcamento',${o.id})">Ver</button>
              <button class="action-btn wpp" onclick="wppOrcamento(${o.id})">WPP</button>
              <button class="action-btn delete" onclick="deleteOrcamento(${o.id})">Excluir</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  }catch(error){
    toast(error.message || 'Erro ao carregar orçamentos', true);
  }
}
async function renderAgendamentos(){
  try{
    const ags=await getAgendamentos();
    if(!ags.length){
      document.getElementById('ag-table-wrap').innerHTML='<div class="empty-state"><div class="empty-icon">i</div><div class="empty-text">Nenhum agendamento ainda</div></div>';return
    }
    document.getElementById('ag-table-wrap').innerHTML=`
    <table class="data-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Veículo</th>
          <th>Data</th>
          <th>Hora</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${ags.map(a=>`
          <tr>
            <td>${escapeHTML(a.nome)}</td>
            <td>${escapeHTML(a.carro)}</td>
            <td>${escapeHTML(formatDateBR(a.data_agendamento || a.data))}</td>
            <td>${escapeHTML(a.hora || a.hora_agendamento || '')}</td>
            <td>${badgeHtml(a.status)}</td>
            <td style="display:flex;gap:4px;flex-wrap:wrap">
              <button class="action-btn" onclick="openDetail('agendamento',${a.id})">Ver</button>
              <button class="action-btn wpp" onclick="wppAgendamento(${a.id})">WPP</button>
              <button class="action-btn delete" onclick="deleteAgendamento(${a.id})">Excluir</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
  }catch(error){
    toast(error.message || 'Erro ao carregar agendamentos', true);
  }
}
async function renderFeedbacks(){
  const container = document.getElementById('feedback-list');
  if(!container){
    return;
  }
  let feedbacks = [];
  try{
    feedbacks = await getFeedbacks();
  }catch{
    return;
  }
  if(!feedbacks.length){
    return;
  }
  const ultimos = feedbacks.slice(0, 3).map(fb => ({
    ...fb,
    nome: escapeHTML(fb.nome),
    cidade: escapeHTML(fb.cidade),
    texto: escapeHTML(fb.texto)
  }));
  container.innerHTML = ultimos.map(fb => {
    const estrelas = '★'.repeat(fb.nota) + '☆'.repeat(5 - fb.nota);
    return `
      <div class="dep-card">
        <div class="dep-stars">${estrelas}</div>
        <p class="dep-text">"${fb.texto}"</p>
        <span class="dep-author">— ${fb.nome}, ${fb.cidade}</span>
      </div>
    `;
  }).join('');
}
function limparFiltroFeedbacks(){
  const filtro = document.getElementById('fb-filter');
  if(filtro){
    filtro.value = '';
  }
  renderAdminFeedbacks();
}
async function renderAdminFeedbacks(){
  const wrap = document.getElementById('feedback-table-wrap');
  if(!wrap || !isLoggedIn){
    return;
  }
  try{
    const filter = document.getElementById('fb-filter')?.value || '';
    const feedbacks = await getAdminFeedbacks(filter);
    if(!feedbacks.length){
      wrap.innerHTML='<div class="empty-state"><div class="empty-icon">☆</div><div class="empty-text">Nenhum feedback encontrado</div></div>';
      return;
    }
    wrap.innerHTML=`
      <table class="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Cidade</th>
            <th>Nota</th>
            <th>Comentário</th>
            <th>Status</th>
            <th>Data</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${feedbacks.map(fb=>`
            <tr>
              <td>${escapeHTML(fb.nome)}</td>
              <td>${escapeHTML(fb.cidade)}</td>
              <td>${escapeHTML(fb.nota)}</td>
              <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(fb.texto)}</td>
              <td>${badgeHtml(fb.status)}</td>
              <td>${escapeHTML(formatDateBR(fb.criado_em || fb.criado))}</td>
              <td style="display:flex;gap:4px;flex-wrap:wrap">
                <button class="action-btn" onclick="aprovarFeedback(${fb.id})">Aprovar</button>
                <button class="action-btn" onclick="reprovarFeedback(${fb.id})">Reprovar</button>
                <button class="action-btn delete" onclick="deleteFeedback(${fb.id})">Excluir</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }catch(error){
    toast(error.message || 'Erro ao carregar feedbacks', true);
  }
}
async function atualizarStatusFeedback(id,status){
  try{
    await apiRequest(`api/feedbacks.php?id=${encodeURIComponent(id)}`,{
      method:'PATCH',
      body:JSON.stringify({status})
    });
    toast('Feedback atualizado!');
    renderAdminFeedbacks();
    renderDashboard();
    renderFeedbacks();
  }catch(error){
    toast(error.message || 'Erro ao atualizar feedback', true);
  }
}
function aprovarFeedback(id){
  atualizarStatusFeedback(id,'aprovado');
}
function reprovarFeedback(id){
  atualizarStatusFeedback(id,'reprovado');
}
async function deleteFeedback(id){
  if(!confirm('Tem certeza que deseja excluir este feedback?')) return;
  try{
    await apiRequest(`api/feedbacks.php?id=${encodeURIComponent(id)}`,{method:'DELETE'});
    toast('Feedback excluído!');
    renderAdminFeedbacks();
    renderDashboard();
    renderFeedbacks();
  }catch(error){
    toast(error.message || 'Erro ao excluir feedback', true);
  }
}
function openDetail(tipo,id){
  const list=tipo==='orcamento'?cacheOrcamentos:cacheAgendamentos;
  let item=list.find(i=>Number(i.id)===Number(id));if(!item)return;
  item = Object.fromEntries(Object.entries(item).map(([key,value]) => [key, escapeHTML(value)]));
  currentDetail={tipo,id};
  const statusOpts = [
  {value:'novo', label:'Novo'},
  {value:'respondido', label:'Respondido'},
  {value:'aguardando cliente', label:'Aguardando Cliente'},
  {value:'fechado', label:'Fechado'},
  {value:'perdido', label:'Perdido'}
].map(s => {
  const itemStatus = String(item.status || '').toLowerCase().trim();
  return `<option value="${s.value}"${itemStatus === s.value ? ' selected' : ''}>${s.label}</option>`;}).join('');
  let rows='';
  if(tipo==='orcamento'){
    rows=`<div class="modal-row"><span class="modal-key">Nome</span><span class="modal-val">${item.nome}</span></div>
    <div class="modal-row"><span class="modal-key">WhatsApp</span><span class="modal-val">${item.wpp}</span></div>
    <div class="modal-row"><span class="modal-key">Veículo</span><span class="modal-val">${item.carro}${item.ano?' — '+item.ano:''}</span></div>
    <div class="modal-row"><span class="modal-key">Serviço</span><span class="modal-val">${item.servico}</span></div>
    <div class="modal-row"><span class="modal-key">Problema</span><span class="modal-val">${item.problema}</span></div>
    <div class="modal-row"><span class="modal-key">Melhor horário</span><span class="modal-val">${item.horario||'—'}</span></div>
    <div class="modal-row"><span class="modal-key">Mídia</span><span class="modal-val">${item.midia||'—'}</span></div>
    <div class="modal-row"><span class="modal-key">Recebido em</span><span class="modal-val">${item.criado}</span></div>`;
  } else {
    rows=`<div class="modal-row"><span class="modal-key">Nome</span><span class="modal-val">${item.nome}</span></div>
    <div class="modal-row"><span class="modal-key">Telefone</span><span class="modal-val">${item.tel}</span></div>
    <div class="modal-row"><span class="modal-key">Veículo</span><span class="modal-val">${item.carro}</span></div>
    <div class="modal-row"><span class="modal-key">Problema</span><span class="modal-val">${item.problema||'—'}</span></div>
    <div class="modal-row"><span class="modal-key">Data</span><span class="modal-val">${item.data} às ${item.hora}</span></div>
    <div class="modal-row"><span class="modal-key">Observação</span><span class="modal-val">${item.obs||'—'}</span></div>
    <div class="modal-row"><span class="modal-key">Recebido em</span><span class="modal-val">${item.criado}</span></div>`;
  }
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">${tipo==='orcamento'?'Orçamento':'Agendamento'} — ${item.nome}</div>
    ${rows}
    <div style="margin-top:1rem;border-top:1px solid rgba(255,255,255,0.07);padding-top:1rem">
      <label class="form-label" style="margin-bottom:6px;display:block">Alterar Status</label>
      <select class="status-select" id="status-sel">${statusOpts}</select>
    </div>
    <div class="modal-actions">
      <button class="btn-primary" style="flex:1" onclick="saveStatus()">Salvar</button>
      <button class="action-btn wpp" style="padding:10px 16px" onclick="${tipo==='orcamento'?'wppOrcamento('+id+')':'wppAgendamento('+id+')'}">Abrir WPP</button>
      <button class="btn-secondary" style="flex:1" onclick="closeModal()">Fechar</button>
    </div>`;
  document.getElementById('detail-modal').classList.add('open');
}
async function saveStatus(){
  if(!currentDetail)return;
  const s=document.getElementById('status-sel').value.toLowerCase().trim();
  const {tipo,id}=currentDetail;
  const endpoint=tipo==='orcamento'?'api/orcamentos.php':'api/agendamentos.php';
  try{
    await apiRequest(`${endpoint}?id=${encodeURIComponent(id)}`,{
      method:'PATCH',
      body:JSON.stringify({status:s})
    });
    toast('Status atualizado!');
    closeModal();renderAdmin();
  }catch(error){
    toast(error.message || 'Erro ao atualizar status', true);
  }
}
function closeModal(){document.getElementById('detail-modal').classList.remove('open');currentDetail=null}
function wppOrcamento(id){
  const item = cacheOrcamentos.find(i => Number(i.id) === Number(id));

  if(!item){
    toast('Orçamento não encontrado.', true);
    return;
  }

  openClientWpp(
    item.wpp,
    `Olá ${item.nome}! Recebi sua solicitação de orçamento para o ${item.carro}. Me envie fotos ou vídeos do problema para eu avaliar melhor. — Daniel, DS Special Eletric`
  );
}
function wppAgendamento(id){
  const item = cacheAgendamentos.find(i => Number(i.id) === Number(id));

  if(!item){
    toast('Agendamento não encontrado.', true);
    return;
  }

  const data = item.data || item.data_agendamento || '';
  const hora = item.hora || item.hora_agendamento || '';

  openClientWpp(
    item.tel,
    `Olá ${item.nome}! Seu horário de avaliação ficou pré-agendado para ${data} às ${hora}. Confirma pra mim se consegue comparecer? — DS Special Eletric`
  );
}
document.getElementById('detail-modal').addEventListener('click',function(e){if(e.target===this)closeModal()});
async function deleteAgendamento(id){
  if(!confirm('Tem certeza que deseja excluir este agendamento?')) return;

  try{
    await apiRequest(`api/agendamentos.php?id=${encodeURIComponent(id)}`,{method:'DELETE'});
  }catch(error){
    toast(error.message || 'Erro ao excluir agendamento', true);
    return;
  }
  toast('Agendamento excluído!');
  renderAdmin();
}
async function deleteOrcamento(id){
  if(!confirm('Tem certeza que deseja excluir este orçamento?')) return;

  try{
    await apiRequest(`api/orcamentos.php?id=${encodeURIComponent(id)}`,{method:'DELETE'});
  }catch(error){
    toast(error.message || 'Erro ao excluir orçamento', true);
    return;
  }
  toast('Orçamento excluído!');
  renderAdmin();
}
const orcWppInput = document.getElementById('orc-wpp');
if(orcWppInput){
  orcWppInput.addEventListener('input', function(){
    this.value = maskPhone(this.value);
  });
}
[
  'orc-nome',
  'orc-wpp',
  'orc-carro',
  'orc-ano',
  'orc-problema',
  'orc-servico',
  'ag-nome',
  'ag-tel',
  'ag-carro',
  'ag-data',
  'ag-hora',
  'fb-nome',
  'fb-cidade',
  'fb-nota',
  'fb-texto'
].forEach(id => {
  const el = document.getElementById(id);
  if(el){
    el.addEventListener('input', function(){
      clearError(id);
    });

    el.addEventListener('change', function(){
      clearError(id);
    });
  }
});

// Set min date for agendamento
const agTelInput = document.getElementById('ag-tel');
if(agTelInput){
  agTelInput.addEventListener('input', function(){
    this.value = maskPhone(this.value);
  });
}
const today=new Date().toISOString().split('T')[0];
const agData = document.getElementById('ag-data');
if(agData){
  agData.min = today;
  agData.addEventListener('change', carregarHorariosDisponiveis);
}
resetHorarioSelect();
renderFeedbacks();
checkAdminSession();

function openVideoModal(videoUrl) {
  const modal = document.getElementById('video-modal');
  const frame = document.getElementById('video-frame');

  if (!modal || !frame) return;

  frame.src = videoUrl;
  modal.classList.add('open');
  document.body.classList.add('modal-open');
}

function closeVideoModal() {
  const modal = document.getElementById('video-modal');
  const frame = document.getElementById('video-frame');

  if (!modal || !frame) return;

  frame.src = '';
  modal.classList.remove('open');
  document.body.classList.remove('modal-open');
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeVideoModal();
  }
});
