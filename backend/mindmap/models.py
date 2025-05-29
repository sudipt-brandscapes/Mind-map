# mindmap/models.py
from django.db import models

# For future use if you want to store uploaded documents or mind maps
class Document(models.Model):
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    total_characters = models.IntegerField(default=0)
    number_of_chunks = models.IntegerField(default=0)
    is_complex = models.BooleanField(default=False)
    
    def __str__(self):
        return self.title

class MindMap(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='mindmaps')
    data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"MindMap for {self.document.title}"