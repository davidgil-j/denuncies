# Fase 7 · Publicar

**Queda decidido al cerrar:** la pieza está donde tiene que estar, se ha comprobado que
producción sirve exactamente lo aprobado, David tiene el enlace y lo ha abierto, y el plan queda
en presente.

---

## 1 · Antes de subir

- **Solo se publican los archivos de la pieza.** Se copian a una carpeta limpia fuera del
  repositorio y se sube desde ahí. Nunca se publica desde el repositorio: arrastra documentos,
  credenciales y cosas de otros proyectos. La lista de archivos publicados se escribe en el
  plan, para que la próxima vez no haya que redescubrirla.
- **El nombre del archivo de vídeo, de tipografía o de imagen es el mismo en local y en
  producción.** Si se cambia un recurso, se cambia su nombre, para que ningún navegador sirva el
  viejo desde su caché.
- **Las tipografías van incrustadas o alojadas con la pieza**, nunca enlazadas a un servicio
  externo que un bloqueador pueda cortar.

## 2 · Subir

Cada plataforma tiene su orden; se apunta en el plan la que use el proyecto. Con Vercel, desde la
carpeta limpia:

```
vercel deploy --prod --yes
```

Si el proyecto pertenece a un equipo y el mando responde que no está autorizado, se añade el
ámbito con `--scope <equipo>`. Si el alias público se queda colgado después de subir, se asigna a
mano con `vercel alias set <dirección-del-despliegue> <dominio>`.

## 3 · Comprobar que producción sirve lo nuevo

**No se da por publicado hasta comprobarlo.** Los navegadores y las redes guardan copias.

1. Se descarga desde la dirección pública el archivo principal y uno de los recursos, con un
   parámetro aleatorio al final para saltar cachés, y se compara byte a byte con el local.
2. Se abre la dirección pública con el navegador, no la de vista previa, y se hace una captura
   del primer pantallazo a escritorio y a móvil.
3. Si hay cuadro de diagnóstico, se abre con su parámetro y se lee que los números son los
   esperados.

Si algo no coincide, no se ha publicado, por mucho que el mando haya dicho que sí.

## 4 · El plan queda en presente

Se actualiza el plan con lo que hay: lo decidido en cada fase, en presente, sin historial. Se
añade dónde vive lo publicado y cómo se vuelve a publicar. Las excepciones asumidas se quedan.
Los bocetos descartados y las carpetas de prueba se borran, salvo que David pida guardarlos.

**Si el proyecto va a durar meses**, `/impeccable document` puede derivar el archivo de diseño
del código construido, no de las intenciones. Solo entonces: en una pieza suelta, el plan basta y
un segundo archivo va contra la regla.

## 5 · El enlace a David

Se le da la dirección pública y se le dice, en una línea, qué tiene que mirar primero. Y se
esperan sus ojos: la fase cierra cuando él lo ha abierto, no cuando yo lo he subido.

## Fallos típicos de esta fase

- **Publicar desde el repositorio.** Se cuela lo que no debe.
- **Dar por publicado sin descargar y comparar.** La caché sirve lo viejo.
- **Comprobar en la dirección de vista previa** en vez de la pública.
- **Cambiar un recurso sin cambiarle el nombre.** Los navegadores sirven el anterior.
- **Escribir un diario de lo que pasó.** El plan dice lo que hay, en presente.
- **Cerrar sin que David lo haya abierto.** Es su pieza.
