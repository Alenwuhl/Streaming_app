# Generated by Django 5.1.1 on 2024-11-07 17:16

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('streamings', '0004_streaming_video_file_alter_streaming_description'),
    ]

    operations = [
        migrations.AddField(
            model_name='streaming',
            name='recorded_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
