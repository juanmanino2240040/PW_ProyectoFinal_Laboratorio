from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ConsultaAuditoriaViewSet,
    ConsultaPublicaView,
    PacienteViewSet,
    ReporteViewSet,
    ResultadoViewSet,
)

router = DefaultRouter()
router.register(r'pacientes', PacienteViewSet, basename='paciente')
router.register(r'resultados', ResultadoViewSet, basename='resultado')
router.register(r'reportes', ReporteViewSet, basename='reporte')
router.register(r'auditoria-consultas', ConsultaAuditoriaViewSet, basename='auditoria-consulta')

urlpatterns = [
    path('', include(router.urls)),
    path('consulta-publica/', ConsultaPublicaView.as_view(), name='consulta-publica'),
]