from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect

urlpatterns = [
    path('admin/', admin.site.urls),
    path('users/', include('users.urls')),
    path('', lambda request: redirect('stream_list')),
    path('streamings/', include('streamings.urls')),
    path('accounts/login/', lambda request: redirect('/users/login/')),
    path('chat/', include('chat.urls')), 
    path('surveys/', include('surveys.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
