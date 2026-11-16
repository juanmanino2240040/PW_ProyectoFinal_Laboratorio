from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UsuarioViewSet,
    PacienteViewSet,
    ResultadoViewSet,
    ReporteViewSet,
    ConsultaViewSet,
)

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'pacientes', PacienteViewSet, basename='paciente')
router.register(r'resultados', ResultadoViewSet, basename='resultado')
router.register(r'reportes', ReporteViewSet, basename='reporte')
router.register(r'consultas', ConsultaViewSet, basename='consulta')

urlpatterns = [
    path('', include(router.urls)),
]