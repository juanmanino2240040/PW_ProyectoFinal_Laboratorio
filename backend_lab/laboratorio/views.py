from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.dateparse import parse_datetime, parse_date
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Paciente, Resultado, Reporte, Consulta
from .serializers import (
    CustomTokenObtainPairSerializer,
    UsuarioSerializer,
    PacienteSerializer,
    ResultadoSerializer,
    ReporteSerializer,
    ConsultaSerializer,
)

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    serializer_class = UsuarioSerializer


class PacienteViewSet(viewsets.ModelViewSet):
    queryset = Paciente.objects.all().order_by('apellidos', 'nombres')
    serializer_class = PacienteSerializer


class ResultadoViewSet(viewsets.ModelViewSet):
    queryset = Resultado.objects.select_related('paciente', 'usuario_registro').all()
    serializer_class = ResultadoSerializer

    def perform_create(self, serializer):
        serializer.save(usuario_registro=self.request.user)

    # CARGA MASIVA CON ARCHIVO JSON: POST /api/resultados/importar-json/
    @action(detail=False, methods=['post'], url_path='importar-json')
    def importar_json(self, request):
        registros = request.data
        if not isinstance(registros, list):
            return Response(
                {'error': 'El archivo JSON debe ser un arreglo [...] de resultados.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        creados = 0
        actualizados = 0
        errores = []

        with transaction.atomic():
            for idx, item in enumerate(registros, start=1):
                documento = str(item.get('documento', '')).strip()
                consecutivo = str(item.get('consecutivo', '')).strip()
                tipo_examen = str(item.get('tipo_examen', '')).strip().upper()

                if not documento or not consecutivo or not tipo_examen:
                    errores.append(
                        f"Registro #{idx}: Faltan campos obligatorios (documento, consecutivo o tipo_examen)."
                    )
                    continue

                fecha_nac = parse_date(str(item.get('fecha_nacimiento', '1990-01-01'))) or parse_date('1990-01-01')

                paciente, _ = Paciente.objects.get_or_create(
                    documento=documento,
                    defaults={
                        'tipo_documento': item.get('tipo_documento', 'CC'),
                        'nombres': str(item.get('nombres', 'SIN NOMBRE')).strip().upper(),
                        'apellidos': str(item.get('apellidos', 'SIN APELLIDO')).strip().upper(),
                        'fecha_nacimiento': fecha_nac,
                        'sexo': item.get('sexo', 'M'),
                        'telefono': item.get('telefono', ''),
                        'correo': item.get('correo', ''),
                        'direccion': item.get('direccion', ''),
                        'afiliacion': item.get('afiliacion', 'PARTICULAR'),
                        'empresa': item.get('empresa', 'PARTICULAR'),
                    }
                )

                fecha_toma_raw = item.get('fecha_toma')
                fecha_toma = parse_datetime(str(fecha_toma_raw)) if fecha_toma_raw else timezone.now()
                if fecha_toma is None:
                    fecha_toma = timezone.now()

                _, created = Resultado.objects.update_or_create(
                    consecutivo=consecutivo,
                    defaults={
                        'paciente': paciente,
                        'usuario_registro': request.user if request.user.is_authenticated else None,
                        'tipo_examen': tipo_examen,
                        'medico_remitente': item.get('medico_remitente', 'PARTICULAR'),
                        'estado': item.get('estado', 'PENDIENTE'),
                        'fecha_toma': fecha_toma,
                        'detalle_examenes': item.get('detalle_examenes', ''),
                        'contenido_resultado': item.get('contenido_resultado', ''),
                        'parametros_json': item.get('parametros_json', {}),
                    }
                )
                if created:
                    creados += 1
                else:
                    actualizados += 1

        return Response({
            'mensaje': f'Proceso completado: {creados} creados, {actualizados} actualizados.',
            'creados': creados,
            'actualizados': actualizados,
            'errores': errores
        }, status=status.HTTP_201_CREATED)

    # PORTAL PÚBLICO DE PACIENTES: POST /api/resultados/consulta-publica/
    @action(detail=False, methods=['post'], url_path='consulta-publica', permission_classes=[AllowAny])
    def consulta_publica(self, request):
        documento = str(request.data.get('documento', '')).strip()
        codigo = str(request.data.get('codigo_consulta', '')).strip().upper()
        ip_cliente = request.META.get('REMOTE_ADDR')

        if not documento or not codigo:
            return Response(
                {'error': 'Debe ingresar el número de documento y el código de consulta.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        resultado = Resultado.objects.select_related('paciente').filter(
            paciente__documento=documento,
            codigo_consulta=codigo
        ).first()

        if not resultado:
            # Si existe el documento, asociamos el intento fallido a su último resultado para auditoría
            ultimo_res = Resultado.objects.filter(paciente__documento=documento).first()
            if ultimo_res:
                Consulta.objects.create(
                    resultado=ultimo_res,
                    documento_consultado=documento,
                    codigo_ingresado=codigo,
                    ip_origen=ip_cliente,
                    exitosa=False
                )
            return Response(
                {'error': 'No se encontró ningún resultado con ese documento y código de consulta.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Registrar consulta exitosa en el modelo Consulta
        Consulta.objects.create(
            resultado=resultado,
            documento_consultado=documento,
            codigo_ingresado=codigo,
            ip_origen=ip_cliente,
            exitosa=True
        )

        # Devolver todos los resultados del paciente o el resultado específico consultado
        todos_resultados = Resultado.objects.filter(paciente=resultado.paciente).order_by('-fecha_toma')
        return Response({
            'paciente': PacienteSerializer(resultado.paciente).data,
            'resultado_consultado': ResultadoSerializer(resultado).data,
            'historial': ResultadoSerializer(todos_resultados, many=True).data
        }, status=status.HTTP_200_OK)


class ReporteViewSet(viewsets.ModelViewSet):
    queryset = Reporte.objects.select_related('paciente', 'resultado', 'generado_por').all()
    serializer_class = ReporteSerializer

    def perform_create(self, serializer):
        serializer.save(generado_por=self.request.user)


class ConsultaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Consulta.objects.select_related('resultado', 'resultado__paciente').all()
    serializer_class = ConsultaSerializer