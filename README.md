# Sistema de Información Web - Laboratorio de Bacteriología

Aplicación web Full-Stack (SPA) diseñada para la gestión integral de un laboratorio clínico y de bacteriología. Permite administrar pacientes, registrar y editar resultados microbiológicos, realizar cargas masivas mediante archivos JSON, auditar consultas externas y brindar un portal público para que los pacientes descarguen e impriman sus exámenes usando su documento y un código único de consulta.

---

## Arquitectura y Tecnologías

### Frontend (SPA)
* **React 18 + Vite:** Interfaz reactiva de una sola página con navegación modular sin recargas.
* **Axios + JWT (`jwt-decode`):** Consumo de API REST con interceptores automáticos para adjuntar tokens `Bearer` y renovar sesiones expiradas.
* **CSS3 / FontAwesome 6:** Diseño clínico limpio con modales de edición, tooltips informativos y soporte de impresión a PDF.

### Backend (API REST)
* **Python 3.13 + Django 5 + Django REST Framework:** API estructurada mediante `ViewSets` y `DefaultRouter`.
* **SimpleJWT (`djangorestframework-simplejwt`):** Autenticación segura basada en tokens de acceso y refresco.
* **PostgreSQL:** Base de datos relacional para almacenamiento persistente.
* **Django Simple History:** Trazabilidad y auditoría de cambios históricos sobre `Paciente` y `Resultado`.

---

## Estructura del Repositorio

```text
PW_ProyectoFinal_Laboratorio/
├── backend_lab/                  # Proyecto Backend en Django
│   ├── backend_lab/              # Configuración principal (settings.py, urls.py)
│   ├── laboratorio/              # App principal (models.py, serializers.py, views.py, urls.py)
│   ├── manage.py
│   └── requirements.txt          # Dependencias de Python
│
└── frontend_lab/                 # Proyecto Frontend en React (Vite)
    ├── src/
    │   ├── api/
    │   │   └── axiosConfig.js    # Cliente HTTP con interceptores JWT
    │   ├── components/
    │   │   ├── Login.jsx
    │   │   ├── PortalPaciente.jsx
    │   │   ├── Navbar.jsx
    │   │   ├── ResultadosTab.jsx
    │   │   ├── EditResultModal.jsx
    │   │   └── GestionUsuariosTab.jsx
    │   ├── App.jsx
    │   ├── App.css
    │   ├── index.css
    │   └── main.jsx
    ├── .env
    └── package.json
```

---

## Modelos Principales del Sistema

1. **Usuarios (`User`):** Control de acceso interno (Administradores, Bacteriólogos y Recepción) autenticado vía JWT.
2. **Pacientes (`Paciente`):** Expediente demográfico (tipo y número de documento, nombres, apellidos, fecha de nacimiento, sexo, contacto, empresa y afiliación) con historial de cambios.
3. **Resultados (`Resultado`):** Registro clínico vinculado al paciente con consecutivo único, código público autogenerado de 8 caracteres (`codigo_consulta`), tipo de examen, médico remitente, estado (`PENDIENTE` / `IMPRESO`), contenido formateado y soporte de parámetros estructurados (`JSONField`).
4. **Consultas (`Consulta`):** Auditoría de accesos realizados desde el portal público (documento consultado, código ingresado, IP de origen, fecha y estado exitoso/fallido).
5. **Reportes (`Reporte`):** Gestión de certificaciones individuales, consolidados por paciente y reportes estadísticos.

---

## Guía de Instalación y Ejecución

### Prerrequisitos
* **Python** 3.11 o superior
* **Node.js** 18+ y **npm**
* **PostgreSQL** 14+ en ejecución en el puerto `5432`

---

### 1. Configuración de la Base de Datos (PostgreSQL)

Desde **pgAdmin 4** o **SQL Shell (`psql`)**, crea el usuario y la base de datos del proyecto:

