from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from laboratorio.views import CustomTokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Endpoints de autenticación JWT (Login personal del laboratorio)
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Endpoints de la API REST (usuarios, pacientes, resultados, reportes, consultas)
    path('api/', include('laboratorio.urls')),
]

# Servir archivos PDF/Excel generados en Reportes durante desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)