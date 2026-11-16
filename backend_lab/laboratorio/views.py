import csv
import io
from datetime import datetime

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.db import transaction
from django.template.loader import render_to_string
from django.utils.dateparse import parse_datetime, parse_date
from django.utils import timezone
from openpyxl import Workbook
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from xhtml2pdf import pisa

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

    # CARGA MASIVA CON ARCHIVO JSON: POST /api/resultados/carga-masiva/
    @action(detail=False, methods=['post'], url_path='carga-masiva')
    def carga_masiva(self, request):
        payload = request.data
        if isinstance(payload, dict) and 'resultados' in payload:
            registros = payload.get('resultados')
        elif isinstance(payload, list):
            # Compatibilidad con formato anterior (arreglo directo)
            registros = payload
        else:
            return Response(
                {'detail': 'El cuerpo debe ser un objeto con la clave "resultados" que contenga un arreglo.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(registros, list):
            return Response(
                {'detail': 'La clave "resultados" debe contener un arreglo de registros.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(registros) == 0:
            return Response({'detail': 'No hay registros para procesar.'}, status=status.HTTP_400_BAD_REQUEST)

        errores = []
        normalizados = []
        consecutivos_vistos = {}

        # 1) Validación previa de todo el lote (sin escribir en BD)
        for idx, item in enumerate(registros, start=1):
            if not isinstance(item, dict):
                errores.append(f'Registro #{idx}: cada elemento debe ser un objeto JSON.')
                continue

            documento = str(item.get('documento', '')).strip()
            consecutivo = str(item.get('consecutivo', '')).strip()
            tipo_examen = str(item.get('tipo_examen', '')).strip().upper()

            if not documento:
                errores.append(f'Registro #{idx}: el campo "documento" es obligatorio.')
            if not consecutivo:
                errores.append(f'Registro #{idx}: el campo "consecutivo" es obligatorio.')
            if not tipo_examen:
                errores.append(f'Registro #{idx}: el campo "tipo_examen" es obligatorio.')

            if consecutivo:
                if consecutivo in consecutivos_vistos:
                    errores.append(f'Registro #{idx}: consecutivo duplicado en el archivo ("{consecutivo}", ya usado en registro #{consecutivos_vistos[consecutivo]}).')
                else:
                    consecutivos_vistos[consecutivo] = idx

            fecha_nac_raw = item.get('fecha_nacimiento')
            fecha_nac = parse_date(str(fecha_nac_raw)) if fecha_nac_raw else parse_date('1990-01-01')
            if fecha_nac is None:
                errores.append(f'Registro #{idx}: "fecha_nacimiento" inválida.')

            fecha_toma_raw = item.get('fecha_toma')
            if fecha_toma_raw:
                fecha_toma = parse_datetime(str(fecha_toma_raw))
                if fecha_toma is None:
                    errores.append(f'Registro #{idx}: "fecha_toma" inválida (use formato ISO, ej. 2026-01-15T10:30:00).')
            else:
                fecha_toma = timezone.now()

            estado = str(item.get('estado', 'PENDIENTE')).strip().upper() or 'PENDIENTE'
            if estado not in dict(Resultado.Estado.choices):
                errores.append(f'Registro #{idx}: "estado" inválido ("{estado}"). Valores permitidos: {", ".join(dict(Resultado.Estado.choices).keys())}.')

            sexo = str(item.get('sexo', 'M')).strip().upper() or 'M'
            if sexo not in dict(Paciente.Sexo.choices):
                errores.append(f'Registro #{idx}: "sexo" inválido ("{sexo}"). Valores permitidos: {", ".join(dict(Paciente.Sexo.choices).keys())}.')

            tipo_documento = str(item.get('tipo_documento', 'CC')).strip().upper() or 'CC'
            if tipo_documento not in dict(Paciente.TipoDocumento.choices):
                errores.append(f'Registro #{idx}: "tipo_documento" inválido ("{tipo_documento}").')

            normalizados.append({
                'idx': idx,
                'documento': documento,
                'consecutivo': consecutivo,
                'tipo_examen': tipo_examen,
                'fecha_nacimiento': fecha_nac,
                'fecha_toma': fecha_toma,
                'estado': estado,
                'sexo': sexo,
                'tipo_documento': tipo_documento,
                'nombres': str(item.get('nombres', 'SIN NOMBRE')).strip().upper(),
                'apellidos': str(item.get('apellidos', 'SIN APELLIDO')).strip().upper(),
                'telefono': item.get('telefono', ''),
                'correo': item.get('correo', ''),
                'direccion': item.get('direccion', ''),
                'afiliacion': item.get('afiliacion', 'PARTICULAR'),
                'empresa': item.get('empresa', 'PARTICULAR'),
                'medico_remitente': item.get('medico_remitente', 'PARTICULAR'),
                'detalle_examenes': item.get('detalle_examenes', ''),
                'contenido_resultado': item.get('contenido_resultado', ''),
                'parametros_json': item.get('parametros_json', {}) if isinstance(item.get('parametros_json', {}), dict) else {},
            })

        if errores:
            return Response(
                {
                    'detail': 'La carga masiva fue rechazada. Corrija los errores y vuelva a intentar.',
                    'errores': errores,
                    'total_errores': len(errores),
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2) Ejecución atómica: todo o nada
        try:
            with transaction.atomic():
                creados = 0
                actualizados = 0
                for item in normalizados:
                    paciente, _ = Paciente.objects.get_or_create(
                        documento=item['documento'],
                        defaults={
                            'tipo_documento': item['tipo_documento'],
                            'nombres': item['nombres'],
                            'apellidos': item['apellidos'],
                            'fecha_nacimiento': item['fecha_nacimiento'],
                            'sexo': item['sexo'],
                            'telefono': item['telefono'],
                            'correo': item['correo'],
                            'direccion': item['direccion'],
                            'afiliacion': item['afiliacion'],
                            'empresa': item['empresa'],
                        }
                    )

                    _, created = Resultado.objects.update_or_create(
                        consecutivo=item['consecutivo'],
                        defaults={
                            'paciente': paciente,
                            'usuario_registro': request.user if request.user.is_authenticated else None,
                            'tipo_examen': item['tipo_examen'],
                            'medico_remitente': item['medico_remitente'],
                            'estado': item['estado'],
                            'fecha_toma': item['fecha_toma'],
                            'detalle_examenes': item['detalle_examenes'],
                            'contenido_resultado': item['contenido_resultado'],
                            'parametros_json': item['parametros_json'],
                        }
                    )
                    if created:
                        creados += 1
                    else:
                        actualizados += 1
        except Exception as e:
            return Response(
                {'detail': f'Error al procesar la carga masiva. No se realizaron cambios: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'mensaje': f'Proceso completado: {creados} creados, {actualizados} actualizados.',
            'creados': creados,
            'actualizados': actualizados,
            'total': len(normalizados),
        }, status=status.HTTP_201_CREATED)

    # Compatibilidad: mantiene la ruta anterior delegando en carga-masiva
    @action(detail=False, methods=['post'], url_path='importar-json')
    def importar_json(self, request):
        return self.carga_masiva(request)

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

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        tipo = data.get('tipo')
        titulo = (data.get('titulo') or '').strip()

        if not tipo or not titulo:
            return Response({'detail': 'Los campos tipo y título son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)

        resultado_obj = None
        paciente_obj = None
        filtros = {}

        # Resolver selección/filtros según el tipo de reporte
        resultado_id = data.get('resultado')
        paciente_id = data.get('paciente')
        fecha_desde = data.get('fecha_desde')
        fecha_hasta = data.get('fecha_hasta')
        estado_filtro = data.get('estado')
        empresa_filtro = data.get('empresa')

        if resultado_id:
            resultado_obj = Resultado.objects.select_related('paciente').filter(id=resultado_id).first()
            if not resultado_obj:
                return Response({'resultado': 'Resultado no encontrado.'}, status=status.HTTP_400_BAD_REQUEST)
            paciente_obj = resultado_obj.paciente
            filtros['resultado_id'] = resultado_obj.id

        if paciente_id:
            paciente_obj = Paciente.objects.filter(id=paciente_id).first()
            if not paciente_obj:
                return Response({'paciente': 'Paciente no encontrado.'}, status=status.HTTP_400_BAD_REQUEST)
            filtros['paciente_id'] = paciente_obj.id

        if fecha_desde:
            filtros['fecha_desde'] = str(fecha_desde)
        if fecha_hasta:
            filtros['fecha_hasta'] = str(fecha_hasta)
        if estado_filtro:
            filtros['estado'] = str(estado_filtro)
        if empresa_filtro:
            filtros['empresa'] = str(empresa_filtro)

        qs = Resultado.objects.select_related('paciente').all().order_by('-fecha_toma')
        if resultado_obj:
            qs = qs.filter(id=resultado_obj.id)
        elif paciente_obj:
            qs = qs.filter(paciente=paciente_obj)
        if estado_filtro:
            qs = qs.filter(estado=estado_filtro)
        if empresa_filtro:
            qs = qs.filter(paciente__empresa__icontains=empresa_filtro)
        if fecha_desde:
            d = parse_date(str(fecha_desde))
            if d:
                qs = qs.filter(fecha_toma__date__gte=d)
        if fecha_hasta:
            d = parse_date(str(fecha_hasta))
            if d:
                qs = qs.filter(fecha_toma__date__lte=d)

        # Validaciones mínimas por tipo
        if tipo == 'CERTIFICADO' and not resultado_obj:
            return Response({'detail': 'Para certificación individual debe seleccionar un resultado.'}, status=status.HTTP_400_BAD_REQUEST)
        if tipo == 'PACIENTE' and not paciente_obj:
            return Response({'detail': 'Para historial de paciente debe seleccionar un paciente.'}, status=status.HTTP_400_BAD_REQUEST)
        if tipo in ['EXCEL', 'ESTADISTICO'] and not qs.exists():
            return Response({'detail': 'No hay resultados que coincidan con los filtros seleccionados.'}, status=status.HTTP_400_BAD_REQUEST)

        reporte = Reporte(
            tipo=tipo,
            titulo=titulo,
            resultado=resultado_obj,
            paciente=paciente_obj,
            generado_por=request.user if request.user.is_authenticated else None,
            filtros_aplicados=filtros,
        )

        try:
            archivo_content, filename = self._generar_archivo_reporte(reporte, qs)
        except Exception as e:
            return Response({'detail': f'Error al generar el archivo del reporte: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        reporte.archivo.save(filename, archivo_content, save=False)
        reporte.save()

        serializer = self.get_serializer(reporte)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def _generar_archivo_reporte(self, reporte, resultados_qs):
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        safe_tipo = (reporte.tipo or 'REPORTE').lower()

        if reporte.tipo == 'EXCEL':
            return self._generar_excel(reporte, resultados_qs, f"{safe_tipo}_{ts}.xlsx")
        if reporte.tipo == 'ESTADISTICO':
            return self._generar_pdf_estadistico(reporte, resultados_qs, f"{safe_tipo}_{ts}.pdf")
        if reporte.tipo == 'PACIENTE':
            return self._generar_pdf_historial_paciente(reporte, resultados_qs, f"{safe_tipo}_{ts}.pdf")
        # CERTIFICADO u otros: PDF individual
        return self._generar_pdf_certificado(reporte, resultados_qs, f"{safe_tipo}_{ts}.pdf")

    def _render_pdf(self, html, filename):
        buffer = io.BytesIO()
        pisa_status = pisa.CreatePDF(src=html, dest=buffer, encoding='utf-8')
        if pisa_status.err:
            raise ValueError('No fue posible renderizar el PDF.')
        return ContentFile(buffer.getvalue()), filename

    def _tabla_resultados_html(self, resultados):
        rows = ''
        for r in resultados:
            fecha = timezone.localtime(r.fecha_toma).strftime('%Y-%m-%d %H:%M') if r.fecha_toma else ''
            rows += f"""
            <tr>
              <td>{r.consecutivo}</td>
              <td>{r.paciente.documento}</td>
              <td>{r.paciente.nombres} {r.paciente.apellidos}</td>
              <td>{r.tipo_examen}</td>
              <td>{r.estado}</td>
              <td>{fecha}</td>
              <td>{r.medico_remitente}</td>
            </tr>
            """
        return f"""
        <table border="1" cellspacing="0" cellpadding="4" width="100%">
          <thead>
            <tr>
              <th>Consecutivo</th><th>Documento</th><th>Paciente</th><th>Examen</th><th>Estado</th><th>Fecha toma</th><th>Médico</th>
            </tr>
          </thead>
          <tbody>{rows or '<tr><td colspan="7">Sin resultados</td></tr>'}</tbody>
        </table>
        """

    def _generar_pdf_certificado(self, reporte, resultados_qs, filename):
        r = resultados_qs.first() or reporte.resultado
        if not r:
            raise ValueError('No se encontró el resultado para generar la certificación.')
        fecha = timezone.localtime(r.fecha_toma).strftime('%Y-%m-%d %H:%M') if r.fecha_toma else ''
        contenido = (r.contenido_resultado or '').replace('\n', '<br/>')
        html = f"""
        <html><head><meta charset='utf-8'><style>
          body {{ font-family: Helvetica, Arial, sans-serif; font-size: 11px; }}
          h2 {{ margin-bottom: 4px; }}
          .box {{ border: 1px solid #999; padding: 8px; margin-bottom: 10px; }}
        </style></head><body>
          <h2>{reporte.titulo}</h2>
          <p><strong>Tipo:</strong> Certificación Individual | <strong>Fecha generación:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
          <div class="box">
            <p><strong>Paciente:</strong> {r.paciente.nombres} {r.paciente.apellidos} ({r.paciente.tipo_documento} {r.paciente.documento})</p>
            <p><strong>Empresa/Afiliación:</strong> {r.paciente.empresa} / {r.paciente.afiliacion}</p>
            <p><strong>Consecutivo:</strong> {r.consecutivo} | <strong>Código consulta:</strong> {r.codigo_consulta}</p>
            <p><strong>Examen:</strong> {r.tipo_examen} | <strong>Estado:</strong> {r.estado}</p>
            <p><strong>Fecha toma:</strong> {fecha} | <strong>Médico remitente:</strong> {r.medico_remitente}</p>
          </div>
          <h3>Contenido del resultado</h3>
          <div class="box">{contenido or 'Sin contenido registrado.'}</div>
        </body></html>
        """
        return self._render_pdf(html, filename)

    def _generar_pdf_historial_paciente(self, reporte, resultados_qs, filename):
        p = reporte.paciente
        html = f"""
        <html><head><meta charset='utf-8'><style>
          body {{ font-family: Helvetica, Arial, sans-serif; font-size: 10px; }}
          h2 {{ margin-bottom: 4px; }}
        </style></head><body>
          <h2>{reporte.titulo}</h2>
          <p><strong>Paciente:</strong> {p.nombres} {p.apellidos} ({p.tipo_documento} {p.documento})</p>
          <p><strong>Empresa/Afiliación:</strong> {p.empresa} / {p.afiliacion} | <strong>Generado:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
          {self._tabla_resultados_html(list(resultados_qs))}
        </body></html>
        """
        return self._render_pdf(html, filename)

    def _generar_pdf_estadistico(self, reporte, resultados_qs, filename):
        resultados = list(resultados_qs)
        total = len(resultados)
        por_estado = {}
        por_examen = {}
        por_empresa = {}
        for r in resultados:
            por_estado[r.estado] = por_estado.get(r.estado, 0) + 1
            por_examen[r.tipo_examen] = por_examen.get(r.tipo_examen, 0) + 1
            emp = r.paciente.empresa or 'SIN EMPRESA'
            por_empresa[emp] = por_empresa.get(emp, 0) + 1

        def lista_html(dic):
            return ''.join(f'<li>{k}: {v}</li>' for k, v in sorted(dic.items(), key=lambda x: (-x[1], x[0]))) or '<li>Sin datos</li>'

        filtros = reporte.filtros_aplicados or {}
        html = f"""
        <html><head><meta charset='utf-8'><style>
          body {{ font-family: Helvetica, Arial, sans-serif; font-size: 11px; }}
        </style></head><body>
          <h2>{reporte.titulo}</h2>
          <p><strong>Generado:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M')} | <strong>Total resultados:</strong> {total}</p>
          <p><strong>Filtros:</strong> {filtros}</p>
          <h3>Por estado</h3><ul>{lista_html(por_estado)}</ul>
          <h3>Por tipo de examen</h3><ul>{lista_html(por_examen)}</ul>
          <h3>Por empresa</h3><ul>{lista_html(por_empresa)}</ul>
          <h3>Detalle</h3>
          {self._tabla_resultados_html(resultados)}
        </body></html>
        """
        return self._render_pdf(html, filename)

    def _generar_excel(self, reporte, resultados_qs, filename):
        wb = Workbook()
        ws = wb.active
        ws.title = 'Resultados'
        headers = ['Consecutivo', 'Código consulta', 'Documento', 'Paciente', 'Empresa', 'Afiliación', 'Tipo examen', 'Estado', 'Fecha toma', 'Médico remitente']
        ws.append(headers)
        for r in resultados_qs:
            fecha = timezone.localtime(r.fecha_toma).strftime('%Y-%m-%d %H:%M') if r.fecha_toma else ''
            ws.append([
                r.consecutivo, r.codigo_consulta, r.paciente.documento,
                f"{r.paciente.nombres} {r.paciente.apellidos}", r.paciente.empresa,
                r.paciente.afiliacion, r.tipo_examen, r.estado, fecha, r.medico_remitente,
            ])
        buffer = io.BytesIO()
        wb.save(buffer)
        return ContentFile(buffer.getvalue()), filename


class ConsultaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Consulta.objects.select_related('resultado', 'resultado__paciente').all()
    serializer_class = ConsultaSerializer