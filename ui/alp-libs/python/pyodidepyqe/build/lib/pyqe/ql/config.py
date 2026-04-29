import os
import json
from pyqe.api.base import _AuthApi
from pyqe.types.enum_types import ConfigPath

FILTER_CARDS = 'filtercards'
MODEL_NAME = 'modelName'
SOURCE = 'source'
ATTRIBUTES = 'attributes'


class Config:
    def __init__(self, path: str, path_type: ConfigPath):
        self._interactions = {}
        if path_type == ConfigPath.URL:
            api = _AuthApi()
            response = api._get(path)
            self._data = json.loads(response.text)
        else:
            with open(os.path.expanduser(path)) as json_file:
                self._data = json.load(json_file)
        if self._data is not None:
            self._patient: dict = self._create_filter_card(self._data[FILTER_CARDS].pop(0))
            for index, card in enumerate(self._data[FILTER_CARDS]):
                self._interactions[card[MODEL_NAME]] = self._create_filter_card(card)
        else:
            raise ValueError('Config setup has failed')

    def _create_filter_card(self, card: dict) -> dict:
        return {
            'configPath': card[SOURCE],
            'name': card[MODEL_NAME],
            ATTRIBUTES: self._create_attributes(card[ATTRIBUTES])
        }

    def _create_attributes(self, config_attributes: list) -> dict:
        attributes = {}
        for config_attribute in config_attributes:
            attribute = ATTRIBUTES + config_attribute[SOURCE].split('.attributes', 1)[1]
            attributes[config_attribute[MODEL_NAME]] = attribute
        return attributes

    def find_interaction(self, name: str) -> dict:
        return self._interactions[name]