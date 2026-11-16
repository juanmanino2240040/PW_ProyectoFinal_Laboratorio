from django.contrib.auth import get_user_model
from rest_framework import serializers

Usuario = get_user_model()


class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
        style={'input_type': 'password'},
        help_text='Requerido al crear usuario; opcional al editar.'
    )
    rol_display = serializers.CharField(source='get_rol_display', read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'documento',
            'cargo',
            'rol',
            'rol_display',
            'is_active',
            'password',
            'date_joined',
            'last_login',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'rol_display']

    def validate_username(self, value):
        value = value.strip()
        qs = Usuario.objects.filter(username__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ya existe un usuario con este nombre de usuario.')
        return value

    def validate(self, attrs):
        # Exigir password únicamente en creación (POST)
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'Este campo es obligatorio al crear un usuario.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Usuario(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class PerfilUsuarioSerializer(serializers.ModelSerializer):
    """Serializer ligero para el endpoint /api/usuarios/me/ en React."""
    rol_display = serializers.CharField(source='get_rol_display', read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'documento',
            'cargo',
            'telefono',
            'rol',
            'rol_display',
            'is_active',
        ]
        read_only_fields = fields


class CambioPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(write_only=True, required=True)
    password_nueva = serializers.CharField(write_only=True, required=True, min_length=8)
    confirmar_password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs['password_nueva'] != attrs['confirmar_password']:
            raise serializers.ValidationError({'confirmar_password': 'La confirmación no coincide con la nueva contraseña.'})
        return attrs