# Despliegue en Dokploy

## Opcion recomendada: Docker Compose desde GitHub

1. Sube este repositorio a GitHub.
2. En Dokploy crea un proyecto nuevo.
3. Crea un servicio de tipo Docker Compose.
4. Selecciona el repositorio de GitHub.
5. Usa `docker-compose.yml` como archivo Compose.
6. En la pestana Environment de Dokploy captura las variables de `.env.dokploy.example`.
7. En Domains asigna tu dominio al servicio `app`, puerto interno `3000`.
8. Despliega.

El contenedor ejecuta automaticamente:

```bash
npm run db:init
npm run start
```

`db:init` hace `prisma db push` y `prisma db seed`. Esto es intencional porque el proyecto todavia no tiene una migracion inicial completa para una base nueva.

## Variables minimas

```env
POSTGRES_USER=factura
POSTGRES_PASSWORD=usa_una_password_larga
POSTGRES_DB=autofacturador_db
JWT_SECRET=usa_una_clave_larga_aleatoria
APP_PORT=3000
```

## Primer acceso

```text
Usuario: admin@tufisti.com
Password: admin123
```

Cambia la contrasena despues de entrar.

## Configuracion posterior

Dentro del sistema entra a Configuracion y captura:

- RFC, razon social, regimen fiscal y codigo postal.
- CSD real para timbrado.
- FIEL si usaras descarga SAT.
- PAC Finkok productivo: usuario, contrasena, ambiente Produccion.
- Timbres contratados.

## Persistencia

El Compose declara volumenes para:

- PostgreSQL
- `almacen_facturas`
- `respaldos-sistema`
- `expediente_fiscal`
- `.sat_sessions`

Estos volumenes evitan perder XML, respaldos y sesiones SAT entre despliegues.
