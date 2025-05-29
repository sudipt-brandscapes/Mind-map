from django.urls import path
from . import views

urlpatterns = [
    path('upload-pdf/', views.upload_pdf, name='upload_pdf'),
    path('ask-question/', views.ask_question, name='ask_question'),
]