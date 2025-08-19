class Logger:
    def __init__(self):
        self.debug_enabled = False # TODO: change to env variable

    def debug(self, msg):
        if self.debug_enabled:
            print(f"[DEBUG] {msg}")

    def info(self, msg):
        print(f"[INFO] {msg}")

    def error(self, msg):
        print(f"[ERROR] {msg}")