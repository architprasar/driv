from celery import shared_task
from .lifecycle import tick_marketplace as tick


@shared_task
def tick_marketplace():
    return tick()
