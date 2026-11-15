from django.utils import timezone
from rest_framework import serializers
from .models import Paciente, Resultado, Reporte, Consulta


class PacienteSerializer(serializers.ModelSerializer):
    tipo_documento_display = serializers.CharField(source='get_tipo_documento_display', read_only=True)
    sexo_display = serializers.CharField(source='get_sexo_display', read_only=True)
    nombre_completo = serializers.SerializerMethodField()

    class Meta:
        model = Paciente
        fields = [
            'id',
            'tipo_documento',
            'tipo_documento_display',
            'documento',
            'nombres',
            'apellidos',
            'nombre_completo',
            'fecha_nacimiento',
            'sexo',
            'sexo_display',
            'telefono',
            'correo',
            'direccion',
            'afiliacion',
            'empresa',
            'fecha_registro',
        ]
        read_only_fields = ['id', 'fecha_registro', 'tipo_documento_display', 'sexo_display', 'nombre_completo']

    def get_nombre_completo(self, obj):
        return f"{obj.nombres} {obj.apellidos}".strip()

    def validate_documento(self, value):
        limpio = value.strip()
        qs = Paciente.objects.filter(documento=limpio)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ya existe un paciente registrado con este documento.')
        return limpio


class PacienteResumenSerializer(serializers.ModelSerializer):
    """Sub-serializer para incrustar datos clave del paciente dentro de Resultado y Reporte."""
    class Meta:
        model = Paciente
        fields = ['id', 'tipo_documento', 'documento', 'nombres', 'apellidos', 'fecha_nacimiento', 'sexo', 'afiliacion', 'empresa']
        read_only_fields = fields


class ResultadoSerializer(serializers.ModelSerializer):
    paciente_detalle = PacienteResumenSerializer(source='paciente', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    usuario_registro_username = serializers.CharField(source='usuario_registro.username', read_only=True)

    class Meta:
        model = Resultado
        fields = [
            'id',
            'consecutivo',
            'codigo_consulta',
            'paciente',
            'paciente_detalle',
            'usuario_registro',
            'usuario_registro_username',
            'tipo_examen',
            'medico_remitente',
            'estado',
            'estado_display',
            'fecha_toma',
            'fecha_resultado',
            'detalle_examenes',
            'contenido_resultado',
            'parametros_json',
        ]
        read_only_fields = [
            'id',
            'codigo_consulta',
            'fecha_resultado',
            'paciente_detalle',
            'estado_display',
            'usuario_registro_username',
        ]

    def validate_consecutivo(self, value):
        limpio = value.strip()
        qs = Resultado.objects.filter(consecutivo=limpio)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Este consecutivo ya está registrado.')
        return limpio

    def validate_parametros_json(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError('parametros_json debe ser un objeto JSON clave-valor.')
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated and not validated_data.get('usuario_registro'):
            validated_data['usuario_registro'] = request.user
        return super().create(validated_data)


class ResultadoCargaMasivaItemSerializer(serializers.Serializer):
    """Valida cada objeto dentro del JSON de carga masiva."""
    consecutivo = serializers.CharField(max_length=30)
    tipo_examen = serializers.CharField(max_length=150)
    medico_remitente = serializers.CharField(max_length=150, required=False, default='PARTICULAR')
    estado = serializers.ChoiceField(choices=Resultado.Estado.choices, required=False, default=Resultado.Estado.PENDIENTE)
    fecha_toma = serializers.DateTimeField(required=False, default=timezone.now)
    detalle_examenes = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    contenido_resultado = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    parametros_json = serializers.JSONField(required=False, default=dict)

    # Datos del paciente para crearlo o vincularlo automáticamente
    paciente_documento = serializers.CharField(max_length=25)
    paciente_tipo_documento = serializers.ChoiceField(
        choices=Paciente.TipoDocumento.choices,
        required=False,
        default=Paciente.TipoDocumento.CC
    )
    paciente_nombres = serializers.CharField(max_length=120)
    paciente_apellidos = serializers.CharField(max_length=120)
    paciente_fecha_nacimiento = serializers.DateField()
    paciente_sexo = serializers.ChoiceField(choices=Paciente.Sexo.choices, required=False, default=Paciente.Sexo.MASCULINO)
    paciente_telefono = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    paciente_correo = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    paciente_afiliacion = serializers.CharField(max_length=100, required=False, default='PARTICULAR')
    paciente_empresa = serializers.CharField(max_length=120, required=False, default='PARTICULAR')

    def validate_consecutivo(self, value):
        limpio = value.strip()
        if Resultado.objects.filter(consecutivo=limpio).exists():
            raise serializers.ValidationError(f"El consecutivo '{limpio}' ya existe en la base de datos.")
        return limpio

    def validate_fecha_toma(self, value):
        return value or timezone.now()


class ResultadoCargaMasivaLoteSerializer(serializers.Serializer):
    """Recibe una lista de ítems bajo la clave 'resultados'."""
    resultados = ResultadoCargaMasivaItemSerializer(many=True)

    def validate_resultados(self, items):
        if not items:
            raise serializers.ValidationError('La lista de resultados no puede estar vacía.')
        consecutivos = [item['consecutivo'].strip() for item in items]
        if len(consecutivos) != len(set(consecutivos)):
            raise serializers.ValidationError('Existen consecutivos duplicados dentro del mismo archivo JSON.')
        return items


class ReporteSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    paciente_detalle = PacienteResumenSerializer(source='paciente', read_only=True)
    generado_por_username = serializers.CharField(source='generado_por.username', read_only=True)

    class Meta:
        model = Reporte
        fields = [
            'id',
            'tipo',
            'tipo_display',
            'titulo',
            'resultado',
            'paciente',
            'paciente_detalle',
            'generado_por',
            'generado_por_username',
            'filtros_aplicados',
            'archivo',
            'fecha_generacion',
        ]
        read_only_fields = [
            'id',
            'tipo_display',
            'paciente_detalle',
            'generado_por',
            'generado_por_username',
            'fecha_generacion',
        ]


class ConsultaPublicaRequestSerializer(serializers.Serializer):
    """Payload que envía el paciente desde el portal público."""
    documento = serializers.CharField(max_length=25)
    codigo_consulta = serializers.CharField(max_length=12)
    fecha_nacimiento = serializers.DateField(help_text='Verificación adicional de identidad del paciente')


class ConsultaPublicaResponseSerializer(serializers.ModelSerializer):
    """Solo expone lo necesario al paciente una vez validada su identidad."""
    paciente_nombre = serializers.SerializerMethodField()
    paciente_documento = serializers.CharField(source='paciente.documento', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = Resultado
        fields = [
            'consecutivo',
            'codigo_consulta',
            'paciente_nombre',
            'paciente_documento',
            'tipo_examen',
            'medico_remitente',
            'estado',
            'estado_display',
            'fecha_toma',
            'fecha_resultado',
            'detalle_examenes',
            'contenido_resultado',
            'parametros_json',
        ]
        read_only_fields = fields

    def get_paciente_nombre(self, obj):
        return f"{obj.paciente.nombres} {obj.paciente.apellidos}".strip()


class ConsultaAuditoriaSerializer(serializers.ModelSerializer):
    """Para el historial interno de consultas realizadas en el portal público."""
    class Meta:
        model = Consulta
        fields = [
            'id',
            'resultado',
            'documento_consultado',
            'codigo_ingresado',
            'ip_origen',
            'exitosa',
            'fecha_consulta',
        ]
        read_only_fields = fields