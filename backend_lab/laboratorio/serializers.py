from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Paciente, Resultado, Reporte, Consulta

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['is_staff'] = user.is_staff
        return token


class UsuarioSerializer(serializers.ModelSerializer):
    usuario = serializers.CharField(source='username')
    rol = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'usuario', 'rol', 'is_staff', 'password']
        extra_kwargs = {'password': {'write_only': True, 'required': False}}

    def get_rol(self, obj):
        if obj.is_superuser:
            return 'Administrador'
        return 'Bacteriólogo / Laboratorio' if obj.is_staff else 'Recepcion'

    def create(self, validated_data):
        password = validated_data.pop('password', 'Lab2026*')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class PacienteSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()

    class Meta:
        model = Paciente
        fields = [
            'id', 'tipo_documento', 'documento', 'nombres', 'apellidos',
            'nombre_completo', 'fecha_nacimiento', 'sexo', 'telefono',
            'correo', 'direccion', 'afiliacion', 'empresa', 'fecha_registro'
        ]

    def get_nombre_completo(self, obj):
        return f"{obj.nombres} {obj.apellidos}"


class ResultadoSerializer(serializers.ModelSerializer):
    paciente_display = serializers.SerializerMethodField()
    paciente_documento = serializers.CharField(source='paciente.documento', read_only=True)
    paciente_empresa = serializers.CharField(source='paciente.empresa', read_only=True)
    paciente_afiliacion = serializers.CharField(source='paciente.afiliacion', read_only=True)
    usuario_registro_nombre = serializers.CharField(source='usuario_registro.username', read_only=True)

    class Meta:
        model = Resultado
        fields = [
            'id', 'consecutivo', 'codigo_consulta', 'paciente', 'paciente_display',
            'paciente_documento', 'paciente_empresa', 'paciente_afiliacion',
            'usuario_registro', 'usuario_registro_nombre', 'tipo_examen',
            'medico_remitente', 'estado', 'fecha_toma', 'fecha_resultado',
            'detalle_examenes', 'contenido_resultado', 'parametros_json'
        ]
        read_only_fields = ['codigo_consulta', 'fecha_resultado']

    def get_paciente_display(self, obj):
        return f"{obj.paciente.documento}: {obj.paciente.nombres} {obj.paciente.apellidos}"


class ReporteSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    generado_por_nombre = serializers.CharField(source='generado_por.username', read_only=True)
    paciente_documento = serializers.CharField(source='paciente.documento', read_only=True)

    class Meta:
        model = Reporte
        fields = [
            'id', 'tipo', 'tipo_display', 'titulo', 'resultado', 'paciente',
            'paciente_documento', 'generado_por', 'generado_por_nombre',
            'filtros_aplicados', 'archivo', 'fecha_generacion'
        ]


class ConsultaSerializer(serializers.ModelSerializer):
    consecutivo = serializers.CharField(source='resultado.consecutivo', read_only=True)
    tipo_examen = serializers.CharField(source='resultado.tipo_examen', read_only=True)

    class Meta:
        model = Consulta
        fields = [
            'id', 'resultado', 'consecutivo', 'tipo_examen',
            'documento_consultado', 'codigo_ingresado', 'ip_origen',
            'exitosa', 'fecha_consulta'
        ]