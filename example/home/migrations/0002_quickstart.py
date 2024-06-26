# Generated by Django 5.0.3 on 2024-05-01 03:15

import django.db.models.deletion
import wagtail.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0001_initial'),
        ('wagtailcore', '0091_remove_revision_submitted_for_moderation'),
    ]

    operations = [
        migrations.CreateModel(
            name='QuickStart',
            fields=[
                ('page_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='wagtailcore.page')),
                ('content', wagtail.fields.RichTextField()),
            ],
            options={
                'abstract': False,
            },
            bases=('wagtailcore.page',),
        ),
    ]
