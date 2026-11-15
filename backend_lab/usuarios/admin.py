from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario

# Register your models here.
@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ('username', 'first_name', 'last_name', 'rol', 'documento', 'is_active')
    list_filter = ('rol', 'is_active')
    search_fields = ('username', 'first_name', 'last_name', 'documento')

    # Agrega los campos personalizados al formulario de edición en el admin
    fieldsets = UserAdmin.fieldsets + (
        ('Información de Laboratorio', {'fields': ('rol', 'documento', 'telefono', 'cargo')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Información de Laboratorio', {'fields': ('rol', 'documento', 'telefono', 'cargo')}),
    )
