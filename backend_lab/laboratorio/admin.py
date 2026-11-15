

from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin
from .models import Paciente, Resultado, Reporte, Consulta


@admin.register(Paciente)
class PacienteAdmin(SimpleHistoryAdmin):
    list_display = ('documento', 'nombres', 'apellidos', 'fecha_nacimiento', 'afiliacion', 'empresa')
    search_fields = ('documento', 'nombres', 'apellidos')
    list_filter = ('afiliacion', 'empresa')


@admin.register(Resultado)
class ResultadoAdmin(SimpleHistoryAdmin):
    list_display = ('consecutivo', 'codigo_consulta', 'paciente', 'tipo_examen', 'estado', 'fecha_toma')
    search_fields = ('consecutivo', 'codigo_consulta', 'paciente__documento', 'paciente__nombres', 'tipo_examen')
    list_filter = ('estado', 'tipo_examen', 'fecha_toma')
    readonly_fields = ('codigo_consulta', 'fecha_resultado')


@admin.register(Reporte)
class ReporteAdmin(admin.ModelAdmin):
    list_display = ('id', 'tipo', 'titulo', 'generado_por', 'fecha_generacion')
    list_filter = ('tipo', 'fecha_generacion')
    search_fields = ('titulo', 'paciente__documento')


@admin.register(Consulta)
class ConsultaAdmin(admin.ModelAdmin):
    list_display = ('codigo_ingresado', 'documento_consultado', 'exitosa', 'ip_origen', 'fecha_consulta')
    list_filter = ('exitosa', 'fecha_consulta')
    search_fields = ('codigo_ingresado', 'documento_consultado')