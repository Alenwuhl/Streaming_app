from django.urls import path
from .views import register_view, login_view, profile_view
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('profile/<int:user_id>/', views.profile_view, name='profile'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('profile/<int:user_id>/follow/', views.follow_user, name='follow_user'),
    path('profile/<int:user_id>/unfollow/', views.unfollow_user, name='unfollow_user'),
]
