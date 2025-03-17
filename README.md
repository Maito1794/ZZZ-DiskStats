# ZZZ Disk Stats Collector

🚀 A Node.js script for collecting and analyzing disk stats from [Prydwen.gg](https://www.prydwen.gg/zenless/) for Zenless Zone Zero (ZZZ).

## 📌 Features

- Fetches character data and stats from Prydwen.gg.
- Extracts disk information from a JavaScript file.
- Merges character stats with disk information.
- Formats and saves the results in JSON and TXT files.

## 📦 Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/Maito1794/ZZZ-DiskStats.git
   cd ZZZ-DiskStats
   ```

## ▶️ Usage

Run the script using:
```sh
node DiskStats.js
```

The results will be saved as:
- `characters_details.json` – Raw merged character & disk data.
- `disk_stats.txt` – Readable disk stats summary.

## 🛠 Dependencies

- Node.js
- `fs` (built-in)
- `path` (built-in)
- Fetch API (available in modern Node.js versions)

## ⚠️ Disclaimer

This script fetches public data from Prydwen.gg. Use it responsibly and respect the website's terms of use.

---

📌 **Contributors welcome!** If you have improvements, feel free to open an issue or pull request.