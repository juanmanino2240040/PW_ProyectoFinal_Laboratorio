from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from usuarios.permissions import EsAutenticadoConRol, PermisoOperacionClinica, PermisoPacientes

from .models import Consulta, Paciente, Reporte, Resultado
from .serializers import (
    ConsultaAuditoriaSerializer,
    ConsultaPublicaRequestSerializer,
    ConsultaPublicaResponseSerializer,
    PacienteSerializer,
    ReporteSerializer,
    ResultadoCargaMasivaLoteSerializer,
    ResultadoSerializer,
)


class PacienteViewSet(viewsets.ModelViewSet):
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
    permission_classes = [AllowAny]
    search_fields = ['documento', 'nombres', 'apellidos', 'empresa']
    ordering_fields = ['apellidos', 'fecha_registro', 'documento']


class ResultadoViewSet(viewsets.ModelViewSet):
    queryset = Resultado.objects.select_related('paciente', 'usuario_registro').all()
    serializer_class = ResultadoSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'], url_path='carga-masiva')
    def carga_masiva(self, request):
        """Recibe un JSON con {'resultados': [...]} y crea pacientes + resultados en lote."""
        lote_serializer = ResultadoCargaMasivaLoteSerializer(data=request.data)
        lote_serializer.is_valid(raise_exception=True)

        items = lote_serializer.validated_data['resultados']
        creados = []

        with transaction.atomic():
            for item in items:
                paciente, _ = Paciente.objects.get_or_create(
                    documento=item['paciente_documento'].strip(),
                    defaults={
                        'tipo_documento': item['paciente_tipo_documento'],
                        'nombres': item['paciente_nombres'].strip(),
                        'apellidos': item['paciente_apellidos'].strip(),
                        'fecha_nacimiento': item['paciente_fecha_nacimiento'],
                        'sexo': item['paciente_sexo'],
                        'telefono': item.get('paciente_telefono'),
                        'correo': item.get('paciente_correo'),
                        'afiliacion': item['paciente_afiliacion'],
                        'empresa': item['paciente_empresa'],
                    },
                )

                resultado = Resultado.objects.create(
                    consecutivo=item['consecutivo'].strip(),
                    paciente=paciente,
                    usuario_registro=request.user if request.user.is_authenticated else None,
                    tipo_examen=item['tipo_examen'].strip(),
                    medico_remitente=item['medico_remitente'],
                    estado=item['estado'],
                    fecha_toma=item.get('fecha_toma') or timezone.now(),
                    detalle_examenes=item.get('detalle_examenes'),
                    contenido_resultado=item.get('contenido_resultado'),
                    parametros_json=item.get('parametros_json', {}),
                )
                creados.append(resultado)

        data = ResultadoSerializer(creados, many=True, context={'request': request}).data
        return Response(
            {'total_creados': len(creados), 'resultados': data},
            status=status.HTTP_201_CREATED,
        )


class ReporteViewSet(viewsets.ModelViewSet):
    queryset = Reporte.objects.select_related('paciente', 'resultado', 'generado_por').all()
    serializer_class = ReporteSerializer
    # permission_classes = [EsAutenticadoConRol]
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        serializer.save(generado_por=self.request.user)


class ConsultaAuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Consulta.objects.select_related('resultado').all()
    serializer_class = ConsultaAuditoriaSerializer
    permission_classes = [AllowAny]


class ConsultaPublicaView(APIView):
    """Endpoint público para que el paciente consulte su resultado validado."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_client_ip(self, request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    def post(self, request):
        serializer = ConsultaPublicaRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        documento = serializer.validated_data['documento'].strip()
        codigo = serializer.validated_data['codigo_consulta'].strip().upper()
        fecha_nac = serializer.validated_data['fecha_nacimiento']
        ip = self.get_client_ip(request)

        resultado = (
            Resultado.objects.select_related('paciente')
            .filter(
                paciente__documento=documento,
                codigo_consulta=codigo,
                paciente__fecha_nacimiento=fecha_nac,
            )
            .first()
        )

        if not resultado:
            return Response(
                {'detail': 'No se encontró un resultado con los datos ingresados.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if resultado.estado != Resultado.Estado.IMPRESO:
            Consulta.objects.create(
                resultado=resultado,
                documento_consultado=documento,
                codigo_ingresado=codigo,
                ip_origen=ip,
                exitosa=False,
            )
            return Response(
                {'detail': 'El resultado aún no ha sido validado o impreso por el laboratorio.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        Consulta.objects.create(
            resultado=resultado,
            documento_consultado=documento,
            codigo_ingresado=codigo,
            ip_origen=ip,
            exitosa=True,
        )

        payload = ConsultaPublicaResponseSerializer(resultado).data
        return Response(payload, status=status.HTTP_200_OK)