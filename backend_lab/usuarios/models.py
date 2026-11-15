from django.contrib.auth.models import AbstractUser
from django.db import models
# Create your models here.


class Usuario(AbstractUser):
    class Rol(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrador'
        RECEPCION = 'RECEPCION', 'Recepción'
        REGISTRO = 'REGISTRO', 'Registro'

    rol = models.CharField(
        max_length=20,
        choices=Rol.choices,
        default=Rol.REGISTRO,
        verbose_name='Rol en el laboratorio'
    )
    documento = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        verbose_name='Número de documento'
    )
    telefono = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name='Teléfono de contacto'
    )
    cargo = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name='Cargo (ej. Bacteriólogo, Auxiliar)'
    )
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['id']

    def __str__(self):
        return f"{self.username} - {self.get_rol_display()}"