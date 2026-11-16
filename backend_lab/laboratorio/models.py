import secrets
import string
from django.conf import settings
from django.db import models, transaction
from simple_history.models import HistoricalRecords


def generar_codigo_consulta():
    """Genera un código alfanumérico único de 8 caracteres para el portal público."""
    caracteres = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(caracteres) for _ in range(8))


def generar_consecutivo_resultado():
    """Genera un consecutivo único y consecutivo para resultados."""
    with transaction.atomic():
        ultimo = Resultado.objects.select_for_update().order_by('-id').first()
        siguiente = (ultimo.id + 1) if ultimo else 1
        while True:
            consecutivo = f"R-{siguiente:06d}"
            if not Resultado.objects.filter(consecutivo=consecutivo).exists():
                return consecutivo
            siguiente += 1


class Paciente(models.Model):
    class TipoDocumento(models.TextChoices):
        CC = 'CC', 'Cédula de Ciudadanía'
        TI = 'TI', 'Tarjeta de Identidad'
        CE = 'CE', 'Cédula de Extranjería'
        PA = 'PA', 'Pasaporte'
        RC = 'RC', 'Registro Civil'

    class Sexo(models.TextChoices):
        MASCULINO = 'M', 'Masculino'
        FEMENINO = 'F', 'Femenino'
        OTRO = 'O', 'Otro'

    tipo_documento = models.CharField(
        max_length=5,
        choices=TipoDocumento.choices,
        default=TipoDocumento.CC
    )
    documento = models.CharField(max_length=25, unique=True, db_index=True)
    nombres = models.CharField(max_length=120)
    apellidos = models.CharField(max_length=120)
    fecha_nacimiento = models.DateField(verbose_name='Fecha de nacimiento')
    sexo = models.CharField(max_length=1, choices=Sexo.choices, default=Sexo.MASCULINO)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    correo = models.EmailField(blank=True, null=True)
    direccion = models.CharField(max_length=200, blank=True, null=True)
    afiliacion = models.CharField(max_length=100, default='PARTICULAR', blank=True)
    empresa = models.CharField(max_length=120, default='PARTICULAR', blank=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    history = HistoricalRecords()

    class Meta:
        verbose_name = 'Paciente'
        verbose_name_plural = 'Pacientes'
        ordering = ['apellidos', 'nombres']

    def __str__(self):
        return f"{self.documento} - {self.nombres} {self.apellidos}"


class Resultado(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        IMPRESO = 'IMPRESO', 'Impreso'

    consecutivo = models.CharField(max_length=30, unique=True, db_index=True)
    codigo_consulta = models.CharField(
        max_length=12,
        unique=True,
        default=generar_codigo_consulta,
        editable=False,
        db_index=True
    )
    paciente = models.ForeignKey(Paciente, on_delete=models.PROTECT, related_name='resultados')
    usuario_registro = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    # Campos del formulario y carga masiva JSON
    tipo_examen = models.CharField(max_length=150, db_index=True)
    medico_remitente = models.CharField(max_length=150, default='PARTICULAR', blank=True)
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.PENDIENTE, db_index=True)
    fecha_toma = models.DateTimeField()
    fecha_resultado = models.DateTimeField(auto_now=True)

    detalle_examenes = models.CharField(max_length=255, blank=True, null=True)
    contenido_resultado = models.TextField(
        blank=True,
        null=True,
        help_text='Texto formateado desde la plantilla y editado por el bacteriólogo'
    )
    parametros_json = models.JSONField(
        default=dict,
        blank=True,
        help_text='Datos adicionales estructurados para carga masiva JSON'
    )

    history = HistoricalRecords()

    class Meta:
        verbose_name = 'Resultado'
        verbose_name_plural = 'Resultados'
        ordering = ['-fecha_toma']

    def save(self, *args, **kwargs):
        if not self.consecutivo:
            self.consecutivo = generar_consecutivo_resultado()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"#{self.consecutivo} | {self.tipo_examen} - {self.paciente.documento}"


class Reporte(models.Model):
    class TipoReporte(models.TextChoices):
        CERTIFICADO_INDIVIDUAL = 'CERTIFICADO', 'Certificación Individual PDF'
        REPORTE_PACIENTE = 'PACIENTE', 'Historial Consolidado de Paciente'
        EXPORTACION_EXCEL = 'EXCEL', 'Exportación Tabular Excel'
        ESTADISTICO = 'ESTADISTICO', 'Reporte Estadístico de Laboratorio'

    tipo = models.CharField(max_length=20, choices=TipoReporte.choices)
    titulo = models.CharField(max_length=200)
    resultado = models.ForeignKey(
        Resultado,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reportes'
    )
    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reportes'
    )
    generado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    filtros_aplicados = models.JSONField(
        default=dict,
        blank=True,
        help_text='Guarda los criterios de búsqueda usados (fechas, estado, etc.)'
    )
    archivo = models.FileField(
        upload_to='reportes/%Y/%m/',
        null=True,
        blank=True
    )
    fecha_generacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Reporte'
        verbose_name_plural = 'Reportes'
        ordering = ['-fecha_generacion']

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.titulo} ({self.fecha_generacion:%Y-%m-%d})"


class Consulta(models.Model):
    """Registra y valida las consultas realizadas desde el portal público por los pacientes."""
    resultado = models.ForeignKey(
        Resultado,
        on_delete=models.CASCADE,
        related_name='consultas_publicas'
    )
    documento_consultado = models.CharField(max_length=25)
    codigo_ingresado = models.CharField(max_length=12)
    ip_origen = models.GenericIPAddressField(null=True, blank=True)
    exitosa = models.BooleanField(default=True)
    fecha_consulta = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Consulta Pública'
        verbose_name_plural = 'Consultas Públicas'
        ordering = ['-fecha_consulta']

    def __str__(self):
        estado = "Exitosa" if self.exitosa else "Fallida"
        return f"Consulta {self.codigo_ingresado} ({self.documento_consultado}) - {estado}"