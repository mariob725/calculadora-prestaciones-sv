const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fechaLarga = dt => dt.toLocaleDateString('es-SV',{day:'2-digit',month:'long',year:'numeric'});
const r2 = n => Math.round((n+Number.EPSILON)*100)/100; // redondeo a centavos
const fmt = n => '$' + (isFinite(n)?n:0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

function serviceSpan(start,end){
  if(end<start) return null;
  let years=end.getFullYear()-start.getFullYear();
  let months=end.getMonth()-start.getMonth();
  let days=end.getDate()-start.getDate();
  if(days<0){months-=1; days+=new Date(end.getFullYear(),end.getMonth(),0).getDate();}
  if(months<0){years-=1; months+=12;}
  const totalDays=Math.round((end-start)/86400000);
  return {years,months,days,totalDays,fraction:(months*30+days)/360};
}
function aguinaldoDias(years){ return years>=10?21:years>=3?19:15; }

// ---- Calendario de asuetos (Art. 190 C.T.) ----
// Domingo de Pascua por el algoritmo de Gauss/Anónimo (calendario gregoriano)
function domingoPascua(year){
  const a=year%19, b=Math.floor(year/100), c=year%100, d=Math.floor(b/4), e=b%4;
  const f=Math.floor((b+8)/25), g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7;
  const m=Math.floor((a+11*h+22*l)/451);
  const mes=Math.floor((h+l-7*m+114)/31), dia=((h+l-7*m+114)%31)+1;
  return new Date(year,mes-1,dia);
}
function nationalAsuetos(year, municipio, fechaPatronal){
  const pascua=domingoPascua(year);
  const day=n=>new Date(pascua.getFullYear(),pascua.getMonth(),pascua.getDate()+n);
  const list=[
    {date:new Date(year,0,1), label:'Año Nuevo'},
    {date:day(-3), label:'Jueves Santo'},
    {date:day(-2), label:'Viernes Santo'},
    {date:day(-1), label:'Sábado Santo'},
    {date:new Date(year,4,1), label:'Día del Trabajo'},
    {date:new Date(year,4,10), label:'Día de la Madre'},
    {date:new Date(year,5,17), label:'Día del Padre'},
    {date:new Date(year,7,6), label:'Día del Divino Salvador del Mundo'},
    {date:new Date(year,8,15), label:'Independencia de El Salvador'},
    {date:new Date(year,10,2), label:'Día de los Difuntos'},
    {date:new Date(year,11,25), label:'Navidad'},
  ];
  if(municipio==='SS'){
    list.push({date:new Date(year,7,3), label:'Fiestas patronales de San Salvador'});
    list.push({date:new Date(year,7,5), label:'Fiestas patronales de San Salvador'});
  } else if(municipio==='SM'){
    list.push({date:new Date(year,10,21), label:'Fiestas patronales de San Miguel (Virgen de la Paz)'});
  } else if(municipio==='otro' && fechaPatronal && !isNaN(fechaPatronal)){
    list.push({date:new Date(year,fechaPatronal.getMonth(),fechaPatronal.getDate()), label:'Fiestas patronales de tu municipio'});
  }
  return list.sort((a,b)=>a.date-b.date);
}
let asuetoChecked=new Set();
function refreshAsuetoList(){
  const ing=parseLocal($('ingreso').value), fin=parseLocal($('fin').value);
  const box=$('asuetoBox');
  if(isNaN(ing)||isNaN(fin)||fin<ing){ box.innerHTML='<div class="empty">Completa las fechas de ingreso y finalización para ver los asuetos del año de finalización.</div>'; return; }
  const muni=$('municipio').value, fp=parseLocal($('fechaPatronal').value);
  const finInc=new Date(fin.getFullYear(),fin.getMonth(),fin.getDate()+1);
  const years=new Set([fin.getFullYear()]); // solo asuetos del año de finalización
  let dates=[];
  years.forEach(y=>dates=dates.concat(nationalAsuetos(y,muni,fp)));
  dates=dates.filter(a=>a.date>=ing && a.date<finInc).sort((a,b)=>a.date-b.date);
  if(!dates.length){ box.innerHTML='<div class="empty">No hay fechas de asueto trabajadas dentro del año de finalización.</div>'; return; }
  box.innerHTML=dates.map(a=>{
    const id='au_'+a.date.getTime();
    const chk=asuetoChecked.has(id)?'checked':'';
    return `<label><input type="checkbox" class="asueto-chk" id="${id}" ${chk}><span>${a.label}</span><span class="d">${a.date.toLocaleDateString('es-SV',{day:'2-digit',month:'short',year:'numeric'})}</span></label>`;
  }).join('');
}
// fracción de año en meses comerciales (30 días), como el ejemplo del Ministerio/juzgados
const frac=(a,b)=>{const s=serviceSpan(a,b); return s?Math.min(1,(s.years*360+s.months*30+s.days)/360):0;};

// ---- número a letras (USD) ----
const UNI=['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés','veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve'];
const apoc=s=>s.replace(/veintiuno$/,'veintiún').replace(/uno$/,'un');
const DEC=['','','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
const CEN=['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];
function tresDigitos(n){
  if(n===0) return '';
  if(n===100) return 'cien';
  let s='';
  const c=Math.floor(n/100), r=n%100;
  if(c) s+=CEN[c]+' ';
  if(r<=29) s+=UNI[r];
  else{
    const d=Math.floor(r/10), u=r%10;
    s+=DEC[d]+(u?' y '+UNI[u]:'');
  }
  return s.trim();
}
function enteroALetras(n){
  if(n===0) return 'cero';
  let out=[];
  const millones=Math.floor(n/1000000); n%=1000000;
  const miles=Math.floor(n/1000); n%=1000;
  if(millones) out.push(millones===1?'un millón':apoc(tresDigitos(millones))+' millones');
  if(miles) out.push(miles===1?'mil':apoc(tresDigitos(miles))+' mil');
  if(n) out.push(tresDigitos(n));
  return out.join(' ').trim();
}
function montoALetras(valor){
  const totalCent=Math.round(valor*100), entero=Math.floor(totalCent/100), centavos=totalCent%100;
  const cad=entero===1?'un dólar':apoc(enteroALetras(entero))+(entero>=1000000&&entero%1000000===0?' de dólares':' dólares');
  return (cad.charAt(0).toUpperCase()+cad.slice(1))+' con '+String(centavos).padStart(2,'0')+'/100 US$';
}

function isr(base){
  if(base<=550) return 0;
  if(base<=895.24) return (base-550)*0.10+17.67;
  if(base<=2038.10) return (base-895.24)*0.20+60.00;
  return (base-2038.10)*0.30+288.57;
}

// Cada causal define cómo se calcula la indemnización y si corresponde vacación proporcional.
const CAUSALES={
  injustificado:{tipo:'art58',vac:true,base:'Arts. 55 y 58 C.T.',nota:'Los recargos por jornadas especiales pendientes se pagan además de la indemnización.'},
  renuncia:{tipo:'renuncia',vac:true,nota:'La prestación por renuncia requiere preaviso escrito de 15 días (30 días si es cargo de dirección, jefatura o trabajador especializado) y al menos 2 años de servicio continuo.'}
};
let tocado=false;
const parseLocal=v=>{ if(!v) return new Date(NaN); const [y,m,d]=v.split('-').map(Number); return new Date(y,m-1,d); };
function duiOk(v){ const n=v.replace('-',''); let s=0; for(let i=0;i<8;i++) s+=(+n[i])*(9-i); return (10-(s%10))%10===+n[8]; }
function validar(){
  const errs=[], warns=[];
  document.querySelectorAll('.err').forEach(e=>e.classList.remove('err'));
  const bad=(id,msg)=>{ errs.push(msg); if(tocado) $(id).classList.add('err'); };
  const dui=$('dui').value.trim();
  if(dui==='') { /* DUI opcional */ }
  else if(!/^\d{8}-\d$/.test(dui)) bad('dui','El DUI debe tener el formato 00000000-0 (o déjalo vacío).');
  else if(!duiOk(dui)) warns.push('El dígito verificador del DUI no coincide; revisa que esté bien escrito.');
  if(!$('cargo').value.trim()) bad('cargo','Escribe el cargo.');
  if(!$('patrono').value.trim()) bad('patrono','Escribe el nombre del patrono o empresa.');
  const sal=parseFloat($('salario').value), min=parseFloat($('sector').value);
  if(!(sal>0)) bad('salario','Escribe un salario mensual mayor a $0.');
  else if(sal<min) warns.push('El salario es menor al mínimo del sector ('+fmt(min)+'). Verifica que sea correcto.');
  const ing=parseLocal($('ingreso').value), fin=parseLocal($('fin').value);
  if(isNaN(ing)) bad('ingreso','Indica la fecha de ingreso.');
  if(isNaN(fin)) bad('fin','Indica la fecha de finalización.');
  if(!isNaN(ing)&&!isNaN(fin)&&fin<ing) bad('fin','La fecha de finalización no puede ser anterior a la de ingreso.');
  if(!$('motivo').value) bad('motivo','Selecciona la causal de cierre laboral.');
  if(document.querySelector('input[name="comis"]:checked').value==='si' && !(parseFloat($('comisMonto').value)>0)) bad('comisMonto','Escribe el total de comisiones de los últimos 6 meses.');
  ['hed','hen','asuetoExtra','descanso','diasPend'].forEach(id=>{ if(parseFloat($(id).value)<0) bad(id,'Los valores no pueden ser negativos.'); });
  if(parseFloat($('diasPend').value)>31) bad('diasPend','Los días de salario pendiente no pueden pasar de 31.');
  return {errs,warns};
}

function calcular(){
  const nombre=$('nombre').value, dui=$('dui').value, cargo=$('cargo').value, patrono=$('patrono').value;
  const salario=parseFloat($('salario').value)||0;
  const salMinMensual=parseFloat($('sector').value);
  const ingreso=parseLocal($('ingreso').value), fin=parseLocal($('fin').value);
  const motivo=$('motivo').value;
  const hed=parseFloat($('hed').value)||0, hen=parseFloat($('hen').value)||0;
  const asuetoSi=document.querySelector('input[name="asuetoSi"]:checked').value==='si';
  const dAsueto=asuetoSi ? document.querySelectorAll('.asueto-chk:checked').length + (parseFloat($('asuetoExtra').value)||0) : 0;
  const dDescanso=parseFloat($('descanso').value)||0;
  const dPend=Math.min(31,parseFloat($('diasPend').value)||0);
  const fechasAsueto=asuetoSi?[...document.querySelectorAll('.asueto-chk:checked')].map(c=>[...c.parentElement.querySelectorAll('span')].map(x=>x.textContent).join(' – ')):[];
  const fechasTxt=[fechasAsueto.length?'Asuetos: '+fechasAsueto.join('; '):'', descansoDates.length?'Descansos: '+descansoDates.map(fmtFecha).join('; '):''].filter(Boolean).join(' · ');
  const box=$('results'), foot=$('footnote');

  const {errs,warns}=validar();
  if(errs.length){
    box.innerHTML = tocado
      ? '<div class="r-row bad"><span>Para calcular, corrige lo siguiente:<span class="detail">'+errs.join('<br>')+'</span></span></div>'
      : '<div class="r-row"><span>Completa los datos para ver el cálculo.</span></div>';
    foot.textContent=''; return null;
  }

  const finInc=new Date(fin.getFullYear(),fin.getMonth(),fin.getDate()+1); // el último día trabajado cuenta
  const span=serviceSpan(ingreso,finInc);
  const radio=n=>document.querySelector('input[name="'+n+'"]:checked').value;
  const vacPrev=radio('vacPrev'), aguiPrev=radio('aguiPrev'), tieneComis=radio('comis')==='si';
  const periodo=parseInt($('periodo').value);
  const comisProm=tieneComis?(parseFloat($('comisMonto').value)||0)/6:0;
  const salDiario=(salario+comisProm)/30;
  const salMinDiario=salMinMensual/30;
  const valorHora=salDiario/8;

  // Prestaciones proporcionales (fracción desde el último aniversario)
  const cz=CAUSALES[motivo];
  const espPct=(document.querySelector('input[name="aloj"]:checked').value==='si'?0.25:0)+(document.querySelector('input[name="comida"]:checked').value==='si'?0.25:0);
  const vacMult=1.30+espPct; // 30% de recargo + 25% por alojamiento y/o alimentación no proporcionados en vacaciones
  const vacTxt='15 días + 30% recargo'+(espPct?' + '+Math.round(espPct*100)+'% por alojamiento/alimentación':'');
  const vacProp=cz.vac?r2(salDiario*15*vacMult*span.fraction):0;
  const vacPend=(vacPrev==='no' && span.years>=1)?r2(salDiario*15*vacMult):0;
  const vacacion=r2(vacProp+vacPend);

  // Reparto de las vacaciones según el período elegido (informativo; el total no cambia)
  const diasVac=(cz.vac?15*span.fraction:0)+(vacPend>0?15:0);
  let resto=diasVac; const partes=[];
  for(let i=0;i<periodo;i++){ const d=i===periodo-1?resto:Math.min([15,10,7][periodo-1],resto); partes.push(d); resto-=d; }
  let cumD=0, prevT=0; // redondeo acumulado: la suma de los períodos es exactamente el total y ninguno sale negativo
  const periodosTxt=partes.map((d,i)=>{ cumD+=d; const t=i===partes.length-1?vacacion:r2(diasVac?vacacion*cumD/diasVac:0); const m=r2(t-prevT); prevT=t; return `Período ${i+1}: ${d.toFixed(1)} días (${fmt(m)})`; }).join(' · ');

  // Aguinaldo: año calendario, del 12 de diciembre al 12 de diciembre (Art. 198)
  const dic=y=>new Date(y,11,12);
  const finAguiPrev=fin>=dic(fin.getFullYear())?dic(fin.getFullYear()):dic(fin.getFullYear()-1);
  const desdeActual=ingreso>finAguiPrev?ingreso:finAguiPrev;
  const aguiProp=r2(salDiario*aguinaldoDias(span.years)*frac(desdeActual,finInc));
  let aguiPend=0;
  if(aguiPrev==='no' && ingreso<finAguiPrev){
    const ini=dic(finAguiPrev.getFullYear()-1), sp2=serviceSpan(ingreso,finAguiPrev);
    aguiPend=r2(salDiario*aguinaldoDias(sp2.years)*frac(ingreso>ini?ingreso:ini,finAguiPrev));
  }
  const aguinaldo=r2(aguiProp+aguiPend);

  // Indemnización / compensación según la causal
  let indem=0, indemLabel='', indemNota='';
  const art58=()=>{ const b=Math.min(salDiario,4*salMinDiario); return Math.max(b*30*span.years+b*30*span.fraction, b*15); };
  if(cz.tipo==='art58'){
    indem=art58();
    indemLabel = 'Indemnización por despido injustificado';
    indemNota = (salDiario>4*salMinDiario ? '30 días por año, salario topado a 4× salario mínimo diario ($'+(4*salMinDiario).toFixed(2)+'/día)' : '30 días de salario por cada año de servicio y su fracción, mínimo 15 días')+' — '+cz.base;
  } else if(cz.tipo==='renuncia'){
    indemLabel='Prestación por renuncia voluntaria';
    const avisoNo=document.querySelector('input[name="aviso"]:checked').value==='no';
    if(avisoNo){
      indemNota='No aplica: sin aviso previo por escrito no se calcula la prestación de 15 días por año (Decreto 592).';
    } else if(span.years<2){
      indemNota='No aplica: la Ley Reguladora de la Prestación Económica por Renuncia Voluntaria (Decreto 592) exige un mínimo de 2 años de servicio continuo.';
    } else {
      const baseDiaria=Math.min(salDiario,2*salMinDiario);
      indem=baseDiaria*15*span.years + baseDiaria*15*span.fraction;
      indemNota = (salDiario>2*salMinDiario ? '15 días por año, salario topado a 2× salario mínimo diario ($'+(2*salMinDiario).toFixed(2)+'/día), con la fracción de año proporcional' : '15 días de salario por cada año de servicio y su fracción')+' — Decreto 592.';
    }
  }
  indem=r2(indem);

  // Recargos por jornadas especiales
  const pagoHED=r2(hed*valorHora*2);
  const pagoHEN=r2(hen*valorHora*1.25*2);
  const pagoAsueto=r2(dAsueto*salDiario*2);
  const pagoDescanso=r2(dDescanso*salDiario*1.5);
  const totalRecargos=r2(pagoHED+pagoHEN+pagoAsueto+pagoDescanso);
  const salPend=r2(salDiario*dPend); // salario de los días trabajados y aún no pagados

  const totalPrestaciones=r2(vacacion+aguinaldo+indem+salPend);
  const totalDevengado=r2(totalPrestaciones+totalRecargos);

  // Deducciones (aguinaldo, indemnización/renuncia exentos; vacación y recargos gravados)
  const gravable=r2(vacacion+totalRecargos+salPend);
  const isssBase=gravable*0.03;
  const isssMonto=r2(Math.min(isssBase,30.00));
  const afpMonto=r2(gravable*0.0725);
  const aguiGravado=Math.max(0,aguinaldo-2*salMinMensual); // exento hasta 2 salarios mínimos mensuales
  const baseISR=r2(Math.max(0,gravable+aguiGravado-isssMonto-afpMonto));
  const isrMonto=r2(isr(baseISR));
  const totalDeducciones=r2(isssMonto+afpMonto+isrMonto);
  const neto=r2(totalDevengado-totalDeducciones);

  box.innerHTML = warns.map(w=>'<div class="r-row warn"><span>'+w+'</span></div>').join('') + `
    <div class="rgroup"><h3>Prestaciones proporcionales</h3>
      <div class="r-row"><span>Tiempo de servicio<span class="detail">${span.years} año(s), ${span.months} mes(es), ${span.days} día(s)</span></span><span class="amount">—</span></div>
      ${comisProm>0?`<div class="r-row"><span>Promedio mensual de comisiones<span class="detail">Se suma al salario base (total de 6 meses ÷ 6)</span></span><span class="amount">${fmt(comisProm)}</span></div>`:''}
      <div class="r-row"><span>Vacación proporcional<span class="detail">${cz.vac?vacTxt+', fracción de año en curso':'No aplica en esta causal; solo se paga la vacación de años ya cumplidos'}</span></span><span class="amount">${fmt(vacProp)}</span></div>
      ${vacPend>0?`<div class="r-row"><span>Vacación pendiente del año anterior<span class="detail">${vacTxt}, sin pago previo</span></span><span class="amount">${fmt(vacPend)}</span></div>`:''}
      ${diasVac>0?`<div class="r-row"><span>Reparto por período vacacional<span class="detail">${periodosTxt}</span></span><span class="amount">—</span></div>`:''}
      <div class="r-row"><span>Aguinaldo proporcional<span class="detail">${aguinaldoDias(span.years)} días según antigüedad, desde el 12 de diciembre</span></span><span class="amount">${fmt(aguiProp)}</span></div>
      ${aguiPend>0?`<div class="r-row"><span>Aguinaldo pendiente del año anterior<span class="detail">Sin pago previo</span></span><span class="amount">${fmt(aguiPend)}</span></div>`:''}
      <div class="r-row"><span>${indemLabel}<span class="detail">${indemNota}</span></span><span class="amount">${fmt(indem)}</span></div>
      ${salPend>0?`<div class="r-row"><span>Salario pendiente de pago<span class="detail">${dPend} día(s) × ${fmt(salDiario)}</span></span><span class="amount">${fmt(salPend)}</span></div>`:''}
    </div>
    <div class="rgroup"><h3>Recargos por jornadas especiales</h3>
      <div class="r-row"><span>Horas extra diurnas (100%)<span class="detail">${hed} h × ${fmt(valorHora)} × 2</span></span><span class="amount">${fmt(pagoHED)}</span></div>
      <div class="r-row"><span>Horas extra nocturnas<span class="detail">${hen} h, base con 25% nocturnidad × 2</span></span><span class="amount">${fmt(pagoHEN)}</span></div>
      <div class="r-row"><span>Días de asueto trabajados (salario + 100% de recargo)<span class="detail">${dAsueto} día(s)</span></span><span class="amount">${fmt(pagoAsueto)}</span></div>
      <div class="r-row"><span>Descanso semanal trabajado (salario + 50% de recargo)<span class="detail">${dDescanso} día(s)</span></span><span class="amount">${fmt(pagoDescanso)}</span></div>
    </div>
    <div class="r-row total"><span>Total devengado (bruto)</span><span class="amount">${fmt(totalDevengado)}</span></div>
    <div class="rgroup"><h3>Deducciones de ley</h3>
      <div class="r-row neg"><span>ISSS (3%, tope $30.00)<span class="detail">sobre remuneración gravada de ${fmt(gravable)}</span></span><span class="amount">-${fmt(isssMonto)}</span></div>
      <div class="r-row neg"><span>AFP (7.25%)</span><span class="amount">-${fmt(afpMonto)}</span></div>
      <div class="r-row neg"><span>ISR<span class="detail">sobre base gravable de ${fmt(baseISR)} tras ISSS y AFP</span></span><span class="amount">-${fmt(isrMonto)}</span></div>
      <div class="r-row neg"><span><b>Total retenciones</b><span class="detail">ISSS + AFP + ISR</span></span><span class="amount">-${fmt(totalDeducciones)}</span></div>
    </div>
    <div class="rgroup"><h3>Resumen del líquido a pagar</h3>
      <div class="r-row"><span>Total devengado (bruto)</span><span class="amount">${fmt(totalDevengado)}</span></div>
      <div class="r-row neg"><span>(−) Total retenciones<span class="detail">ISSS ${fmt(isssMonto)} + AFP ${fmt(afpMonto)} + ISR ${fmt(isrMonto)}</span></span><span class="amount">-${fmt(totalDeducciones)}</span></div>
    </div>
    <div class="r-row total"><span>Líquido a pagar</span><span class="amount">${fmt(neto)}</span></div>
    <div class="letras">${montoALetras(Math.max(0,neto))}</div>
  `;
  foot.textContent = cz.nota||'';

  return {nombre:nombre.trim()?esc(nombre.trim()):'Anónimo',dui:dui.trim()?esc(dui.trim()):'XXXXXXXX-X',cargo:esc(cargo),patrono:esc(patrono),salario,span,vacacion,aguinaldo,vacProp,vacPend,vacTxt,salPend,fechasTxt,aguiGravado,ingresoTxt:fechaLarga(ingreso),finTxt:fechaLarga(fin),causa:motivo==='renuncia'?'Renuncia voluntaria':'Despido sin causa justificada',indemBase:cz.tipo==='art58'?'Art. 58 CT':'Decreto 592',aguiProp,aguiPend,periodosTxt,diasVac,indem,indemLabel,indemNota,
    pagoHED,pagoHEN,pagoAsueto,pagoDescanso,totalRecargos,totalDevengado,
    isssMonto,afpMonto,isrMonto,totalDeducciones,neto,gravable};
}

function letrasFormal(v){
  return montoALetras(v).replace(/ (de )?dólares?(?= con)/,'').replace(/ con (\d\d)\/100 US\$$/,' CON $1/100 DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA').toUpperCase();
}
function buildPrintSheet(d){
  if(!d) return;
  const now=new Date(), z=n=>String(n).padStart(2,'0');
  const gen='Generado el '+z(now.getDate())+'/'+z(now.getMonth()+1)+'/'+now.getFullYear()+' '+z(now.getHours())+':'+z(now.getMinutes());
  const pl=(n,u,p)=>n+' '+(n===1?u:p);
  const antig=pl(d.span.years,'año','años')+', '+pl(d.span.months,'mes','meses')+', '+pl(d.span.days,'día','días');
  const row=(c,b,m)=>`<tr><td>${c}</td><td>${b}</td><td class="n">${m}</td></tr>`;
  const notas=[d.diasVac>0?'Reparto de vacaciones: '+d.periodosTxt:'', d.indemNota?d.indemLabel+': '+d.indemNota:'', d.fechasTxt].filter(Boolean);
  const exento=r2(d.indem+d.aguinaldo);
  const isrAgui=d.aguiGravado>0?` En el ISR, el aguinaldo está exento hasta ${fmt(r2(d.aguinaldo-d.aguiGravado))}; el excedente de ${fmt(d.aguiGravado)} integra la base del ISR.`:'';
  const titulo='<div class="p-title"><h2>COMPROBANTE DE LIQUIDACIÓN DE PRESTACIONES LABORALES</h2><div>República de El Salvador</div></div>';
  $('printSheet').innerHTML = `
  <div class="p-page pagebreak">
    ${titulo}
    <div class="p-sec">I. Datos de las partes</div>
    <table class="p-table p-info">
      <tr><th>Persona trabajadora</th><td>${d.nombre}</td><th>DUI</th><td>${d.dui}</td></tr>
      <tr><th>Patrono</th><td>${d.patrono}</td><th>Cargo desempeñado</th><td>${d.cargo}</td></tr>
      <tr><th>Salario mensual</th><td>${fmt(d.salario)}</td><th>Causa de terminación</th><td>${d.causa}</td></tr>
      <tr><th>Fecha de ingreso</th><td>${d.ingresoTxt}</td><th>Fecha de terminación</th><td>${d.finTxt}</td></tr>
      <tr><th>Antigüedad reconocida</th><td colspan="3">${antig}</td></tr>
    </table>

    <div class="p-sec">II. Desglose de prestaciones liquidadas</div>
    <table class="p-table"><tr><th>Concepto</th><th>Base legal</th><th>Monto</th></tr>
      ${row('Vacación proporcional','Arts. 177 y 187 CT',fmt(d.vacProp))}
      ${d.vacPend>0?row('Vacación pendiente del año anterior','Arts. 177 y 187 CT',fmt(d.vacPend)):''}
      ${row('Aguinaldo proporcional','Arts. 196-198 CT',fmt(d.aguiProp))}
      ${d.aguiPend>0?row('Aguinaldo pendiente del año anterior','Arts. 196-198 CT',fmt(d.aguiPend)):''}
      ${row(d.indemLabel,d.indemBase,fmt(d.indem))}
      ${d.pagoHED>0?row('Horas extras diurnas','Art. 169 CT',fmt(d.pagoHED)):''}
      ${d.pagoHEN>0?row('Horas extras nocturnas','Arts. 168 y 169 CT',fmt(d.pagoHEN)):''}
      ${d.pagoAsueto>0?row('Días de asueto laborados','Art. 192 CT',fmt(d.pagoAsueto)):''}
      ${d.pagoDescanso>0?row('Días de descanso semanal laborados','Arts. 175 y 176 CT',fmt(d.pagoDescanso)):''}
      ${d.salPend>0?row('Salario pendiente de pago','Código de Trabajo',fmt(d.salPend)):''}
      <tr class="p-total"><td colspan="2">TOTAL DEVENGADO (BRUTO)</td><td class="n">${fmt(d.totalDevengado)}</td></tr>
    </table>
    ${notas.length?'<p class="p-notas">'+notas.join('<br>')+'</p>':''}

    <div class="p-sec">III. Deducciones de ley y neto a pagar</div>
    <p class="p-small">Remuneración gravada: ${fmt(d.gravable)}. Monto exento de cotizaciones: ${fmt(exento)} (indemnización o prestación por renuncia, y aguinaldo).${isrAgui}</p>
    <table class="p-table"><tr><th>Concepto</th><th>Base legal</th><th>Monto</th></tr>
      ${row('Cotización ISSS (trabajador)','Reglamento del ISSS, Art. 29','-'+fmt(d.isssMonto))}
      ${row('Cotización AFP (trabajador)','Ley del Sistema de Ahorro para Pensiones','-'+fmt(d.afpMonto))}
      ${row('Retención de ISR','Art. 37 Ley de ISR','-'+fmt(d.isrMonto))}
      <tr class="p-total"><td colspan="2">Total de deducciones</td><td class="n">-${fmt(d.totalDeducciones)}</td></tr>
      <tr class="p-total"><td colspan="2">MONTO NETO A PAGAR</td><td class="n">${fmt(d.neto)}</td></tr>
    </table>
    <p class="p-small"><b>Monto neto en letras</b><br>${letrasFormal(Math.max(0,d.neto))}</p>
    <div class="p-foot"><span>${gen}</span><span>1 / 2</span></div>
  </div>
  <div class="p-page">
    ${titulo}
    <div class="p-sec">IV. Declaración</div>
    <p>La persona trabajadora <b>${d.nombre}</b> declara haber recibido el detalle de las prestaciones económicas que anteceden, calculadas conforme al Código de Trabajo de El Salvador, así como el desglose de las retenciones de ley aplicadas y el monto neto resultante. Este comprobante se suscribe en la fecha que se indica al pie de las firmas.</p>
    <div class="p-sig2">
      <div><b>Persona trabajadora</b><p>Nombre: ______________________________</p><p>DUI: _________________________________</p><p>Fecha: _______________________________</p></div>
      <div><b>Patrono o representante legal</b><p>Nombre: ______________________________</p><p>DUI: _________________________________</p><p>Fecha: _______________________________</p></div>
    </div>
    <div class="p-legal"><b>Advertencia legal</b><br>Este documento es un comprobante informativo del cálculo de prestaciones y NO constituye el finiquito laboral. Conforme al Art. 402 inciso 2 del Código de Trabajo, la renuncia, la terminación por mutuo consentimiento o el recibo de pago de prestaciones por despido sin causa legal solo tienen valor probatorio si constan en hojas extendidas por la Dirección General de Inspección de Trabajo o por los jueces con competencia en materia laboral, utilizadas dentro de los diez días siguientes a su expedición, o bien en documento privado autenticado ante notario. Se recomienda asesoría legal profesional antes de suscribir cualquier finiquito.</div>
    <div class="p-foot"><span>${gen}</span><span>2 / 2</span></div>
  </div>`;
}

// ---- Días de descanso semanal trabajados: se agregan uno a uno con el calendario (solo del año de finalización) ----
let descansoDates=[];
const fmtFecha=iso=>parseLocal(iso).toLocaleDateString('es-SV',{day:'2-digit',month:'short',year:'numeric'});
function descansoRange(){
  const ing=parseLocal($('ingreso').value), fin=parseLocal($('fin').value);
  if(isNaN(ing)||isNaN(fin)) return null;
  return [new Date(Math.max(ing,new Date(fin.getFullYear(),0,1))), fin];
}
function renderDescanso(){
  $('descanso').value=descansoDates.length;
  $('descansoList').innerHTML=descansoDates.length
    ? descansoDates.map((f,i)=>`<label><span>${fmtFecha(f)}</span><button type="button" class="mini del" data-i="${i}">Quitar</button></label>`).join('')
    : '<div class="empty">Aún no has agregado días de descanso trabajados.</div>';
}
function pruneDescanso(){
  const r=descansoRange(); if(!r) return;
  const n=descansoDates.length;
  descansoDates=descansoDates.filter(f=>{const d=parseLocal(f); return d>=r[0]&&d<=r[1];});
  if(descansoDates.length!==n) renderDescanso();
}
document.addEventListener('click', e=>{
  const t=e.target, notify=()=>$('descanso').dispatchEvent(new Event('input',{bubbles:true}));
  if(t.id==='descansoAdd'){
    const v=$('descansoFecha').value, msg=$('descansoMsg'); msg.textContent='';
    const d=parseLocal(v), r=descansoRange();
    if(isNaN(d)){ msg.textContent='Elige una fecha en el calendario.'; return; }
    if(r && (d<r[0]||d>r[1])){ msg.textContent='La fecha debe estar dentro del período trabajado y del año de finalización.'; return; }
    if(descansoDates.includes(v)){ msg.textContent='Esa fecha ya fue agregada.'; return; }
    descansoDates.push(v); descansoDates.sort(); $('descansoFecha').value=''; renderDescanso(); notify();
  } else if(t.classList && t.classList.contains('del')){
    descansoDates.splice(+t.dataset.i,1); renderDescanso(); notify();
  }
});

// Bloqueos en cascada: datos generales -> salario y fechas -> causal -> jornadas y vacaciones
function updateLocks(){
  const v=id=>$(id).value.trim();
  const datosOk=!!v('cargo')&&!!v('patrono');
  const fechasOk=parseFloat($('salario').value)>0 && !isNaN(parseLocal($('ingreso').value)) && !isNaN(parseLocal($('fin').value));
  const motivoOk=!!$('motivo').value;
  ['salario','sector','ingreso','fin'].forEach(id=>$(id).disabled=!datosOk);
  $('motivo').disabled=!(datosOk&&fechasOk);
  const off3=!(datosOk&&fechasOk&&motivoOk);
  document.querySelectorAll('#p3 input,#p3 select,#p3 button,#p4 input,#p4 select').forEach(el=>el.disabled=off3);
  $('p2').classList.toggle('locked',!datosOk);
  $('p3').classList.toggle('locked',off3);
  $('p4').classList.toggle('locked',off3);
  $('asuetoWrap').style.display=document.querySelector('input[name="asuetoSi"]:checked').value==='si'?'block':'none';
  const iD=parseLocal($('ingreso').value), fD=parseLocal($('fin').value);
  const sp=(!isNaN(iD)&&!isNaN(fD)&&fD>=iD)?serviceSpan(iD,new Date(fD.getFullYear(),fD.getMonth(),fD.getDate()+1)):null;
  $('vacPrevWrap').style.display=(sp&&sp.years<1)?'none':'block';
  $('lockHint').textContent = !datosOk ? 'Completa el cargo y la empresa para desbloquear el siguiente apartado (el nombre y el DUI son opcionales).'
    : !fechasOk ? 'Indica el salario y las fechas para poder elegir la causal.'
    : !motivoOk ? 'Selecciona la causal para desbloquear jornadas especiales y vacaciones.' : '';
}

document.addEventListener('input', e => {
  if(e.target.id==='dui'){ const v=e.target.value.replace(/\D/g,'').slice(0,9); e.target.value=v.length>8?v.slice(0,8)+'-'+v.slice(8):v; }
  if(e.target.name==='comis') $('comisWrap').style.display = e.target.value==='si' ? 'block' : 'none';
  if(e.target.id==='motivo'){ $('avisoWrap').style.display = e.target.value==='renuncia' ? 'block' : 'none'; }
  if(e.target.id==='municipio') $('patronalWrap').style.display = e.target.value==='otro' ? 'block' : 'none';
  if(e.target.classList && e.target.classList.contains('asueto-chk')){ if(e.target.checked) asuetoChecked.add(e.target.id); else asuetoChecked.delete(e.target.id); }
  if(['ingreso','fin','municipio','fechaPatronal'].includes(e.target.id)) refreshAsuetoList();
  if(['ingreso','fin'].includes(e.target.id)) pruneDescanso();
  updateLocks();
  buildPrintSheet(calcular());
});

$('printBtn').addEventListener('click', ()=>{
  const d=calcular();
  if(!d){ tocado=true; calcular(); $('results').scrollIntoView({behavior:'smooth'}); return; }
  buildPrintSheet(d);
  const tAnt=document.title; document.title='Liquidacion - '+($('nombre').value.trim().replace(/[\\/:*?"<>|]/g,'')||'Anonimo');
  window.print(); document.title=tAnt;
});

const _t=new Date(); $('fin').value=_t.getFullYear()+'-'+String(_t.getMonth()+1).padStart(2,'0')+'-'+String(_t.getDate()).padStart(2,'0'); // fin = hoy
document.querySelectorAll('.field').forEach(f=>{ const l=f.querySelector(':scope > label'), c=f.querySelector(':scope > input[id]:not([type=hidden]), :scope > select[id]'); if(l&&c&&!l.htmlFor) l.htmlFor=c.id; });
document.querySelectorAll('.field').forEach((f,i)=>{ const l=f.querySelector(':scope > label'), r=f.querySelector(':scope > .radios'); if(l&&r){ l.id=l.id||'lbl_r'+i; r.setAttribute('role','radiogroup'); r.setAttribute('aria-labelledby',l.id); } });
refreshAsuetoList();
renderDescanso();
updateLocks();
buildPrintSheet(calcular());
