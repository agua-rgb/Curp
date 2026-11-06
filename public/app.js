const form = document.querySelector('#demo-form');
const sendStatus = document.querySelector('#send-status');
const listStatus = document.querySelector('#list-status');
const container = document.querySelector('#records');
const labels = {first_name:'Nombre',last_name:'Apellidos',curp:'CURP ficticia',rfc:'RFC ficticio',nss:'NSS ficticio',address:'Dirección',phone:'Teléfono',email:'Correo'};
let fetching = false;
async function refresh() {
  if (fetching) return;
  fetching = true;
  try {
    const response = await fetch('/api/citizens', {cache:'no-store'});
    if (!response.ok) throw new Error();
    const records = await response.json();
    container.replaceChildren();
    if (!records.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Todavía no hay envíos.';
      container.append(empty);
    }
    for (const record of records) {
      const article = document.createElement('article');
      const heading = document.createElement('h3');
      heading.textContent = 'Envío · ' + new Date(record.created_at).toLocaleString();
      article.append(heading);
      for (const [key, label] of Object.entries(labels)) {
        const row = document.createElement('p');
        row.textContent = label + ': ' + (record[key] || 'No proporcionada');
        article.append(row);
      }
      container.append(article);
    }
    listStatus.textContent = '';
  } catch { listStatus.textContent = 'No se pudo actualizar la lista. Se reintentará automáticamente.'; }
  finally { fetching = false; }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  sendStatus.textContent = 'Enviando…';
  const data = Object.fromEntries(new FormData(form));
  data.synthetic = form.elements.synthetic.checked;
  try {
    const response = await fetch('/api/verify', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    sendStatus.textContent = result.message;
    await refresh();
  } catch (error) { sendStatus.textContent = error.message || 'No se pudieron enviar los datos.'; }
  finally { button.disabled = false; }
});
refresh();
setInterval(refresh, 2000);
