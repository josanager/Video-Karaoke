import os
import queue
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from typing import Optional, Tuple

from downloader import DownloadRequest, default_download_folder, stream_download


class MusicDownloaderApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Descargador de musica")
        self.root.geometry("720x520")
        self.root.minsize(640, 480)

        self.message_queue: "queue.Queue[Tuple[str, str]]" = queue.Queue()
        self.download_thread: Optional[threading.Thread] = None

        default_folder = default_download_folder()
        self.url_var = tk.StringVar()
        self.folder_var = tk.StringVar(value=default_folder)
        self.filename_var = tk.StringVar()
        self.format_var = tk.StringVar(value="mp3")
        self.browser_var = tk.StringVar(value="none")
        self.status_var = tk.StringVar(value="Listo para descargar")

        self._build_ui()
        self.root.after(150, self._process_queue)

    def _build_ui(self) -> None:
        container = ttk.Frame(self.root, padding=18)
        container.pack(fill="both", expand=True)

        title = ttk.Label(
            container,
            text="Descargador de musica por enlace",
            font=("Helvetica", 20, "bold"),
        )
        title.pack(anchor="w")

        subtitle = ttk.Label(
            container,
            text="Pega un link, elige donde guardar el archivo y descarga el audio.",
        )
        subtitle.pack(anchor="w", pady=(6, 18))

        form = ttk.Frame(container)
        form.pack(fill="x")
        form.columnconfigure(1, weight=1)

        ttk.Label(form, text="Enlace").grid(row=0, column=0, sticky="w", pady=6)
        ttk.Entry(form, textvariable=self.url_var).grid(
            row=0, column=1, sticky="ew", pady=6
        )

        ttk.Label(form, text="Carpeta").grid(row=1, column=0, sticky="w", pady=6)
        ttk.Entry(form, textvariable=self.folder_var).grid(
            row=1, column=1, sticky="ew", pady=6
        )
        ttk.Button(form, text="Elegir", command=self._choose_folder).grid(
            row=1, column=2, padx=(10, 0), pady=6
        )

        ttk.Label(form, text="Nombre").grid(row=2, column=0, sticky="w", pady=6)
        ttk.Entry(form, textvariable=self.filename_var).grid(
            row=2, column=1, sticky="ew", pady=6
        )

        ttk.Label(form, text="Formato").grid(row=3, column=0, sticky="w", pady=6)
        ttk.Combobox(
            form,
            textvariable=self.format_var,
            values=("mp3", "m4a", "original"),
            state="readonly",
        ).grid(row=3, column=1, sticky="w", pady=6)

        ttk.Label(form, text="Navegador").grid(row=4, column=0, sticky="w", pady=6)
        ttk.Combobox(
            form,
            textvariable=self.browser_var,
            values=("none", "safari", "chrome", "firefox", "edge"),
            state="readonly",
        ).grid(row=4, column=1, sticky="w", pady=6)

        actions = ttk.Frame(container)
        actions.pack(fill="x", pady=(18, 10))

        self.download_button = ttk.Button(
            actions, text="Descargar", command=self._start_download
        )
        self.download_button.pack(side="left")

        ttk.Label(actions, textvariable=self.status_var).pack(side="left", padx=(14, 0))

        note = ttk.Label(
            container,
            text="Se descarga la mejor calidad de audio que permita la plataforma y tu acceso.",
            foreground="#666666",
        )
        note.pack(anchor="w", pady=(0, 12))

        self.log = tk.Text(container, wrap="word", height=18, state="disabled")
        self.log.pack(fill="both", expand=True)

    def _choose_folder(self) -> None:
        selected = filedialog.askdirectory(initialdir=self.folder_var.get() or None)
        if selected:
            self.folder_var.set(selected)

    def _append_log(self, text: str) -> None:
        self.log.configure(state="normal")
        self.log.insert("end", text + "\n")
        self.log.see("end")
        self.log.configure(state="disabled")

    def _set_busy(self, busy: bool) -> None:
        self.download_button.configure(state="disabled" if busy else "normal")

    def _start_download(self) -> None:
        url = self.url_var.get().strip()
        folder = self.folder_var.get().strip()
        filename = self.filename_var.get().strip()
        fmt = self.format_var.get().strip()
        browser = self.browser_var.get().strip()

        if not url:
            messagebox.showerror("Falta el enlace", "Introduce un enlace antes de descargar.")
            return

        if not folder:
            messagebox.showerror("Falta la carpeta", "Elige una carpeta de destino.")
            return

        if not os.path.isdir(folder):
            messagebox.showerror("Carpeta no valida", "La carpeta elegida no existe.")
            return

        if self.download_thread and self.download_thread.is_alive():
            messagebox.showinfo("Descarga en curso", "Espera a que termine la descarga actual.")
            return

        self._append_log(f"Iniciando descarga: {url}")
        self.status_var.set("Descargando...")
        self._set_busy(True)

        self.download_thread = threading.Thread(
            target=self._run_download,
            args=(
                DownloadRequest(
                    url=url,
                    folder=folder,
                    filename=filename,
                    audio_format=fmt,
                    browser=browser,
                ),
            ),
            daemon=True,
        )
        self.download_thread.start()

    def _run_download(self, request: DownloadRequest) -> None:
        def emit_log(line: str) -> None:
            self.message_queue.put(("log", line.rstrip()))

        ok, message = stream_download(request, emit_log)
        if ok:
            self.message_queue.put(("done", message))
        else:
            self.message_queue.put(("error", message))

    def _process_queue(self) -> None:
        while not self.message_queue.empty():
            kind, message = self.message_queue.get()

            if kind == "log":
                self._append_log(message)
            elif kind == "done":
                self._append_log(message)
                self.status_var.set("Descarga terminada")
                self._set_busy(False)
            elif kind == "error":
                self._append_log(message)
                self.status_var.set("Error en la descarga")
                self._set_busy(False)
                messagebox.showerror("Error", message)

        self.root.after(150, self._process_queue)


def main() -> None:
    root = tk.Tk()
    MusicDownloaderApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
