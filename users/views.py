from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.shortcuts import get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from .models import CustomUser

from .forms import UserRegisterForm, UserLoginForm

def register_view(request):
    if request.method == 'POST':
        form = UserRegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('stream_list')  
    else:
        form = UserRegisterForm()
    return render(request, 'users/register.html', {'form': form})

def login_view(request):
    if request.method == 'POST':
        form = UserLoginForm(data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('stream_list')  
    else:
        form = UserLoginForm()
    return render(request, 'users/login.html', {'form': form})

@login_required
def profile_view(request, user_id=None):
    # Obtén el perfil del usuario en función del ID o del usuario autenticado
    profile_user = get_object_or_404(CustomUser, id=user_id) if user_id else request.user
    followers_count = profile_user.followers.count()
    following_count = profile_user.following.count()
    
    # Usa 'streams' en lugar de 'streaming_set' para acceder a los streams del usuario
    recent_streams = profile_user.streams.filter(is_live=False).order_by('-start_time')[:5]
    
    # Verificar si el usuario actual sigue al usuario cuyo perfil está viendo
    is_following = profile_user.followers.filter(id=request.user.id).exists()

    return render(request, 'users/profile.html', {
        'profile_user': profile_user,
        'followers_count': followers_count,
        'following_count': following_count,
        'recent_streams': recent_streams,
        'is_following': is_following,
    })



@login_required
def follow_user(request, user_id):
    user_to_follow = get_object_or_404(CustomUser, id=user_id)
    if user_to_follow != request.user:
        user_to_follow.followers.add(request.user)
    return redirect('profile', user_id=user_to_follow.id)

@login_required
def unfollow_user(request, user_id):
    user_to_unfollow = get_object_or_404(CustomUser, id=user_id)
    if user_to_unfollow != request.user:
        user_to_unfollow.followers.remove(request.user)
    return redirect('profile', user_id=user_to_unfollow.id)

