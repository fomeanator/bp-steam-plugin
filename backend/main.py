import Millennium

class Plugin:
    def _load(self):
        Millennium.logger.log("[BP] OK")
        Millennium.ready()

    def _unload(self):
        pass
