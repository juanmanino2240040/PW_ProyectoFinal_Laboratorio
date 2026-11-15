from django.contrib.auth import get_user_model
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .permissions import EsAdmin
from .serializers import PerfilUsuarioSerializer, UsuarioSerializer

Usuario = get_user_model()


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all().order_by('username')
    serializer_class = UsuarioSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def me(self, request):
        """Devuelve los datos y rol del usuario autenticado."""
        serializer = PerfilUsuarioSerializer(request.user)
        return Response(serializer.data)