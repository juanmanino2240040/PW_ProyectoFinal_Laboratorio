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


class PermisoOperacionClinica(EsAutenticadoConRol):
    """
    Reglas para operación del laboratorio:
    - Lectura (GET, HEAD, OPTIONS): ADMIN, RECEPCION, REGISTRO.
    - Escritura/edición clínica (POST, PUT, PATCH, DELETE): ADMIN y REGISTRO.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        if request.method in SAFE_METHODS:
            return request.user.rol in {'ADMIN', 'RECEPCION', 'REGISTRO'}

        return request.user.rol in {'ADMIN', 'REGISTRO'}


class PermisoPacientes(EsAutenticadoConRol):
    """
    Reglas para gestión de pacientes:
    - Lectura: todos los roles internos autenticados.
    - Creación/edición: ADMIN y RECEPCION (y opcionalmente REGISTRO si carga masiva).
    - Eliminación (DELETE): solo ADMIN.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False

        if request.method in SAFE_METHODS:
            return request.user.rol in {'ADMIN', 'RECEPCION', 'REGISTRO'}

        if request.method == 'DELETE':
            return request.user.rol == 'ADMIN'

        return request.user.rol in {'ADMIN', 'RECEPCION', 'REGISTRO'}