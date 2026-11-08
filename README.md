# Vive+ · Pequeños hábitos, grandes cambios

Red social de hábitos saludables. Las personas crean una cuenta, se ponen una meta, completan un reto diario para construir su racha, publican sus comidas y ejercicios con foto, y se conectan con amigos.

Proyecto académico de Desarrollo de Aplicaciones UI/UX, Universidad de Ibagué.
Integrantes: Juan Miguel Robayo Díaz y María Stefanie Bermúdez.

## Funcionalidades

- **Cuentas reales:** registro con nombre de usuario único, meta, correo y contraseña; inicio y cierre de sesión. La sesión se mantiene al recargar.
- **Todo empieza en 0:** racha en 0 y edad, peso y altura vacíos hasta que la persona los llene en "Editar perfil".
- **Reto diario y racha:** cada meta tiene su reto. La racha sube una vez por día y se reinicia si pasa un día sin completarlo.
- **Publicaciones con foto:** comidas (con imagen) y ejercicios. Las fotos se comprimen en el navegador antes de subirse.
- **Comunidad:** todas las publicaciones de todos los usuarios, con filtros (Todos, Amigos, Comida, Ejercicio) y búsqueda de personas con la lupa.
- **Inicio:** feed solo con las publicaciones de tus amigos y las tuyas.
- **Me gusta y comentarios** guardados en la base de datos. Cada quien puede eliminar sus publicaciones.
- **Amigos (mutuos):** si agregas a alguien, los dos quedan como amigos. Un amigo puede ver tu perfil (meta y racha) y tus publicaciones.
- **Notificaciones en tiempo real:** me gusta, comentarios, nuevos amigos, reto completado y primer reto al registrarse.

## Tecnologías

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- Supabase: Auth, Postgres (con Row Level Security), Storage y Realtime

## Estructura

```
src/
  App.tsx             Toda la interfaz y la lógica de la app
  supabaseClient.ts   Conexión con Supabase (lee las variables de entorno)
  index.css           Estilos globales
database/
  supabase.sql                  Parte 1: perfiles, amigos y registro
  supabase_partes_2_3_4.sql     Partes 2 a 4: publicaciones, fotos, notificaciones y amistad mutua
```

## Cómo correrlo

### 1. Instalar

```bash
npm install
```

### 2. Crear el proyecto en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor** corre, **en este orden y una sola vez cada uno**:
   1. `database/supabase.sql`
   2. `database/supabase_partes_2_3_4.sql`
3. En **Authentication → Sign In / Providers → Email** apaga **Confirm email** (recomendado para pruebas; si queda encendido, cada cuenta nueva debe confirmar su correo antes de entrar).

### 3. Variables de entorno

Crea un archivo `.env.local` junto a `package.json`:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon
```

Los valores están en Supabase → **Project Settings → API**. El archivo `.env.local` ya está en `.gitignore`: no lo subas a GitHub.

### 4. Ejecutar

```bash
npm run dev        # desarrollo
npm run build      # versión de producción
npm run preview    # probar la versión de producción
```

Si publicas la app (Vercel, Netlify, Figma Make, etc.), agrega las mismas dos variables en el panel de la plataforma.

## Base de datos

| Tabla | Para qué sirve |
|---|---|
| `profiles` | Usuario, meta, edad, peso, altura, racha y último reto |
| `friends` | Amistades (se guardan en ambos sentidos) |
| `posts` | Publicaciones de comida y ejercicio |
| `post_likes` | Me gusta |
| `post_comments` | Comentarios |
| `notifications` | Notificaciones de cada usuario |

Las fotos se guardan en el bucket de Storage `fotos`, dentro de una carpeta por usuario (máx. 5 MB, JPG, PNG o WEBP).

Los triggers de la base de datos crean el perfil al registrarse y generan las notificaciones, así que la app no puede falsificarlas.

## Seguridad

- Todas las tablas tienen **Row Level Security**: cada usuario solo edita lo suyo.
- **Peso, edad y altura nunca se comparten.** Los demás usuarios solo ven nombre de usuario, meta y racha (y solo si son amigos).
- La clave `anon` es pública por diseño; la protección está en las políticas de la base de datos. **Nunca** pongas la clave `service_role` en la app ni en GitHub.
- Las fotos son visibles para quien tenga el enlace exacto.

## Pendientes y mejoras posibles

- El color del avatar elegido no se guarda al recargar.
- Se cargan las 100 publicaciones más recientes (falta paginar).
- Inicio de sesión con nombre de usuario (hoy es con correo).
- Solicitudes de amistad con aceptación (hoy la amistad es automática y mutua).
- Hacer privadas las fotos si se manejan datos sensibles.
- El texto "Cada registro suma a tu racha" en Agregar no es cierto todavía: la racha solo sube al completar el reto.
- Premium, retos patrocinados y los enlaces del pie de página son de demostración.

## Licencia

Proyecto académico. Uso educativo.