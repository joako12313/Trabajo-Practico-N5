const form = document.getElementById('form-juego');
const grid = document.getElementById('grid-juegos');
const mensaje = document.getElementById('mensaje');
const inputId = document.getElementById('juego-id');       
const tituloForm = document.getElementById('titulo-form');
const btnSubmit = document.getElementById('btn-submit');
const btnCancelar = document.getElementById('btn-cancelar');


const IMG_RESPALDO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260">' +
    '<rect width="100%" height="100%" fill="#e9eaf0"/>' +
    '<text x="50%" y="50%" fill="#6b6e80" font-family="Arial" font-size="20" ' +
    'text-anchor="middle" dominant-baseline="middle">Sin portada</text></svg>'
  );

function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = 'mensaje ' + tipo; 
}

function mostrarEstadoCatalogo(texto) {
  grid.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'empty-message';
  p.textContent = texto;
  grid.appendChild(p);
}

function crearTarjeta(juego) {
  const card = document.createElement('article');
  card.className = 'card-juego';

  const img = document.createElement('img');
  img.src = juego.portada;
  img.alt = 'Portada de ' + juego.titulo;
  img.loading = 'lazy';
  img.onerror = () => { img.onerror = null; img.src = IMG_RESPALDO; };

  const cuerpo = document.createElement('div');
  cuerpo.className = 'card-body';

  const titulo = document.createElement('h3');
  titulo.textContent = juego.titulo;

  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const genero = document.createElement('span');
  genero.className = 'badge';
  genero.textContent = juego.genero;

  const puntos = document.createElement('span');
  puntos.className = 'puntos';
  puntos.textContent = '⭐ ' + juego.puntuacion + '/10';

  meta.append(genero, puntos);

  const resena = document.createElement('p');
  resena.className = 'resena';
  resena.textContent = juego.resena;

  // Botones de acción
  const acciones = document.createElement('div');
  acciones.className = 'card-actions';

  const btnEditar = document.createElement('button');
  btnEditar.type = 'button';
  btnEditar.className = 'btn-action btn-edit';
  btnEditar.textContent = '✏️ Editar';
  btnEditar.addEventListener('click', () => prepararEdicion(juego.id));

  const btnEliminar = document.createElement('button');
  btnEliminar.type = 'button';
  btnEliminar.className = 'btn-action btn-delete';
  btnEliminar.textContent = '🗑️ Eliminar';
  btnEliminar.addEventListener('click', () => eliminarJuego(juego.id));

  acciones.append(btnEditar, btnEliminar);

  cuerpo.append(titulo, meta, resena, acciones);
  card.append(img, cuerpo);
  return card;
}

async function cargarJuegos() {
  const { data, error } = await supabase
    .from('juegos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al cargar el catálogo:', error);
    mostrarEstadoCatalogo('No se pudo cargar el catálogo: ' + error.message);
    return;
  }

  if (!data || data.length === 0) {
    mostrarEstadoCatalogo('Todavía no hay recomendaciones. ¡Sé el primero en publicar una!');
    return;
  }

  grid.innerHTML = '';
  data.forEach((juego) => grid.appendChild(crearTarjeta(juego)));
}

async function eliminarJuego(id) {
  const confirmacion = confirm('¿Estás seguro de que querés eliminar esta recomendación?');
  if (!confirmacion) return;

  try {
    const { error } = await supabase.from('juegos').delete().eq('id', id);
    if (error) throw new Error('Error al eliminar: ' + error.message);

    mostrarMensaje('Recomendación eliminada con éxito.', 'exito');

    if (inputId.value == id) {
      cancelarEdicion();
    }

    await cargarJuegos();
  } catch (err) {
    console.error(err);
    mostrarMensaje(err.message, 'error');
  }
}

async function prepararEdicion(id) {
  try {
    // 1. Buscar los datos actuales del registro
    const { data: juego, error } = await supabase
      .from('juegos')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;

    inputId.value = juego.id; // el campo oculto guarda el ID
    document.getElementById('titulo').value = juego.titulo;
    document.getElementById('genero').value = juego.genero;
    document.getElementById('puntuacion').value = juego.puntuacion;
    document.getElementById('resena').value = juego.resena;
    document.getElementById('portada').value = juego.portada;
    document.getElementById('porque').value = juego.porque;

    tituloForm.textContent = 'Editar recomendación';
    btnSubmit.textContent = 'Guardar cambios';
    btnCancelar.hidden = false;
    mostrarMensaje('', '');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    console.error(err);
    mostrarMensaje('No se pudo cargar el juego para editar: ' + err.message, 'error');
  }
}

function cancelarEdicion() {
  form.reset();
  inputId.value = '';
  tituloForm.textContent = 'Recomendá un juego';
  btnSubmit.textContent = 'Publicar recomendación';
  btnCancelar.hidden = true;
}

btnCancelar.addEventListener('click', () => {
  cancelarEdicion();
  mostrarMensaje('', '');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = inputId.value; // vacío = nuevo, con número = edición
  const datos = {
    titulo: document.getElementById('titulo').value.trim(),
    genero: document.getElementById('genero').value,
    puntuacion: Number(document.getElementById('puntuacion').value),
    resena: document.getElementById('resena').value.trim(),
    portada: document.getElementById('portada').value.trim(),
    porque: document.getElementById('porque').value.trim()
  };

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Guardando...';
  mostrarMensaje('Guardando...', 'info');

  try {
    if (id) {
      const { error } = await supabase.from('juegos').update(datos).eq('id', id);
      if (error) throw error;
      mostrarMensaje('¡Recomendación actualizada con éxito!', 'exito');
    } else {
      const { error } = await supabase.from('juegos').insert([datos]);
      if (error) throw error;
      mostrarMensaje('¡Recomendación publicada con éxito!', 'exito');
    }

    cancelarEdicion();      
    await cargarJuegos();   
  } catch (err) {
    console.error('Error al guardar:', err);
    mostrarMensaje('No se pudo guardar: ' + err.message, 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = inputId.value ? 'Guardar cambios' : 'Publicar recomendación';
  }
});

cargarJuegos();
