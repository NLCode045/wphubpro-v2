# Scenario A: volledige Appwrite-instance verplaatsen

Gebruik dit wanneer je **dezelfde server** (of een 1:1-kopie) wilt behouden: wachtwoorden, encrypted documentvelden en interne consistentie blijven intact. Zie de officiële documentatie: [Production backups](https://appwrite.io/docs/advanced/self-hosting/production/backups) en [Backups blog](https://appwrite.io/blog/post/how-to-back-up-your-appwrite-data).

## Checklist

1. **Versies**: Zelfde Appwrite-versie op bron en doel (of upgrade volgens de upgrade-guide ná een succesvolle restore-test).
2. **Bron stilzetten** (of read-only) zodat dump en volumes consistent zijn.
3. **MariaDB**: `mysqldump` van de Appwrite-database(s) volgens jouw compose-setup.
4. **Volumes**: archiveer o.a. uploads, functions, builds (namen uit jouw `docker-compose`).
5. **Kritieke secrets**: Voor encrypted data moet **`_APP_OPENSSL_KEY_V1`** op doel overeenkomen met bron (anders zijn encrypted velden onbruikbaar).
6. **Doel**: Bij voorkeur een **lege** Appwrite-installatie; restore daarna DB → volumes.
7. **Na restore**: Voer Appwrite-migraties uit (bijv. `docker compose exec appwrite migrate` — exact commando afhankelijk van je image/versie).
8. **Clients**: Werk endpoint/DNS en app-`.env` bij naar de nieuwe host.

## Project-script (scenario B)

Voor data naar een **bestaand** project op een andere instance: gebruik `npm run migrate:appwrite -- --help` en het script in deze map. Dat pad behoudt geen wachtwoorden tenzij je zelf hashes aanlevert (zie `--user-hashes`).
