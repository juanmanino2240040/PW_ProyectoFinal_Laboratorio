from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Resultado

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        return token

class ResultadoSerializer(serializers.ModelSerializer):
    hora = serializers.TimeField(format="%H:%M:%S", read_only=True)

    class Meta:
        model = Resultado
        fields = '__all__'

class UsuarioSerializer(serializers.ModelSerializer):
    usuario = serializers.CharField(source='username')
    rol = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'usuario', 'rol']

    def get_rol(self, obj):
        return 'Administrador' if obj.is_staff else 'Recepcion'