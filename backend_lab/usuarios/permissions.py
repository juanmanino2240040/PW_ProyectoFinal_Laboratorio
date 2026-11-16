from rest_framework.permissions import BasePermission, SAFE_METHODS


class EsAutenticadoConRol(BasePermission):
    """Base para verificar que el usuario esté autenticado y tenga un rol asignado."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'rol', None)
        )


class EsAdmin(EsAutenticadoConRol):
    """Solo permite acceso a usuarios con rol ADMIN."""

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.rol == 'ADMIN'


class EsAdminORecepcion(EsAutenticadoConRol):
    """Permite acceso a ADMIN y RECEPCION."""

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.rol in {
            'ADMIN',
            'RECEPCION',
        }


class EsAdminORegistro(EsAutenticadoConRol):
    """Permite acceso a ADMIN y REGISTRO."""

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.rol in {
            'ADMIN',
            'REGISTRO',
        }


class PermisoPacientes(EsAutenticadoConRol):
    """
    Pacientes:
    - Lectura: ADMIN, RECEPCION, REGISTRO.
    - Creación/edición: ADMIN, RECEPCION, REGISTRO.
    - Eliminación: solo ADMIN.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        if request.method in SAFE_METHODS:
            return request.user.rol in {'ADMIN', 'RECEPCION', 'REGISTRO'}

        if request.method == 'DELETE':
            return request.user.rol == 'ADMIN'

        return request.user.rol in {'ADMIN', 'RECEPCION', 'REGISTRO'}


class PermisoResultados(EsAutenticadoConRol):
    """
    Resultados individuales:
    - Lectura: ADMIN, RECEPCION, REGISTRO.
    - Creación/edición: ADMIN, REGISTRO.
    - Eliminación: solo ADMIN.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        if request.method in SAFE_METHODS:
            return request.user.rol in {'ADMIN', 'RECEPCION', 'REGISTRO'}

        if request.method == 'DELETE':
            return request.user.rol == 'ADMIN'

        return request.user.rol in {'ADMIN', 'REGISTRO'}


class PermisoReportes(EsAutenticadoConRol):
    """
    Reportes:
    - Lectura/descarga (GET): ADMIN, RECEPCION, REGISTRO.
    - Generación (POST): ADMIN, REGISTRO.
    - Eliminación (DELETE): solo ADMIN.
    - Otras modificaciones: solo ADMIN.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        if request.method in SAFE_METHODS:
            return request.user.rol in {'ADMIN', 'RECEPCION', 'REGISTRO'}

        if request.method == 'POST':
            return request.user.rol in {'ADMIN', 'REGISTRO'}

        if request.method == 'DELETE':
            return request.user.rol == 'ADMIN'

        return request.user.rol == 'ADMIN'


class PermisoConsultas(EsAutenticadoConRol):
    """
    Historial de consultas:
    - Lectura: ADMIN, RECEPCION, REGISTRO.
    - Escritura/eliminación: solo ADMIN.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        if request.method in SAFE_METHODS:
            return request.user.rol in {'ADMIN', 'RECEPCION', 'REGISTRO'}

        return request.user.rol == 'ADMIN'