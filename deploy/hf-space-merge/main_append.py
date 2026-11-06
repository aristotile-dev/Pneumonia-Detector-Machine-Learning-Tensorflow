

# ── Pneumonia detector (mounted under /pneumonia) ───────────────
import threading

import pneumonia_api

pneumonia_api.app.user_middleware.clear()  # CORS is already handled by this app
app.mount("/pneumonia", pneumonia_api.app)


def _warm_pneumonia():
    try:
        pneumonia_api.get_model()
    except Exception as e:  # noqa: BLE001
        print(f"[pneumonia] model preload failed: {e}")


threading.Thread(target=_warm_pneumonia, daemon=True).start()
