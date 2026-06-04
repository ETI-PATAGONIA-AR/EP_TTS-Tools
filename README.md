# 🎙️ EP_TTS-Tools (S íntesis de Voz Neural )
EP_TTS — Estudio de producción voz neural multi-voz, local y sin complicaciones...100% local, 0% nube...

<img width="1032" height="692" alt="Captura de pantalla 2026-06-04 145305" src="https://github.com/user-attachments/assets/7b86be10-3369-441f-b62a-035dc3ecca5e" />


🚀 Aplicación **local** de Text-to-Speech con voces neurales Microsoft edge-tts.  
🎭 Interfaz profesional multi-escena, multi-interlocutor con tono y velocidad configurables **por voz**.

---

## ✨ Características

| | |
|---|---|
| 🗣️ **7 voces neurales** | Argentina, Chile, México, Uruguay |
| 👥 **Multi-interlocutor** | Diálogos con voces distintas por persona |
| 📜 **Múltiples escenas** | Organizá guiones por proyecto |
| 🎛️ **Tono + Velocidad** | Configurables individualmente por cada voz |
| 💾 **Perfiles de voz** | Guardá y cargá configuraciones de interlocutores |
| 📋 **Historial** | Reproducí y descargá audios generados |
| 📦 **Portable** | Doble clic en `EP_TTS.bat` y listo |
| 🔄 **Auto-instalación** | Instala dependencias Node.js y Python automáticamente |

---

## 🎤 Voces disponibles

| Voz | 🌎 Locale | 👤 Género |
|---|---|---|
| Tomás | 🇦🇷 es-AR (Argentina) | Masculino |
| Elena | 🇦🇷 es-AR (Argentina) | Femenino |
| Lorenzo | 🇨🇱 es-CL (Chile) | Masculino |
| Jorge | 🇲🇽 es-MX (México) | Masculino |
| Dalia | 🇲🇽 es-MX (México) | Femenino |
| Valentina | 🇺🇾 es-UY (Uruguay) | Femenino |
| Mateo | 🇺🇾 es-UY (Uruguay) | Masculino |

---

## ⚙️ Requisitos

- ✅ **Node.js** 18+
- ✅ **Python** 3.8+

## 🚀 Instalación y ejecución

```bash
git clone <repo>
cd EP_TTS
EP_TTS.bat
```

O manual:

```bash
npm install
pip install -r requirements.txt
npm run dev
```

Abrir 🌐 `http://localhost:3000`.

---

## 🖥️ ¿Qué incluye?

- Editor con escenas múltiples y pestañas
- Panel de interlocutores con tono/velocidad por voz
- Botones para insertar prefijo `Speaker A:` / `Speaker B:`
- Reproductor integrado con control de velocidad (0.75x – 2.0x)
- Historial de audios con descarga MP3
- Perfiles de voz guardables

---

## 🛠️ Tecnología

| Capa | Stack |
|---|---|
| 🎨 **Frontend** | React + TypeScript + Vite + Tailwind CSS |
| ⚙️ **Backend** | Express + tsx (Node.js) |
| 🔊 **TTS** | edge-tts (Python) — Microsoft Edge Speech Service |
| 🌙 **Estilos** | Interfaz oscura profesional con acentos verdes |

---

## 📄 Licencia

MIT — libre para usar y compartir.

