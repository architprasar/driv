from rest_framework.parsers import JSONParser
from rest_framework.exceptions import ParseError


class ObjectJSONParser(JSONParser):
    def parse(self, stream, media_type=None, parser_context=None):
        value = super().parse(
            stream, media_type=media_type, parser_context=parser_context
        )
        if not isinstance(value, dict):
            raise ParseError("Send a JSON object containing the requested fields.")
        return value