```sql
CREATE USER lab_user WITH PASSWORD 'tu_password';
CREATE DATABASE bacteriologia_db OWNER lab_user;
GRANT ALL PRIVILEGES ON DATABASE bacteriologia_db TO lab_user;
```

---

### 2. Instalación del Backend (Django)

1. Navega a la carpeta del backend y activa el entorno virtual:
   ```bash
   cd backend_lab
   python -m venv .venv
   # En Windows:
   .venv\Scripts\activate
   # En Linux/Mac:
   source .venv/bin/activate
   ```

2. Instala las dependencias de Python:
   ```bash
   pip install Django djangorestframework djangorestframework-simplejwt django-cors-headers psycopg[binary] django-simple-history python-dotenv
   ```

3. Verifica las credenciales en `backend_lab/settings.py`:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': 'bacteriologia_db',
           'USER': 'lab_user',
           'PASSWORD': 'tu_password',
           'HOST': '127.0.0.1',
           'PORT': '5432',
       }
   }
   ```

4. Aplica las migraciones, crea el usuario administrador y levanta el servidor:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver
   ```
   El backend quedará activo en `http://127.0.0.1:8000`.

---

### 3. Instalación del Frontend (React + Vite)

1. Abre una nueva terminal, entra a la carpeta del frontend e instala los paquetes:
   ```bash
   cd frontend_lab
   npm install
   ```

2. Crea un archivo `.env` en la raíz de `frontend_lab` con la URL de la API:
   ```env
   VITE_API_URL=http://127.0.0.1:8000/api
   ```

3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:5173`.

---

## Endpoints Principales de la API

| Endpoint | Método | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `/api/token/` | `POST` | Público | Obtiene el par de tokens JWT (`access` y `refresh`). |
| `/api/token/refresh/` | `POST` | Público | Renueva un token de acceso expirado. |
| `/api/resultados/` | `GET`, `POST` | Autenticado | Lista y registra resultados clínicos. |
| `/api/resultados/<id>/` | `PUT`, `DELETE` | Autenticado | Actualiza o elimina un resultado existente. |
| `/api/resultados/importar-json/` | `POST` | Autenticado | Carga masiva de pacientes y resultados desde un archivo `.json`. |
| `/api/resultados/consulta-publica/` | `POST` | Público | Valida `documento` + `codigo_consulta` y registra auditoría. |
| `/api/pacientes/` | `GET`, `POST` | Autenticado | Gestión de expedientes de pacientes. |
| `/api/consultas/` | `GET` | Autenticado | Historial de auditoría de consultas en el portal público. |
| `/api/reportes/` | `GET`, `POST` | Autenticado | Consulta y generación de reportes del laboratorio. |
| `/api/usuarios/` | `GET`, `POST` | Autenticado | Administración de usuarios y roles del sistema. |

---

## Formato para Carga Masiva JSON

Desde el módulo **Resultados -> Importar JSON**, se pueden cargar lotes de exámenes utilizando un archivo `.json` con la siguiente estructura:

```json
[
  {
    "consecutivo": "101",
    "tipo_documento": "CC",
    "documento": "91230146",
    "nombres": "JHON GABINO",
    "apellidos": "PINZON POF",
    "fecha_nacimiento": "1985-04-12",
    "sexo": "M",
    "afiliacion": "PARTICULAR",
    "empresa": "PARTICULAR",
    "tipo_examen": "QUÍMICA SANGUÍNEA",
    "medico_remitente": "PARTICULAR",
    "estado": "IMPRESO",
    "fecha_toma": "2026-11-16T08:30:00Z",
    "detalle_examenes": "Glicemia basal en suero",
    "contenido_resultado": "GLICEMIA BASAL: 103 mg/dL (Rango: 70 - 100 mg/dL)",
    "parametros_json": {
      "glicemia": "103 mg/dL"
    }
  }
]
```

---

## Créditos

Desarrollado por **JOTAFREX** — Proyecto Final de Programación Web.