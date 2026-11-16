import os
import subprocess
from datetime import datetime

from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .permissions import EsAdmin
from .serializers import CambioPasswordSerializer, PerfilUsuarioSerializer, UsuarioSerializer

Usuario = get_user_model()


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all().order_by('username')
    serializer_class = UsuarioSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Devuelve los datos y rol del usuario autenticado."""
        serializer = PerfilUsuarioSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='cambiar-password', permission_classes=[IsAuthenticated])
    def cambiar_password(self, request):
        serializer = CambioPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['password_actual']):
            return Response(
                {'password_actual': 'La contraseña actual es incorrecta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data['password_nueva'])
        user.save()
        return Response({'detail': 'Contraseña actualizada correctamente.'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='exportar-db', permission_classes=[IsAuthenticated])
    def exportar_db(self, request):
        db = settings.DATABASES.get('default', {})
        engine = db.get('ENGINE', '')

        if 'postgresql' not in engine:
            return Response(
                {'detail': 'La exportación automática en .sql solo está disponible para PostgreSQL.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        db_name = db.get('NAME') or ''
        db_user = db.get('USER') or ''
        db_password = db.get('PASSWORD') or ''
        db_host = db.get('HOST') or 'localhost'
        db_port = str(db.get('PORT') or '5432')

        cmd = [
            'pg_dump',
            '--no-owner',
            '--no-privileges',
            '--format=plain',
            '-h', db_host,
            '-p', db_port,
            '-U', db_user,
            db_name,
        ]

        env = os.environ.copy()
        if db_password:
            env['PGPASSWORD'] = str(db_password)

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                env=env,
                check=False,
            )
        except FileNotFoundError:
            return Response(
                {'detail': 'No se encontró la utilidad pg_dump en el servidor.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if result.returncode != 0:
            error_msg = (result.stderr or 'Error desconocido al generar el respaldo.').strip()
            return Response({'detail': error_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        filename = f"backup_{db_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
        response = HttpResponse(result.stdout, content_type='application/sql; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response