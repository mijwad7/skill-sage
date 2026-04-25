from django.urls import path
from core import views

urlpatterns = [
    path("api/sessions/",                       views.create_session,  name="create_session"),
    path("api/sessions/<uuid:session_id>/",     views.get_session,     name="get_session"),
    path("api/sessions/<uuid:session_id>/message/", views.send_message, name="send_message"),
    path("api/sessions/<uuid:session_id>/results/", views.get_results,  name="get_results"),
    path("api/extract-text/",                   views.extract_text_view, name="extract_text"),
]
