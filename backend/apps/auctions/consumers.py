"""WebSocket consumer for live auction bid streaming."""
import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer


class AuctionConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.auction_id = self.scope["url_route"]["kwargs"]["auction_id"]
        self.group_name = f"auction_{self.auction_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # Clients don't send bids via WS — they use REST API.
        # This is for future extensions (chat, etc.)
        pass

    async def new_bid(self, event):
        """Broadcast new bid to all connected clients."""
        await self.send_json(event["data"])

    async def auction_update(self, event):
        """Broadcast auction status updates (time extension, close, etc.)."""
        await self.send_json(event["data"])
