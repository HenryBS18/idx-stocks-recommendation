import os
import time
import threading

def delete_file_later(file_path: str):
    def worker():
        time.sleep(15)

        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f'Deleted: {file_path}')
        except Exception as e:
            print(f'Failed deleting {file_path}: {e}')

    threading.Thread(target=worker, daemon=True).start()