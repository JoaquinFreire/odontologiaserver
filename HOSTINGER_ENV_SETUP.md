# GUÍA: Configurar Variables de Entorno en Hostinger

## 📋 Resumen de tus credenciales Hostinger

```
Usuario MySQL: u101578332_joaquin
Contraseña: Joaquinhost2302
Base de Datos: u101578332_odontologia
Host: localhost (dentro del mismo servidor Hostinger)
Puerto: 3306 (default)
```

## 🔧 Cómo configurar en Hostinger

### Opción 1: **Recomendado - Variables de Entorno en Hostinger Panel**

1. Accede al panel de Hostinger
2. Ve a **Advanced > Environment Variables** (o similar)
3. Agrega estas variables exactamente así:

```
DB_HOST=localhost
DB_USER=u101578332_joaquin
DB_PASSWORD=Joaquinhost2302
DB_NAME=u101578332_odontologia
DB_PORT=3306
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui_cambiar_esto
NODE_ENV=production
FRONTEND_ORIGIN=https://odontologiahi.com
BACKEND_ORIGIN=https://api.odontologiahi.com
DEBUG_KEY=tu_clave_debug_secreti_opcional
```

**⚠️ IMPORTANTE:**
- NO incluyas `PORT` (Hostinger lo asigna automáticamente)
- Cambia `JWT_SECRET` por algo seguro y único
- `DEBUG_KEY` es opcional, úsalo solo si necesitas ver logs

### Opción 2: Archivos .env en el servidor

Si Hostinger no permite variables de entorno en el panel:

1. Git push sube automáticamente `.env.production` a tu servidor
2. En el servidor Hostinger, renombra `.env.production` a `.env`:

```bash
mv .env.production .env
```

O, puedes editar `.env` directamente vía File Manager (es el archivo `.env` que está en la raíz del proyecto).

## 📝 Tu archivo `.env` LOCAL (desarrollo)

Mantén tu `.env` local como está para Railway (es para desarrollo):

```
DB_HOST=interchange.proxy.rlwy.net
DB_USER=root
DB_PASSWORD=ylFCJiGmQjOzomJlHtaVpWvjgqEuiAKP
DB_NAME=odontologia
DB_PORT=13218
PORT=3000
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui
FRONTEND_ORIGIN=http://localhost:5173
BACKEND_ORIGIN=http://localhost:3000
```

## 🧪 Verificar que funciona en Hostinger

Una vez configuradas las variables, visita:

```
https://api.odontologiahi.com/internal/env-check?key=TU_DEBUG_KEY
```

Reemplaza `TU_DEBUG_KEY` con el valor que pusiste en `DEBUG_KEY`.

Deberias ver algo como:

```json
{
  "timestamp": "2026-02-12T...",
  "ambiente": "PRODUCCIÓN",
  "puerto": 10000,
  "db": {
    "host": "✅ definido",
    "user": "✅ definido",
    "password": "✅ definido",
    "database": "✅ definido",
    "port": "3306"
  },
  "auth": {
    "jwtSecret": "✅ definido"
  },
  "cors": {
    "frontendOrigin": "https://odontologiahi.com",
    "backendOrigin": "https://api.odontologiahi.com"
  }
}
```

Si ves `❌`, significa que esa variable no está definida.

## 📊 Ver logs en Hostinger

Si necesitas ver qué pasó al iniciar:

```
https://api.odontologiahi.com/internal/startup-log?key=TU_DEBUG_KEY
```

Verás un archivo de texto con timestamps de cada paso.

## ✅ Checklist antes de ir a producción

- [ ] De los datos de la BD de Hostinger, cambié en `.env.production`:
  - `DB_HOST=localhost`
  - `DB_USER=u101578332_joaquin`
  - `DB_PASSWORD=Joaquinhost2302`
  - `DB_NAME=u101578332_odontologia`
  - `DB_PORT=3306`
- [ ] Cambié `JWT_SECRET` a algo seguro y único
- [ ] Definí `FRONTEND_ORIGIN` y `BACKEND_ORIGIN` con mis dominios de producción
- [ ] Agregué las variables en el panel de Hostinger O actualicé `.env` en el servidor
- [ ] Ejecuté `git push` para subir los cambios
- [ ] Redeployé la aplicación en Hostinger
- [ ] Pruebo `/api/health` y veo respuesta 200
- [ ] Pruebo `/internal/env-check?key=...` y ✅ todos los campos

## ❓ Solución de problemas

**Error 503 en `/api/health`**
- La app Node.js no está corriendo o hay error en `/internal/env-check?key=...`
- Verifica variables de entorno en el panel
- Revisa el startup log

**Error en login (500)**
- Probablemente conexión a BD falla
- Verifica que `DB_HOST=localhost`, `DB_USER`, `DB_PASSWORD` sean correctos
- Usa `/internal/env-check?key=...` para confirmar que están definidos

**CORS error**
- Revisa que `FRONTEND_ORIGIN` y `BACKEND_ORIGIN` coincidan exactamente con tus dominios
- No incluyas `/` al final (ej: `https://odontologiahi.com`, no `https://odontologiahi.com/`)
